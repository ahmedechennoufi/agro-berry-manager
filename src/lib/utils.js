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
  
  // Row 1: Main headers (now with 25 columns)
  const mainHeaders = [
    { v: 'Article', s: headerStyle1("6B7280") },
    { v: 'Cat.', s: headerStyle1("6B7280") },
    { v: 'Unité', s: headerStyle1("6B7280") },
    { v: 'Prix', s: headerStyle1("6B7280") },
    { v: 'STOCK INITIAL', s: headerStyle1(BLUE) }, { v: '', s: headerStyle1(BLUE) }, { v: '', s: headerStyle1(BLUE) }, { v: '', s: headerStyle1(BLUE) },
    { v: 'ENTRÉES', s: headerStyle1(GREEN) }, { v: '', s: headerStyle1(GREEN) }, { v: '', s: headerStyle1(GREEN) }, { v: '', s: headerStyle1(GREEN) }, { v: '', s: headerStyle1(GREEN) },
    { v: 'SORTIES', s: headerStyle1(PURPLE) }, { v: '', s: headerStyle1(PURPLE) }, { v: '', s: headerStyle1(PURPLE) }, { v: '', s: headerStyle1(PURPLE) },
    { v: 'CONSOMMATION', s: headerStyle1(ORANGE) }, { v: '', s: headerStyle1(ORANGE) }, { v: '', s: headerStyle1(ORANGE) }, { v: '', s: headerStyle1(ORANGE) },
    { v: 'STOCK FINAL', s: headerStyle1(INDIGO) }, { v: '', s: headerStyle1(INDIGO) }, { v: '', s: headerStyle1(INDIGO) }, { v: '', s: headerStyle1(INDIGO) }
  ];
  mainHeaders.forEach((h, i) => { ws1[XLSX.utils.encode_cell({ r: 0, c: i })] = h; });
  
  // Row 2: Sub headers
  const subHeaders = [
    { v: '', s: headerStyle2("F3F4F6") }, { v: '', s: headerStyle2("F3F4F6") }, { v: '', s: headerStyle2("F3F4F6") }, { v: '', s: headerStyle2("F3F4F6") },
    { v: 'AB1', s: headerStyle2(BLUE_LIGHT) }, { v: 'AB2', s: headerStyle2(BLUE_LIGHT) }, { v: 'AB3', s: headerStyle2(BLUE_LIGHT) }, { v: 'TOTAL', s: headerStyle2(BLUE_TOT) },
    { v: 'MAG', s: headerStyle2(GREEN_LIGHT) }, { v: 'AB1', s: headerStyle2(GREEN_LIGHT) }, { v: 'AB2', s: headerStyle2(GREEN_LIGHT) }, { v: 'AB3', s: headerStyle2(GREEN_LIGHT) }, { v: 'TOTAL', s: headerStyle2(GREEN_TOT) },
    { v: 'AB1', s: headerStyle2(PURPLE_LIGHT) }, { v: 'AB2', s: headerStyle2(PURPLE_LIGHT) }, { v: 'AB3', s: headerStyle2(PURPLE_LIGHT) }, { v: 'TOTAL', s: headerStyle2(PURPLE_TOT) },
    { v: 'AB1', s: headerStyle2(ORANGE_LIGHT) }, { v: 'AB2', s: headerStyle2(ORANGE_LIGHT) }, { v: 'AB3', s: headerStyle2(ORANGE_LIGHT) }, { v: 'TOTAL', s: headerStyle2(ORANGE_TOT) },
    { v: 'MAG', s: headerStyle2(INDIGO_LIGHT) }, { v: 'AB1', s: headerStyle2(INDIGO_LIGHT) }, { v: 'AB2', s: headerStyle2(INDIGO_LIGHT) }, { v: 'AB3', s: headerStyle2(INDIGO_LIGHT) }
  ];
  subHeaders.forEach((h, i) => { ws1[XLSX.utils.encode_cell({ r: 1, c: i })] = h; });
  
  // Data rows
  tableData.forEach((d, idx) => {
    const r = idx + 2;
    const initTot = d.initAB1 + d.initAB2 + d.initAB3;
    const entTot = d.entMAG || 0;
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
      { v: d.entMAG || '', t: 'n', s: cellStyle(GREEN_LIGHT) },
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
      { v: d.stockMAG || '', t: 'n', s: cellStyle(INDIGO_LIGHT) },
      { v: d.finAB1 || '', t: 'n', s: cellStyle(INDIGO_LIGHT) },
      { v: d.finAB2 || '', t: 'n', s: cellStyle(INDIGO_LIGHT) },
      { v: d.finAB3 || '', t: 'n', s: cellStyle(INDIGO_LIGHT) }
    ];
    row.forEach((cell, i) => { ws1[XLSX.utils.encode_cell({ r, c: i })] = cell; });
  });
  
  ws1['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: tableData.length + 1, c: 24 } });
  
  ws1['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
    { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
    { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
    { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } },
    { s: { r: 0, c: 4 }, e: { r: 0, c: 7 } },
    { s: { r: 0, c: 8 }, e: { r: 0, c: 12 } },
    { s: { r: 0, c: 13 }, e: { r: 0, c: 16 } },
    { s: { r: 0, c: 17 }, e: { r: 0, c: 20 } },
    { s: { r: 0, c: 21 }, e: { r: 0, c: 24 } }
  ];
  
  ws1['!cols'] = [
    { wch: 28 }, { wch: 16 }, { wch: 8 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
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

// Export inventaire stylé
export const downloadStyledInventoryExcel = async (data, monthName, totals) => {
  const XLSX = await import('xlsx-js-style');
  const wb = XLSX.utils.book_new();
  const ws = {};
  
  // Styles
  const titleStyle = {
    font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "22C55E" } },
    alignment: { horizontal: "center", vertical: "center" }
  };
  
  const headerStyle = {
    font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "3B82F6" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: { top: {style:"thin"}, bottom: {style:"thin"}, left: {style:"thin"}, right: {style:"thin"} }
  };
  
  const subHeaderStyle = (color) => ({
    font: { bold: true, sz: 10, color: { rgb: "374151" } },
    fill: { fgColor: { rgb: color } },
    alignment: { horizontal: "center", vertical: "center" },
    border: { top: {style:"thin"}, bottom: {style:"thin"}, left: {style:"thin"}, right: {style:"thin"} }
  });
  
  const cellStyle = {
    font: { sz: 10 },
    alignment: { horizontal: "right" },
    border: { top: {style:"thin", color:{rgb:"E5E7EB"}}, bottom: {style:"thin", color:{rgb:"E5E7EB"}}, left: {style:"thin", color:{rgb:"E5E7EB"}}, right: {style:"thin", color:{rgb:"E5E7EB"}} }
  };
  
  const cellStyleName = {
    font: { sz: 10, bold: true },
    alignment: { horizontal: "left" },
    border: { top: {style:"thin", color:{rgb:"E5E7EB"}}, bottom: {style:"thin", color:{rgb:"E5E7EB"}}, left: {style:"thin", color:{rgb:"E5E7EB"}}, right: {style:"thin", color:{rgb:"E5E7EB"}} }
  };
  
  const totalRowStyle = {
    font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "22C55E" } },
    alignment: { horizontal: "right" },
    border: { top: {style:"medium"}, bottom: {style:"medium"}, left: {style:"thin"}, right: {style:"thin"} }
  };
  
  const moneyStyle = {
    font: { sz: 10, color: { rgb: "059669" } },
    alignment: { horizontal: "right" },
    numFmt: "#,##0",
    border: { top: {style:"thin", color:{rgb:"E5E7EB"}}, bottom: {style:"thin", color:{rgb:"E5E7EB"}}, left: {style:"thin", color:{rgb:"E5E7EB"}}, right: {style:"thin", color:{rgb:"E5E7EB"}} }
  };
  
  // Row 0: Title
  ws['A1'] = { v: `📋 INVENTAIRE - ${monthName}`, s: titleStyle };
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
  
  // Row 1: Date
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  ws['A2'] = { v: `Exporté le ${dateStr}`, s: { font: { sz: 9, italic: true, color: { rgb: "6B7280" } }, alignment: { horizontal: "left" } } };
  
  // Row 3: Headers
  const headers = ['PRODUIT', 'UNITÉ', 'AGB 1', 'AGB 2', 'AGB 3', 'TOTAL', 'PRIX UNIT.', 'VALEUR (MAD)'];
  const headerColors = ['E5E7EB', 'E5E7EB', 'DBEAFE', 'D1FAE5', 'F3E8FF', 'FEF3C7', 'E5E7EB', 'D1FAE5'];
  headers.forEach((h, i) => {
    ws[XLSX.utils.encode_cell({ r: 3, c: i })] = { v: h, s: subHeaderStyle(headerColors[i]) };
  });
  
  // Data rows
  data.forEach((p, idx) => {
    const r = idx + 4;
    ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: p.Produit || p.name, s: cellStyleName };
    ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: p.Unité || p.unit, s: { ...cellStyle, alignment: { horizontal: "center" } } };
    ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: p['AGB 1'] || p.AB1 || 0, t: 'n', s: cellStyle };
    ws[XLSX.utils.encode_cell({ r, c: 3 })] = { v: p['AGB 2'] || p.AB2 || 0, t: 'n', s: cellStyle };
    ws[XLSX.utils.encode_cell({ r, c: 4 })] = { v: p['AGB 3'] || p.AB3 || 0, t: 'n', s: cellStyle };
    ws[XLSX.utils.encode_cell({ r, c: 5 })] = { v: p.Total || p.total || 0, t: 'n', s: { ...cellStyle, font: { sz: 10, bold: true } } };
    ws[XLSX.utils.encode_cell({ r, c: 6 })] = { v: p['Prix Unit.'] || p.price || 0, t: 'n', s: cellStyle };
    ws[XLSX.utils.encode_cell({ r, c: 7 })] = { v: p.Valeur || p.value || 0, t: 'n', s: moneyStyle };
  });
  
  // Total row
  const totalRow = data.length + 4;
  ws[XLSX.utils.encode_cell({ r: totalRow, c: 0 })] = { v: `TOTAL (${data.length} produits)`, s: { ...totalRowStyle, alignment: { horizontal: "left" } } };
  ws[XLSX.utils.encode_cell({ r: totalRow, c: 1 })] = { v: '', s: totalRowStyle };
  ws[XLSX.utils.encode_cell({ r: totalRow, c: 2 })] = { v: data.reduce((s, p) => s + (p['AGB 1'] || p.AB1 || 0), 0), t: 'n', s: totalRowStyle };
  ws[XLSX.utils.encode_cell({ r: totalRow, c: 3 })] = { v: data.reduce((s, p) => s + (p['AGB 2'] || p.AB2 || 0), 0), t: 'n', s: totalRowStyle };
  ws[XLSX.utils.encode_cell({ r: totalRow, c: 4 })] = { v: data.reduce((s, p) => s + (p['AGB 3'] || p.AB3 || 0), 0), t: 'n', s: totalRowStyle };
  ws[XLSX.utils.encode_cell({ r: totalRow, c: 5 })] = { v: totals?.totalQty || data.reduce((s, p) => s + (p.Total || p.total || 0), 0), t: 'n', s: totalRowStyle };
  ws[XLSX.utils.encode_cell({ r: totalRow, c: 6 })] = { v: '', s: totalRowStyle };
  ws[XLSX.utils.encode_cell({ r: totalRow, c: 7 })] = { v: totals?.totalValue || data.reduce((s, p) => s + (p.Valeur || p.value || 0), 0), t: 'n', s: { ...totalRowStyle, numFmt: "#,##0" } };
  
  // Set range
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totalRow, c: 7 } });
  
  // Column widths
  ws['!cols'] = [
    { wch: 30 },  // Produit
    { wch: 8 },   // Unité
    { wch: 12 },  // AGB 1
    { wch: 12 },  // AGB 2
    { wch: 12 },  // AGB 3
    { wch: 12 },  // Total
    { wch: 12 },  // Prix Unit
    { wch: 15 }   // Valeur
  ];
  
  // Row heights
  ws['!rows'] = [{ hpt: 30 }, { hpt: 18 }, { hpt: 10 }, { hpt: 22 }];
  
  XLSX.utils.book_append_sheet(wb, ws, 'Inventaire');
  XLSX.writeFile(wb, `inventaire-${monthName.replace(/\s+/g, '-')}.xlsx`);
};

// === EXPORT INVENTAIRE PHYSIQUE (Comparaison) ===
export const downloadPhysicalInventoryExcel = async (comparisonData, farmName, inventoryDate, stats) => {
  const XLSX = await import('xlsx-js-style');
  const wb = XLSX.utils.book_new();
  const ws = {};

  // === STYLES ===
  const titleStyle = {
    font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "22C55E" } },
    alignment: { horizontal: "center", vertical: "center" }
  };

  const subtitleStyle = {
    font: { sz: 10, italic: true, color: { rgb: "6B7280" } },
    alignment: { horizontal: "left" }
  };

  const statLabelStyle = {
    font: { bold: true, sz: 10, color: { rgb: "374151" } },
    fill: { fgColor: { rgb: "F3F4F6" } },
    alignment: { horizontal: "left" },
    border: { top: {style:"thin"}, bottom: {style:"thin"}, left: {style:"thin"}, right: {style:"thin"} }
  };

  const statValueStyle = (color) => ({
    font: { bold: true, sz: 11, color: { rgb: color } },
    fill: { fgColor: { rgb: "F3F4F6" } },
    alignment: { horizontal: "center" },
    border: { top: {style:"thin"}, bottom: {style:"thin"}, left: {style:"thin"}, right: {style:"thin"} }
  });

  const headerStyle = (color) => ({
    font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: color } },
    alignment: { horizontal: "center", vertical: "center" },
    border: { top: {style:"thin"}, bottom: {style:"thin"}, left: {style:"thin"}, right: {style:"thin"} }
  });

  const cellStyle = {
    font: { sz: 10 },
    alignment: { horizontal: "right" },
    border: { top: {style:"thin", color:{rgb:"E5E7EB"}}, bottom: {style:"thin", color:{rgb:"E5E7EB"}}, left: {style:"thin", color:{rgb:"E5E7EB"}}, right: {style:"thin", color:{rgb:"E5E7EB"}} }
  };

  const cellStyleName = {
    font: { sz: 10, bold: true },
    alignment: { horizontal: "left" },
    border: { top: {style:"thin", color:{rgb:"E5E7EB"}}, bottom: {style:"thin", color:{rgb:"E5E7EB"}}, left: {style:"thin", color:{rgb:"E5E7EB"}}, right: {style:"thin", color:{rgb:"E5E7EB"}} }
  };

  const cellCenter = {
    font: { sz: 10 },
    alignment: { horizontal: "center" },
    border: { top: {style:"thin", color:{rgb:"E5E7EB"}}, bottom: {style:"thin", color:{rgb:"E5E7EB"}}, left: {style:"thin", color:{rgb:"E5E7EB"}}, right: {style:"thin", color:{rgb:"E5E7EB"}} }
  };

  const diffStyleNeg = {
    font: { sz: 10, bold: true, color: { rgb: "DC2626" } },
    alignment: { horizontal: "right" },
    border: { top: {style:"thin", color:{rgb:"E5E7EB"}}, bottom: {style:"thin", color:{rgb:"E5E7EB"}}, left: {style:"thin", color:{rgb:"E5E7EB"}}, right: {style:"thin", color:{rgb:"E5E7EB"}} }
  };

  const diffStylePos = {
    font: { sz: 10, bold: true, color: { rgb: "2563EB" } },
    alignment: { horizontal: "right" },
    border: { top: {style:"thin", color:{rgb:"E5E7EB"}}, bottom: {style:"thin", color:{rgb:"E5E7EB"}}, left: {style:"thin", color:{rgb:"E5E7EB"}}, right: {style:"thin", color:{rgb:"E5E7EB"}} }
  };

  const diffStyleOk = {
    font: { sz: 10, bold: true, color: { rgb: "059669" } },
    alignment: { horizontal: "right" },
    border: { top: {style:"thin", color:{rgb:"E5E7EB"}}, bottom: {style:"thin", color:{rgb:"E5E7EB"}}, left: {style:"thin", color:{rgb:"E5E7EB"}}, right: {style:"thin", color:{rgb:"E5E7EB"}} }
  };

  const statusStyle = (status) => {
    const colors = {
      ok: { bg: "D1FAE5", fg: "059669" },
      manquant: { bg: "FEE2E2", fg: "DC2626" },
      excedent: { bg: "DBEAFE", fg: "2563EB" },
      pending: { bg: "F3F4F6", fg: "9CA3AF" }
    };
    const c = colors[status] || colors.pending;
    return {
      font: { bold: true, sz: 9, color: { rgb: c.fg } },
      fill: { fgColor: { rgb: c.bg } },
      alignment: { horizontal: "center" },
      border: { top: {style:"thin", color:{rgb:"E5E7EB"}}, bottom: {style:"thin", color:{rgb:"E5E7EB"}}, left: {style:"thin", color:{rgb:"E5E7EB"}}, right: {style:"thin", color:{rgb:"E5E7EB"}} }
    };
  };

  const totalRowStyle = {
    font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "22C55E" } },
    alignment: { horizontal: "right" },
    border: { top: {style:"medium"}, bottom: {style:"medium"}, left: {style:"thin"}, right: {style:"thin"} }
  };

  const totalRowStyleNeg = {
    font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "DC2626" } },
    alignment: { horizontal: "right" },
    border: { top: {style:"medium"}, bottom: {style:"medium"}, left: {style:"thin"}, right: {style:"thin"} }
  };

  // === ROW 0: Title ===
  ws['A1'] = { v: `🔍 INVENTAIRE PHYSIQUE - ${farmName}`, s: titleStyle };
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }
  ];

  // === ROW 1: Date ===
  const dateStr = inventoryDate.split('-').reverse().join('/');
  const exportDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  ws['A2'] = { v: `Date inventaire: ${dateStr} — Exporté le ${exportDate}`, s: subtitleStyle };

  // === ROW 3-4: Stats ===
  ws['A4'] = { v: 'Produits', s: statLabelStyle };
  ws['B4'] = { v: stats.total, t: 'n', s: statValueStyle("3B82F6") };
  ws['C4'] = { v: 'Saisis', s: statLabelStyle };
  ws['D4'] = { v: stats.entered, t: 'n', s: statValueStyle("7C3AED") };
  ws['E4'] = { v: 'Conformes', s: statLabelStyle };
  ws['F4'] = { v: stats.ok, t: 'n', s: statValueStyle("059669") };
  ws['G4'] = { v: 'Avec écart', s: statLabelStyle };
  ws['H4'] = { v: stats.withDiff, t: 'n', s: statValueStyle("DC2626") };

  // === ROW 6: Headers ===
  const headers = ['PRODUIT', 'UNITÉ', 'THÉORIQUE', 'PHYSIQUE', 'ÉCART', 'ÉCART %', 'VALEUR ÉCART', 'STATUT'];
  const headerColors = ['374151', '6B7280', '3B82F6', '059669', 'F59E0B', 'F59E0B', 'EF4444', '6B7280'];
  headers.forEach((h, i) => {
    ws[XLSX.utils.encode_cell({ r: 6, c: i })] = { v: h, s: headerStyle(headerColors[i]) };
  });

  // === DATA ROWS ===
  const entered = comparisonData.filter(i => i.hasPhysical);
  entered.forEach((item, idx) => {
    const r = idx + 7;
    const getDiffStyle = () => {
      if (!item.hasPhysical || item.diff === null) return cellStyle;
      if (Math.abs(item.diff) < 0.01) return diffStyleOk;
      return item.diff < 0 ? diffStyleNeg : diffStylePos;
    };

    ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: item.name, s: cellStyleName };
    ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: item.unit, s: cellCenter };
    ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: item.theoretical, t: 'n', s: cellStyle };
    ws[XLSX.utils.encode_cell({ r, c: 3 })] = { v: item.physical ?? 0, t: 'n', s: cellStyle };
    ws[XLSX.utils.encode_cell({ r, c: 4 })] = { v: item.diff ?? 0, t: 'n', s: getDiffStyle() };
    ws[XLSX.utils.encode_cell({ r, c: 5 })] = { 
      v: item.diffPercent !== null ? `${item.diffPercent >= 0 ? '+' : ''}${Math.round(item.diffPercent * 10) / 10}%` : '—', 
      s: getDiffStyle() 
    };
    ws[XLSX.utils.encode_cell({ r, c: 6 })] = { v: item.diffValue ?? 0, t: 'n', s: getDiffStyle() };

    const statusLabels = { ok: '✅ OK', manquant: '🔻 MANQUANT', excedent: '🔺 EXCÉDENT', pending: '⏳' };
    ws[XLSX.utils.encode_cell({ r, c: 7 })] = { v: statusLabels[item.status] || '—', s: statusStyle(item.status) };
  });

  // === TOTAL ROW ===
  const totalRow = entered.length + 7;
  const totalDiff = entered.reduce((s, i) => s + (i.diff || 0), 0);
  const totalDiffValue = entered.reduce((s, i) => s + (i.diffValue || 0), 0);
  const isNeg = totalDiffValue < 0;
  const tStyle = isNeg ? totalRowStyleNeg : totalRowStyle;

  ws[XLSX.utils.encode_cell({ r: totalRow, c: 0 })] = { v: `TOTAL (${entered.length} produits)`, s: { ...tStyle, alignment: { horizontal: "left" } } };
  ws[XLSX.utils.encode_cell({ r: totalRow, c: 1 })] = { v: '', s: tStyle };
  ws[XLSX.utils.encode_cell({ r: totalRow, c: 2 })] = { v: entered.reduce((s, i) => s + i.theoretical, 0), t: 'n', s: tStyle };
  ws[XLSX.utils.encode_cell({ r: totalRow, c: 3 })] = { v: entered.reduce((s, i) => s + (i.physical || 0), 0), t: 'n', s: tStyle };
  ws[XLSX.utils.encode_cell({ r: totalRow, c: 4 })] = { v: totalDiff, t: 'n', s: tStyle };
  ws[XLSX.utils.encode_cell({ r: totalRow, c: 5 })] = { v: '', s: tStyle };
  ws[XLSX.utils.encode_cell({ r: totalRow, c: 6 })] = { v: totalDiffValue, t: 'n', s: tStyle };
  ws[XLSX.utils.encode_cell({ r: totalRow, c: 7 })] = { v: `${stats.withDiff} écarts`, s: tStyle };

  // === SET RANGE ===
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totalRow, c: 7 } });

  // === COLUMN WIDTHS ===
  ws['!cols'] = [
    { wch: 30 },  // Produit
    { wch: 8 },   // Unité
    { wch: 14 },  // Théorique
    { wch: 14 },  // Physique
    { wch: 12 },  // Écart
    { wch: 10 },  // Écart %
    { wch: 15 },  // Valeur Écart
    { wch: 16 }   // Statut
  ];

  // === ROW HEIGHTS ===
  ws['!rows'] = [{ hpt: 30 }, { hpt: 18 }, { hpt: 10 }, { hpt: 22 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Inventaire Physique');
  const safeFarmName = farmName.replace(/\s+/g, '-');
  XLSX.writeFile(wb, `inventaire-physique-${safeFarmName}-${inventoryDate}.xlsx`);
};
