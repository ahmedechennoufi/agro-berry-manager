import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../App';
import { Card, Button, Input, Select, StatCard, EmptyState, Badge } from '../components/UI';
import { FARMS, CATEGORIES } from '../lib/constants';
import { fmt, fmtMoney, downloadExcel } from '../lib/utils';
import { calculateFarmStock, getAveragePrice, getDefaultThreshold, getProducts, getLatestPhysicalInventoryForFarm } from '../lib/store';

const FARM_COLORS = {
  'AGRO BERRY 1': { bg: '#f0faf2', accent: 'var(--green)', border: 'rgba(52,199,89,0.2)' },
  'AGRO BERRY 2': { bg: '#f0f6ff', accent: 'var(--blue)', border: 'rgba(0,122,255,0.2)' },
  'AGRO BERRY 3': { bg: '#f8f0ff', accent: 'var(--purple)', border: 'rgba(175,82,222,0.2)' },
};

const Farms = () => {
  const { movements } = useApp();
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStock, setFilterStock] = useState('ALL');
  const [sortBy, setSortBy] = useState('quantity');
  const [sortOrder, setSortOrder] = useState('desc');
  const threshold = getDefaultThreshold();
  const allProducts = getProducts();

  useEffect(() => {
    const preselectedFarmId = localStorage.getItem('selectedFarmId');
    if (preselectedFarmId) {
      const farm = FARMS.find(f => f.id === preselectedFarmId);
      if (farm) setSelectedFarm(farm);
      localStorage.removeItem('selectedFarmId');
    }
  }, []);

  const farmStockData = useMemo(() => {
    if (!selectedFarm) return [];
    const stockMap = calculateFarmStock(selectedFarm.id);
    return Object.entries(stockMap).map(([product, data]) => {
      const price = data.price || getAveragePrice(product) || 0;
      const quantity = data.quantity || 0;
      const productInfo = allProducts.find(p => p.name === product);
      const productThreshold = productInfo?.threshold || threshold;
      let status = 'normal';
      if (quantity <= 0) status = 'epuise';
      else if (quantity <= productThreshold) status = 'bas';
      return { name: product, quantity, price, value: quantity * price, category: productInfo?.category || 'AUTRES', status, threshold: productThreshold };
    }).filter(item => item.quantity !== 0 || item.status === 'epuise');
  }, [selectedFarm, threshold, allProducts, movements]);

  const filteredStock = useMemo(() => {
    let result = farmStockData.filter(item => {
      const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = filterCategory === 'ALL' || item.category === filterCategory;
      const matchStock = filterStock === 'ALL' || item.status === filterStock;
      return matchSearch && matchCategory && matchStock;
    });
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortBy === 'quantity') comparison = a.quantity - b.quantity;
      else if (sortBy === 'value') comparison = a.value - b.value;
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    return result;
  }, [farmStockData, search, filterCategory, filterStock, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const inStock = filteredStock.filter(s => s.quantity > 0);
    return {
      totalProducts: inStock.length,
      totalQuantity: inStock.reduce((s, p) => s + p.quantity, 0),
      totalValue: inStock.reduce((s, p) => s + p.value, 0),
      epuiseCount: farmStockData.filter(s => s.status === 'epuise').length,
      basCount: farmStockData.filter(s => s.status === 'bas').length,
    };
  }, [filteredStock, farmStockData]);

  const farmSummaries = useMemo(() => FARMS.map(farm => {
    const stockMap = calculateFarmStock(farm.id);
    const items = Object.entries(stockMap).filter(([_, d]) => d.quantity > 0);
    const totalQty = items.reduce((s, [_, p]) => s + p.quantity, 0);
    const totalValue = items.reduce((s, [name, p]) => {
      const price = p.price || getAveragePrice(name) || 0;
      return s + p.quantity * price;
    }, 0);
    return { ...farm, nbProducts: items.length, totalQty, totalValue };
  }), [movements]);

  const handleExport = async () => {
    if (!selectedFarm) return;
    const data = filteredStock.map(s => ({ Produit: s.name, Quantité: s.quantity, Prix: s.price, Valeur: s.value, Statut: s.status === 'epuise' ? 'Épuisé' : s.status === 'bas' ? 'Stock bas' : 'Normal' }));
    await downloadExcel(data, `stock-${selectedFarm.short}.xlsx`);
  };

  const resetFilters = () => { setSearch(''); setFilterCategory('ALL'); setFilterStock('ALL'); };

  const getStatusBadge = (status) => {
    if (status === 'epuise') return <Badge color="red">Épuisé</Badge>;
    if (status === 'bas') return <Badge color="orange">Stock bas</Badge>;
    return <Badge color="green">OK</Badge>;
  };

  const toggleSort = (field) => {
    if (sortBy === field) setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortOrder('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span style={{ color: 'var(--text-3)', marginLeft: 4 }}>↕</span>;
    return <span style={{ color: 'var(--blue)', marginLeft: 4 }}>{sortOrder === 'desc' ? '↓' : '↑'}</span>;
  };

  // Farm selection view
  if (!selectedFarm) {
    return (
      <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }} className="animate-fade-in">
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.3px' }}>Stock Fermes</h1>
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '4px 0 0' }}>Sélectionnez une ferme pour voir son stock</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {farmSummaries.map((farm, idx) => {
            const fc = FARM_COLORS[farm.id] || { bg: '#f9f9fb', accent: 'var(--blue)', border: 'var(--border)' };
            return (
              <div
                key={farm.id}
                onClick={() => setSelectedFarm(farm)}
                className="ios-card"
                style={{ padding: '24px', cursor: 'pointer', borderTop: `3px solid ${fc.accent}`, transition: 'all var(--transition)' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-lg)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, background: fc.bg }}>
                    🌱
                  </div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{farm.name}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '3px 0 0' }}>{farm.hectares} ha</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { label: 'Produits', value: farm.nbProducts, color: fc.accent },
                    { label: 'Quantité', value: fmt(farm.totalQty), color: 'var(--green)' },
                    { label: 'Valeur', value: fmtMoney(farm.totalValue), color: 'var(--orange)' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', padding: '10px 8px', background: 'var(--surface-2)', borderRadius: 10 }}>
                      <p style={{ fontSize: 18, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-2)', margin: '3px 0 0' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 500 }}>Voir le stock →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const fc = FARM_COLORS[selectedFarm.id] || { accent: 'var(--blue)' };

  // Farm detail view
  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => setSelectedFarm(null)}
            style={{ padding: '8px 14px', borderRadius: 'var(--radius)', background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}
          >← Retour</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: fc.bg || 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌱</div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{selectedFarm.name}</h1>
              <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '3px 0 0' }}>{selectedFarm.hectares} ha · {stats.totalProducts} produits</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={resetFilters}>🔄 Reset</Button>
          <Button variant="secondary" onClick={handleExport}>📥 Export</Button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard icon="📦" label="Produits" value={stats.totalProducts} color="blue" />
        <StatCard icon="📊" label="Quantité" value={fmt(stats.totalQuantity)} color="green" />
        <StatCard icon="💰" label="Valeur" value={fmtMoney(stats.totalValue)} color="orange" />
        <div onClick={() => setFilterStock(filterStock === 'epuise' ? 'ALL' : 'epuise')} style={{ cursor: 'pointer' }}>
          <StatCard icon="🔴" label="Épuisé" value={stats.epuiseCount} color="red" />
        </div>
        <div onClick={() => setFilterStock(filterStock === 'bas' ? 'ALL' : 'bas')} style={{ cursor: 'pointer' }}>
          <StatCard icon="⚠️" label="Stock bas" value={stats.basCount} color="orange" />
        </div>
      </div>

      {/* Physical inventory reference */}
      {(() => {
        const refInventory = getLatestPhysicalInventoryForFarm(selectedFarm.id);
        if (!refInventory) return null;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#f0faf2', border: '1px solid rgba(52,199,89,0.2)', borderRadius: 'var(--radius)', marginBottom: 20 }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <span style={{ fontSize: 13, color: '#1a8a36', fontWeight: 500 }}>
              Basé sur l'inventaire physique du {refInventory.date.split('-').reverse().join('/')} + mouvements depuis cette date
            </span>
          </div>
        );
      })()}

      {/* Filter Pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[{ id: 'ALL', label: 'Tous' }, { id: 'epuise', label: '🔴 Épuisé' }, { id: 'bas', label: '⚠️ Bas' }, { id: 'normal', label: '✅ Normal' }].map(f => (
          <button key={f.id} onClick={() => setFilterStock(f.id)} className={`filter-pill ${filterStock === f.id ? 'active' : ''}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Search & Category */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input placeholder="🔍 Rechercher..." value={search} onChange={setSearch} uppercase={false} />
        </div>
        <Select
          value={filterCategory}
          onChange={setFilterCategory}
          options={[{ value: 'ALL', label: 'Toutes catégories' }, ...CATEGORIES.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))]}
        />
      </div>

      {/* Table */}
      <div className="ios-card" style={{ overflow: 'hidden' }}>
        {filteredStock.length === 0 ? (
          <EmptyState icon="📦" message="Aucun produit correspondant" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('name')} style={{ cursor: 'pointer' }}>Produit <SortIcon field="name" /></th>
                  <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('quantity')}>Quantité <SortIcon field="quantity" /></th>
                  <th style={{ textAlign: 'right' }}>Prix Moyen</th>
                  <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleSort('value')}>Valeur <SortIcon field="value" /></th>
                  <th style={{ textAlign: 'center' }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((item, idx) => (
                  <tr key={idx} style={{ background: item.status === 'epuise' ? '#fff2f1' : item.status === 'bas' ? '#fff8f0' : 'transparent' }}>
                    <td style={{ fontWeight: 600, color: 'var(--text-1)' }}>{item.name}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: item.status === 'epuise' ? 'var(--red)' : item.status === 'bas' ? 'var(--orange)' : 'var(--text-1)' }}>
                      {fmt(item.quantity)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>{item.price > 0 ? `${fmt(item.price)} MAD` : '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>{fmtMoney(item.value)}</td>
                    <td style={{ textAlign: 'center' }}>{getStatusBadge(item.status)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--surface-2)', fontWeight: 700 }}>
                  <td style={{ color: 'var(--text-1)' }}>TOTAL ({filteredStock.length})</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-1)' }}>{fmt(stats.totalQuantity)}</td>
                  <td></td>
                  <td style={{ textAlign: 'right', color: 'var(--green)' }}>{fmtMoney(stats.totalValue)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Farms;
