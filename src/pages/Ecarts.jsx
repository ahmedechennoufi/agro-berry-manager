import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Select, Button, EmptyState, StatCard } from '../components/UI';
import { CATEGORIES } from '../lib/constants';
import { fmt, fmtMoney } from '../lib/utils';
import { getPhysicalInventories, getMovements, getConsommations } from '../lib/store';

const Ecarts = () => {
  const { products, movements, showNotif } = useApp();
  const [selectedInvId, setSelectedInvId] = useState('');
  const [filterType, setFilterType] = useState('anomaly');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  const inventories = useMemo(() => {
    return getPhysicalInventories().sort((a, b) => b.date.localeCompare(a.date));
  }, []);

  const selectedInv = useMemo(() => {
    return inventories.find(i => i.id === selectedInvId) || null;
  }, [selectedInvId, inventories]);

  // Check which products had entries or consumption up to inventory date
  const productActivity = useMemo(() => {
    if (!selectedInv) return { entries: new Set(), consos: new Set(), entryQty: {}, consoQty: {} };
    const allMovements = getMovements();
    const allConso = getConsommations();
    const farmId = selectedInv.farm;
    const invDate = selectedInv.date;

    // Look at the month of the inventory
    const invDateObj = new Date(invDate);
    const monthStart = new Date(invDateObj.getFullYear(), invDateObj.getMonth(), 1).toISOString().split('T')[0];

    const entries = new Set();
    const consos = new Set();
    const entryQty = {};
    const consoQty = {};

    // Helper to match farm - same logic as ConsoFermes
    const farmNum = farmId.includes('1') ? '1' : farmId.includes('2') ? '2' : '3';
    const matchFarm = (movFarm) => {
      if (!movFarm) return false;
      return movFarm === farmId || movFarm.includes(farmNum);
    };

    allMovements.forEach(m => {
      if (!m.date || m.date < monthStart || m.date > invDate) return;

      // Entries to this farm = exit from magasin to farm + transfer-in
      if ((m.type === 'exit' || m.type === 'transfer-in') && matchFarm(m.farm)) {
        entries.add(m.product);
        entryQty[m.product] = (entryQty[m.product] || 0) + (m.quantity || 0);
      }
      // Consumption at this farm
      if (m.type === 'consumption' && matchFarm(m.farm)) {
        consos.add(m.product);
        consoQty[m.product] = (consoQty[m.product] || 0) + (m.quantity || 0);
      }
      // Transfer-out from this farm (also counts as activity)
      if (m.type === 'transfer-out' && matchFarm(m.farm)) {
        consos.add(m.product);
        consoQty[m.product] = (consoQty[m.product] || 0) + (m.quantity || 0);
      }
    });

    allConso.forEach(c => {
      if (!c.date || c.date < monthStart || c.date > invDate) return;
      if (matchFarm(c.farm)) {
        consos.add(c.product);
        consoQty[c.product] = (consoQty[c.product] || 0) + (c.quantity || 0);
      }
    });

    return { entries, consos, entryQty, consoQty };
  }, [selectedInv]);

  // Build data: theoretical vs physical + activity info
  const ecartsData = useMemo(() => {
    if (!selectedInv || !selectedInv.comparison) return [];

    return selectedInv.comparison.map(item => {
      const hasEntry = productActivity.entries.has(item.name);
      const hasConso = productActivity.consos.has(item.name);
      const entryQty = productActivity.entryQty[item.name] || 0;
      const consoQty = productActivity.consoQty[item.name] || 0;
      const productInfo = products.find(p => p.name === item.name);
      const category = productInfo?.category || 'AUTRES';
      const ecart = item.diff || 0;
      const price = productInfo?.price || 0;

      let status = 'ok';
      if (!hasEntry && !hasConso && Math.abs(ecart) > 0.01) {
        status = 'anomaly';
      } else if (hasEntry || hasConso) {
        status = 'actif';
      } else if (Math.abs(ecart) <= 0.01) {
        status = 'stable';
      }

      return {
        ...item,
        category,
        hasEntry, hasConso, entryQty, consoQty,
        ecart,
        ecartValue: item.diffValue || (ecart * price),
        status
      };
    });
  }, [selectedInv, productActivity, products]);

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
      data = data.filter(d => d.ecart < -0.01 && d.status === 'anomaly');
    } else if (filterType === 'increased') {
      data = data.filter(d => d.ecart > 0.01 && d.status === 'anomaly');
    }

    if (search) data = data.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
    if (filterCategory !== 'ALL') data = data.filter(d => d.category === filterCategory);

    return data.sort((a, b) => {
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
      const farmName = selectedInv.farmName || selectedInv.farm;

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
      const cr_ = (bg) => ({
        font: { sz: 10 }, fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: "right", vertical: "center" }, numFmt: "0.00",
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
        alignment: { horizontal: "right", vertical: "center" }, numFmt: "0.00",
        border: { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } }
      };

      const ws = {};
      let r = 0;
      const cols = 9;

      for (let c = 0; c < cols; c++) ws[XLSX.utils.encode_cell({ r, c })] = { v: c === 0 ? 'Controle Ecarts - ' + farmName + ' - ' + selectedInv.date : '', s: titleStyle };
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: cols - 1 } }];
      r += 2;

      const headers = ['Produit', 'Stock Theorique', 'Inventaire Physique', 'Ecart', 'Ecart %', 'Achats', 'Consommation', 'Valeur Ecart', 'Statut'];
      headers.forEach((h, c) => { ws[XLSX.utils.encode_cell({ r, c })] = { v: h, s: headerStyle }; });
      r++;

      filteredData.forEach((item, idx) => {
        const bg = idx % 2 === 0 ? "FFFFFF" : "F9FAFB";
        const ecart = Number(item.ecart) || 0;
        const ecartPct = item.diffPercent != null ? Number(item.diffPercent) : 0;

        let statusText = 'OK', statusType = 'ok';
        if (item.status === 'anomaly') {
          statusText = ecart < 0 ? 'ANOMALIE (baisse)' : 'ANOMALIE (hausse)';
          statusType = 'danger';
        } else if (item.status === 'actif') {
          statusText = 'Normal (actif)'; statusType = 'ok';
        } else {
          statusText = 'Stable'; statusType = 'ok';
        }

        ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: item.name, s: { ...cl(bg), font: { bold: true, sz: 10 } } };
        ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: Number(item.theoretical) || 0, t: 'n', s: cr_(bg) };
        ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: Number(item.physical) || 0, t: 'n', s: cr_(bg) };
        ws[XLSX.utils.encode_cell({ r, c: 3 })] = { v: ecart, t: 'n', s: { ...cr_(bg), font: { bold: true, sz: 10, color: { rgb: ecart < -0.01 ? "DC2626" : ecart > 0.01 ? "16A34A" : "374151" } } } };
        ws[XLSX.utils.encode_cell({ r, c: 4 })] = { v: ecartPct !== 0 ? Math.round(ecartPct) + '%' : '-', s: cr_(bg) };
        ws[XLSX.utils.encode_cell({ r, c: 5 })] = { v: item.hasEntry ? Number(item.entryQty) || 0 : 0, t: 'n', s: item.hasEntry ? cr_(bg) : ac('danger') };
        ws[XLSX.utils.encode_cell({ r, c: 6 })] = { v: item.hasConso ? Number(item.consoQty) || 0 : 0, t: 'n', s: item.hasConso ? cr_(bg) : ac('danger') };
        ws[XLSX.utils.encode_cell({ r, c: 7 })] = { v: Number(item.ecartValue) || 0, t: 'n', s: { ...cr_(bg), numFmt: '#,##0', font: { sz: 10, color: { rgb: item.ecartValue < 0 ? "DC2626" : "374151" } } } };
        ws[XLSX.utils.encode_cell({ r, c: 8 })] = { v: statusText, s: ac(statusType) };
        r++;
      });

      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: cols - 1 } });
      ws['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 20 }];
      ws['!rows'] = [{ hpt: 30 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Ecarts');

      XLSX.writeFile(wb, 'Controle_Ecarts_' + farmName.replace(/\s+/g, '_') + '_' + selectedInv.date + '.xlsx');
      showNotif('Excel exporte');
    } catch (err) {
      console.error('Export error:', err);
      showNotif('Erreur export: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔎 Contrôle d'Écarts</h1>
          <p className="text-gray-500 text-sm mt-1">Théorique vs Physique — produits sans achat ni conso mais avec écart</p>
        </div>
        {filteredData.length > 0 && (
          <Button variant="secondary" onClick={exportExcel}>📥 Export Excel</Button>
        )}
      </div>

      {/* Select Inventory */}
      <Card>
        {inventories.length === 0 ? (
          <div className="p-4 bg-yellow-50 rounded-xl text-sm text-yellow-700">
            ⚠️ Aucun inventaire physique sauvegardé. Allez dans <strong>Inventaire Physique</strong> pour en créer un d'abord.
          </div>
        ) : (
          <Select
            label="📋 Sélectionner un inventaire physique"
            value={selectedInvId}
            onChange={setSelectedInvId}
            options={[
              { value: '', label: '-- Choisir un inventaire --' },
              ...inventories.map(inv => ({
                value: inv.id,
                label: `${inv.farmName || inv.farm} — ${inv.date} (${inv.stats?.entered || 0} produits)`
              }))
            ]}
          />
        )}
      </Card>

      {selectedInv && (
        <>
          {/* Info */}
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="font-medium text-purple-800">🏠 {selectedInv.farmName}</span>
              <span className="text-purple-600">📅 {selectedInv.date}</span>
              <span className="text-purple-600">📋 {selectedInv.stats?.entered || 0} produits comptés</span>
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
                  { value: 'anomaly', label: '🔴 Anomalies (sans achat, sans conso, avec écart)' },
                  { value: 'ALL', label: 'Tous les produits' },
                  { value: 'actif', label: '✅ Actifs (avec achat ou conso)' },
                  { value: 'stable', label: '🔵 Stables (pas d\'écart)' },
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
              <StatCard icon="📋" label="Total" value={stats.total} color="blue" />
              <StatCard icon="🔴" label="Anomalies" value={stats.anomaly} color="red" />
              <StatCard icon="📉" label="Anomalie baisse" value={stats.anomalyDown} color="red" />
              <StatCard icon="📈" label="Anomalie hausse" value={stats.anomalyUp} color="orange" />
              <StatCard icon="✅" label="Actifs (normal)" value={stats.actif} color="green" />
              <StatCard icon="🔵" label="Stables" value={stats.stable} color="blue" />
            </div>
          )}

          {/* Alert */}
          {stats && stats.anomaly > 0 && (
            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-bold text-red-800">{stats.anomaly} produit(s) avec écart inexpliqué</p>
                  <p className="text-sm text-red-600">
                    Pas d'achat, pas de consommation, mais le stock a changé. Valeur : <strong>{fmtMoney(Math.abs(stats.anomalyValue))}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {stats && stats.anomaly === 0 && filterType === 'anomaly' && (
            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <p className="font-bold text-green-800">Aucune anomalie ! Tous les écarts sont justifiés par des achats ou consommations.</p>
              </div>
            </div>
          )}

          {/* Table */}
          <Card>
            {filteredData.length === 0 ? (
              <EmptyState icon={filterType === 'anomaly' ? '✅' : '📋'} message={filterType === 'anomaly' ? 'Aucune anomalie détectée !' : 'Aucun produit trouvé'} />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th className="text-right">Théorique</th>
                      <th className="text-right">Physique</th>
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
                      const ecartPct = item.diffPercent != null ? Number(item.diffPercent) : null;

                      let statusLabel, statusColor, statusIcon;
                      if (item.status === 'anomaly' && ecart < 0) {
                        statusLabel = 'Anomalie ↓'; statusColor = 'bg-red-100 text-red-800'; statusIcon = '🔴';
                      } else if (item.status === 'anomaly' && ecart > 0) {
                        statusLabel = 'Anomalie ↑'; statusColor = 'bg-orange-100 text-orange-800'; statusIcon = '🟠';
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
                          <td className="text-right">{fmt(item.theoretical)}</td>
                          <td className="text-right font-medium">{fmt(item.physical)}</td>
                          <td className="text-right">
                            {Math.abs(ecart) > 0.01 ? (
                              <span className={`font-bold ${ecart < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {ecart > 0 ? '+' : ''}{fmt(ecart)}
                                {ecartPct != null && Math.abs(ecartPct) > 0.1 && (
                                  <span className="text-xs ml-1">({Math.round(ecartPct)}%)</span>
                                )}
                              </span>
                            ) : <span style={{ color: "var(--text-3)" }}>—</span>}
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
                            ) : <span style={{ color: "var(--text-3)" }}>—</span>}
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
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 font-medium">🔴 Anomalie ↓</span>
                <span className="text-gray-500">Écart négatif, pas d'achat ni consommation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-orange-100 text-orange-800 font-medium">🟠 Anomalie ↑</span>
                <span className="text-gray-500">Écart positif, pas d'achat ni consommation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium">✅ Normal</span>
                <span className="text-gray-500">Écart justifié par achat ou consommation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">🔵 Stable</span>
                <span className="text-gray-500">Pas de mouvement, pas d'écart</span>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default Ecarts;
