// Formatting utilities
export const fmt = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return new Intl.NumberFormat('fr-FR', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 2 
  }).format(num);
};

export const fmtMoney = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '- MAD';
  return new Intl.NumberFormat('fr-FR', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }).format(num) + ' MAD';
};

export const fmtDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR');
};

export const fmtDateTime = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('fr-FR');
};

// Excel export
export const downloadExcel = async (data, filename) => {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, filename);
};

// Export consommation fermes with SORTIES column
export const exportConsoFermes = async (tableData, month, entryDetails = [], consoDetails = []) => {
  const XLSX = await import('xlsx-js-style');
  const wb = XLSX.utils.book_new();
  
  const headerStyle1 = (color) => ({
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
    fill: { fgColor: { rgb: color } },
    alignment: { horizontal: "center", vertical: "center" },
    border: { top: {style:"thin"}, bottom: {style:"thin"}, left: {style:"thin"}, right: {style:"thin"} }
  });
  
  const headerStyle2 = (color) => ({
    font: { bold: true, color: { rgb: "000000" }, sz: 10 },
    fill: { fgColor: { rgb: color } },
    alignment: { horizontal: "center", vertical: "center" },
    border: { top: {style:"thin"}, bottom: {style:"thin"}, left: {style:"thin"}, right: {style:"thin"} }
  });
  
  const cellStyle = (color) => ({
    font: { sz: 10 },
    fill: { fgColor: { rgb: color } },
    alignment: { horizontal: "right" },
    border: { top: {style:"thin",color:{rgb:"DDD"}}, bottom: {style:"thin",color:{rgb:"DDD"}}, left: {style:"thin",color:{rgb:"DDD"}}, right: {style:"thin",color:{rgb:"DDD"}} }
  });
  
  const totStyle = (color) => ({
    font: { bold: true, sz: 10 },
    fill: { fgColor: { rgb: color } },
    alignment: { horizontal: "right" },
    border: { top: {style:"thin"}, bottom: {style:"thin"}, left: {style:"thin"}, right: {style:"thin"} }
  });

  // Colors
  const BLUE = "3B82F6", BLUE_LIGHT = "DBEAFE", BLUE_TOT = "93C5FD";
  const GREEN = "22C55E", GREEN_LIGHT = "DCFCE7", GREEN_TOT = "86EFAC";
  const PURPLE = "A855F7", PURPLE_LIGHT = "F3E8FF", PURPLE_TOT = "D8B4FE";
  const ORANGE = "F97316", ORANGE_LIGHT = "FED7AA", ORANGE_TOT = "FDBA74";
  const INDIGO = "6366F1", INDIGO_LIGHT = "E0E7FF";
  
  // Sheet 1: Consommation
  const ws1 = {};
  
  // Row 1: Main headers (now with 23 columns)
  const mainHeaders = [
    { v: 'Article', s: headerStyle1("6B7280") },
    { v: 'Cat.', s: headerStyle1("6B7280") },
    { v: 'Unité', s: headerStyle1("6B7280") },
    { v: 'Prix', s: headerStyle1("6B7280") },
    { v: 'STOCK INITIAL', s: headerStyle1(BLUE) }, { v: '', s: headerStyle1(BLUE) }, { v: '', s: headerStyle1(BLUE) }, { v: '', s: headerStyle1(BLUE) },
    { v: 'ENTRÉES', s: headerStyle1(GREEN) }, { v: '', s: headerStyle1(GREEN) }, { v: '', s: headerStyle1(GREEN) }, { v: '', s: headerStyle1(GREEN) },
    { v: 'SORTIES', s: headerStyle1(PURPLE) }, { v: '', s: headerStyle1(PURPLE) }, { v: '', s: headerStyle1(PURPLE) }, { v: '', s: headerStyle1(PURPLE) },
    { v: 'CONSOMMATION', s: headerStyle1(ORANGE) }, { v: '', s: headerStyle1(ORANGE) }, { v: '', s: headerStyle1(ORANGE) }, { v: '', s: headerStyle1(ORANGE) },
    { v: 'STOCK FINAL', s: headerStyle1(INDIGO) }, { v: '', s: headerStyle1(INDIGO) }, { v: '', s: headerStyle1(INDIGO) }
  ];
  mainHeaders.forEach((h, i) => { ws1[XLSX.utils.encode_cell({ r: 0, c: i })] = h; });
  
  // Row 2: Sub headers
  const subHeaders = [
    { v: '', s: headerStyle2("F3F4F6") }, { v: '', s: headerStyle2("F3F4F6") }, { v: '', s: headerStyle2("F3F4F6") }, { v: '', s: headerStyle2("F3F4F6") },
    { v: 'AB1', s: headerStyle2(BLUE_LIGHT) }, { v: 'AB2', s: headerStyle2(BLUE_LIGHT) }, { v: 'AB3', s: headerStyle2(BLUE_LIGHT) }, { v: 'TOTAL', s: headerStyle2(BLUE_TOT) },
    { v: 'AB1', s: headerStyle2(GREEN_LIGHT) }, { v: 'AB2', s: headerStyle2(GREEN_LIGHT) }, { v: 'AB3', s: headerStyle2(GREEN_LIGHT) }, { v: 'TOTAL', s: headerStyle2(GREEN_TOT) },
    { v: 'AB1', s: headerStyle2(PURPLE_LIGHT) }, { v: 'AB2', s: headerStyle2(PURPLE_LIGHT) }, { v: 'AB3', s: headerStyle2(PURPLE_LIGHT) }, { v: 'TOTAL', s: headerStyle2(PURPLE_TOT) },
    { v: 'AB1', s: headerStyle2(ORANGE_LIGHT) }, { v: 'AB2', s: headerStyle2(ORANGE_LIGHT) }, { v: 'AB3', s: headerStyle2(ORANGE_LIGHT) }, { v: 'TOTAL', s: headerStyle2(ORANGE_TOT) },
    { v: 'AB1', s: headerStyle2(INDIGO_LIGHT) }, { v: 'AB2', s: headerStyle2(INDIGO_LIGHT) }, { v: 'AB3', s: headerStyle2(INDIGO_LIGHT) }
  ];
  subHeaders.forEach((h, i) => { ws1[XLSX.utils.encode_cell({ r: 1, c: i })] = h; });
  
  // Data rows
  tableData.forEach((d, idx) => {
    const r = idx + 2;
    const initTot = d.initAB1 + d.initAB2 + d.initAB3;
    const entTot = d.entAB1 + d.entAB2 + d.entAB3;
    const sortTot = (d.sortAB1||0) + (d.sortAB2||0) + (d.sortAB3||0);
    const consTot = d.consAB1 + d.consAB2 + d.consAB3;
    
    const row = [
      { v: d.name, s: { font: { bold: true, sz: 10 }, alignment: { horizontal: "left" } } },
      { v: d.category, s: { font: { sz: 9, color: { rgb: "666666" } } } },
      { v: d.unit, s: { alignment: { horizontal: "center" } } },
      { v: d.price, t: 'n', s: { numFmt: "0.00", alignment: { horizontal: "right" } } },
      // Stock Initial
      { v: d.initAB1 || '', t: 'n', s: cellStyle(BLUE_LIGHT) },
      { v: d.initAB2 || '', t: 'n', s: cellStyle(BLUE_LIGHT) },
      { v: d.initAB3 || '', t: 'n', s: cellStyle(BLUE_LIGHT) },
      { v: initTot || '', t: 'n', s: totStyle(BLUE_TOT) },
      // Entrées
      { v: d.entAB1 || '', t: 'n', s: cellStyle(GREEN_LIGHT) },
      { v: d.entAB2 || '', t: 'n', s: cellStyle(GREEN_LIGHT) },
      { v: d.entAB3 || '', t: 'n', s: cellStyle(GREEN_LIGHT) },
      { v: entTot || '', t: 'n', s: totStyle(GREEN_TOT) },
      // Sorties
      { v: d.sortAB1 || '', t: 'n', s: cellStyle(PURPLE_LIGHT) },
      { v: d.sortAB2 || '', t: 'n', s: cellStyle(PURPLE_LIGHT) },
      { v: d.sortAB3 || '', t: 'n', s: cellStyle(PURPLE_LIGHT) },
      { v: sortTot || '', t: 'n', s: totStyle(PURPLE_TOT) },
      // Consommation
      { v: d.consAB1 || '', t: 'n', s: cellStyle(ORANGE_LIGHT) },
      { v: d.consAB2 || '', t: 'n', s: cellStyle(ORANGE_LIGHT) },
      { v: d.consAB3 || '', t: 'n', s: cellStyle(ORANGE_LIGHT) },
      { v: consTot || '', t: 'n', s: totStyle(ORANGE_TOT) },
      // Stock Final
      { v: d.finAB1 || '', t: 'n', s: cellStyle(INDIGO_LIGHT) },
      { v: d.finAB2 || '', t: 'n', s: cellStyle(INDIGO_LIGHT) },
      { v: d.finAB3 || '', t: 'n', s: cellStyle(INDIGO_LIGHT) }
    ];
    row.forEach((cell, i) => { ws1[XLSX.utils.encode_cell({ r, c: i })] = cell; });
  });
  
  ws1['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: tableData.length + 1, c: 22 } });
  
  ws1['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
    { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
    { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
    { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } },
    { s: { r: 0, c: 4 }, e: { r: 0, c: 7 } },
    { s: { r: 0, c: 8 }, e: { r: 0, c: 11 } },
    { s: { r: 0, c: 12 }, e: { r: 0, c: 15 } },
    { s: { r: 0, c: 16 }, e: { r: 0, c: 19 } },
    { s: { r: 0, c: 20 }, e: { r: 0, c: 22 } }
  ];
  
  ws1['!cols'] = [
    { wch: 28 }, { wch: 16 }, { wch: 8 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }
  ];
  
  XLSX.utils.book_append_sheet(wb, ws1, 'Consommation');
  
  // Sheet 2: Détails Entrées (par source)
  const data2 = [
    ['Article', 'Catégorie', 'Ferme Dest.', 'Source', 'Type', 'Quantité', 'Unité', 'Prix Unit.', 'Valeur (MAD)'],
    ...entryDetails.map(e => {
      const farmShort = e.farm?.includes('1') ? 'AB1' : e.farm?.includes('2') ? 'AB2' : 'AB3';
      const isTransfer = e.type === 'transfer-in';
      const sourceName = isTransfer 
        ? `Transfert de ${e.fromFarm?.includes('1') ? 'AB1' : e.fromFarm?.includes('2') ? 'AB2' : 'AB3'}`
        : (e.supplier || 'Magasin');
      return [
        e.product, 
        e.category, 
        farmShort, 
        sourceName,
        isTransfer ? 'Transfert' : 'Fournisseur',
        e.quantity, 
        e.unit, 
        e.price, 
        e.quantity * e.price
      ];
    })
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(data2);
  // Style header row
  if (data2.length > 0) {
    for (let c = 0; c < 9; c++) {
      const cell = ws2[XLSX.utils.encode_cell({ r: 0, c })];
      if (cell) cell.s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: GREEN } }, alignment: { horizontal: "center" } };
    }
  }
  ws2['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 10 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Détails Entrées');
  
  // Sheet 3: Détails Conso (par culture)
  const data3 = [
    ['Article', 'Catégorie', 'Ferme', 'Culture', 'Quantité', 'Unité', 'Prix Unit.', 'Valeur (MAD)'],
    ...consoDetails.map(c => {
      const farmShort = c.farm?.includes('1') ? 'AB1' : c.farm?.includes('2') ? 'AB2' : 'AB3';
      return [
        c.product, 
        c.category, 
        farmShort, 
        c.culture || '-', 
        c.quantity, 
        c.unit, 
        c.price, 
        c.quantity * c.price
      ];
    })
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(data3);
  // Style header row
  if (data3.length > 0) {
    for (let c = 0; c < 8; c++) {
      const cell = ws3[XLSX.utils.encode_cell({ r: 0, c })];
      if (cell) cell.s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: ORANGE } }, alignment: { horizontal: "center" } };
    }
  }
  ws3['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Détails Conso');
  
  XLSX.writeFile(wb, `consommation-fermes-${month}.xlsx`);
};

// Generate unique ID
export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Get today's date
export const today = () => new Date().toISOString().split('T')[0];

// Get month index for season
export const getMonthIdx = (date) => {
  const d = new Date(date);
  const month = d.getMonth();
  const mapping = { 8: 0, 9: 1, 10: 2, 11: 3, 0: 4, 1: 5, 2: 6, 3: 7, 4: 8, 5: 9, 6: 10, 7: 11 };
  return mapping[month] ?? 0;
};

// Deep clone
export const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

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

// Read file
export const readFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

// Debounce
export const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};
