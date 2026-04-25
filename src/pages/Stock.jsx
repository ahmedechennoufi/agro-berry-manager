import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Button, Input, Select, StatCard, EmptyState, Badge } from '../components/UI';
import { CATEGORIES } from '../lib/constants';
import { fmt, fmtMoney } from '../lib/utils';
import { calculateGlobalStock, getAveragePrice, getDefaultThreshold } from '../lib/store';

const Stock = () => {
  const { products, movements } = useApp();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStock, setFilterStock] = useState('ALL');
  const [sortBy, setSortBy] = useState('value');
  const [sortOrder, setSortOrder] = useState('desc');
  const threshold = getDefaultThreshold();

  const stockData = useMemo(() => {
    const globalStock = calculateGlobalStock();
    return products.map(product => {
      const stock = globalStock[product.name] || { quantity: 0, totalValue: 0 };
      const price = getAveragePrice(product.name) || 0;
      const quantity = stock.quantity || 0;
      const value = quantity * price;
      const productThreshold = product.threshold || threshold;
      let status = 'normal';
      if (quantity <= 0) status = 'epuise';
      else if (quantity <= productThreshold) status = 'bas';
      return { name: product.name, category: product.category || 'AUTRES', unit: product.unit || 'KG', quantity, price, value, status, threshold: productThreshold };
    });
  }, [products, movements, threshold]);

  const filteredStock = useMemo(() => {
    let result = stockData.filter(item => {
      const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = filterCategory === 'ALL' || item.category === filterCategory;
      const matchStock = filterStock === 'ALL' || item.status === filterStock;
      return matchSearch && matchCategory && matchStock;
    });
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortBy === 'quantity') comparison = a.quantity - b.quantity;
      else if (sortBy === 'value') comparison = a.value - b.value;
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    return result;
  }, [stockData, search, filterCategory, filterStock, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const epuiseCount = stockData.filter(i => i.status === 'epuise').length;
    const basCount = stockData.filter(i => i.status === 'bas').length;
    return {
      totalProducts: filteredStock.length,
      totalQuantity: filteredStock.reduce((s, i) => s + i.quantity, 0),
      totalValue: filteredStock.reduce((s, i) => s + i.value, 0),
      epuiseCount, basCount
    };
  }, [filteredStock, stockData]);

  const categorySummary = useMemo(() => {
    const summary = {};
    CATEGORIES.forEach(cat => {
      const items = filteredStock.filter(i => i.category === cat.id);
      summary[cat.id] = { count: items.length, value: items.reduce((s, i) => s + i.value, 0) };
    });
    return summary;
  }, [filteredStock]);

  const handleSort = (column) => {
    if (sortBy === column) setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    else { setSortBy(column); setSortOrder('desc'); }
  };

  const resetFilters = () => { setSearch(''); setFilterCategory('ALL'); setFilterStock('ALL'); };

  const handleExportExcel = async () => {
    try {
      const XLSX = (await import('xlsx-js-style')).default || await import('xlsx-js-style');
      const wb = XLSX.utils.book_new();
      const now = new Date();
      const date = now.toLocaleDateString('fr-FR');
      const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      // ========== PALETTE & STYLES ==========
      const COL_BRAND = '1d9e75';   // vert Agro Berry
      const COL_DARK = '1d1d1f';
      const COL_GRAY = '6e6e73';
      const COL_LINE = 'E5E7EB';
      const COL_ROW_ALT = 'F9FAFB';
      const COL_KPI_BG = 'F0FDF4';
      const COL_KPI_BORDER = 'BBF7D0';

      const border = { top: { style: 'thin', color: { rgb: COL_LINE } }, bottom: { style: 'thin', color: { rgb: COL_LINE } }, left: { style: 'thin', color: { rgb: COL_LINE } }, right: { style: 'thin', color: { rgb: COL_LINE } } };

      const titleStyle = { font: { name: 'Calibri', bold: true, sz: 22, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: COL_BRAND } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 } };
      const subtitleStyle = { font: { name: 'Calibri', sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: COL_BRAND } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 } };

      const kpiLabelStyle = { font: { name: 'Calibri', sz: 9, color: { rgb: COL_GRAY }, bold: true }, fill: { fgColor: { rgb: COL_KPI_BG } }, alignment: { horizontal: 'center', vertical: 'center' }, border: { top: { style: 'medium', color: { rgb: COL_KPI_BORDER } }, left: { style: 'medium', color: { rgb: COL_KPI_BORDER } }, right: { style: 'medium', color: { rgb: COL_KPI_BORDER } } } };
      const kpiValueStyle = { font: { name: 'Calibri', sz: 18, color: { rgb: COL_BRAND }, bold: true }, fill: { fgColor: { rgb: COL_KPI_BG } }, alignment: { horizontal: 'center', vertical: 'center' }, border: { left: { style: 'medium', color: { rgb: COL_KPI_BORDER } }, right: { style: 'medium', color: { rgb: COL_KPI_BORDER } }, bottom: { style: 'medium', color: { rgb: COL_KPI_BORDER } } } };

      const sectionTitle = { font: { name: 'Calibri', bold: true, sz: 12, color: { rgb: COL_DARK } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 } };

      const headerStyle = { font: { name: 'Calibri', bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: COL_DARK } }, alignment: { horizontal: 'center', vertical: 'center' }, border };

      const baseCell = { font: { name: 'Calibri', sz: 10, color: { rgb: COL_DARK } }, alignment: { vertical: 'center', indent: 1 }, border };
      const baseAlt = { ...baseCell, fill: { fgColor: { rgb: COL_ROW_ALT } } };
      const numCell = { ...baseCell, alignment: { horizontal: 'right', vertical: 'center', indent: 1 }, numFmt: '#,##0.00' };
      const numCellAlt = { ...numCell, fill: { fgColor: { rgb: COL_ROW_ALT } } };
      const moneyCell = { ...numCell, font: { name: 'Calibri', sz: 10, color: { rgb: COL_BRAND }, bold: true }, numFmt: '#,##0 "MAD"' };
      const moneyCellAlt = { ...moneyCell, fill: { fgColor: { rgb: COL_ROW_ALT } } };
      const productCell = { ...baseCell, font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COL_DARK } } };
      const productCellAlt = { ...productCell, fill: { fgColor: { rgb: COL_ROW_ALT } } };
      const centerCell = { ...baseCell, alignment: { horizontal: 'center', vertical: 'center' } };
      const centerCellAlt = { ...centerCell, fill: { fgColor: { rgb: COL_ROW_ALT } } };

      const epuiseStyle = { ...baseCell, font: { name: 'Calibri', sz: 10, color: { rgb: 'FFFFFF' }, bold: true }, fill: { fgColor: { rgb: 'DC2626' } }, alignment: { horizontal: 'center', vertical: 'center' } };
      const basStyle = { ...baseCell, font: { name: 'Calibri', sz: 10, color: { rgb: 'FFFFFF' }, bold: true }, fill: { fgColor: { rgb: 'D97706' } }, alignment: { horizontal: 'center', vertical: 'center' } };
      const okStyle = { ...baseCell, font: { name: 'Calibri', sz: 10, color: { rgb: '15803D' }, bold: true }, fill: { fgColor: { rgb: 'DCFCE7' } }, alignment: { horizontal: 'center', vertical: 'center' } };

      // Total row
      const totalLabel = { font: { name: 'Calibri', bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: COL_BRAND } }, alignment: { horizontal: 'left', vertical: 'center', indent: 1 }, border };
      const totalNum = { font: { name: 'Calibri', bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: COL_BRAND } }, alignment: { horizontal: 'right', vertical: 'center', indent: 1 }, numFmt: '#,##0.00', border };
      const totalMoney = { ...totalNum, numFmt: '#,##0 "MAD"' };

      const footerStyle = { font: { name: 'Calibri', sz: 9, italic: true, color: { rgb: COL_GRAY } }, alignment: { horizontal: 'center', vertical: 'center' } };

      // ========== BUILD WORKSHEET ==========
      const ws = {};
      const merges = [];
      const NUM_COLS = 7; // 0..6
      let r = 0;

      // --- TITLE BANNER ---
      // Row 0 : Big title
      for (let c = 0; c < NUM_COLS; c++) ws[XLSX.utils.encode_cell({ r, c })] = { v: c === 0 ? '🌱  AGRO BERRY MANAGER  —  STOCK GLOBAL' : '', s: titleStyle };
      merges.push({ s: { r, c: 0 }, e: { r, c: NUM_COLS - 1 } });
      r++;
      // Row 1 : subtitle
      for (let c = 0; c < NUM_COLS; c++) ws[XLSX.utils.encode_cell({ r, c })] = { v: c === 0 ? `Inventaire du magasin central · Généré le ${date} à ${time}` : '', s: subtitleStyle };
      merges.push({ s: { r, c: 0 }, e: { r, c: NUM_COLS - 1 } });
      r++;
      // Spacer
      r++;

      // --- KPI CARDS (3 cards spanning the columns) ---
      // Layout: cols 0-1 = Produits, cols 2-4 = Quantité, cols 5-6 = Valeur
      // Label row
      ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: '📦  PRODUITS', s: kpiLabelStyle };
      ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: '', s: kpiLabelStyle };
      ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: '📊  QUANTITÉ TOTALE', s: kpiLabelStyle };
      ws[XLSX.utils.encode_cell({ r, c: 3 })] = { v: '', s: kpiLabelStyle };
      ws[XLSX.utils.encode_cell({ r, c: 4 })] = { v: '', s: kpiLabelStyle };
      ws[XLSX.utils.encode_cell({ r, c: 5 })] = { v: '💰  VALEUR TOTALE', s: kpiLabelStyle };
      ws[XLSX.utils.encode_cell({ r, c: 6 })] = { v: '', s: kpiLabelStyle };
      merges.push({ s: { r, c: 0 }, e: { r, c: 1 } });
      merges.push({ s: { r, c: 2 }, e: { r, c: 4 } });
      merges.push({ s: { r, c: 5 }, e: { r, c: 6 } });
      r++;
      // Value row
      ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: stats.totalProducts, s: kpiValueStyle };
      ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: '', s: kpiValueStyle };
      ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: stats.totalQuantity, s: { ...kpiValueStyle, numFmt: '#,##0.00' } };
      ws[XLSX.utils.encode_cell({ r, c: 3 })] = { v: '', s: kpiValueStyle };
      ws[XLSX.utils.encode_cell({ r, c: 4 })] = { v: '', s: kpiValueStyle };
      ws[XLSX.utils.encode_cell({ r, c: 5 })] = { v: stats.totalValue, s: { ...kpiValueStyle, numFmt: '#,##0 "MAD"' } };
      ws[XLSX.utils.encode_cell({ r, c: 6 })] = { v: '', s: kpiValueStyle };
      merges.push({ s: { r, c: 0 }, e: { r, c: 1 } });
      merges.push({ s: { r, c: 2 }, e: { r, c: 4 } });
      merges.push({ s: { r, c: 5 }, e: { r, c: 6 } });
      r++;
      // Spacer
      r++;

      // --- SECTION HEADER ---
      ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: `📋  Détail des produits  (${filteredStock.length} produit${filteredStock.length > 1 ? 's' : ''})`, s: sectionTitle };
      merges.push({ s: { r, c: 0 }, e: { r, c: NUM_COLS - 1 } });
      r++;

      // --- TABLE HEADERS ---
      const headers = ['Produit', 'Catégorie', 'Unité', 'Quantité', 'Prix moyen', 'Valeur', 'Statut'];
      headers.forEach((h, c) => { ws[XLSX.utils.encode_cell({ r, c })] = { v: h, s: headerStyle }; });
      r++;

      // --- DATA ROWS (zebra striped) ---
      filteredStock.forEach((item, idx) => {
        const isAlt = idx % 2 === 1;
        ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: item.name, s: isAlt ? productCellAlt : productCell };
        ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: item.category || '—', s: isAlt ? baseAlt : baseCell };
        ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: item.unit, s: isAlt ? centerCellAlt : centerCell };
        ws[XLSX.utils.encode_cell({ r, c: 3 })] = { v: item.quantity, s: isAlt ? numCellAlt : numCell };
        ws[XLSX.utils.encode_cell({ r, c: 4 })] = { v: item.price, s: { ...(isAlt ? numCellAlt : numCell), numFmt: '#,##0.00 "MAD"' } };
        ws[XLSX.utils.encode_cell({ r, c: 5 })] = { v: item.value, s: isAlt ? moneyCellAlt : moneyCell };

        let statusLabel, statusStyle;
        if (item.status === 'epuise') { statusLabel = '🔴 Épuisé'; statusStyle = epuiseStyle; }
        else if (item.status === 'bas') { statusLabel = '🟠 Bas'; statusStyle = basStyle; }
        else { statusLabel = '🟢 OK'; statusStyle = okStyle; }
        ws[XLSX.utils.encode_cell({ r, c: 6 })] = { v: statusLabel, s: statusStyle };
        r++;
      });

      // --- TOTAL ROW ---
      ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: `TOTAL  (${filteredStock.length} produit${filteredStock.length > 1 ? 's' : ''})`, s: totalLabel };
      ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: '', s: totalLabel };
      ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: '', s: totalLabel };
      merges.push({ s: { r, c: 0 }, e: { r, c: 2 } });
      ws[XLSX.utils.encode_cell({ r, c: 3 })] = { v: stats.totalQuantity, s: totalNum };
      ws[XLSX.utils.encode_cell({ r, c: 4 })] = { v: '', s: totalLabel };
      ws[XLSX.utils.encode_cell({ r, c: 5 })] = { v: stats.totalValue, s: totalMoney };
      ws[XLSX.utils.encode_cell({ r, c: 6 })] = { v: '', s: totalLabel };
      r++;
      // Spacer
      r++;

      // --- FOOTER ---
      const breakdown = `Épuisé: ${stats.lowStock || filteredStock.filter(x => x.status === 'epuise').length}   ·   Stock bas: ${filteredStock.filter(x => x.status === 'bas').length}   ·   Normal: ${filteredStock.filter(x => x.status === 'normal').length}`;
      for (let c = 0; c < NUM_COLS; c++) ws[XLSX.utils.encode_cell({ r, c })] = { v: c === 0 ? breakdown : '', s: footerStyle };
      merges.push({ s: { r, c: 0 }, e: { r, c: NUM_COLS - 1 } });
      r++;
      for (let c = 0; c < NUM_COLS; c++) ws[XLSX.utils.encode_cell({ r, c })] = { v: c === 0 ? `Document généré automatiquement par Agro Berry Manager · ${date}` : '', s: footerStyle };
      merges.push({ s: { r, c: 0 }, e: { r, c: NUM_COLS - 1 } });
      r++;

      // ========== WORKSHEET CONFIG ==========
      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: NUM_COLS - 1 } });
      ws['!cols'] = [
        { wch: 32 }, // Produit
        { wch: 16 }, // Catégorie
        { wch: 9 },  // Unité
        { wch: 14 }, // Quantité
        { wch: 16 }, // Prix moyen
        { wch: 18 }, // Valeur
        { wch: 14 }, // Statut
      ];
      ws['!rows'] = [
        { hpt: 36 }, // Title
        { hpt: 22 }, // Subtitle
        { hpt: 10 }, // Spacer
        { hpt: 18 }, // KPI label
        { hpt: 36 }, // KPI value
        { hpt: 10 }, // Spacer
        { hpt: 22 }, // Section title
        { hpt: 24 }, // Header
      ];
      // Data rows
      for (let i = 0; i < filteredStock.length; i++) ws['!rows'].push({ hpt: 22 });
      ws['!rows'].push({ hpt: 26 }); // Total
      ws['!rows'].push({ hpt: 10 }); // Spacer
      ws['!rows'].push({ hpt: 18 }); // Footer 1
      ws['!rows'].push({ hpt: 16 }); // Footer 2

      ws['!merges'] = merges;

      // Freeze top rows so KPIs/header stay visible
      ws['!freeze'] = { xSplit: 0, ySplit: 8 };

      XLSX.utils.book_append_sheet(wb, ws, 'Stock Global');

      // Print setup
      ws['!margins'] = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };

      const filename = `Stock-Global_${now.toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error('Erreur export:', err);
      alert("Erreur lors de l'export Excel: " + err.message);
    }
  };

  const getCategoryColor = (cat) => {
    const colors = { ENGRAIS: 'green', PHYTOSANITAIRES: 'blue', ACIDES: 'orange', AUTRES: 'gray' };
    return colors[cat] || 'gray';
  };

  const getStatusBadge = (status) => {
    if (status === 'epuise') return <Badge color="red">Épuisé</Badge>;
    if (status === 'bas') return <Badge color="orange">Stock bas</Badge>;
    return <Badge color="green">OK</Badge>;
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span style={{ color: 'var(--text-3)', marginLeft: 4 }}>↕</span>;
    return <span style={{ color: 'var(--blue)', marginLeft: 4 }}>{sortOrder === 'desc' ? '↓' : '↑'}</span>;
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.3px' }}>Stock Global</h1>
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '4px 0 0' }}>Inventaire du magasin central</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" onClick={handleExportExcel} style={{ background: '#16a34a', color: '#fff', border: 'none' }}>📊 Export Excel</Button>
          <Button variant="secondary" onClick={resetFilters}>🔄 Reset</Button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard icon="📦" label="Produits" value={stats.totalProducts} color="blue" />
        <StatCard icon="📊" label="Quantité" value={fmt(stats.totalQuantity)} color="purple" />
        <StatCard icon="💰" label="Valeur" value={fmtMoney(stats.totalValue)} color="green" />
        <div onClick={() => setFilterStock(filterStock === 'epuise' ? 'ALL' : 'epuise')} style={{ cursor: 'pointer' }}>
          <StatCard icon="🔴" label="Épuisé" value={stats.epuiseCount} color="red" />
        </div>
        <div onClick={() => setFilterStock(filterStock === 'bas' ? 'ALL' : 'bas')} style={{ cursor: 'pointer' }}>
          <StatCard icon="⚠️" label="Stock bas" value={stats.basCount} color="orange" />
        </div>
      </div>

      {/* Filter Pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[{ id: 'ALL', label: 'Tous' }, { id: 'epuise', label: '🔴 Épuisé' }, { id: 'bas', label: '⚠️ Bas' }, { id: 'normal', label: '✅ Normal' }].map(f => (
          <button key={f.id} onClick={() => setFilterStock(f.id)} className={`filter-pill ${filterStock === f.id ? 'active' : ''}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Search & Category Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input placeholder="🔍 Rechercher un produit..." value={search} onChange={setSearch} uppercase={false} />
        </div>
        <Select
          value={filterCategory}
          onChange={setFilterCategory}
          options={[{ value: 'ALL', label: 'Toutes les catégories' }, ...CATEGORIES.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))]}
        />
      </div>

      {/* Category Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
        {CATEGORIES.map(cat => {
          const data = categorySummary[cat.id] || { count: 0, value: 0 };
          const isActive = filterCategory === cat.id;
          return (
            <div
              key={cat.id}
              onClick={() => setFilterCategory(isActive ? 'ALL' : cat.id)}
              className="ios-card"
              style={{
                padding: '14px 16px', textAlign: 'center', cursor: 'pointer',
                border: isActive ? '2px solid var(--blue)' : '1px solid var(--border)',
                background: isActive ? '#f0f6ff' : 'var(--surface)',
              }}
            >
              <span style={{ fontSize: 22 }}>{cat.icon}</span>
              <p style={{ fontSize: 11, color: 'var(--text-2)', margin: '4px 0 2px' }}>{cat.name}</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: isActive ? 'var(--blue)' : 'var(--text-1)', margin: 0 }}>{data.count}</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>{fmtMoney(data.value)}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="ios-card" style={{ overflow: 'hidden' }}>
        {filteredStock.length === 0 ? (
          <EmptyState icon="📦" message="Aucun produit trouvé" action={<Button onClick={resetFilters}>Réinitialiser</Button>} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Produit <SortIcon field="name" /></th>
                  <th>Catégorie</th>
                  <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('quantity')}>Quantité <SortIcon field="quantity" /></th>
                  <th style={{ textAlign: 'right' }}>Prix Moy.</th>
                  <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('value')}>Valeur <SortIcon field="value" /></th>
                  <th style={{ textAlign: 'center' }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((item, idx) => (
                  <tr key={idx} style={{ background: item.status === 'epuise' ? '#fff2f1' : item.status === 'bas' ? '#fff8f0' : 'transparent' }}>
                    <td style={{ fontWeight: 600, color: 'var(--text-1)' }}>{item.name}</td>
                    <td><Badge color={getCategoryColor(item.category)}>{item.category}</Badge></td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: item.status === 'epuise' ? 'var(--red)' : item.status === 'bas' ? 'var(--orange)' : 'var(--text-1)' }}>
                      {fmt(item.quantity)} {item.unit}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>{fmtMoney(item.price)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>{fmtMoney(item.value)}</td>
                    <td style={{ textAlign: 'center' }}>{getStatusBadge(item.status)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--surface-2)', fontWeight: 700 }}>
                  <td style={{ color: 'var(--text-1)' }}>TOTAL ({filteredStock.length} produits)</td>
                  <td></td>
                  <td style={{ textAlign: 'right', color: 'var(--text-1)' }}>{fmt(stats.totalQuantity)}</td>
                  <td></td>
                  <td style={{ textAlign: 'right', color: 'var(--green)' }}>{fmtMoney(stats.totalValue)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Stock;
