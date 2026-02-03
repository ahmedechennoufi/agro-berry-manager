import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Select, Input, Button, EmptyState, StatCard } from '../components/UI';
import { MONTHS, CATEGORIES } from '../lib/constants';
import { fmt, fmtMoney, exportConsoFermes } from '../lib/utils';
import { getConsoFermesDataByPeriod, getInventaires, getMovements, getProducts, getAveragePrice } from '../lib/store';

const ConsoFermes = () => {
  const { products, movements } = useApp();
  const [selectedMonth, setSelectedMonth] = useState('JANVIER');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Months for the dropdown (campagne + calendaire)
  const CONSO_MONTHS = [
    { id: 'SEPTEMBRE', name: 'Septembre 2025' },
    { id: 'OCTOBRE', name: 'Octobre 2025' },
    { id: 'NOVEMBRE', name: 'Novembre 2025' },
    { id: 'DECEMBRE', name: 'Déc 2025 (campagne)' },
    { id: 'DECEMBRE_2025', name: 'Déc 2025 (26→31)' },
    { id: 'JANVIER', name: 'Janvier 2026' },
    { id: 'FEVRIER', name: 'Février 2026' },
    { id: 'MARS', name: 'Mars 2026' },
    { id: 'AVRIL', name: 'Avril 2026' },
    { id: 'MAI', name: 'Mai 2026' },
    { id: 'JUIN', name: 'Juin 2026' },
    { id: 'JUILLET', name: 'Juillet 2026' },
    { id: 'AOUT', name: 'Août 2026' }
  ];

  // Get period dates based on selected month
  const periodDates = useMemo(() => {
    const monthMap = {
      'SEPTEMBRE': { start: '2025-08-26', end: '2025-09-25', prevInv: null },
      'OCTOBRE': { start: '2025-09-26', end: '2025-10-25', prevInv: '2025-09-25' },
      'NOVEMBRE': { start: '2025-10-26', end: '2025-11-25', prevInv: '2025-10-25' },
      'DECEMBRE': { start: '2025-11-26', end: '2025-12-25', prevInv: '2025-11-25' },
      'DECEMBRE_2025': { start: '2025-12-26', end: '2025-12-31', prevInv: '2025-12-25' },
      'JANVIER': { start: '2026-01-01', end: '2026-01-31', prevInv: '2025-12-31' },
      'FEVRIER': { start: '2026-02-01', end: '2026-02-28', prevInv: '2026-01-31' },
      'MARS': { start: '2026-03-01', end: '2026-03-31', prevInv: '2026-02-28' },
      'AVRIL': { start: '2026-04-01', end: '2026-04-30', prevInv: '2026-03-31' },
      'MAI': { start: '2026-05-01', end: '2026-05-31', prevInv: '2026-04-30' },
      'JUIN': { start: '2026-06-01', end: '2026-06-30', prevInv: '2026-05-31' },
      'JUILLET': { start: '2026-07-01', end: '2026-07-31', prevInv: '2026-06-30' },
      'AOUT': { start: '2026-08-01', end: '2026-08-31', prevInv: '2026-07-31' }
    };
    return monthMap[selectedMonth] || monthMap['JANVIER'];
  }, [selectedMonth]);

  const tableData = useMemo(() => {
    const dataMap = getConsoFermesDataByPeriod(periodDates.start, periodDates.end, periodDates.prevInv);
    
    return Object.values(dataMap)
      .filter(d => {
        const hasData = d.initAB1 > 0 || d.initAB2 > 0 || d.initAB3 > 0 || 
                       d.entAB1 > 0 || d.entAB2 > 0 || d.entAB3 > 0 ||
                       d.sortAB1 > 0 || d.sortAB2 > 0 || d.sortAB3 > 0 ||
                       d.consAB1 > 0 || d.consAB2 > 0 || d.consAB3 > 0 ||
                       Math.abs(d.finAB1) > 0.01 || Math.abs(d.finAB2) > 0.01 || Math.abs(d.finAB3) > 0.01;
        const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
        const matchCategory = filterCategory === 'ALL' || d.category === filterCategory;
        return hasData && matchSearch && matchCategory;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, movements, periodDates, search, filterCategory]);

  const totals = useMemo(() => {
    const t = { 
      initVal: 0, entVal: 0, sortVal: 0, consVal: 0, finVal: 0, 
      initQty: 0, entQty: 0, sortQty: 0, consQty: 0, finQty: 0,
      // Per farm quantities
      initAB1: 0, initAB2: 0, initAB3: 0,
      entAB1: 0, entAB2: 0, entAB3: 0,
      transInAB1: 0, transInAB2: 0, transInAB3: 0,
      sortAB1: 0, sortAB2: 0, sortAB3: 0,
      consAB1: 0, consAB2: 0, consAB3: 0,
      finAB1: 0, finAB2: 0, finAB3: 0,
      // Per farm values
      initValAB1: 0, initValAB2: 0, initValAB3: 0,
      entValAB1: 0, entValAB2: 0, entValAB3: 0,
      sortValAB1: 0, sortValAB2: 0, sortValAB3: 0,
      consValAB1: 0, consValAB2: 0, consValAB3: 0,
      finValAB1: 0, finValAB2: 0, finValAB3: 0
    };
    tableData.forEach(d => {
      const price = d.price || 0;
      // Quantities
      t.initAB1 += d.initAB1; t.initAB2 += d.initAB2; t.initAB3 += d.initAB3;
      t.entAB1 += d.entAB1; t.entAB2 += d.entAB2; t.entAB3 += d.entAB3;
      t.transInAB1 += d.transInAB1 || 0; t.transInAB2 += d.transInAB2 || 0; t.transInAB3 += d.transInAB3 || 0;
      t.sortAB1 += d.sortAB1 || 0; t.sortAB2 += d.sortAB2 || 0; t.sortAB3 += d.sortAB3 || 0;
      t.consAB1 += d.consAB1; t.consAB2 += d.consAB2; t.consAB3 += d.consAB3;
      t.finAB1 += d.finAB1; t.finAB2 += d.finAB2; t.finAB3 += d.finAB3;
      // Values
      t.initValAB1 += d.initAB1 * price; t.initValAB2 += d.initAB2 * price; t.initValAB3 += d.initAB3 * price;
      t.entValAB1 += d.entAB1 * price; t.entValAB2 += d.entAB2 * price; t.entValAB3 += d.entAB3 * price;
      t.sortValAB1 += (d.sortAB1||0) * price; t.sortValAB2 += (d.sortAB2||0) * price; t.sortValAB3 += (d.sortAB3||0) * price;
      t.consValAB1 += d.consAB1 * price; t.consValAB2 += d.consAB2 * price; t.consValAB3 += d.consAB3 * price;
      t.finValAB1 += d.finAB1 * price; t.finValAB2 += d.finAB2 * price; t.finValAB3 += d.finAB3 * price;
      // Totals
      const initTot = d.initAB1 + d.initAB2 + d.initAB3;
      const entTot = d.entAB1 + d.entAB2 + d.entAB3;
      const sortTot = (d.sortAB1 || 0) + (d.sortAB2 || 0) + (d.sortAB3 || 0);
      const consTot = d.consAB1 + d.consAB2 + d.consAB3;
      const finTot = d.finAB1 + d.finAB2 + d.finAB3;
      t.initVal += initTot * price;
      t.entVal += entTot * price;
      t.sortVal += sortTot * price;
      t.consVal += consTot * price;
      t.finVal += finTot * price;
      t.initQty += initTot;
      t.entQty += entTot;
      t.sortQty += sortTot;
      t.consQty += consTot;
      t.finQty += finTot;
    });
    return t;
  }, [tableData]);

  // Entry details (transfer-in + exit movements)
  const entryDetails = useMemo(() => {
    const allMovements = getMovements();
    const allProducts = getProducts();
    const productMap = {};
    allProducts.forEach(p => { productMap[p.name] = p; });
    
    return allMovements
      .filter(m => (m.type === 'transfer-in' || m.type === 'exit') && m.date >= periodDates.start && m.date <= periodDates.end)
      .map(m => {
        const prod = productMap[m.product] || {};
        return {
          product: m.product,
          type: m.type,
          category: prod.category || 'AUTRES',
          farm: m.farm,
          fromFarm: m.fromFarm,
          supplier: m.supplier,
          unit: prod.unit || 'KG',
          price: getAveragePrice(m.product) || 0,
          quantity: m.quantity || 0
        };
      })
      .sort((a, b) => a.product.localeCompare(b.product));
  }, [movements, periodDates]);

  // Sortie details (transfer-out movements = transferts vers autres fermes)
  const sortieDetails = useMemo(() => {
    const allMovements = getMovements();
    const allProducts = getProducts();
    const productMap = {};
    allProducts.forEach(p => { productMap[p.name] = p; });
    
    return allMovements
      .filter(m => m.type === 'transfer-out' && m.date >= periodDates.start && m.date <= periodDates.end)
      .map(m => {
        const prod = productMap[m.product] || {};
        return {
          product: m.product,
          fromFarm: m.farm,
          toFarm: m.toFarm,
          unit: prod.unit || 'KG',
          price: getAveragePrice(m.product) || 0,
          quantity: m.quantity || 0
        };
      })
      .sort((a, b) => a.product.localeCompare(b.product));
  }, [movements, periodDates]);

  // Consumption details
  const consoDetails = useMemo(() => {
    const allMovements = getMovements();
    const allProducts = getProducts();
    const productMap = {};
    allProducts.forEach(p => { productMap[p.name] = p; });
    
    return allMovements
      .filter(m => m.type === 'consumption' && m.date >= periodDates.start && m.date <= periodDates.end)
      .map(m => {
        const prod = productMap[m.product] || {};
        return {
          product: m.product,
          category: prod.category || 'AUTRES',
          farm: m.farm,
          culture: m.culture || '-',
          unit: prod.unit || 'KG',
          price: getAveragePrice(m.product) || 0,
          quantity: m.quantity || 0
        };
      })
      .sort((a, b) => a.product.localeCompare(b.product));
  }, [movements, periodDates]);

  const handleExport = async () => {
    await exportConsoFermes(tableData, selectedMonth, entryDetails, consoDetails);
  };

  // Format period display
  const formatPeriod = () => {
    const start = new Date(periodDates.start);
    const end = new Date(periodDates.end);
    return `${start.getDate()} ${start.toLocaleDateString('fr-FR', { month: 'short' })} → ${end.getDate()} ${end.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🔥 Consommation Fermes</h1>
          <p className="text-gray-500 text-sm mt-1">
            Période: <span className="font-medium text-gray-700">{formatPeriod()}</span>
            <span className="mx-2">•</span>
            Stock Initial + Entrées - Sorties - Conso = Stock Final
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedMonth} onChange={setSelectedMonth}
            options={CONSO_MONTHS.map(m => ({ value: m.id, label: m.name }))} className="w-56" />
          <Button variant="secondary" onClick={handleExport}>📥 Export</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon="📦" label="Stock Initial" value={fmtMoney(totals.initVal)} subValue={`${fmt(totals.initQty)} unités`} color="blue" />
        <StatCard icon="📥" label="Entrées" value={fmtMoney(totals.entVal)} subValue={`${fmt(totals.entQty)} unités`} color="green" />
        <StatCard icon="📤" label="Sorties" value={fmtMoney(totals.sortVal)} subValue={`${fmt(totals.sortQty)} unités`} color="purple" />
        <StatCard icon="🔥" label="Consommation" value={fmtMoney(totals.consVal)} subValue={`${fmt(totals.consQty)} unités`} color="red" />
        <StatCard icon="📊" label="Stock Final" value={fmtMoney(totals.finVal)} color="indigo" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="🔍 Rechercher..." value={search} onChange={setSearch} className="flex-1" />
        <Select value={filterCategory} onChange={setFilterCategory}
          options={[{ value: 'ALL', label: 'Toutes catégories' }, ...CATEGORIES.map(c => ({ value: c.id, label: c.name }))]}
          className="sm:w-48" />
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b">
          <span className="text-gray-500 text-sm font-medium">{tableData.length} produits</span>
        </div>
        {tableData.length === 0 ? <div className="p-8"><EmptyState icon="📭" message="Aucune donnée pour cette période" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1400px]">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left p-3 font-semibold text-gray-700" rowSpan={2}>ARTICLE</th>
                  <th className="text-center p-2 font-medium text-gray-500 text-xs" rowSpan={2}>Unité</th>
                  <th className="text-center p-2 font-medium text-gray-500 text-xs" rowSpan={2}>Prix</th>
                  <th colSpan={4} className="text-center p-2 font-bold text-blue-700 bg-blue-100 border-l-4 border-blue-300">
                    📦 STOCK INITIAL
                  </th>
                  <th colSpan={4} className="text-center p-2 font-bold text-green-700 bg-green-100 border-l-4 border-green-300">
                    📥 ENTRÉES
                  </th>
                  <th colSpan={4} className="text-center p-2 font-bold text-purple-700 bg-purple-100 border-l-4 border-purple-300">
                    📤 SORTIES
                  </th>
                  <th colSpan={4} className="text-center p-2 font-bold text-orange-600 bg-orange-100 border-l-4 border-orange-300">
                    🔥 CONSOMMATION
                  </th>
                  <th colSpan={3} className="text-center p-2 font-bold text-indigo-700 bg-indigo-100 border-l-4 border-indigo-300">
                    📊 STOCK FINAL
                  </th>
                </tr>
                <tr className="bg-gray-50 border-b text-xs">
                  <th className="p-2 text-center text-blue-600 bg-blue-50 border-l-4 border-blue-300 font-semibold">AB1</th>
                  <th className="p-2 text-center text-blue-600 bg-blue-50 font-semibold">AB2</th>
                  <th className="p-2 text-center text-blue-600 bg-blue-50 font-semibold">AB3</th>
                  <th className="p-2 text-center text-blue-800 bg-blue-200 font-bold">TOT</th>
                  <th className="p-2 text-center text-green-600 bg-green-50 border-l-4 border-green-300 font-semibold">AB1</th>
                  <th className="p-2 text-center text-green-600 bg-green-50 font-semibold">AB2</th>
                  <th className="p-2 text-center text-green-600 bg-green-50 font-semibold">AB3</th>
                  <th className="p-2 text-center text-green-800 bg-green-200 font-bold">TOT</th>
                  <th className="p-2 text-center text-purple-600 bg-purple-50 border-l-4 border-purple-300 font-semibold">AB1</th>
                  <th className="p-2 text-center text-purple-600 bg-purple-50 font-semibold">AB2</th>
                  <th className="p-2 text-center text-purple-600 bg-purple-50 font-semibold">AB3</th>
                  <th className="p-2 text-center text-purple-800 bg-purple-200 font-bold">TOT</th>
                  <th className="p-2 text-center text-orange-600 bg-orange-50 border-l-4 border-orange-300 font-semibold">AB1</th>
                  <th className="p-2 text-center text-orange-600 bg-orange-50 font-semibold">AB2</th>
                  <th className="p-2 text-center text-orange-600 bg-orange-50 font-semibold">AB3</th>
                  <th className="p-2 text-center text-orange-800 bg-orange-200 font-bold">TOT</th>
                  <th className="p-2 text-center text-indigo-600 bg-indigo-50 border-l-4 border-indigo-300 font-semibold">AB1</th>
                  <th className="p-2 text-center text-indigo-600 bg-indigo-50 font-semibold">AB2</th>
                  <th className="p-2 text-center text-indigo-600 bg-indigo-50 font-semibold">AB3</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((d, idx) => {
                  const initTot = d.initAB1 + d.initAB2 + d.initAB3;
                  const entTot = d.entAB1 + d.entAB2 + d.entAB3;
                  const sortTot = (d.sortAB1 || 0) + (d.sortAB2 || 0) + (d.sortAB3 || 0);
                  const consTot = d.consAB1 + d.consAB2 + d.consAB3;
                  const V = (val, color) => val > 0.01 ? <span className={color}>{fmt(val)}</span> : <span className="text-gray-300">-</span>;
                  
                  // Helper for entry with transfer info - same color
                  const VE = (entVal, transVal, color) => {
                    if (entVal <= 0.01) return <span className="text-gray-300">-</span>;
                    const fournVal = entVal - (transVal || 0); // Entrée fournisseur = total - transfert
                    if (transVal > 0) {
                      return (
                        <div className="flex flex-col items-center">
                          <span className={color}>{fmt(fournVal)}</span>
                          <span className={`${color} text-xs`}>(↔{fmt(transVal)})</span>
                        </div>
                      );
                    }
                    return <span className={color}>{fmt(entVal)}</span>;
                  };
                  
                  return (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-semibold text-gray-800">{d.name}</div>
                        <div className="text-xs text-gray-400">{d.category}</div>
                      </td>
                      <td className="p-2 text-center text-gray-500 text-xs">{d.unit}</td>
                      <td className="p-2 text-center text-gray-600">{fmt(d.price)}</td>
                      <td className="p-2 text-center bg-blue-50/40 border-l-4 border-blue-100">{V(d.initAB1, 'text-blue-600')}</td>
                      <td className="p-2 text-center bg-blue-50/40">{V(d.initAB2, 'text-blue-600')}</td>
                      <td className="p-2 text-center bg-blue-50/40">{V(d.initAB3, 'text-blue-600')}</td>
                      <td className="p-2 text-center bg-blue-100/60 font-bold text-blue-800">{initTot > 0 ? fmt(initTot) : '-'}</td>
                      <td className="p-2 text-center bg-green-50/40 border-l-4 border-green-100">{VE(d.entAB1, d.transInAB1 || 0, 'text-green-600')}</td>
                      <td className="p-2 text-center bg-green-50/40">{VE(d.entAB2, d.transInAB2 || 0, 'text-green-600')}</td>
                      <td className="p-2 text-center bg-green-50/40">{VE(d.entAB3, d.transInAB3 || 0, 'text-green-600')}</td>
                      <td className="p-2 text-center bg-green-100/60 font-bold text-green-800">{entTot > 0 ? fmt(entTot) : '-'}</td>
                      <td className="p-2 text-center bg-purple-50/40 border-l-4 border-purple-100">{V(d.sortAB1, 'text-purple-600')}</td>
                      <td className="p-2 text-center bg-purple-50/40">{V(d.sortAB2, 'text-purple-600')}</td>
                      <td className="p-2 text-center bg-purple-50/40">{V(d.sortAB3, 'text-purple-600')}</td>
                      <td className="p-2 text-center bg-purple-100/60 font-bold text-purple-800">{sortTot > 0 ? fmt(sortTot) : '-'}</td>
                      <td className="p-2 text-center bg-orange-50/40 border-l-4 border-orange-100">{V(d.consAB1, 'text-orange-600')}</td>
                      <td className="p-2 text-center bg-orange-50/40">{V(d.consAB2, 'text-orange-600')}</td>
                      <td className="p-2 text-center bg-orange-50/40">{V(d.consAB3, 'text-orange-600')}</td>
                      <td className="p-2 text-center bg-orange-100/60 font-bold text-orange-700">{consTot > 0 ? fmt(consTot) : '-'}</td>
                      <td className={`p-2 text-center bg-indigo-50/40 border-l-4 border-indigo-100 ${d.finAB1 < 0 ? 'text-red-500 font-bold' : 'text-indigo-600'}`}>
                        {Math.abs(d.finAB1) > 0.01 ? fmt(d.finAB1) : '-'}
                      </td>
                      <td className={`p-2 text-center bg-indigo-50/40 ${d.finAB2 < 0 ? 'text-red-500 font-bold' : 'text-indigo-600'}`}>
                        {Math.abs(d.finAB2) > 0.01 ? fmt(d.finAB2) : '-'}
                      </td>
                      <td className={`p-2 text-center bg-indigo-50/40 ${d.finAB3 < 0 ? 'text-red-500 font-bold' : 'text-indigo-600'}`}>
                        {Math.abs(d.finAB3) > 0.01 ? fmt(d.finAB3) : '-'}
                      </td>
                    </tr>
                  );
                })}
                {/* TOTAUX Row - Only TOT columns */}
                <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold">
                  <td className="p-3 text-right" colSpan={3}>TOTAUX</td>
                  {/* Stock Initial */}
                  <td colSpan={3} className="p-2 text-center bg-blue-50"></td>
                  <td className="p-2 text-center bg-blue-200 text-blue-800">
                    <div>{fmt(totals.initQty)}</div>
                  </td>
                  {/* Entrées */}
                  <td colSpan={3} className="p-2 text-center bg-green-50"></td>
                  <td className="p-2 text-center bg-green-200 text-green-800">
                    <div>+{fmt(totals.entQty)}</div>
                  </td>
                  {/* Sorties */}
                  <td colSpan={3} className="p-2 text-center bg-purple-50"></td>
                  <td className="p-2 text-center bg-purple-200 text-purple-800">
                    <div>-{fmt(totals.sortQty)}</div>
                  </td>
                  {/* Consommation */}
                  <td colSpan={3} className="p-2 text-center bg-orange-50"></td>
                  <td className="p-2 text-center bg-orange-200 text-orange-800">
                    <div>-{fmt(totals.consQty)}</div>
                  </td>
                  {/* Stock Final */}
                  <td colSpan={3} className="p-2 text-center bg-indigo-100 text-indigo-700 font-bold">
                    <div>{fmt(totals.finQty)}</div>
                  </td>
                </tr>
                {/* VALEUR (MAD) Row */}
                <tr className="bg-gray-50 font-bold">
                  <td className="p-3 text-right" colSpan={3}>VALEUR (MAD)</td>
                  {/* Stock Initial */}
                  <td colSpan={3} className="p-2 text-center bg-blue-50"></td>
                  <td className="p-2 text-center bg-blue-100 text-blue-700 text-sm">
                    <div>{fmtMoney(totals.initVal)}</div>
                  </td>
                  {/* Entrées */}
                  <td colSpan={3} className="p-2 text-center bg-green-50"></td>
                  <td className="p-2 text-center bg-green-100 text-green-700 text-sm">
                    <div>+{fmtMoney(totals.entVal)}</div>
                  </td>
                  {/* Sorties */}
                  <td colSpan={3} className="p-2 text-center bg-purple-50"></td>
                  <td className="p-2 text-center bg-purple-100 text-purple-700 text-sm">
                    <div>-{fmtMoney(totals.sortVal)}</div>
                  </td>
                  {/* Consommation */}
                  <td colSpan={3} className="p-2 text-center bg-orange-50"></td>
                  <td className="p-2 text-center bg-orange-100 text-orange-700 text-sm">
                    <div>-{fmtMoney(totals.consVal)}</div>
                  </td>
                  {/* Stock Final */}
                  <td colSpan={3} className="p-2 text-center bg-indigo-100 text-indigo-700 font-bold text-sm">
                    <div>{fmtMoney(totals.finVal)}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Détails des Entrées par Fournisseur */}
      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b bg-green-50">
          <h3 className="font-semibold text-green-700 flex items-center gap-2">
            📥 Détails des Entrées par Source
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-3 font-semibold text-gray-700">Article</th>
                <th className="text-center p-3 font-semibold text-gray-700">Ferme Dest.</th>
                <th className="text-left p-3 font-semibold text-gray-700">Source</th>
                <th className="text-center p-3 font-semibold text-gray-700">Type</th>
                <th className="text-center p-3 font-semibold text-gray-700">Unité</th>
                <th className="text-right p-3 font-semibold text-gray-700">Prix Unit.</th>
                <th className="text-right p-3 font-semibold text-green-600">Quantité</th>
                <th className="text-right p-3 font-semibold text-green-600">Valeur (MAD)</th>
              </tr>
            </thead>
            <tbody>
              {entryDetails.map((e, idx) => {
                const isTransfer = e.type === 'transfer-in';
                const sourceName = isTransfer 
                  ? (e.fromFarm?.includes('1') ? 'AB1' : e.fromFarm?.includes('2') ? 'AB2' : 'AB3')
                  : (e.supplier || 'Magasin');
                return (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{e.product}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        e.farm?.includes('1') ? 'bg-blue-100 text-blue-700' :
                        e.farm?.includes('2') ? 'bg-green-100 text-green-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {e.farm?.includes('1') ? 'AB1' : e.farm?.includes('2') ? 'AB2' : 'AB3'}
                      </span>
                    </td>
                    <td className="p-3">
                      {isTransfer ? (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          e.fromFarm?.includes('1') ? 'bg-blue-100 text-blue-700' :
                          e.fromFarm?.includes('2') ? 'bg-green-100 text-green-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {sourceName}
                        </span>
                      ) : (
                        <span className="text-gray-700">{sourceName}</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        isTransfer ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isTransfer ? '↔️ Transfert' : '🏭 Fournisseur'}
                      </span>
                    </td>
                    <td className="p-3 text-center text-gray-500">{e.unit}</td>
                    <td className="p-3 text-right">{fmt(e.price)}</td>
                    <td className="p-3 text-right text-green-600 font-medium">+{fmt(e.quantity)}</td>
                    <td className="p-3 text-right text-green-600">{fmtMoney(e.quantity * e.price)}</td>
                  </tr>
                );
              })}
              {entryDetails.length === 0 && (
                <tr><td colSpan={8} className="p-4 text-center text-gray-400">Aucune entrée pour cette période</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Détails des Sorties (Transferts entre fermes) */}
      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b bg-purple-50">
          <h3 className="font-semibold text-purple-700 flex items-center gap-2">
            ↔️ Détails des Transferts entre Fermes (Sorties)
          </h3>
          <p className="text-xs text-purple-600 mt-1">Produits transférés d'une ferme vers une autre</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-3 font-semibold text-gray-700">Article</th>
                <th className="text-center p-3 font-semibold text-orange-600">De (Source)</th>
                <th className="text-center p-3 font-semibold text-gray-500">→</th>
                <th className="text-center p-3 font-semibold text-green-600">Vers (Destination)</th>
                <th className="text-center p-3 font-semibold text-gray-700">Unité</th>
                <th className="text-right p-3 font-semibold text-gray-700">Prix Unit.</th>
                <th className="text-right p-3 font-semibold text-purple-600">Quantité</th>
                <th className="text-right p-3 font-semibold text-purple-600">Valeur (MAD)</th>
              </tr>
            </thead>
            <tbody>
              {sortieDetails.length > 0 ? sortieDetails.map((s, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{s.product}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        s.fromFarm?.includes('1') ? 'bg-blue-100 text-blue-700' :
                        s.fromFarm?.includes('2') ? 'bg-green-100 text-green-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {s.fromFarm?.includes('1') ? 'AB1' : s.fromFarm?.includes('2') ? 'AB2' : 'AB3'}
                      </span>
                    </td>
                    <td className="p-3 text-center text-gray-400">→</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        s.toFarm?.includes('1') ? 'bg-blue-100 text-blue-700' :
                        s.toFarm?.includes('2') ? 'bg-green-100 text-green-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {s.toFarm?.includes('1') ? 'AB1' : s.toFarm?.includes('2') ? 'AB2' : 'AB3'}
                      </span>
                    </td>
                    <td className="p-3 text-center text-gray-500">{s.unit}</td>
                    <td className="p-3 text-right">{fmt(s.price)}</td>
                    <td className="p-3 text-right text-purple-600 font-medium">-{fmt(s.quantity)}</td>
                    <td className="p-3 text-right text-purple-600">{fmtMoney(s.quantity * s.price)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={8} className="p-4 text-center text-gray-400">Aucun transfert sortant pour cette période</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

      {/* Détails des Consommations par Culture */}
      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b bg-orange-50">
          <h3 className="font-semibold text-orange-700 flex items-center gap-2">
            🔥 Détails des Consommations par Culture
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-3 font-semibold text-gray-700">Article</th>
                <th className="text-center p-3 font-semibold text-gray-700">Catégorie</th>
                <th className="text-center p-3 font-semibold text-gray-700">Ferme</th>
                <th className="text-left p-3 font-semibold text-gray-700">Culture</th>
                <th className="text-center p-3 font-semibold text-gray-700">Unité</th>
                <th className="text-right p-3 font-semibold text-gray-700">Prix Unit.</th>
                <th className="text-right p-3 font-semibold text-orange-600">Quantité</th>
                <th className="text-right p-3 font-semibold text-orange-600">Valeur (MAD)</th>
              </tr>
            </thead>
            <tbody>
              {consoDetails.map((c, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{c.product}</td>
                  <td className="p-3 text-center text-gray-500 text-xs">{c.category}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      c.farm?.includes('1') ? 'bg-blue-100 text-blue-700' :
                      c.farm?.includes('2') ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {c.farm?.includes('1') ? 'AB1' : c.farm?.includes('2') ? 'AB2' : 'AB3'}
                    </span>
                  </td>
                  <td className="p-3">{c.culture || '-'}</td>
                  <td className="p-3 text-center text-gray-500">{c.unit}</td>
                  <td className="p-3 text-right">{fmt(c.price)}</td>
                  <td className="p-3 text-right text-orange-600 font-medium">-{fmt(c.quantity)}</td>
                  <td className="p-3 text-right text-orange-600">{fmtMoney(c.quantity * c.price)}</td>
                </tr>
              ))}
              {consoDetails.length === 0 && (
                <tr><td colSpan={8} className="p-4 text-center text-gray-400">Aucune consommation pour cette période</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ConsoFermes;
