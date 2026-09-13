/**
 * Utility function to trigger browser download of a CSV file.
 * @param {string} filename - Desired filename
 * @param {Array<Object>} rows - Array of objects to be converted to CSV
 */
export function downloadCSV(filename, rows) {
  if (!rows || !rows.length) return;

  const keys = Object.keys(rows[0]);
  const csvContent = [
    keys.join(','),
    ...rows.map(row =>
      keys
        .map(k => {
          let val = row[k];
          if (val === null || val === undefined) val = '';
          if (typeof val === 'string' && val.includes(',')) {
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
