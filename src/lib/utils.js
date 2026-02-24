// Format nombre
export const fmt = (n) => {
  if (n === null || n === undefined) return '0';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

// Format monnaie
export const fmtMoney = (n) => {
  if (n === null || n === undefined) return '0 MAD';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD';
};

// Format date
export const fmtDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR');
};

// Date aujourd'hui
export const today = () => new Date().toISOString().split('T')[0];

// Download JSON
export const downloadJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Download Excel
export const downloadExcel = async (data, filename, sheetName = 'Data') => {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
};

// Read file
export const readFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

// Group by
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const k = typeof key === 'function' ? key(item) : item[key];
    (result[k] = result[k] || []).push(item);
    return result;
  }, {});
};

// Sum
export const sum = (array, key) => {
  return array.reduce((s, item) => s + (item[key] || 0), 0);
};

// Get month index from date
export const getMonthIdx = (dateStr) => {
  if (!dateStr) return 4;
  const month = new Date(dateStr).getMonth();
  // Sept=0, Oct=1, Nov=2, Dec=3, Jan=4, Feb=5, etc.
  const mapping = { 8: 0, 9: 1, 10: 2, 11: 3, 0: 4, 1: 5, 2: 6, 3: 7, 4: 8, 5: 9, 6: 10, 7: 11 };
  return mapping[month] ?? 4;
};
