"""
Member 3 — ML Forecasting (R&D Phase)
=======================================
scikit-learn models trained on synthetic/historical data.
Compares formula-based forecast with ML predictions using MAE/RMSE/MAPE.
"""

import logging
import numpy as np
from datetime import datetime
from typing import List, Dict, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.db_models import EnergyRecord

logger = logging.getLogger("urjasetu.ml_forecast")


class MLForecaster:
    """Machine learning forecasting using scikit-learn."""

    def __init__(self):
        self.solar_model = None
        self.wind_model = None
        self.demand_model = None
        self._is_trained = False

    def train(self, db: Session, min_records: int = 100) -> Dict:
        """Train ML models on historical data."""
        try:
            from sklearn.ensemble import GradientBoostingRegressor
            from sklearn.model_selection import train_test_split
            from sklearn.metrics import mean_absolute_error, mean_squared_error
        except ImportError:
            logger.warning("scikit-learn not available — ML forecasting disabled")
            return {"error": "scikit-learn not installed"}

        records = db.query(EnergyRecord).order_by(EnergyRecord.timestamp).all()
        if len(records) < min_records:
            return {"error": f"Insufficient data: {len(records)} records (need {min_records})"}

        # Build feature matrix
        X, y_solar, y_wind, y_demand = self._build_features(records)

        if len(X) == 0:
            return {"error": "Could not build features from data"}

        results = {}

        # Train Solar model
        X_train, X_test, y_train, y_test = train_test_split(X, y_solar, test_size=0.2, random_state=42)
        self.solar_model = GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42)
        self.solar_model.fit(X_train, y_train)
        solar_pred = self.solar_model.predict(X_test)
        results["solar"] = self._compute_metrics(y_test, solar_pred)

        # Train Wind model
        X_train, X_test, y_train, y_test = train_test_split(X, y_wind, test_size=0.2, random_state=42)
        self.wind_model = GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42)
        self.wind_model.fit(X_train, y_train)
        wind_pred = self.wind_model.predict(X_test)
        results["wind"] = self._compute_metrics(y_test, wind_pred)

        # Train Demand model
        X_train, X_test, y_train, y_test = train_test_split(X, y_demand, test_size=0.2, random_state=42)
        self.demand_model = GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42)
        self.demand_model.fit(X_train, y_train)
        demand_pred = self.demand_model.predict(X_test)
        results["demand"] = self._compute_metrics(y_test, demand_pred)

        self._is_trained = True
        logger.info(f"ML models trained on {len(records)} records")
        return results

    def predict(self, features: Dict) -> Dict:
        """Predict solar, wind, and demand for a single time step."""
        if not self._is_trained:
            return {"error": "Models not trained yet"}

        x = self._extract_features(features)
        x = np.array(x).reshape(1, -1)

        return {
            "solar_kwh": float(max(0, self.solar_model.predict(x)[0])),
            "wind_kwh": float(max(0, self.wind_model.predict(x)[0])),
            "demand_kwh": float(max(0, self.demand_model.predict(x)[0])),
            "method": "ml",
        }

    def _build_features(self, records: List[EnergyRecord]) -> Tuple:
        """Build feature matrix from historical records."""
        X = []
        y_solar = []
        y_wind = []
        y_demand = []

        for i, r in enumerate(records):
            ts = r.timestamp
            features = [
                ts.hour,
                ts.weekday(),
                ts.month,
                ts.day,
                r.solar_irradiance or 0,
                r.cloud_cover or 0,
                r.temperature or 25,
                r.wind_speed or 0,
                # Previous hour demand (if available)
                records[i - 1].demand if i > 0 else 50,
                # 7-day avg demand for this hour (simplified: just previous)
                records[max(0, i - 24)].demand if i >= 24 else 50,
            ]

            X.append(features)
            y_solar.append(r.solar_generation or 0)
            y_wind.append(r.wind_generation or 0)
            y_demand.append(r.demand or 50)

        return np.array(X), np.array(y_solar), np.array(y_wind), np.array(y_demand)

    def _extract_features(self, features: Dict) -> List[float]:
        """Extract feature vector from a dict."""
        ts = features.get("timestamp", datetime.now())
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts)

        return [
            ts.hour,
            ts.weekday(),
            ts.month,
            ts.day,
            features.get("solar_irradiance", 0),
            features.get("cloud_cover", 0),
            features.get("temperature", 25),
            features.get("wind_speed", 0),
            features.get("previous_demand", 50),
            features.get("avg_demand_7d", 50),
        ]

    def _compute_metrics(self, y_true: np.ndarray, y_pred: np.ndarray) -> Dict:
        """Compute MAE, RMSE, MAPE."""
        from sklearn.metrics import mean_absolute_error, mean_squared_error

        mae = mean_absolute_error(y_true, y_pred)
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))

        # MAPE (avoid division by zero)
        mask = y_true > 0
        if mask.sum() > 0:
            mape = np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100
        else:
            mape = 0.0

        return {
            "mae": round(float(mae), 3),
            "rmse": round(float(rmse), 3),
            "mape": round(float(mape), 2),
        }

    @property
    def is_trained(self) -> bool:
        return self._is_trained


# Module-level singleton
ml_forecaster = MLForecaster()
