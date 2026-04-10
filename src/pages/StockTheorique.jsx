import React, { useState, useMemo } from 'react';
import { Card, EmptyState } from '../components/UI';
import { FARMS } from '../lib/constants';
import {
  getMovements,
  getPhysicalInventories,
  getProducts,
  getAveragePrice
} from '../lib/store';
import { fmt, fmtMoney } from '../lib/utils';

// Helper: get period 25/M-1 → 24/M from a reference month (YYYY-MM)
const getPeriod = (refMonth) => {
  const [y, m] = refMonth.split('-').map(Number);
  // Start: 25 of previous month
  const prevYear = m === 1 ? y - 1 : y;
  const prevMonth = m === 1 ? 12 : m - 1;
  const startDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-25`;
  // End: 24 of current month
  const endDate = `${y}-${String(m).padStart(2, '0')}-24`;
  return { startDate, endDate };
};

// Get the physical inventory of the 25th of previous month for a farm (the base stock)
const getBaseInventory = (farmId, startDate) => {
  const physicalInventories = getPhysicalInventories();
  // Base = last physical inventory with date <= startDate (25 of prev month)
  const candidates = physicalInventories
    .filter(inv => inv.farm === farmId && inv.data && inv.date <= startDate)
    .sort((a, b) => b.date.localeCompare(a.date));
  return candidates[0] || null;
};

// Calculate theoretical stock for a farm over a period
const calcTheoretical = (farmId, startDate, endDate) => {
  const movements = getMovements();
  const allProducts = getProducts();
  const stockMap = {};

  // 1. Base = last physical inventory before or on startDate
  const baseInv = getBaseInventory(farmId, startDate);

  if (baseInv) {
    Object.entries(baseInv.data).forEach(([product, qty]) => {
      const quantity = parseFloat(qty) || 0;
      if (quantity > 0) {
        const price = getAveragePrice(product) || 0;
        stockMap[product] = { base: quantity, entries: 0, transferIn: 0, transferOut: 0, consumption: 0, price };
      }
    });
  }

  // 2. Apply movements AFTER startDate (26th) up to endDate (24th)
  // startDate is the 25th (base inventory day), so movements start from the 26th
  const movementsStartDate = (() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })();

  movements.forEach(m => {
    if (!m.date || m.date < movementsStartDate || m.date > endDate) return;
    const product = m.product;
    if (!product) return;

    if (!stockMap[product]) {
      const price = m.price || getAveragePrice(product) || 0;
      stockMap[product] = { base: 0, entries: 0, transferIn: 0, transferOut: 0, consumption: 0, price };
    }

    if (m.type === 'exit' && m.farm === farmId) {
      stockMap[product].entries += m.quantity || 0;
      if (m.price) stockMap[product].price = m.price;
    }
    if (m.type === 'transfer-in' && m.farm === farmId) {
      stockMap[product].transferIn += m.quantity || 0;
    }
    if (m.type === 'transfer-out' && m.farm === farmId) {
      stockMap[product].transferOut += m.quantity || 0;
    }
    if (m.type === 'consumption' && m.farm === farmId) {
      stockMap[product].consumption += m.quantity || 0;
    }
  });

  // 3. Compute final theoretical
  return Object.entries(stockMap).map(([name, d]) => {
    const theoretical = d.base + d.entries + d.transferIn - d.transferOut - d.consumption;
    const productInfo = allProducts.find(p => p.name === name);
    return {
      name,
      unit: productInfo?.unit || 'KG',
      category: productInfo?.category || 'AUTRES',
      base: d.base,
      entries: d.entries,
      transferIn: d.transferIn,
      transferOut: d.transferOut,
      consumption: d.consumption,
      theoretical,
      price: d.price,
      value: theoretical * d.price
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
};

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const getDefaultMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const StockTheorique = () => {
  const [refMonth, setRefMonth] = useState(getDefaultMonth);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [expandedFarm, setExpandedFarm] = useState(null);

  const { startDate, endDate } = useMemo(() => getPeriod(refMonth), [refMonth]);

  // Calculate for all 3 farms
  const farmsData = useMemo(() => {
    return FARMS.map(farm => {
      const baseInv = getBaseInventory(farm.id, startDate);
      const items = calcTheoretical(farm.id, startDate, endDate);
      const totalValue = items.reduce((s, i) => s + (i.theoretical > 0 ? i.value : 0), 0);
      const totalProducts = items.filter(i => i.theoretical > 0.01).length;
      return { ...farm, items, baseInv, totalValue, totalProducts };
    });
  }, [startDate, endDate]);

  // Month label
  const [y, m] = refMonth.split('-').map(Number);
  const monthLabel = `${MONTHS[m - 1]} ${y}`;
  const prevMonthLabel = `${MONTHS[m === 1 ? 11 : m - 2]} ${m === 1 ? y - 1 : y}`;

  const tabColors = {
    'ALL': 'bg-gray-700 text-white',
    'AGRO BERRY 1': 'bg-green-500 text-white',
    'AGRO BERRY 2': 'bg-blue-500 text-white',
    'AGRO BERRY 3': 'bg-purple-500 text-white',
  };

  const renderFarmTable = (farmData) => {
    const filtered = farmData.items.filter(i => {
      const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
      const matchTab = activeTab === 'ALL' || farmData.id === activeTab;
      return matchSearch && (activeTab === 'ALL' || farmData.id === activeTab) && matchSearch;
    }).filter(i => i.theoretical > 0.001 || i.entries > 0 || i.consumption > 0);

    const filteredBySearch = filtered.filter(i =>
      !search || i.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "auto", minWidth: 900, borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left p-3 font-semibold text-gray-700">PRODUIT</th>
              <th className="text-center p-3 font-semibold text-gray-500">UNT</th>
              <th className="text-right p-3 font-semibold text-indigo-600">📌 BASE</th>
              <th className="text-right p-3 font-semibold text-green-600">➕ ENTRÉES</th>
              <th className="text-right p-3 font-semibold text-blue-500">🔄 T.IN</th>
              <th className="text-right p-3 font-semibold text-orange-500">🔄 T.OUT</th>
              <th className="text-right p-3 font-semibold text-red-500">🔥 CONSO</th>
              <th className="text-right p-3 font-semibold text-gray-800">📊 THÉORIQUE</th>
              <th className="text-right p-3 font-semibold text-gray-500">VALEUR</th>
            </tr>
          </thead>
          <tbody>
            {filteredBySearch.length === 0 ? (
              <tr><td colSpan={9} className="p-8 text-center text-gray-400">Aucun produit</td></tr>
            ) : filteredBySearch.map((item) => (
              <tr key={item.name} className={`border-b hover:bg-gray-50 transition-colors ${
                item.theoretical < 0 ? 'bg-red-50/40' : ''
              }`}>
                <td className="p-3 font-medium text-gray-800">{item.name}</td>
                <td className="p-3 text-center text-gray-500 text-xs">{item.unit}</td>
                <td className="p-3 text-right text-indigo-600">{item.base > 0 ? fmt(item.base) : '—'}</td>
                <td className="p-3 text-right text-green-600">{item.entries > 0 ? `+${fmt(item.entries)}` : '—'}</td>
                <td className="p-3 text-right text-blue-500">{item.transferIn > 0 ? `+${fmt(item.transferIn)}` : '—'}</td>
                <td className="p-3 text-right text-orange-500">{item.transferOut > 0 ? `-${fmt(item.transferOut)}` : '—'}</td>
                <td className="p-3 text-right text-red-500">{item.consumption > 0 ? `-${fmt(item.consumption)}` : '—'}</td>
                <td className={`p-3 text-right font-bold text-base ${
                  item.theoretical < 0 ? 'text-red-600' : 'text-gray-800'
                }`}>{fmt(item.theoretical)}</td>
                <td className="p-3 text-right text-gray-500 text-xs">{fmtMoney(item.theoretical > 0 ? item.value : 0)}</td>
              </tr>
            ))}
          </tbody>
          {filteredBySearch.length > 0 && (
            <tfoot>
              <tr className="bg-gray-100 font-bold border-t-2">
                <td colSpan={7} className="p-3 text-gray-700">TOTAL</td>
                <td className="p-3 text-right text-gray-800">
                  {fmt(filteredBySearch.reduce((s, i) => s + i.theoretical, 0))}
                </td>
                <td className="p-3 text-right text-gray-600">
                  {fmtMoney(filteredBySearch.reduce((s, i) => s + (i.theoretical > 0 ? i.value : 0), 0))}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📈 Stock Théorique Mensuel</h1>
          <p className="text-gray-500 text-sm mt-1">
            Calcul du stock par ferme sur la période du 25/{prevMonthLabel} au 24/{monthLabel}
          </p>
        </div>
        {/* Month selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600">📅 Mois de référence :</label>
          <input
            type="month"
            value={refMonth}
            onChange={e => setRefMonth(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-800 font-medium focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Period Banner */}
      <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl flex items-center gap-3">
        <span className="text-2xl">📅</span>
        <div>
          <p className="font-bold text-indigo-800">
            Période : <span className="text-indigo-600">{startDate.split('-').reverse().join('/')} → {endDate.split('-').reverse().join('/')}</span>
          </p>
          <p className="text-indigo-600 text-sm mt-0.5">
            Stock de base = inventaire physique du 25/{prevMonthLabel} · + Entrées · ± Transferts · − Consommations
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {farmsData.map((farm, i) => {
          const colors = [
            'from-green-50 to-green-100 border-green-200 text-green-700',
            'from-blue-50 to-blue-100 border-blue-200 text-blue-700',
            'from-purple-50 to-purple-100 border-purple-200 text-purple-700'
          ];
          const baseColors = ['text-green-600', 'text-blue-600', 'text-purple-600'];
          return (
            <Card key={farm.id} className={`p-4 bg-gradient-to-br ${colors[i]} cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => setExpandedFarm(expandedFarm === farm.id ? null : farm.id)}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-800">{farm.name}</span>
                <span className="text-xl">🌿</span>
              </div>
              {farm.baseInv ? (
                <p className="text-xs mb-2 text-gray-500">📌 Base : inventaire du {farm.baseInv.date.split('-').reverse().join('/')}</p>
              ) : (
                <p className="text-xs mb-2 text-orange-500">⚠️ Aucun inventaire physique de base</p>
              )}
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-gray-500">Produits actifs</p>
                  <p className={`text-2xl font-bold ${baseColors[i]}`}>{farm.totalProducts}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Valeur stock</p>
                  <p className={`text-lg font-bold ${baseColors[i]}`}>{fmtMoney(farm.totalValue)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                {expandedFarm === farm.id ? '🔼 Masquer le détail' : '🔽 Voir le détail'}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="🔍 Rechercher un produit..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Farm Tables */}
      {farmsData.map((farm, i) => {
        const headerColors = [
          'bg-green-500',
          'bg-blue-500',
          'bg-purple-500'
        ];

        const isExpanded = expandedFarm === farm.id || search.length > 0;

        return (
          <div key={farm.id} className="ios-card" style={{ padding: 0 }}>
            {/* Farm Header */}
            <div
              className={`p-4 ${headerColors[i]} flex items-center justify-between cursor-pointer`}
              onClick={() => setExpandedFarm(expandedFarm === farm.id ? null : farm.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌿</span>
                <div>
                  <h2 className="font-bold text-white text-lg">{farm.name}</h2>
                  <p className="text-white/80 text-sm">
                    {farm.totalProducts} produits · {fmtMoney(farm.totalValue)}
                    {farm.baseInv
                      ? ` · Base du ${farm.baseInv.date.split('-').reverse().join('/')}`
                      : ' · ⚠️ Pas de base physique'}
                  </p>
                </div>
              </div>
              <span className="text-white text-xl">{isExpanded ? '🔼' : '🔽'}</span>
            </div>

            {/* Formula row */}
            {isExpanded && (
              <div className="px-4 py-2 bg-gray-50 border-b flex flex-wrap gap-3 text-xs font-medium text-gray-600">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-indigo-400 inline-block"></span>
                  📌 Base (inv. physique 25/{prevMonthLabel.split(' ')[0]})
                </span>
                <span className="text-gray-400">+</span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-400 inline-block"></span>
                  Entrées magasin
                </span>
                <span className="text-gray-400">+</span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-blue-400 inline-block"></span>
                  Transferts reçus
                </span>
                <span className="text-gray-400">−</span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-orange-400 inline-block"></span>
                  Transferts envoyés
                </span>
                <span className="text-gray-400">−</span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-400 inline-block"></span>
                  Consommations
                </span>
                <span className="text-gray-400">=</span>
                <span className="flex items-center gap-1 font-bold text-gray-800">
                  📊 Stock Théorique
                </span>
              </div>
            )}

            {/* Table */}
            {isExpanded && renderFarmTable(farm)}

            {!isExpanded && (
              <div className="p-3 text-center text-sm text-gray-400 cursor-pointer hover:text-gray-600"
                onClick={() => setExpandedFarm(farm.id)}>
                Cliquer pour afficher les {farm.totalProducts} produits
              </div>
            )}
          </div>
        );
      })}

      {/* Legend */}
      <Card className="p-4 bg-gray-50">
        <p className="text-xs text-gray-500 font-semibold mb-2">📖 Formule de calcul :</p>
        <p className="text-xs text-gray-600">
          <span className="font-bold text-indigo-600">Stock théorique</span> =
          Stock physique du 25/{prevMonthLabel}
          <span style={{ color: "var(--green)" }}> + Entrées du magasin</span>
          <span style={{ color: "var(--blue)" }}> + Transferts reçus</span>
          <span className="text-orange-500"> − Transferts envoyés</span>
          <span className="text-red-500"> − Consommations</span>
          <br/>
          <span className="text-gray-400 mt-1 block">
            Période couverte : du {startDate.split('-').reverse().join('/')} au {endDate.split('-').reverse().join('/')}
            — Les mouvements comptabilisés vont du 26/{prevMonthLabel.split(' ')[0]} au 24/{monthLabel.split(' ')[0]}
          </span>
        </p>
      </Card>
    </div>
  );
};

export default StockTheorique;
