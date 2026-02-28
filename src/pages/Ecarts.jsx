import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Select, Button, EmptyState, StatCard } from '../components/UI';
import { CATEGORIES } from '../lib/constants';
import { fmt, fmtMoney } from '../lib/utils';
import { getPhysicalInventories, getMovements, getConsommations } from '../lib/store';

const Ecarts = () => {
  const { products, movements, showNotif } = useApp();
  const [prevInvId, setPrevInvId] = useState('');
  const [currInvId, setCurrInvId] = useState('');
  const [filterType, setFilterType] = useState('anomaly'); // default: show anomalies
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  const inventories = useMemo(() => {
    return getPhysicalInventories().sort((a, b) => b.date.localeCompare(a.date));
  }, []);

  const prevInv = useMemo(() => inventories.find(i => i.id === prevInvId) || null, [prevInvId, inventories]);
  const currInv = useMemo(() => inventories.find(i => i.id === currInvId) || null, [currInvId, inventories]);

  // Get movements between the two inventory dates
  const periodMovements = useMemo(() => {
    if (!prevInv || !currInv) return { entries: new Set(), consos: new Set(), entryQty: {}, consoQty: {} };
    const allMovements = getMovements();
    const allConso = getConsommations();
    const farmId = currInv.farm;
    const startDate = prevInv.date;
    const endDate = currInv.date;

    const entries = new Set();
    const consos = new Set();
    const entryQty = {};
    const consoQty = {};

    // Entries = exits from magasin to this farm + transfer-in
    allMovements.forEach(m => {
      if (!m.date || m.date < startDate || m.date > endDate) return;
      if ((m.type === 'exit' || m.type === 'transfer-in') && m.farm === farmId) {
        entries.add(m.product);
        entryQty[m.product] = (entryQty[m.product] || 0) + (m.quantity || 0);
      }
      if (m.type === 'consumption' && m.farm === farmId) {
        consos.add(m.product);
        consoQty[m.product] = (consoQty[m.product] || 0) + (m.quantity || 0);
      }
    });

    allConso.forEach(c => {
      if (!c.date || c.date < startDate || c.date > endDate) return;
      if (c.farm === farmId) {
        consos.add(c.product);
        consoQty[c.product] = (consoQty[c.product] || 0) + (c.quantity || 0);
      }
    });

    return { entries, consos, entryQty, consoQty };
  }, [prevInv, currInv]);

  // Build comparison: previous physical stock vs current physical stock
  const ecartsData = useMemo(() => {
    if (!prevInv || !currInv) return [];

    // Build maps from comparison arrays (physical values)
    const prevMap = {};
    (prevInv.comparison || []).forEach(item => {
      prevMap[item.name] = {
        physical: item.physical != null ? Number(item.physical) : Number(item.theoretical) || 0,
        unit: item.unit || 'KG'
      };
    });
    // Also from raw data
    if (prevInv.data) {
      Object.entries(prevInv.data).forEach(([name, val]) => {
        if (!prevMap[name]) prevMap[name] = { physical: 0, unit: 'KG' };
        if (val !== '' && val != null) prevMap[name].physical = parseFloat(val) || 0;
      });
    }

    const currMap = {};
    (currInv.comparison || []).forEach(item => {
      currMap[item.name] = {
        physical: item.physical != null ? Number(item.physical) : Number(item.theoretical) || 0,
        unit: item.unit || 'KG'
      };
    });
    if (currInv.data) {
      Object.entries(currInv.data).forEach(([name, val]) => {
        if (!currMap[name]) currMap[name] = { physical: 0, unit: 'KG' };
        if (val !== '' && val != null) currMap[name].physical = parseFloat(val) || 0;
      });
    }

    // All products in either inventory
    const allProducts = new Set([...Object.keys(prevMap), ...Object.keys(currMap)]);
    const results = [];

    allProducts.forEach(name => {
      const prev = prevMap[name]?.physical || 0;
      const curr = currMap[name]?.physical || 0;

      // Skip products with 0 in both
      if (prev === 0 && curr === 0) return;

      const hasEntry = periodMovements.entries.has(name);
      const hasConso = periodMovements.consos.has(name);
      const entryQty = periodMovements.entryQty[name] || 0;
      const consoQty = periodMovements.consoQty[name] || 0;
      const ecart = curr - prev;
      const productInfo = products.find(p => p.name === name);
      const category = productInfo?.category || 'AUTRES';
      const price = productInfo?.price || 0;

      // Determine status
      let status = 'ok';
      if (!hasEntry && !hasConso && Math.abs(ecart) > 0.01) {
        status = 'anomaly'; // Changed without any reason
      } else if (hasEntry || hasConso) {
        status = 'actif'; // Normal: had activity
      } else if (Math.abs(ecart) <= 0.01) {
        status = 'stable'; // No activity, no change = expected
      }

      results.push({
        name, category, unit: prevMap[name]?.unit || currMap[name]?.unit || 'KG',
        price,
        prev, curr, ecart,
        hasEntry, hasConso, entryQty, consoQty,
        ecartValue: ecart * price,
        status
      });
    });

    return results;
  }, [prevInv, currInv, periodMovements, products]);

  // Filtered
  const filteredData = useMemo(() => {
    let data = ecartsData;

    if (filterType === 'anomaly') {
      data = data.filter(d => d.status === 'anomaly');
    } else if (filterType === 'actif') {
      data = data.filter(d => d.status === 'actif');
    } else if (filterType === 'stable') {
      data = data.filter(d => d.status === 'stable');
    } else if (filterType === 'decreased') {
      data = data.filter(d => d.ecart < -0.01 && !d.hasEntry && !d.hasConso);
    } else if (filterType === 'increased') {
      data = data.filter(d => d.ecart > 0.01 && !d.hasEntry && !d.hasConso);
    }

    if (search) data = data.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
    if (filterCategory !== 'ALL') data = data.filter(d => d.category === filterCategory);

    return data.sort((a, b) => {
      // Anomalies first, then by écart size
      if (a.status === 'anomaly' && b.status !== 'anomaly') return -1;
      if (a.status !== 'anomaly' && b.status === 'anomaly') return 1;
      return a.ecart - b.ecart;
    });
  }, [ecartsData, filterType, search, filterCategory]);

  // Stats
  const stats = useMemo(() => {
    if (!ecartsData.length) return null;
    const total = ecartsData.length;
    const anomaly = ecartsData.filter(d => d.status === 'anomaly').length;
    const anomalyDown = ecartsData.filter(d => d.status === 'anomaly' && d.ecart < 0).length;
    const anomalyUp = ecartsData.filter(d => d.status === 'anomaly' && d.ecart > 0).length;
    const actif = ecartsData.filter(d => d.status === 'actif').length;
    const stable = ecartsData.filter(d => d.status === 'stable').length;
    const anomalyValue = ecartsData
      .filter(d => d.status === 'anomaly')
      .reduce((s, d) => s + (d.ecartValue || 0), 0);

    return { total, anomaly, anomalyDown, anomalyUp, actif, stable, anomalyValue };
  }, [ecartsData]);

  // Export Excel
  const exportExcel = async () => {
    if (!filteredData.length) { showNotif('Aucune donnee', 'warning'); return; }
    try {
      const XLSX = (await import('xlsx-js-style')).default || await import('xlsx-js-style');
      const wb = XLSX.utils.book_new();
      const farmName = currInv.farmName || currInv.farm;

      const titleStyle = {
        font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "7C3AED" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
      const headerStyle = {
        font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "8B5CF6" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
      };
      const cl = (bg) => ({
        font: { sz: 10 }, fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: "left", vertical: "center" },
        border: { top: { style: "thin", color: { rgb: "D1D5DB" } }, bottom: { style: "thin", color: { rgb: "D1D5DB" } }, left: { style: "thin", color: { rgb: "D1D5DB" } }, right: { style: "thin", color: { rgb: "D1D5DB" } } }
      });
      const cr = (bg) => ({
        font: { sz: 10 }, fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: "right", vertical: "center" }, numFmt: "0.0",
        border: { top: { style: "thin", color: { rgb: "D1D5DB" } }, bottom: { style: "thin", color: { rgb: "D1D5DB" } }, left: { style: "thin", color: { rgb: "D1D5DB" } }, right: { style: "thin", color: { rgb: "D1D5DB" } } }
      });
      const ac = (type) => ({
        font: { bold: true, sz: 10, color: { rgb: type === 'danger' ? "991B1B" : type === 'warning' ? "9A3412" : "166534" } },
        fill: { fgColor: { rgb: type === 'danger' ? "FEE2E2" : type === 'warning' ? "FEF3C7" : "DCFCE7" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: { top: { style: "thin", color: { rgb: "D1D5DB" } }, bottom: { style: "thin", color: { rgb: "D1D5DB" } }, left: { style: "thin", color: { rgb: "D1D5DB" } }, right: { style: "thin", color: { rgb: "D1D5DB" } } }
      });
      const ts = {
        font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "581C87" } },
        alignment: { horizontal: "right", vertical: "center" }, numFmt: "0.0",
        border: { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } }
      };

      const ws = {};
      let r = 0;
      const cols = 9;

      for (let c = 0; c < cols; c++) ws[XLSX.utils.encode_cell({ r, c })] = { v: c === 0 ? 'Controle Ecarts - ' + farmName + ' (' + prevInv.date + ' vs ' + currInv.date + ')' : '', s: titleStyle };
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: cols - 1 } }];
      r += 2;

      const headers = ['Produit', 'Stock Precedent', 'Stock Actuel', 'Ecart', 'Achats', 'Consommation', 'Valeur Ecart', 'Activite', 'Statut'];
      headers.forEach((h, c) => { ws[XLSX.utils.encode_cell({ r, c })] = { v: h, s: headerStyle }; });
      r++;

      filteredData.forEach((item, idx) => {
        const bg = idx % 2 === 0 ? "FFFFFF" : "F9FAFB";
        const ecart = Number(item.ecart) || 0;

        let statusText = 'OK', statusType = 'ok';
        if (item.status === 'anomaly') {
          statusText = ecart < 0 ? 'ANOMALIE (baisse)' : 'ANOMALIE (hausse)';
          statusType = 'danger';
        } else if (item.status === 'actif') {
          statusText = 'Actif'; statusType = 'ok';
        } else {
          statusText = 'Stable'; statusType = 'ok';
        }

        ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: item.name, s: { ...cl(bg), font: { bold: true, sz: 10 } } };
        ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: Number(item.prev) || 0, t: 'n', s: cr(bg) };
        ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: Number(item.curr) || 0, t: 'n', s: cr(bg) };
        ws[XLSX.utils.encode_cell({ r, c: 3 })] = { v: ecart, t: 'n', s: { ...cr(bg), font: { bold: true, sz: 10, color: { rgb: ecart < -0.01 ? "DC2626" : ecart > 0.01 ? "16A34A" : "374151" } } } };
        ws[XLSX.utils.encode_cell({ r, c: 4 })] = { v: item.hasEntry ? Number(item.entryQty) || 0 : 0, t: 'n', s: item.hasEntry ? cr(bg) : ac('danger') };
        ws[XLSX.utils.encode_cell({ r, c: 5 })] = { v: item.hasConso ? Number(item.consoQty) || 0 : 0, t: 'n', s: item.hasConso ? cr(bg) : ac('danger') };
        ws[XLSX.utils.encode_cell({ r, c: 6 })] = { v: Number(item.ecartValue) || 0, t: 'n', s: { ...cr(bg), numFmt: '#,##0', font: { sz: 10, color: { rgb: item.ecartValue < 0 ? "DC2626" : "374151" } } } };
        ws[XLSX.utils.encode_cell({ r, c: 7 })] = { v: item.hasEntry || item.hasConso ? 'Oui' : 'Non', s: ac(item.hasEntry || item.hasConso ? 'ok' : 'danger') };
        ws[XLSX.utils.encode_cell({ r, c: 8 })] = { v: statusText, s: ac(statusType) };
        r++;
      });

      // Total
      const totPrev = filteredData.reduce((s, d) => s + (Number(d.prev) || 0), 0);
      const totCurr = filteredData.reduce((s, d) => s + (Number(d.curr) || 0), 0);
      const totVal = filteredData.reduce((s, d) => s + (Number(d.ecartValue) || 0), 0);
      ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: 'TOTAL', s: { ...ts, alignment: { horizontal: "left" } } };
      ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: totPrev, t: 'n', s: ts };
      ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: totCurr, t: 'n', s: ts };
      ws[XLSX.utils.encode_cell({ r, c: 3 })] = { v: totCurr - totPrev, t: 'n', s: ts };
      for (let c = 4; c < cols; c++) ws[XLSX.utils.encode_cell({ r, c })] = { v: c === 6 ? totVal : '', s: c === 6 ? { ...ts, numFmt: '#,##0' } : ts };

      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: cols - 1 } });
      ws['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 20 }];
      ws['!rows'] = [{ hpt: 30 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Ecarts');

      XLSX.writeFile(wb, 'Controle_Ecarts_' + farmName.replace(/\s+/g, '_') + '.xlsx');
      showNotif('Excel exporte');
    } catch (err) {
      console.error('Export error:', err);
      showNotif('Erreur export: ' + err.message, 'error');
    }
  };

  // Check same farm
  const sameFarm = prevInv && currInv && prevInv.farm === currInv.farm;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔎 Contrôle d'Écarts</h1>
          <p className="text-gray-500 text-sm mt-1">Comparer 2 inventaires physiques — détecter les écarts inexpliqués</p>
        </div>
        {filteredData.length > 0 && (
          <Button variant="secondary" onClick={exportExcel}>📥 Export Excel</Button>
        )}
      </div>

      {/* Select inventories */}
      <Card>
        {inventories.length < 2 ? (
          <div className="p-4 bg-yellow-50 rounded-xl text-sm text-yellow-700">
            ⚠️ Il faut au moins <strong>2 inventaires physiques</strong> sauvegardés pour comparer. Allez dans <strong>Inventaire Physique</strong> pour en créer.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="📅 Inventaire PRÉCÉDENT (ancien)"
              value={prevInvId}
              onChange={setPrevInvId}
              options={[
                { value: '', label: '-- Choisir --' },
                ...inventories.map(inv => ({
                  value: inv.id,
                  label: `${inv.farmName || inv.farm} — ${inv.date}`
                }))
              ]}
            />
            <Select
              label="📅 Inventaire ACTUEL (récent)"
              value={currInvId}
              onChange={setCurrInvId}
              options={[
                { value: '', label: '-- Choisir --' },
                ...inventories.map(inv => ({
                  value: inv.id,
                  label: `${inv.farmName || inv.farm} — ${inv.date}`
                }))
              ]}
            />
          </div>
        )}
        {prevInv && currInv && !sameFarm && (
          <div className="mt-3 p-3 bg-red-50 rounded-xl text-sm text-red-700">
            ⚠️ Attention : les 2 inventaires ne sont pas de la <strong>même ferme</strong> ({prevInv.farmName} vs {currInv.farmName}). Sélectionnez la même ferme.
          </div>
        )}
      </Card>

      {prevInv && currInv && sameFarm && (
        <>
          {/* Period info */}
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="font-medium text-purple-800">🏠 {currInv.farmName}</span>
              <span className="text-purple-600">📅 {prevInv.date} → {currInv.date}</span>
              <span className="text-purple-600">📋 {ecartsData.length} produits comparés</span>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Filtre"
                value={filterType}
                onChange={setFilterType}
                options={[
                  { value: 'anomaly', label: '🔴 Anomalies (ni conso, ni achat, mais écart)' },
                  { value: 'ALL', label: 'Tous les produits' },
                  { value: 'actif', label: '✅ Actifs (conso ou achat)' },
                  { value: 'stable', label: '🔵 Stables (aucun mouvement, aucun écart)' },
                  { value: 'decreased', label: '📉 Anomalie baisse' },
                  { value: 'increased', label: '📈 Anomalie hausse' }
                ]}
              />
              <Select
                label="Catégorie"
                value={filterCategory}
                onChange={setFilterCategory}
                options={[
                  { value: 'ALL', label: 'Toutes' },
                  ...CATEGORIES.map(c => ({ value: c.id, label: c.name }))
                ]}
              />
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Recherche</label>
                <input
                  type="text" value={search}
                  onChange={(e) => setSearch(e.target.value.toUpperCase())}
                  placeholder="🔍 Rechercher..."
                  className="input-field uppercase"
                />
              </div>
            </div>
          </Card>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard icon="📋" label="Total produits" value={stats.total} color="blue" />
              <StatCard icon="🔴" label="Anomalies" value={stats.anomaly} color="red" />
              <StatCard icon="📉" label="Anomalie baisse" value={stats.anomalyDown} color="red" />
              <StatCard icon="📈" label="Anomalie hausse" value={stats.anomalyUp} color="orange" />
              <StatCard icon="✅" label="Actifs (normal)" value={stats.actif} color="green" />
              <StatCard icon="🔵" label="Stables" value={stats.stable} color="blue" />
            </div>
          )}

          {/* Anomaly value alert */}
          {stats && stats.anomaly > 0 && (
            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-bold text-red-800">{stats.anomaly} produit(s) avec écart inexpliqué</p>
                  <p className="text-sm text-red-600">
                    Valeur totale des anomalies : <strong>{fmtMoney(Math.abs(stats.anomalyValue))}</strong>
                    {stats.anomalyValue < 0 ? ' (perte)' : ' (surplus)'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <Card>
            {filteredData.length === 0 ? (
              <EmptyState icon={filterType === 'anomaly' ? '✅' : '📋'} message={filterType === 'anomaly' ? 'Aucune anomalie détectée !' : 'Aucun produit trouvé'} />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th className="text-right">Stock Précédent</th>
                      <th className="text-right">Stock Actuel</th>
                      <th className="text-right">Écart</th>
                      <th className="text-center">Achats</th>
                      <th className="text-center">Consommation</th>
                      <th className="text-right">Valeur Écart</th>
                      <th className="text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, idx) => {
                      const ecart = Number(item.ecart) || 0;

                      let statusLabel, statusColor, statusIcon;
                      if (item.status === 'anomaly' && ecart < 0) {
                        statusLabel = 'Anomalie (baisse)'; statusColor = 'bg-red-100 text-red-800'; statusIcon = '🔴';
                      } else if (item.status === 'anomaly' && ecart > 0) {
                        statusLabel = 'Anomalie (hausse)'; statusColor = 'bg-orange-100 text-orange-800'; statusIcon = '🟠';
                      } else if (item.status === 'actif') {
                        statusLabel = 'Normal'; statusColor = 'bg-green-100 text-green-800'; statusIcon = '✅';
                      } else {
                        statusLabel = 'Stable'; statusColor = 'bg-blue-100 text-blue-800'; statusIcon = '🔵';
                      }

                      return (
                        <tr key={idx} className={item.status === 'anomaly' ? 'bg-red-50/50' : ''}>
                          <td>
                            <span className="font-medium text-gray-900">{item.name}</span>
                            <span className="text-xs text-gray-400 ml-2">{item.category}</span>
                          </td>
                          <td className="text-right">{fmt(item.prev)}</td>
                          <td className="text-right font-medium">{fmt(item.curr)}</td>
                          <td className="text-right">
                            {Math.abs(ecart) > 0.01 ? (
                              <span className={`font-bold ${ecart < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {ecart > 0 ? '+' : ''}{fmt(ecart)}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="text-center">
                            {item.hasEntry ? (
                              <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold">✅ {fmt(item.entryQty)}</span>
                            ) : (
                              <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-400 text-xs">Non</span>
                            )}
                          </td>
                          <td className="text-center">
                            {item.hasConso ? (
                              <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold">✅ {fmt(item.consoQty)}</span>
                            ) : (
                              <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-400 text-xs">Non</span>
                            )}
                          </td>
                          <td className="text-right">
                            {Math.abs(item.ecartValue || 0) > 0.5 ? (
                              <span className={`text-sm font-medium ${item.ecartValue < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {fmtMoney(item.ecartValue)}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                              {statusIcon} {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Legend */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Légende</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 font-medium">🔴 Anomalie (baisse)</span>
                <span className="text-gray-500">Stock a baissé sans achat ni consommation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-orange-100 text-orange-800 font-medium">🟠 Anomalie (hausse)</span>
                <span className="text-gray-500">Stock a augmenté sans achat ni consommation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium">✅ Normal</span>
                <span className="text-gray-500">Produit avec des achats ou consommations (écart justifié)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">🔵 Stable</span>
                <span className="text-gray-500">Aucun mouvement, aucun écart = attendu</span>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default Ecarts;
