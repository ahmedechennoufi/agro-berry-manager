import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Select, Input, Button, EmptyState, StatCard } from '../components/UI';
import { MONTHS, CATEGORIES } from '../lib/constants';
import { fmt, fmtMoney, downloadExcel } from '../lib/utils';
import { getInventoryByMonth, getAveragePrice } from '../lib/store';

const ConsoFermes = () => {
  const { products, movements, inventory } = useApp();
  const [selectedMonth, setSelectedMonth] = useState('DECEMBRE');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  const tableData = useMemo(() => {
    const monthInventory = getInventoryByMonth(selectedMonth);
    const dataMap = {};

    products.forEach(p => {
      dataMap[p.name] = {
        name: p.name, category: p.category || 'AUTRES', unit: p.unit || 'KG',
        price: getAveragePrice(p.name) || 0,
        initAB1: 0, initAB2: 0, initAB3: 0, initTot: 0,
        entAB1: 0, entAB2: 0, entAB3: 0, entTot: 0,
        sortAB1: 0, sortAB2: 0, sortAB3: 0, sortTot: 0,
        consAB1: 0, consAB2: 0, consAB3: 0, consTot: 0,
        finAB1: 0, finAB2: 0, finAB3: 0
      };
    });

    monthInventory.forEach(inv => {
      if (!dataMap[inv.product]) {
        dataMap[inv.product] = {
          name: inv.product, category: 'AUTRES', unit: 'KG', price: getAveragePrice(inv.product) || 0,
          initAB1: 0, initAB2: 0, initAB3: 0, initTot: 0,
          entAB1: 0, entAB2: 0, entAB3: 0, entTot: 0,
          sortAB1: 0, sortAB2: 0, sortAB3: 0, sortTot: 0,
          consAB1: 0, consAB2: 0, consAB3: 0, consTot: 0,
          finAB1: 0, finAB2: 0, finAB3: 0
        };
      }
      dataMap[inv.product].initAB1 = inv.agb1 || 0;
      dataMap[inv.product].initAB2 = inv.agb2 || 0;
      dataMap[inv.product].initAB3 = inv.agb3 || 0;
      dataMap[inv.product].initTot = (inv.agb1 || 0) + (inv.agb2 || 0) + (inv.agb3 || 0);
    });

    movements.forEach(m => {
      const prodName = m.product;
      if (!prodName || !dataMap[prodName]) return;
      const data = dataMap[prodName];
      const qty = m.quantity || 0;
      const farm = m.farm || '';

      if (m.type === 'exit') {
        if (farm.includes('1')) data.entAB1 += qty;
        else if (farm.includes('2')) data.entAB2 += qty;
        else if (farm.includes('3')) data.entAB3 += qty;
        data.entTot += qty;
      }
      if (m.type === 'transfer-in') {
        const toFarm = m.toFarm || m.farm || '';
        if (toFarm.includes('1')) data.entAB1 += qty;
        else if (toFarm.includes('2')) data.entAB2 += qty;
        else if (toFarm.includes('3')) data.entAB3 += qty;
        data.entTot += qty;
      }
      if (m.type === 'transfer-out') {
        const fromFarm = m.fromFarm || m.farm || '';
        if (fromFarm.includes('1')) data.sortAB1 += qty;
        else if (fromFarm.includes('2')) data.sortAB2 += qty;
        else if (fromFarm.includes('3')) data.sortAB3 += qty;
        data.sortTot += qty;
      }
      if (m.type === 'consumption') {
        if (farm.includes('1')) data.consAB1 += qty;
        else if (farm.includes('2')) data.consAB2 += qty;
        else if (farm.includes('3')) data.consAB3 += qty;
        data.consTot += qty;
      }
    });

    Object.values(dataMap).forEach(data => {
      data.finAB1 = data.initAB1 + data.entAB1 - data.sortAB1 - data.consAB1;
      data.finAB2 = data.initAB2 + data.entAB2 - data.sortAB2 - data.consAB2;
      data.finAB3 = data.initAB3 + data.entAB3 - data.sortAB3 - data.consAB3;
    });

    return Object.values(dataMap)
      .filter(d => {
        const hasData = d.initTot > 0 || d.entTot > 0 || d.sortTot > 0 || d.consTot > 0 || d.finAB1 !== 0 || d.finAB2 !== 0 || d.finAB3 !== 0;
        const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
        const matchCategory = filterCategory === 'ALL' || d.category === filterCategory;
        return hasData && matchSearch && matchCategory;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, movements, inventory, selectedMonth, search, filterCategory]);

  const totals = useMemo(() => {
    const t = { initVal: 0, entVal: 0, consVal: 0, finVal: 0 };
    tableData.forEach(d => {
      t.initVal += d.initTot * d.price;
      t.entVal += d.entTot * d.price;
      t.consVal += d.consTot * d.price;
      t.finVal += (d.finAB1 + d.finAB2 + d.finAB3) * d.price;
    });
    return t;
  }, [tableData]);

  const handleExport = async () => {
    const data = tableData.map(d => ({
      Article: d.name, Cat: d.category, Unité: d.unit, Prix: d.price,
      'Init AB1': d.initAB1, 'Init AB2': d.initAB2, 'Init AB3': d.initAB3,
      'Ent AB1': d.entAB1, 'Ent AB2': d.entAB2, 'Ent AB3': d.entAB3,
      'Cons AB1': d.consAB1, 'Cons AB2': d.consAB2, 'Cons AB3': d.consAB3,
      'Fin AB1': d.finAB1, 'Fin AB2': d.finAB2, 'Fin AB3': d.finAB3
    }));
    await downloadExcel(data, `consommation-${selectedMonth}.xlsx`);
  };

  const Cell = ({ val, positive = true, bold = false }) => {
    if (!val || val === 0) return <span className="text-gray-300">-</span>;
    const color = bold ? 'text-ios-dark' : positive ? 'text-ios-green' : 'text-ios-red';
    return <span className={`${color} ${bold ? 'font-semibold' : ''}`}>{positive && val > 0 ? '+' : ''}{fmt(val)}</span>;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ios-dark">🔥 Consommation Fermes</h1>
          <p className="text-ios-gray text-sm mt-1">Stock Initial + Entrées - Sorties - Conso = Stock Final</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedMonth} onChange={setSelectedMonth}
            options={MONTHS.map(m => ({ value: m.id, label: m.name }))} className="w-40" />
          <Button variant="secondary" onClick={handleExport}>📥 Export</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📦" label="Stock Initial" value={fmtMoney(totals.initVal)} color="blue" />
        <StatCard icon="📥" label="Entrées" value={`+${fmtMoney(totals.entVal)}`} color="green" />
        <StatCard icon="🔥" label="Consommation" value={`-${fmtMoney(totals.consVal)}`} color="red" />
        <StatCard icon="📊" label="Stock Final" value={fmtMoney(totals.finVal)} color="purple" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="🔍 Rechercher..." value={search} onChange={setSearch} className="flex-1" />
        <Select value={filterCategory} onChange={setFilterCategory}
          options={[{ value: 'ALL', label: 'Toutes catégories' }, ...CATEGORIES.map(c => ({ value: c.id, label: c.name }))]}
          className="sm:w-48" />
      </div>

      {/* Table */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-ios-gray text-sm font-medium">{tableData.length} produits</span>
        </div>
        {tableData.length === 0 ? <EmptyState icon="📭" message="Aucune donnée" /> : (
          <div className="overflow-x-auto -mx-4">
            <table className="w-full text-sm min-w-[1000px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-ios-gray font-medium text-xs uppercase sticky left-0 bg-white">Article</th>
                  <th className="text-left py-3 px-2 text-ios-gray font-medium text-xs uppercase">Cat.</th>
                  <th className="text-center py-3 px-2 text-ios-gray font-medium text-xs uppercase">Unité</th>
                  <th className="text-right py-3 px-2 text-ios-gray font-medium text-xs uppercase">Prix</th>
                  {/* Stock Initial */}
                  <th className="text-right py-3 px-2 bg-blue-50 text-blue-600 font-medium text-xs">AB1</th>
                  <th className="text-right py-3 px-2 bg-blue-50 text-blue-600 font-medium text-xs">AB2</th>
                  <th className="text-right py-3 px-2 bg-blue-50 text-blue-600 font-medium text-xs">AB3</th>
                  <th className="text-right py-3 px-2 bg-blue-100 text-blue-700 font-semibold text-xs">TOT</th>
                  {/* Entrées */}
                  <th className="text-right py-3 px-2 bg-green-50 text-green-600 font-medium text-xs">AB1</th>
                  <th className="text-right py-3 px-2 bg-green-50 text-green-600 font-medium text-xs">AB2</th>
                  <th className="text-right py-3 px-2 bg-green-50 text-green-600 font-medium text-xs">AB3</th>
                  <th className="text-right py-3 px-2 bg-green-100 text-green-700 font-semibold text-xs">TOT</th>
                  {/* Sorties */}
                  <th className="text-right py-3 px-2 bg-orange-50 text-orange-600 font-medium text-xs">AB1</th>
                  <th className="text-right py-3 px-2 bg-orange-50 text-orange-600 font-medium text-xs">AB2</th>
                  <th className="text-right py-3 px-2 bg-orange-50 text-orange-600 font-medium text-xs">AB3</th>
                  <th className="text-right py-3 px-2 bg-orange-100 text-orange-700 font-semibold text-xs">TOT</th>
                  {/* Consommation */}
                  <th className="text-right py-3 px-2 bg-red-50 text-red-600 font-medium text-xs">AB1</th>
                  <th className="text-right py-3 px-2 bg-red-50 text-red-600 font-medium text-xs">AB2</th>
                  <th className="text-right py-3 px-2 bg-red-50 text-red-600 font-medium text-xs">AB3</th>
                  <th className="text-right py-3 px-2 bg-red-100 text-red-700 font-semibold text-xs">TOT</th>
                  {/* Stock Final */}
                  <th className="text-right py-3 px-2 bg-purple-50 text-purple-600 font-medium text-xs">AB1</th>
                  <th className="text-right py-3 px-2 bg-purple-50 text-purple-600 font-medium text-xs">AB2</th>
                  <th className="text-right py-3 px-2 bg-purple-50 text-purple-600 font-medium text-xs">AB3</th>
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th colSpan="4" className="py-1 sticky left-0 bg-gray-50"></th>
                  <th colSpan="4" className="py-1 text-center text-[10px] text-blue-500 font-semibold bg-blue-50">📦 STOCK INITIAL</th>
                  <th colSpan="4" className="py-1 text-center text-[10px] text-green-500 font-semibold bg-green-50">📥 ENTRÉES</th>
                  <th colSpan="4" className="py-1 text-center text-[10px] text-orange-500 font-semibold bg-orange-50">📤 SORTIES</th>
                  <th colSpan="4" className="py-1 text-center text-[10px] text-red-500 font-semibold bg-red-50">🔥 CONSO</th>
                  <th colSpan="3" className="py-1 text-center text-[10px] text-purple-500 font-semibold bg-purple-50">📊 FINAL</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((d, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2.5 px-4 font-medium text-ios-dark sticky left-0 bg-white">{d.name}</td>
                    <td className="py-2.5 px-2 text-ios-gray text-xs">{d.category}</td>
                    <td className="py-2.5 px-2 text-center text-ios-gray">{d.unit}</td>
                    <td className="py-2.5 px-2 text-right text-ios-gray">{fmt(d.price)}</td>
                    {/* Stock Initial */}
                    <td className="py-2.5 px-2 text-right bg-blue-50/50"><Cell val={d.initAB1} /></td>
                    <td className="py-2.5 px-2 text-right bg-blue-50/50"><Cell val={d.initAB2} /></td>
                    <td className="py-2.5 px-2 text-right bg-blue-50/50"><Cell val={d.initAB3} /></td>
                    <td className="py-2.5 px-2 text-right bg-blue-100/50 font-semibold text-ios-blue">{fmt(d.initTot) || '-'}</td>
                    {/* Entrées */}
                    <td className="py-2.5 px-2 text-right bg-green-50/50"><Cell val={d.entAB1} /></td>
                    <td className="py-2.5 px-2 text-right bg-green-50/50"><Cell val={d.entAB2} /></td>
                    <td className="py-2.5 px-2 text-right bg-green-50/50"><Cell val={d.entAB3} /></td>
                    <td className="py-2.5 px-2 text-right bg-green-100/50 font-semibold text-ios-green">{d.entTot > 0 ? `+${fmt(d.entTot)}` : '-'}</td>
                    {/* Sorties */}
                    <td className="py-2.5 px-2 text-right bg-orange-50/50"><Cell val={d.sortAB1} positive={false} /></td>
                    <td className="py-2.5 px-2 text-right bg-orange-50/50"><Cell val={d.sortAB2} positive={false} /></td>
                    <td className="py-2.5 px-2 text-right bg-orange-50/50"><Cell val={d.sortAB3} positive={false} /></td>
                    <td className="py-2.5 px-2 text-right bg-orange-100/50 font-semibold text-ios-orange">{d.sortTot > 0 ? `-${fmt(d.sortTot)}` : '-'}</td>
                    {/* Consommation */}
                    <td className="py-2.5 px-2 text-right bg-red-50/50"><Cell val={d.consAB1} positive={false} /></td>
                    <td className="py-2.5 px-2 text-right bg-red-50/50"><Cell val={d.consAB2} positive={false} /></td>
                    <td className="py-2.5 px-2 text-right bg-red-50/50"><Cell val={d.consAB3} positive={false} /></td>
                    <td className="py-2.5 px-2 text-right bg-red-100/50 font-semibold text-ios-red">{d.consTot > 0 ? `-${fmt(d.consTot)}` : '-'}</td>
                    {/* Stock Final */}
                    <td className="py-2.5 px-2 text-right bg-purple-50/50"><Cell val={d.finAB1} positive={d.finAB1 >= 0} /></td>
                    <td className="py-2.5 px-2 text-right bg-purple-50/50"><Cell val={d.finAB2} positive={d.finAB2 >= 0} /></td>
                    <td className="py-2.5 px-2 text-right bg-purple-50/50"><Cell val={d.finAB3} positive={d.finAB3 >= 0} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ConsoFermes;
