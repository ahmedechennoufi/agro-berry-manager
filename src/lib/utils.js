// Formater un nombre
export const fmt = (n) => {
  if (n === null || n === undefined) return '0';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

// Formater en monnaie
export const fmtMoney = (n) => {
  if (n === null || n === undefined) return '0 MAD';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD';
};

// Formater une date
export const fmtDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR');
};

// Date d'aujourd'hui en format YYYY-MM-DD
export const today = () => new Date().toISOString().split('T')[0];

// Télécharger un fichier JSON
export const downloadJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Télécharger un fichier Excel
export const downloadExcel = async (data, filename) => {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, filename);
};

// Lire un fichier
export const readFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

// Grouper par clé
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const k = typeof key === 'function' ? key(item) : item[key];
    (result[k] = result[k] || []).push(item);
    return result;
  }, {});
};

// Somme d'un tableau
export const sum = (array, key) => {
  return array.reduce((s, item) => s + (item[key] || 0), 0);
};
