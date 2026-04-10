import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Button, Input, Select, Modal, StatCard, EmptyState } from '../components/UI';
import { FARMS, CULTURES, DESTINATIONS } from '../lib/constants';
import { fmt, today, downloadExcel } from '../lib/utils';
import { getAveragePrice, calculateFarmStock } from '../lib/store';

const MONTHS = [
  { value: 'ALL', label: 'Tous les mois' },
  { value: '2025-09', label: 'Septembre 2025' },
  { value: '2025-10', label: 'Octobre 2025' },
  { value: '2025-11', label: 'Novembre 2025' },
  { value: '2025-12', label: 'Décembre 2025' },
  { value: '2026-01', label: 'Janvier 2026' },
  { value: '2026-02', label: 'Février 2026' },
  { value: '2026-03', label: 'Mars 2026' },
  { value: '2026-04', label: 'Avril 2026' },
  { value: '2026-05', label: 'Mai 2026' },
  { value: '2026-06', label: 'Juin 2026' },
  { value: '2026-07', label: 'Juillet 2026' },
  { value: '2026-08', label: 'Août 2026' },
];

const Consumption = () => {
  const { products, movements, addMovement, showNotif } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [form, setForm] = useState({
    date: today(),
    product: '',
    quantity: '',
    farm: 'AGRO BERRY 1',
    culture: 'Myrtille',
    destination: 'Sol'
  });

  const farmStock = useMemo(() => {
    if (!form.farm) return {};
    return calculateFarmStock(form.farm);
  }, [form.farm, movements]);

  const availableStock = useMemo(() => {
    if (!form.product || !form.farm) return null;
    const stock = farmStock[form.product];
    return stock !== undefined ? stock.quantity : 0;
  }, [form.product, form.farm, farmStock]);

  const getProductUnit = (productName) => {
    const product = products.find(p => p.name === productName);
    return product?.unit || 'KG';
  };

  const allConsumptions = useMemo(() => {
    return movements.filter(m => m.type === 'consumption');
  }, [movements]);

  // Filtered by month
  const consumptions = useMemo(() => {
    return allConsumptions.filter(m => {
      if (selectedMonth === 'ALL') return true;
      return (m.date || '').startsWith(selectedMonth);
    });
  }, [allConsumptions, selectedMonth]);

  // Filtered by month + farm
  const filteredConsumptions = useMemo(() => {
    return consumptions.filter(m => selectedFarm === 'ALL' || m.farm === selectedFarm);
  }, [consumptions, selectedFarm]);

  const consoByProduct = useMemo(() => {
    const map = {};
    filteredConsumptions.forEach(m => {
      if (!map[m.product]) {
        map[m.product] = { name: m.product, total: 0, byFarm: {} };
      }
      map[m.product].total += m.quantity || 0;
      if (!map[m.product].byFarm[m.farm]) map[m.product].byFarm[m.farm] = 0;
      map[m.product].byFarm[m.farm] += m.quantity || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredConsumptions]);

  const handleExport = async () => {
    if (filteredConsumptions.length === 0) {
      showNotif('Aucune donnée à exporter', 'error');
      return;
    }
    const label = MONTHS.find(m => m.value === selectedMonth)?.label || selectedMonth;
    const farmLabel = selectedFarm === 'ALL' ? 'Toutes fermes' : selectedFarm;

    // Export détail ligne par ligne
    const rows = filteredConsumptions.map(m => ({
      Date: m.date || '',
      Produit: m.product || '',
      Quantité: m.quantity || 0,
      Unité: getProductUnit(m.product),
      Prix: m.price || 0,
      Valeur: ((m.quantity || 0) * (m.price || 0)).toFixed(2),
      Ferme: m.farm || '',
      Culture: m.culture || '',
      Destination: m.destination || '',
    }));

    const filename = `consommation-${label.replace(/\s+/g, '-')}-${farmLabel.replace(/\s+/g, '-')}.xlsx`;
    await downloadExcel(rows, filename);
    showNotif(`Export Excel : ${label} — ${farmLabel}`);
  };

  const handleSubmit = () => {
    if (!form.product || !form.quantity) return;
    if (form.farm && form.product) {
      const currentStock = availableStock ?? 0;
      const qty = parseFloat(form.quantity);
      if (qty > currentStock) {
        showNotif(`Stock insuffisant : ${fmt(currentStock)} ${getProductUnit(form.product)} disponible`, 'error');
        return;
      }
    }
    const price = getAveragePrice(form.product);
    addMovement({
      date: form.date,
      type: 'consumption',
      product: form.product,
      quantity: parseFloat(form.quantity),
      price: price,
      farm: form.farm,
      culture: form.culture,
      destination: form.destination
    });
    setShowModal(false);
    setForm({ date: today(), product: '', quantity: '', farm: 'AGRO BERRY 1', culture: 'Myrtille', destination: 'Sol' });
  };

  const selectedMonthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || selectedMonth;

  return (
    <div className="fade-in space-y-6">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">🔥 Consommation</h1>
          <p style={{ color: "var(--text-2)" }}>{allConsumptions.length} consommations enregistrées au total</p>
        </div>
        <Button onClick={() => setShowModal(true)}>🔥 Saisir Consommation</Button>
      </div>

      {/* Filtres + Export */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <Select
            label="Mois"
            value={selectedMonth}
            onChange={setSelectedMonth}
            options={MONTHS}
            className="md:w-56"
          />
          <Select
            label="Ferme"
            value={selectedFarm}
            onChange={setSelectedFarm}
            options={[
              { value: 'ALL', label: 'Toutes les fermes' },
              ...FARMS.map(f => ({ value: f.id, label: f.name }))
            ]}
            className="md:w-56"
          />
          <Button
            variant="secondary"
            onClick={handleExport}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            📥 Exporter Excel
          </Button>
        </div>
      </Card>

      {/* Stats par ferme */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FARMS.map(farm => {
          const farmConso = consumptions.filter(c => c.farm === farm.id);
          const total = farmConso.reduce((s, c) => s + (c.quantity || 0), 0);
          return (
            <StatCard
              key={farm.id}
              icon="🔥"
              label={farm.name}
              value={fmt(total)}
              subValue={`${farmConso.length} mouvements · ${selectedMonthLabel}`}
              color={farm.color}
            />
          );
        })}
      </div>

      <Card>
        <h3 className="font-bold text-gray-800 mb-4">
          Consommation par produit
          {selectedMonth !== 'ALL' && (
            <span className="ml-2 text-sm font-normal text-gray-500">— {selectedMonthLabel}</span>
          )}
        </h3>
        {consoByProduct.length === 0 ? (
          <EmptyState icon="🔥" message={`Aucune consommation pour ${selectedMonthLabel}`} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="w-full" style={{minWidth:"600px"}}>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Produit</th>
                  <th className="text-right py-3 px-4 font-medium text-blue-600">AGB1</th>
                  <th className="text-right py-3 px-4 font-medium text-orange-600">AGB2</th>
                  <th className="text-right py-3 px-4 font-medium text-green-600">AGB3</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-800">Total</th>
                </tr>
              </thead>
              <tbody>
                {consoByProduct.map((p, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{p.name}</td>
                    <td className="py-3 px-4 text-right text-blue-600">{fmt(p.byFarm['AGRO BERRY 1'] || 0)}</td>
                    <td className="py-3 px-4 text-right text-orange-600">{fmt(p.byFarm['AGRO BERRY 2'] || 0)}</td>
                    <td className="py-3 px-4 text-right text-green-600">{fmt(p.byFarm['AGRO BERRY 3'] || 0)}</td>
                    <td className="py-3 px-4 text-right font-bold text-red-600">{fmt(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="🔥 Saisir Consommation">
        <div className="space-y-4">
          <Input label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} required />
          <Select
            label="Ferme"
            value={form.farm}
            onChange={(v) => setForm({ ...form, farm: v, product: '', quantity: '' })}
            options={FARMS.map(f => ({ value: f.id, label: f.name }))}
          />
          <Select
            label="Produit"
            value={form.product}
            onChange={(v) => setForm({ ...form, product: v, quantity: '' })}
            options={[
              { value: '', label: 'Sélectionner...' },
              ...products.map(p => ({ value: p.name, label: p.name }))
            ]}
            required
          />
          {form.product && form.farm && availableStock !== null && (
            <div className={`p-3 rounded-xl border flex items-center gap-2 ${
              availableStock > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <span className="text-xl">📦</span>
              <div>
                <span className="text-sm font-medium text-gray-600">
                  Stock {form.farm.replace('AGRO BERRY ', 'AGB')} :
                </span>
                <span className={`ml-2 text-lg font-bold ${availableStock > 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {fmt(availableStock)} {getProductUnit(form.product)}
                </span>
                {availableStock <= 0 && (
                  <span className="ml-2 text-xs text-red-500 font-semibold">⚠️ Stock épuisé</span>
                )}
              </div>
            </div>
          )}
          <Input label="Quantité" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} required />
          <Select
            label="Culture"
            value={form.culture}
            onChange={(v) => setForm({ ...form, culture: v })}
            options={CULTURES.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))}
          />
          <Select
            label="Destination"
            value={form.destination}
            onChange={(v) => setForm({ ...form, destination: v })}
            options={DESTINATIONS.map(d => ({ value: d.id, label: `${d.icon} ${d.name}` }))}
          />
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Annuler</Button>
            <Button onClick={handleSubmit} style={{ flex: 1 }}>Enregistrer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Consumption;
