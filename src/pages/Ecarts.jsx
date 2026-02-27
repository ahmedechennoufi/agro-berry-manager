import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Select, Button, EmptyState, StatCard, Badge } from '../components/UI';
import { CATEGORIES } from '../lib/constants';
import { fmt, fmtMoney } from '../lib/utils';
import { getPhysicalInventories, getMovements, getConsommations } from '../lib/store';

const Ecarts = () => {
  const { products, movements, showNotif } = useApp();
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Load all saved physical inventories
  const inventories = useMemo(() => {
    return getPhysicalInventories().sort((a, b) => b.date.localeCompare(a.date));
  }, []);

  // Selected inventory
  const selectedInventory = useMemo(() => {
    if (!selectedInventoryId) return null;
    return inventories.find(inv => inv.id === selectedInventoryId) || null;
  }, [selectedInventoryId, inventories]);

  // Get products that had consumption in the period
  const consoProducts = useMemo(() => {
    if (!selectedInventory) return new Set();
    const allMovements = getMovements();
    const allConso = getConsommations();
    const farmId = selectedInventory.farm;
    const invDate = selectedInventory.date;

    const invDateObj = new Date(invDate);
    const monthStart = new Date(invDateObj.getFullYear(), invDateObj.getMonth(), 1).toISOString().split('T')[0];

    const consumedProducts = new Set();

    allMovements
      .filter(m => m.type === 'consumption' && m.farm === farmId && m.date >= monthStart && m.date <= invDate)
      .forEach(m => consumedProducts.add(m.product));

    allConso
      .filter(c => c.farm === farmId && c.date >= monthStart && c.date <= invDate)
      .forEach(c => consumedProducts.add(c.product));

    return consumedProducts;
  }, [selectedInventory]);

  // Build comparison data
  const ecartsData = useMemo(() => {
    if (!selectedInventory || !selectedInventory.comparison) return [];

    return selectedInventory.comparison.map(item => {
      const hasConso = consoProducts.has(item.name);
      const productInfo = products.find(p => p.name === item.name);
      const category = productInfo?.category || 'AUTRES';

      return {
        ...item,
        category,
        hasConso,
        ecart: item.diff || 0,
        ecartValue: item.diffValue || 0
      };
    });
  }, [selectedInventory, consoProducts, products]);

  // Filtered data
  const filteredData = useMemo(() => {
    let data = ecartsData;

    if (filterType === 'ecart') {
      data = data.filter(d => Math.abs(d.ecart) > 0.01);
    } else if (filterType === 'manquant') {
      data = data.filter(d => d.ecart < -0.01);
    } else if (filterType === 'excedent') {
      data = data.filter(d => d.ecart > 0.01);
    } else if (filterType === 'no-conso') {
      data = data.filter(d => !d.hasConso);
    } else if (filterType === 'manquant-no-conso') {
      data = data.filter(d => d.ecart < -0.01 && !d.hasConso);
    }

    if (search) {
      data = data.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
    }

    if (filterCategory !== 'ALL') {
      data = data.filter(d => d.category === filterCategory);
    }

    return data.sort((a, b) => a.ecart - b.ecart);
  }, [ecartsData, filterType, search, filterCategory]);

  // Stats
  const stats = useMemo(() => {
    if (!ecartsData.length) return null;
    const total = ecartsData.length;
    const withEcart = ecartsData.filter(d => Math.abs(d.ecart) > 0.01).length;
    const manquant = ecartsData.filter(d => d.ecart < -0.01).length;
    const excedent = ecartsData.filter(d => d.ecart > 0.01).length;
    const ok = ecartsData.filter(d => Math.abs(d.ecart) <= 0.01).length;
    const noConso = ecartsData.filter(d => !d.hasConso).length;
    const manquantNoConso = ecartsData.filter(d => d.ecart < -0.01 && !d.hasConso).length;
    const totalManquantValue = ecartsData.filter(d => d.ecart < -0.01).reduce((s, d) => s + (d.ecartValue || 0), 0);

    return { total, withEcart, manquant, excedent, ok, noConso, manquantNoConso, totalManquantValue };
  }, [ecartsData]);

  // Export Excel
  const exportExcel = async () => {
    if (!selectedInventory || !filteredData.length) {
      showNotif('Aucune donnee a exporter', 'warning');
      return;
    }
    try {
      const XLSX = (await import('xlsx-js-style')).default || await import('xlsx-js-style');
      const wb = XLSX.utils.book_new();
      const farmName = selectedInventory.farmName || selectedInventory.farm;
      const invDate = selectedInventory.date;

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
      const cellLeft = (bg) => ({
        font: { sz: 10 }, fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: "left", vertical: "center" },
        border: { top: { style: "thin", color: { rgb: "D1D5DB" } }, bottom: { style: "thin", color: { rgb: "D1D5DB" } }, left: { style: "thin", color: { rgb: "D1D5DB" } }, right: { style: "thin", color: { rgb: "D1D5DB" } } }
      });
      const cellRight = (bg) => ({
        font: { sz: 10 }, fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: "right", vertical: "center" }, numFmt: "0.0",
        border: { top: { style: "thin", color: { rgb: "D1D5DB" } }, bottom: { style: "thin", color: { rgb: "D1D5DB" } }, left: { style: "thin", color: { rgb: "D1D5DB" } }, right: { style: "thin", color: { rgb: "D1D5DB" } } }
      });
      const alertCell = (type) => ({
        font: { bold: true, sz: 10, color: { rgb: type === 'danger' ? "991B1B" : type === 'warning' ? "9A3412" : "166534" } },
        fill: { fgColor: { rgb: type === 'danger' ? "FEE2E2" : type === 'warning' ? "FEF3C7" : "DCFCE7" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: { top: { style: "thin", color: { rgb: "D1D5DB" } }, bottom: { style: "thin", color: { rgb: "D1D5DB" } }, left: { style: "thin", color: { rgb: "D1D5DB" } }, right: { style: "thin", color: { rgb: "D1D5DB" } } }
      });
      const totalStyle = {
        font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "581C87" } },
        alignment: { horizontal: "right", vertical: "center" }, numFmt: "0.0",
        border: { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } }
      };

      const ws = {};
      let r = 0;
      const cols = 9;

      for (let c = 0; c < cols; c++) ws[XLSX.utils.encode_cell({ r, c })] = { v: c === 0 ? 'Controle Ecarts - ' + farmName + ' - ' + invDate : '', s: titleStyle };
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: cols - 1 } }];
      r += 2;

      const headers = ['Produit', 'Categorie', 'Stock Theorique', 'Inventaire Physique', 'Ecart', 'Ecart %', 'Valeur Ecart', 'Consommation', 'Statut'];
      headers.forEach((h, c) => { ws[XLSX.utils.encode_cell({ r, c })] = { v: h, s: headerStyle }; });
      r++;

      filteredData.forEach((item, idx) => {
        const bg = idx % 2 === 0 ? "FFFFFF" : "F9FAFB";
        const ecart = Number(item.ecart) || 0;
        const ecartPct = item.diffPercent != null ? Number(item.diffPercent) : 0;
        const ecartVal = Number(item.ecartValue) || 0;

        let statusText = 'OK', statusType = 'ok';
        if (ecart < -0.01 && !item.hasConso) { statusText = 'Manquant sans conso'; statusType = 'danger'; }
        else if (ecart < -0.01) { statusText = 'Manquant'; statusType = 'warning'; }
        else if (ecart > 0.01) { statusText = 'Excedent'; statusType = 'warning'; }

        ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: item.name, s: { ...cellLeft(bg), font: { bold: true, sz: 10 } } };
        ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: item.category || '', s: cellLeft(bg) };
        ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: Number(item.theoretical) || 0, t: 'n', s: cellRight(bg) };
        ws[XLSX.utils.encode_cell({ r, c: 3 })] = { v: Number(item.physical) || 0, t: 'n', s: cellRight(bg) };
        ws[XLSX.utils.encode_cell({ r, c: 4 })] = { v: ecart, t: 'n', s: { ...cellRight(bg), font: { bold: true, sz: 10, color: { rgb: ecart < -0.01 ? "DC2626" : ecart > 0.01 ? "16A34A" : "374151" } } } };
        ws[XLSX.utils.encode_cell({ r, c: 5 })] = { v: ecartPct !== 0 ? Math.round(ecartPct) + '%' : '-', s: cellRight(bg) };
        ws[XLSX.utils.encode_cell({ r, c: 6 })] = { v: ecartVal, t: 'n', s: { ...cellRight(bg), numFmt: '#,##0', font: { sz: 10, color: { rgb: ecartVal < 0 ? "DC2626" : "374151" } } } };
        ws[XLSX.utils.encode_cell({ r, c: 7 })] = { v: item.hasConso ? 'Oui' : 'Non', s: alertCell(item.hasConso ? 'ok' : 'danger') };
        ws[XLSX.utils.encode_cell({ r, c: 8 })] = { v: statusText, s: alertCell(statusType) };
        r++;
      });

      const totTheo = filteredData.reduce((s, d) => s + (Number(d.theoretical) || 0), 0);
      const totPhys = filteredData.reduce((s, d) => s + (Number(d.physical) || 0), 0);
      const totEcart = totPhys - totTheo;
      const totVal = filteredData.reduce((s, d) => s + (Number(d.ecartValue) || 0), 0);

      ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: 'TOTAL', s: { ...totalStyle, alignment: { horizontal: "left" } } };
      ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: '', s: totalStyle };
      ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: totTheo, t: 'n', s: totalStyle };
      ws[XLSX.utils.encode_cell({ r, c: 3 })] = { v: totPhys, t: 'n', s: totalStyle };
      ws[XLSX.utils.encode_cell({ r, c: 4 })] = { v: totEcart, t: 'n', s: totalStyle };
      ws[XLSX.utils.encode_cell({ r, c: 5 })] = { v: '', s: totalStyle };
      ws[XLSX.utils.encode_cell({ r, c: 6 })] = { v: totVal, t: 'n', s: { ...totalStyle, numFmt: '#,##0' } };
      ws[XLSX.utils.encode_cell({ r, c: 7 })] = { v: '', s: totalStyle };
      ws[XLSX.utils.encode_cell({ r, c: 8 })] = { v: '', s: totalStyle };

      ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: cols - 1 } });
      ws['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 20 }];
      ws['!rows'] = [{ hpt: 30 }];
      XLSX.utils.book_append_sheet(wb, ws, (farmName + ' ' + invDate).substring(0, 31));

      XLSX.writeFile(wb, 'Controle_Ecarts_' + farmName.replace(/\s+/g, '_') + '_' + invDate + '.xlsx');
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
          <p className="text-gray-500 text-sm mt-1">Stock théorique vs Inventaire physique + suivi consommation</p>
        </div>
        {selectedInventory && filteredData.length > 0 && (
          <Button variant="secondary" onClick={exportExcel}>
            📥 Export Excel
          </Button>
        )}
      </div>

      {/* Select Inventory */}
      <Card>
        <Select
          label="Sélectionner un inventaire physique"
          value={selectedInventoryId}
          onChange={setSelectedInventoryId}
          options={[
            { value: '', label: '-- Choisir un inventaire --' },
            ...inventories.map(inv => ({
              value: inv.id,
              label: `${inv.farmName || inv.farm} — ${inv.date} (${inv.stats?.entered || 0} produits)`
            }))
          ]}
        />
        {inventories.length === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-xl text-sm text-yellow-700">
            ⚠️ Aucun inventaire physique sauvegardé. Allez dans <strong>Inventaire Physique</strong> pour en créer un d'abord.
          </div>
        )}
      </Card>

      {selectedInventory && (
        <>
          {/* Info */}
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="font-medium text-purple-800">🏠 {selectedInventory.farmName}</span>
              <span className="text-purple-600">📅 {selectedInventory.date}</span>
              <span className="text-purple-600">📋 {selectedInventory.stats?.entered || 0} produits comptés</span>
              <span className="text-purple-600">⚠️ {selectedInventory.stats?.withDiff || 0} écarts</span>
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
                  { value: 'ALL', label: 'Tous les produits' },
                  { value: 'ecart', label: '⚠️ Avec écart' },
                  { value: 'manquant', label: '🔻 Manquant (physique < théorique)' },
                  { value: 'excedent', label: '🔺 Excédent (physique > théorique)' },
                  { value: 'no-conso', label: '🚫 Sans consommation' },
                  { value: 'manquant-no-conso', label: '🔴 Manquant + sans conso' }
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
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value.toUpperCase())}
                  placeholder="🔍 Rechercher..."
                  className="input-field uppercase"
                />
              </div>
            </div>
          </Card>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <StatCard icon="📋" label="Total produits" value={stats.total} color="blue" />
              <StatCard icon="✅" label="OK" value={stats.ok} color="green" />
              <StatCard icon="🔻" label="Manquants" value={stats.manquant} color="red" />
              <StatCard icon="🔺" label="Excédents" value={stats.excedent} color="orange" />
              <StatCard icon="🚫" label="Sans conso" value={stats.noConso} color="purple" />
              <StatCard icon="🔴" label="Manquant+sans conso" value={stats.manquantNoConso} color="red" />
            </div>
          )}

          {/* Table */}
          <Card>
            {filteredData.length === 0 ? (
              <EmptyState icon="✅" message="Aucun produit trouvé avec ce filtre" />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th className="text-right">Stock Théorique</th>
                      <th className="text-right">Inventaire Physique</th>
                      <th className="text-right">Écart</th>
                      <th className="text-right">Écart %</th>
                      <th className="text-right">Valeur Écart</th>
                      <th className="text-center">Consommation</th>
                      <th className="text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, idx) => {
                      const ecart = Number(item.ecart) || 0;
                      const ecartPct = item.diffPercent != null ? Number(item.diffPercent) : null;
                      const ecartVal = Number(item.ecartValue) || 0;

                      let statusLabel, statusColor, statusIcon;
                      if (ecart < -0.01 && !item.hasConso) {
                        statusLabel = 'Manquant sans conso'; statusColor = 'bg-red-100 text-red-800'; statusIcon = '🔴';
                      } else if (ecart < -0.01) {
                        statusLabel = 'Manquant'; statusColor = 'bg-orange-100 text-orange-800'; statusIcon = '🔻';
                      } else if (ecart > 0.01) {
                        statusLabel = 'Excédent'; statusColor = 'bg-blue-100 text-blue-800'; statusIcon = '🔺';
                      } else {
                        statusLabel = 'OK'; statusColor = 'bg-green-100 text-green-800'; statusIcon = '✅';
                      }

                      return (
                        <tr key={idx}>
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
                              </span>
                            ) : <span className="text-gray-300">-</span>}
                          </td>
                          <td className="text-right">
                            {ecartPct != null && Math.abs(ecartPct) > 0.1 ? (
                              <span className={`text-sm ${ecartPct < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {ecartPct > 0 ? '+' : ''}{Math.round(ecartPct)}%
                              </span>
                            ) : <span className="text-gray-300">-</span>}
                          </td>
                          <td className="text-right">
                            {Math.abs(ecartVal) > 0.5 ? (
                              <span className={`text-sm font-medium ${ecartVal < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {fmtMoney(ecartVal)}
                              </span>
                            ) : <span className="text-gray-300">-</span>}
                          </td>
                          <td className="text-center">
                            {item.hasConso ? (
                              <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold">✅ Oui</span>
                            ) : (
                              <span className="px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold">🚫 Non</span>
                            )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 font-medium">🔴 Manquant sans conso</span>
                <span className="text-gray-500">Physique &lt; Théorique, aucune conso</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-orange-100 text-orange-800 font-medium">🔻 Manquant</span>
                <span className="text-gray-500">Physique &lt; Théorique (conso saisie)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">🔺 Excédent</span>
                <span className="text-gray-500">Physique &gt; Théorique</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium">✅ OK</span>
                <span className="text-gray-500">Pas d'écart significatif</span>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default Ecarts;
