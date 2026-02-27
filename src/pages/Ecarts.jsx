import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Select, Button, EmptyState, StatCard, Badge } from '../components/UI';
import { CATEGORIES } from '../lib/constants';
import { fmt, fmtMoney } from '../lib/utils';
import { getConsoFermesDataByPeriod, getProducts, getAveragePrice } from '../lib/store';

const CONSO_MONTHS = [
  { id: 'SEPTEMBRE', name: 'Septembre 2025' },
  { id: 'OCTOBRE', name: 'Octobre 2025' },
  { id: 'NOVEMBRE', name: 'Novembre 2025' },
  { id: 'DECEMBRE', name: 'Décembre 2025' },
  { id: 'JANVIER', name: 'Janvier 2026' },
  { id: 'FEVRIER', name: 'Février 2026' },
  { id: 'MARS', name: 'Mars 2026' },
  { id: 'AVRIL', name: 'Avril 2026' },
  { id: 'MAI', name: 'Mai 2026' },
  { id: 'JUIN', name: 'Juin 2026' },
  { id: 'JUILLET', name: 'Juillet 2026' },
  { id: 'AOUT', name: 'Août 2026' }
];

const MONTH_DATES = {
  'SEPTEMBRE': { start: '2025-09-01', end: '2025-09-30', prevInv: '2025-08-25' },
  'OCTOBRE': { start: '2025-10-01', end: '2025-10-31', prevInv: '2025-09-25' },
  'NOVEMBRE': { start: '2025-11-01', end: '2025-11-30', prevInv: '2025-10-25' },
  'DECEMBRE': { start: '2025-12-01', end: '2025-12-31', prevInv: '2025-11-25' },
  'JANVIER': { start: '2026-01-01', end: '2026-01-31', prevInv: '2025-12-25' },
  'FEVRIER': { start: '2026-02-01', end: '2026-02-28', prevInv: '2026-01-25' },
  'MARS': { start: '2026-03-01', end: '2026-03-31', prevInv: '2026-02-25' },
  'AVRIL': { start: '2026-04-01', end: '2026-04-30', prevInv: '2026-03-25' },
  'MAI': { start: '2026-05-01', end: '2026-05-31', prevInv: '2026-04-25' },
  'JUIN': { start: '2026-06-01', end: '2026-06-30', prevInv: '2026-05-25' },
  'JUILLET': { start: '2026-07-01', end: '2026-07-31', prevInv: '2026-06-25' },
  'AOUT': { start: '2026-08-01', end: '2026-08-31', prevInv: '2026-07-25' }
};

const FARMS = ['AB1', 'AB2', 'AB3'];

const Ecarts = () => {
  const { products, movements, showNotif } = useApp();
  const [selectedMonth, setSelectedMonth] = useState('JANVIER');
  const [selectedFarm, setSelectedFarm] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL'); // ALL, no-conso, decreased, increased
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  const periodDates = useMemo(() => {
    return MONTH_DATES[selectedMonth] || MONTH_DATES['JANVIER'];
  }, [selectedMonth]);

  // Get data from the same function used by ConsoFermes
  const rawData = useMemo(() => {
    return getConsoFermesDataByPeriod(periodDates.start, periodDates.end, periodDates.prevInv);
  }, [products, movements, periodDates]);

  // Build ecarts data per farm
  const ecartsData = useMemo(() => {
    const results = [];

    Object.values(rawData).forEach(d => {
      FARMS.forEach(farm => {
        const init = d[`init${farm}`] || 0;
        const ent = d[`ent${farm}`] || 0;
        const sort = d[`sort${farm}`] || 0;
        const conso = d[`cons${farm}`] || 0;
        const fin = d[`fin${farm}`] || 0;
        const transIn = d[`transIn${farm}`] || 0;

        // Only products that had stock at start
        if (init <= 0) return;

        // Change = difference between final and initial
        const change = fin - init;
        // Expected final = init + entries - exits - conso
        // If conso = 0, then ecart = fin - (init + ent - sort)
        // The "unexplained" part is the change not explained by movements

        const hasConso = conso > 0;
        const hasChanged = Math.abs(change) > 0.01;

        results.push({
          product: d.name,
          category: d.category,
          unit: d.unit,
          price: d.price,
          farm,
          init,
          ent,
          sort,
          transIn,
          conso,
          fin,
          change,
          hasConso,
          hasChanged
        });
      });
    });

    return results;
  }, [rawData]);

  // Filtered data
  const filteredData = useMemo(() => {
    let data = ecartsData;

    // Filter by farm
    if (selectedFarm !== 'ALL') {
      data = data.filter(d => d.farm === selectedFarm);
    }

    // Filter by type
    if (filterType === 'no-conso') {
      data = data.filter(d => !d.hasConso);
    } else if (filterType === 'decreased') {
      data = data.filter(d => d.change < -0.01 && !d.hasConso);
    } else if (filterType === 'increased') {
      data = data.filter(d => d.change > 0.01 && !d.hasConso);
    } else if (filterType === 'anomaly') {
      // Products with stock decrease but no consumption
      data = data.filter(d => d.change < -0.01 && !d.hasConso);
    }

    // Search
    if (search) {
      data = data.filter(d => d.product.toLowerCase().includes(search.toLowerCase()));
    }

    // Category
    if (filterCategory !== 'ALL') {
      data = data.filter(d => d.category === filterCategory);
    }

    return data.sort((a, b) => {
      // Sort by anomaly severity first (biggest unexplained decrease first)
      if (!a.hasConso && !b.hasConso) return a.change - b.change;
      if (!a.hasConso) return -1;
      if (!b.hasConso) return 1;
      return a.product.localeCompare(b.product);
    });
  }, [ecartsData, selectedFarm, filterType, search, filterCategory]);

  // Stats
  const stats = useMemo(() => {
    const farmData = selectedFarm === 'ALL' ? ecartsData : ecartsData.filter(d => d.farm === selectedFarm);
    const totalProducts = farmData.length;
    const noConso = farmData.filter(d => !d.hasConso).length;
    const decreased = farmData.filter(d => d.change < -0.01 && !d.hasConso).length;
    const increased = farmData.filter(d => d.change > 0.01 && !d.hasConso).length;
    const stable = farmData.filter(d => Math.abs(d.change) <= 0.01 && !d.hasConso).length;
    const totalEcartValue = farmData
      .filter(d => !d.hasConso && Math.abs(d.change) > 0.01)
      .reduce((s, d) => s + (d.change * d.price), 0);

    return { totalProducts, noConso, decreased, increased, stable, totalEcartValue };
  }, [ecartsData, selectedFarm]);

  // Export Excel
  const exportExcel = async () => {
    try {
      const XLSX = (await import('xlsx-js-style')).default || await import('xlsx-js-style');
      const wb = XLSX.utils.book_new();
      const monthName = CONSO_MONTHS.find(m => m.id === selectedMonth)?.name || selectedMonth;

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
        font: { sz: 10 },
        fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: "left", vertical: "center" },
        border: { top: { style: "thin", color: { rgb: "D1D5DB" } }, bottom: { style: "thin", color: { rgb: "D1D5DB" } }, left: { style: "thin", color: { rgb: "D1D5DB" } }, right: { style: "thin", color: { rgb: "D1D5DB" } } }
      });
      const cellRight = (bg) => ({
        font: { sz: 10 },
        fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: "right", vertical: "center" },
        numFmt: "0.0",
        border: { top: { style: "thin", color: { rgb: "D1D5DB" } }, bottom: { style: "thin", color: { rgb: "D1D5DB" } }, left: { style: "thin", color: { rgb: "D1D5DB" } }, right: { style: "thin", color: { rgb: "D1D5DB" } } }
      });
      const alertStyle = (type) => ({
        font: { bold: true, sz: 10, color: { rgb: type === 'danger' ? "991B1B" : type === 'warning' ? "9A3412" : type === 'ok' ? "166534" : "374151" } },
        fill: { fgColor: { rgb: type === 'danger' ? "FEE2E2" : type === 'warning' ? "FEF3C7" : type === 'ok' ? "DCFCE7" : "F3F4F6" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: { top: { style: "thin", color: { rgb: "D1D5DB" } }, bottom: { style: "thin", color: { rgb: "D1D5DB" } }, left: { style: "thin", color: { rgb: "D1D5DB" } }, right: { style: "thin", color: { rgb: "D1D5DB" } } }
      });

      // Build sheet for each farm (or selected farm)
      const farmsToExport = selectedFarm === 'ALL' ? FARMS : [selectedFarm];

      farmsToExport.forEach(farm => {
        const farmItems = filteredData.filter(d => d.farm === farm);
        if (farmItems.length === 0) return;

        const ws = {};
        let r = 0;
        const cols = 9;

        // Title
        for (let c = 0; c < cols; c++) ws[XLSX.utils.encode_cell({ r, c })] = { v: c === 0 ? 'Controle Ecarts - ' + farm + ' - ' + monthName : '', s: titleStyle };
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: cols - 1 } }];
        r += 2;

        // Headers
        const headers = ['Produit', 'Categorie', 'Stock Initial', 'Entrees', 'Sorties', 'Consommation', 'Stock Final', 'Ecart', 'Statut'];
        headers.forEach((h, c) => { ws[XLSX.utils.encode_cell({ r, c })] = { v: h, s: headerStyle }; });
        r++;

        farmItems.forEach((item, idx) => {
          const bg = idx % 2 === 0 ? "FFFFFF" : "F9FAFB";
          const changeVal = Number(item.change) || 0;
          let statusText = '';
          let statusType = 'ok';
          if (!item.hasConso && changeVal < -0.01) {
            statusText = 'Baisse sans conso';
            statusType = 'danger';
          } else if (!item.hasConso && changeVal > 0.01) {
            statusText = 'Hausse sans conso';
            statusType = 'warning';
          } else if (!item.hasConso && Math.abs(changeVal) <= 0.01) {
            statusText = 'Stable, non consomme';
            statusType = 'ok';
          } else {
            statusText = 'OK';
            statusType = 'ok';
          }

          ws[XLSX.utils.encode_cell({ r, c: 0 })] = { v: item.product, s: { ...cellLeft(bg), font: { bold: true, sz: 10 } } };
          ws[XLSX.utils.encode_cell({ r, c: 1 })] = { v: item.category, s: cellLeft(bg) };
          ws[XLSX.utils.encode_cell({ r, c: 2 })] = { v: Number(item.init) || 0, t: 'n', s: cellRight(bg) };
          ws[XLSX.utils.encode_cell({ r, c: 3 })] = { v: Number(item.ent) || 0, t: 'n', s: cellRight(bg) };
          ws[XLSX.utils.encode_cell({ r, c: 4 })] = { v: Number(item.sort) || 0, t: 'n', s: cellRight(bg) };
          ws[XLSX.utils.encode_cell({ r, c: 5 })] = { v: Number(item.conso) || 0, t: 'n', s: item.hasConso ? cellRight(bg) : alertStyle('danger') };
          ws[XLSX.utils.encode_cell({ r, c: 6 })] = { v: Number(item.fin) || 0, t: 'n', s: cellRight(bg) };
          ws[XLSX.utils.encode_cell({ r, c: 7 })] = { v: changeVal, t: 'n', s: { ...cellRight(bg), font: { bold: true, sz: 10, color: { rgb: changeVal < -0.01 ? "DC2626" : changeVal > 0.01 ? "16A34A" : "374151" } } } };
          ws[XLSX.utils.encode_cell({ r, c: 8 })] = { v: statusText, s: alertStyle(statusType) };
          r++;
        });

        ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: cols - 1 } });
        ws['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 20 }];
        ws['!rows'] = [{ hpt: 30 }];
        XLSX.utils.book_append_sheet(wb, ws, farm);
      });

      XLSX.writeFile(wb, 'Controle_Ecarts_' + monthName.replace(' ', '_') + '.xlsx');
      showNotif('Excel exporte');
    } catch (err) {
      console.error('Export error:', err);
      showNotif('Erreur export: ' + err.message, 'error');
    }
  };

  const monthLabel = CONSO_MONTHS.find(m => m.id === selectedMonth)?.name || selectedMonth;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔎 Contrôle d'Écarts</h1>
          <p className="text-gray-500 text-sm mt-1">Produits sans consommation avec variation de stock</p>
        </div>
        <Button variant="secondary" onClick={exportExcel}>
          📥 Export Excel
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Select
            label="Mois"
            value={selectedMonth}
            onChange={setSelectedMonth}
            options={CONSO_MONTHS.map(m => ({ value: m.id, label: m.name }))}
          />
          <Select
            label="Ferme"
            value={selectedFarm}
            onChange={setSelectedFarm}
            options={[
              { value: 'ALL', label: 'Toutes les fermes' },
              { value: 'AB1', label: 'Agro Berry 1' },
              { value: 'AB2', label: 'Agro Berry 2' },
              { value: 'AB3', label: 'Agro Berry 3' }
            ]}
          />
          <Select
            label="Filtre"
            value={filterType}
            onChange={setFilterType}
            options={[
              { value: 'ALL', label: 'Tous les produits' },
              { value: 'no-conso', label: 'Sans consommation' },
              { value: 'decreased', label: '📉 Baisse sans conso' },
              { value: 'increased', label: '📈 Hausse sans conso' }
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
        </div>
        <div className="mt-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            placeholder="🔍 Rechercher un produit..."
            className="input-field uppercase"
          />
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon="📋" label="Produits en stock" value={stats.totalProducts} color="blue" />
        <StatCard icon="⚠️" label="Sans consommation" value={stats.noConso} color="orange" />
        <StatCard icon="📉" label="Baisse sans conso" value={stats.decreased} color="red" />
        <StatCard icon="📈" label="Hausse sans conso" value={stats.increased} color="green" />
        <StatCard
          icon="💰"
          label="Valeur écarts"
          value={fmtMoney(Math.abs(stats.totalEcartValue))}
          color={stats.totalEcartValue < 0 ? 'red' : 'purple'}
        />
      </div>

      {/* Table */}
      <Card>
        {filteredData.length === 0 ? (
          <EmptyState
            icon="✅"
            message={filterType !== 'ALL' ? 'Aucun écart trouvé avec ce filtre' : 'Aucun produit en stock pour cette période'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  {selectedFarm === 'ALL' && <th className="text-center">Ferme</th>}
                  <th className="text-right">Stock Initial</th>
                  <th className="text-right">Entrées</th>
                  <th className="text-right">Sorties</th>
                  <th className="text-right">Conso</th>
                  <th className="text-right">Stock Final</th>
                  <th className="text-right">Écart</th>
                  <th className="text-center">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, idx) => {
                  const changeVal = Number(item.change) || 0;
                  let statusLabel = '';
                  let statusColor = '';
                  let statusIcon = '';

                  if (!item.hasConso && changeVal < -0.01) {
                    statusLabel = 'Baisse sans conso';
                    statusColor = 'bg-red-50 text-red-700';
                    statusIcon = '🔴';
                  } else if (!item.hasConso && changeVal > 0.01) {
                    statusLabel = 'Hausse sans conso';
                    statusColor = 'bg-orange-50 text-orange-700';
                    statusIcon = '🟡';
                  } else if (!item.hasConso && Math.abs(changeVal) <= 0.01) {
                    statusLabel = 'Stable, non consommé';
                    statusColor = 'bg-blue-50 text-blue-600';
                    statusIcon = '🔵';
                  } else {
                    statusLabel = 'OK';
                    statusColor = 'bg-green-50 text-green-700';
                    statusIcon = '✅';
                  }

                  return (
                    <tr key={idx}>
                      <td>
                        <div>
                          <span className="font-medium text-gray-900">{item.product}</span>
                          <span className="text-xs text-gray-400 ml-2">{item.category}</span>
                        </div>
                      </td>
                      {selectedFarm === 'ALL' && (
                        <td className="text-center">
                          <Badge color={item.farm === 'AB1' ? 'blue' : item.farm === 'AB2' ? 'green' : 'purple'}>
                            {item.farm}
                          </Badge>
                        </td>
                      )}
                      <td className="text-right">{fmt(item.init)}</td>
                      <td className="text-right">
                        {item.ent > 0 ? <span className="text-green-600">+{fmt(item.ent)}</span> : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="text-right">
                        {item.sort > 0 ? <span className="text-purple-600">-{fmt(item.sort)}</span> : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="text-right">
                        {item.hasConso ? (
                          <span className="text-orange-600 font-medium">{fmt(item.conso)}</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-500 text-xs font-bold">0</span>
                        )}
                      </td>
                      <td className="text-right font-medium">{fmt(item.fin)}</td>
                      <td className="text-right">
                        {Math.abs(changeVal) > 0.01 ? (
                          <span className={`font-bold ${changeVal < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {changeVal > 0 ? '+' : ''}{fmt(changeVal)}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
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
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-50 text-red-700 font-medium">🔴 Baisse sans conso</span>
            <span className="text-gray-500">Stock diminué, aucune conso saisie</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-orange-50 text-orange-700 font-medium">🟡 Hausse sans conso</span>
            <span className="text-gray-500">Stock augmenté via entrées</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">🔵 Stable, non consommé</span>
            <span className="text-gray-500">Stock inchangé, pas de conso</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-700 font-medium">✅ OK</span>
            <span className="text-gray-500">Consommation saisie</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Ecarts;
