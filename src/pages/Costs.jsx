import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Select, StatCard, EmptyState, Button } from '../components/UI';
import { FARMS, COST_CATEGORIES, CULTURES, SUPERFICIES } from '../lib/constants';
import { fmt, fmtMoney, downloadExcel } from '../lib/utils';

const Costs = () => {
  const { movements } = useApp();
  const [selectedFarm, setSelectedFarm] = useState('AGRO BERRY 1');
  const [selectedCulture, setSelectedCulture] = useState('Myrtille');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const farmName = selectedFarm.includes('1') ? 'Agro Berry 1' : selectedFarm.includes('2') ? 'Agro Berry 2' : 'Agro Berry 3';
  const getSuperficie = (cat) => SUPERFICIES[farmName]?.[cat]?.reste || 24;

  const consumptions = useMemo(() => movements.filter(m => m.type === 'consumption' && m.farm === selectedFarm && (selectedCulture === 'ALL' || m.culture === selectedCulture)), [movements, selectedFarm, selectedCulture]);

  const costByCategory = useMemo(() => {
    const result = {};
    COST_CATEGORIES.forEach(cat => result[cat.id] = { total: 0, qty: 0, products: [] });
    consumptions.forEach(c => {
      const dest = c.destination || 'Sol';
      let category = 'Pesticides';
      if (dest === 'Sol') category = 'Engrais Poudre Sol';
      else if (dest === 'Hydro') category = 'Engrais Poudre Hydroponic';
      else if (dest === 'Foliaire') category = 'Engrais Foliaire';
      if (!result[category]) result[category] = { total: 0, qty: 0, products: [] };
      const cost = (c.quantity || 0) * (c.price || 0);
      result[category].total += cost;
      result[category].qty += c.quantity || 0;
      const existing = result[category].products.find(p => p.name === c.product);
      if (existing) { existing.qty += c.quantity || 0; existing.cost += cost; }
      else result[category].products.push({ name: c.product, qty: c.quantity || 0, cost, price: c.price || 0 });
    });
    return result;
  }, [consumptions]);

  const totalCost = Object.values(costByCategory).reduce((s, c) => s + c.total, 0);
  const totalQty = Object.values(costByCategory).reduce((s, c) => s + c.qty, 0);
  const globalSuperficie = getSuperficie(selectedCategory === 'ALL' ? 'Pesticides' : selectedCategory);
  const costPerHa = totalCost / globalSuperficie;

  const filteredData = selectedCategory === 'ALL'
    ? Object.entries(costByCategory).flatMap(([cat, data]) => data.products.map(p => ({ ...p, category: cat })))
    : costByCategory[selectedCategory]?.products || [];

  const handleExport = async () => {
    const data = filteredData.map(p => ({ Produit: p.name, Catégorie: p.category || selectedCategory, Quantité: p.qty, Coût: p.cost }));
    await downloadExcel(data, `couts-${farmName}.xlsx`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ios-dark">Coûts Production</h1>
          <p className="text-ios-gray text-sm mt-1">Analyse par catégorie</p>
        </div>
        <Button variant="secondary" onClick={handleExport}>📥 Export</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select label="Ferme" value={selectedFarm} onChange={setSelectedFarm} options={FARMS.map(f => ({ value: f.id, label: f.name }))} />
        <Select label="Culture" value={selectedCulture} onChange={setSelectedCulture} options={[{ value: 'ALL', label: 'Toutes' }, ...CULTURES.map(c => ({ value: c.id, label: c.name }))]} />
        <Select label="Catégorie" value={selectedCategory} onChange={setSelectedCategory} options={[{ value: 'ALL', label: 'Toutes' }, ...COST_CATEGORIES.map(c => ({ value: c.id, label: c.name }))]} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="💰" label="Coût Total" value={fmtMoney(totalCost)} color="orange" />
        <StatCard icon="📊" label="Coût/Ha" value={fmtMoney(costPerHa)} color="blue" />
        <StatCard icon="📦" label="Produits" value={filteredData.length} color="green" />
        <StatCard icon="⚖️" label="Quantité" value={fmt(totalQty)} color="purple" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {COST_CATEGORIES.map(cat => {
          const data = costByCategory[cat.id] || { total: 0 };
          const sup = getSuperficie(cat.id);
          return (
            <Card key={cat.id} onClick={() => setSelectedCategory(cat.id)}
              className={`cursor-pointer text-center ${selectedCategory === cat.id ? 'ring-2 ring-ios-blue' : ''}`}>
              <span className="text-2xl">{cat.icon}</span>
              <p className="text-xs text-ios-gray mt-1">{cat.name}</p>
              <p className="font-bold text-ios-green">{fmtMoney(data.total)}</p>
              <p className="text-xs text-ios-gray">{fmt(data.total / sup)}/ha</p>
            </Card>
          );
        })}
      </div>
      <Card>
        <h3 className="font-semibold text-ios-dark mb-3">Détail</h3>
        {filteredData.length === 0 ? <EmptyState icon="💰" message="Aucune donnée" /> : (
          <table className="ios-table">
            <thead><tr><th>Produit</th><th className="hidden sm:table-cell">Cat.</th><th className="text-right">Qté</th><th className="text-right">Coût</th></tr></thead>
            <tbody>{filteredData.sort((a, b) => b.cost - a.cost).map((p, i) => (
              <tr key={i}>
                <td className="font-medium text-ios-dark">{p.name}</td>
                <td className="text-ios-gray hidden sm:table-cell">{p.category || selectedCategory}</td>
                <td className="text-right">{fmt(p.qty)}</td>
                <td className="text-right font-semibold text-ios-orange">{fmtMoney(p.cost)}</td>
              </tr>
            ))}</tbody>
            <tfoot><tr className="border-t border-gray-200"><td colSpan="2" className="font-bold py-3">TOTAL</td><td className="text-right font-bold py-3">{fmt(totalQty)}</td><td className="text-right font-bold text-ios-orange py-3">{fmtMoney(totalCost)}</td></tr></tfoot>
          </table>
        )}
      </Card>
    </div>
  );
};
export default Costs;
