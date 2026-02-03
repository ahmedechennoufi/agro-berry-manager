import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Button, Input, Select, Modal, Badge, StatCard, EmptyState } from '../components/UI';
import { FARMS } from '../lib/constants';
import { fmt, downloadExcel } from '../lib/utils';
import { getAveragePrice, calculateFarmStock } from '../lib/store';

const Transfers = () => {
  const { products, movements, addMovement, showNotif } = useApp();
  
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterFarm, setFilterFarm] = useState('ALL');
  const [form, setForm] = useState({
    product: '',
    quantity: '',
    fromFarm: FARMS[0]?.id || '',
    toFarm: FARMS[1]?.id || '',
    date: new Date().toISOString().split('T')[0]
  });

  // Calculate stock for source farm
  const sourceStock = useMemo(() => {
    if (!form.fromFarm) return {};
    return calculateFarmStock(form.fromFarm);
  }, [form.fromFarm, movements]);

  // Get stock quantity for selected product in source farm
  const productStockInSource = useMemo(() => {
    if (!form.product || !form.fromFarm) return null;
    const stock = sourceStock[form.product];
    return stock ? stock.quantity : 0;
  }, [form.product, form.fromFarm, sourceStock]);

  // Get product unit
  const getProductUnit = (productName) => {
    const product = products.find(p => p.name === productName);
    return product?.unit || 'KG';
  };

  // Get all transfers
  const transfers = useMemo(() => {
    return movements
      .filter(m => m.type === 'transfer-in' || m.type === 'transfer-out')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [movements]);

  // Group transfers by pair (in + out)
  const groupedTransfers = useMemo(() => {
    const transfersIn = movements.filter(m => m.type === 'transfer-in');
    return transfersIn.map(t => {
      const matchingOut = movements.find(m => 
        m.type === 'transfer-out' && 
        m.product === t.product && 
        m.date === t.date && 
        Math.abs((m.quantity || 0) - (t.quantity || 0)) < 0.01
      );
      return {
        id: t.id,
        date: t.date,
        product: t.product,
        quantity: t.quantity,
        fromFarm: matchingOut?.farm || 'Magasin',
        toFarm: t.farm,
        price: t.price || getAveragePrice(t.product) || 0
      };
    });
  }, [movements]);

  // Filter
  const filteredTransfers = useMemo(() => {
    return groupedTransfers.filter(t => {
      const matchSearch = !search || t.product?.toLowerCase().includes(search.toLowerCase());
      const matchFarm = filterFarm === 'ALL' || t.fromFarm === filterFarm || t.toFarm === filterFarm;
      return matchSearch && matchFarm;
    });
  }, [groupedTransfers, search, filterFarm]);

  // Stats by farm
  const farmStats = useMemo(() => {
    return FARMS.map(farm => {
      const incoming = groupedTransfers.filter(t => t.toFarm === farm.id);
      const outgoing = groupedTransfers.filter(t => t.fromFarm === farm.id);
      return {
        ...farm,
        incoming: incoming.length,
        outgoing: outgoing.length,
        inQty: incoming.reduce((s, t) => s + (t.quantity || 0), 0),
        outQty: outgoing.reduce((s, t) => s + (t.quantity || 0), 0)
      };
    });
  }, [groupedTransfers]);

  const handleSubmit = () => {
    if (!form.product || !form.quantity || !form.fromFarm || !form.toFarm) {
      showNotif('Remplir tous les champs', 'error');
      return;
    }
    if (form.fromFarm === form.toFarm) {
      showNotif('Les fermes doivent être différentes', 'error');
      return;
    }

    const price = getAveragePrice(form.product) || 0;
    const qty = parseFloat(form.quantity);

    // Sortie de la ferme source
    addMovement({
      type: 'transfer-out',
      product: form.product,
      quantity: qty,
      price,
      farm: form.fromFarm,
      date: form.date
    });

    // Entrée dans la ferme destination
    addMovement({
      type: 'transfer-in',
      product: form.product,
      quantity: qty,
      price,
      farm: form.toFarm,
      date: form.date
    });

    showNotif('Transfert enregistré');
    setShowModal(false);
    setForm({
      product: '',
      quantity: '',
      fromFarm: FARMS[0]?.id || '',
      toFarm: FARMS[1]?.id || '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleExport = async () => {
    const data = filteredTransfers.map(t => ({
      Date: t.date,
      Produit: t.product,
      Quantité: t.quantity,
      De: t.fromFarm?.replace('AGRO BERRY ', 'AB'),
      Vers: t.toFarm?.replace('AGRO BERRY ', 'AB')
    }));
    await downloadExcel(data, 'transferts.xlsx');
  };

  const getFarmShort = (farmId) => {
    if (!farmId) return '-';
    return farmId.replace('AGRO BERRY ', 'AB');
  };

  const getFarmColor = (farmId) => {
    if (farmId?.includes('1')) return 'green';
    if (farmId?.includes('2')) return 'blue';
    if (farmId?.includes('3')) return 'purple';
    return 'gray';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transferts</h1>
          <p className="text-gray-500 mt-1">Transferts entre fermes • {filteredTransfers.length} opérations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport}>📥 Export</Button>
          <Button onClick={() => setShowModal(true)}>+ Transfert</Button>
        </div>
      </div>

      {/* Farm Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {farmStats.map((farm, idx) => (
          <Card key={farm.id} className="hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                style={{ backgroundColor: ['#dcfce7', '#dbeafe', '#f3e8ff'][idx] }}
              >
                🔄
              </div>
              <div>
                <p className="font-semibold text-gray-900">{farm.short}</p>
                <p className="text-sm text-gray-500">{farm.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-red-50 rounded-xl">
                <p className="text-xl font-bold text-red-600">↓ {farm.incoming}</p>
                <p className="text-xs text-gray-500">Reçus ({fmt(farm.inQty)})</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-xl">
                <p className="text-xl font-bold text-green-600">↑ {farm.outgoing}</p>
                <p className="text-xs text-gray-500">Envoyés ({fmt(farm.outQty)})</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input placeholder="🔍 Rechercher un produit..." value={search} onChange={setSearch} />
          </div>
          <Select 
            value={filterFarm} 
            onChange={setFilterFarm}
            options={[
              { value: 'ALL', label: 'Toutes les fermes' },
              ...FARMS.map(f => ({ value: f.id, label: f.name }))
            ]}
            className="md:w-56"
          />
        </div>
      </Card>

      {/* Table */}
      <Card>
        {filteredTransfers.length === 0 ? (
          <EmptyState icon="🔄" message="Aucun transfert enregistré" action={
            <Button onClick={() => setShowModal(true)}>+ Nouveau Transfert</Button>
          } />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Produit</th>
                  <th className="text-right">Quantité</th>
                  <th className="text-center">De</th>
                  <th className="text-center"></th>
                  <th className="text-center">Vers</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.map((t, idx) => (
                  <tr key={t.id || idx}>
                    <td className="text-gray-600 whitespace-nowrap">{t.date}</td>
                    <td className="font-medium text-gray-900">{t.product}</td>
                    <td className="text-right font-semibold">{fmt(t.quantity)}</td>
                    <td className="text-center">
                      <Badge color={getFarmColor(t.fromFarm)}>{getFarmShort(t.fromFarm)}</Badge>
                    </td>
                    <td className="text-center text-gray-400">→</td>
                    <td className="text-center">
                      <Badge color={getFarmColor(t.toFarm)}>{getFarmShort(t.toFarm)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="🔄 Nouveau Transfert">
        <div className="space-y-4">
          <Select 
            label="Produit *" 
            value={form.product} 
            onChange={(v) => setForm({ ...form, product: v })}
            options={[
              { value: '', label: 'Sélectionner un produit...' },
              ...products.map(p => ({ value: p.name, label: p.name }))
            ]} 
          />
          
          <Input 
            label="Quantité *" 
            type="number" 
            value={form.quantity} 
            onChange={(v) => setForm({ ...form, quantity: v })} 
            placeholder="0"
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Ferme Source *" 
              value={form.fromFarm} 
              onChange={(v) => setForm({ ...form, fromFarm: v })}
              options={FARMS.map(f => ({ value: f.id, label: f.name }))} 
            />
            <Select 
              label="Ferme Destination *" 
              value={form.toFarm} 
              onChange={(v) => setForm({ ...form, toFarm: v })}
              options={FARMS.map(f => ({ value: f.id, label: f.name }))} 
            />
          </div>

          {/* Stock disponible dans la ferme source */}
          {form.product && form.fromFarm && (
            <div className={`p-4 rounded-xl border-2 flex items-center justify-between ${
              productStockInSource > 0 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">📦</span>
                <span className="text-gray-700">
                  Stock {FARMS.find(f => f.id === form.fromFarm)?.short || form.fromFarm}:
                </span>
              </div>
              <span className={`text-xl font-bold ${
                productStockInSource > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {fmt(productStockInSource || 0)} {getProductUnit(form.product)}
              </span>
            </div>
          )}

          {/* Alerte stock insuffisant */}
          {form.product && form.quantity && productStockInSource !== null && parseFloat(form.quantity) > productStockInSource && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <p className="text-sm text-orange-600">⚠️ Stock insuffisant ! Disponible: {fmt(productStockInSource)} {getProductUnit(form.product)}</p>
            </div>
          )}

          {form.fromFarm === form.toFarm && form.fromFarm && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">⚠️ Les fermes source et destination doivent être différentes</p>
            </div>
          )}
          
          <Input 
            label="Date" 
            type="date" 
            value={form.date} 
            onChange={(v) => setForm({ ...form, date: v })} 
          />
          
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Annuler</Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={form.fromFarm === form.toFarm}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Transfers;
