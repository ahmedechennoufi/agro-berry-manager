import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Card, Button, Input, Select, StatCard, EmptyState, Badge } from '../components/UI';
import { CATEGORIES } from '../lib/constants';
import { fmt, fmtMoney } from '../lib/utils';
import { calculateGlobalStock, getAveragePrice, getDefaultThreshold } from '../lib/store';

const Stock = () => {
  const { products, movements } = useApp();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStock, setFilterStock] = useState('ALL');
  const [sortBy, setSortBy] = useState('value');
  const [sortOrder, setSortOrder] = useState('desc');
  const threshold = getDefaultThreshold();

  const stockData = useMemo(() => {
    const globalStock = calculateGlobalStock();
    return products.map(product => {
      const stock = globalStock[product.name] || { quantity: 0, totalValue: 0 };
      const price = getAveragePrice(product.name) || 0;
      const quantity = stock.quantity || 0;
      const value = quantity * price;
      const productThreshold = product.threshold || threshold;
      let status = 'normal';
      if (quantity <= 0) status = 'epuise';
      else if (quantity <= productThreshold) status = 'bas';
      return { name: product.name, category: product.category || 'AUTRES', unit: product.unit || 'KG', quantity, price, value, status, threshold: productThreshold };
    });
  }, [products, movements, threshold]);

  const filteredStock = useMemo(() => {
    let result = stockData.filter(item => {
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
  }, [stockData, search, filterCategory, filterStock, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const epuiseCount = stockData.filter(i => i.status === 'epuise').length;
    const basCount = stockData.filter(i => i.status === 'bas').length;
    return {
      totalProducts: filteredStock.length,
      totalQuantity: filteredStock.reduce((s, i) => s + i.quantity, 0),
      totalValue: filteredStock.reduce((s, i) => s + i.value, 0),
      epuiseCount, basCount
    };
  }, [filteredStock, stockData]);

  const categorySummary = useMemo(() => {
    const summary = {};
    CATEGORIES.forEach(cat => {
      const items = filteredStock.filter(i => i.category === cat.id);
      summary[cat.id] = { count: items.length, value: items.reduce((s, i) => s + i.value, 0) };
    });
    return summary;
  }, [filteredStock]);

  const handleSort = (column) => {
    if (sortBy === column) setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    else { setSortBy(column); setSortOrder('desc'); }
  };

  const resetFilters = () => { setSearch(''); setFilterCategory('ALL'); setFilterStock('ALL'); };

  const getCategoryColor = (cat) => {
    const colors = { ENGRAIS: 'green', PHYTOSANITAIRES: 'blue', ACIDES: 'orange', AUTRES: 'gray' };
    return colors[cat] || 'gray';
  };

  const getStatusBadge = (status) => {
    if (status === 'epuise') return <Badge color="red">Épuisé</Badge>;
    if (status === 'bas') return <Badge color="orange">Stock bas</Badge>;
    return <Badge color="green">OK</Badge>;
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span style={{ color: 'var(--text-3)', marginLeft: 4 }}>↕</span>;
    return <span style={{ color: 'var(--blue)', marginLeft: 4 }}>{sortOrder === 'desc' ? '↓' : '↑'}</span>;
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.3px' }}>Stock Global</h1>
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '4px 0 0' }}>Inventaire du magasin central</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={resetFilters}>🔄 Reset</Button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard icon="📦" label="Produits" value={stats.totalProducts} color="blue" />
        <StatCard icon="📊" label="Quantité" value={fmt(stats.totalQuantity)} color="purple" />
        <StatCard icon="💰" label="Valeur" value={fmtMoney(stats.totalValue)} color="green" />
        <div onClick={() => setFilterStock(filterStock === 'epuise' ? 'ALL' : 'epuise')} style={{ cursor: 'pointer' }}>
          <StatCard icon="🔴" label="Épuisé" value={stats.epuiseCount} color="red" />
        </div>
        <div onClick={() => setFilterStock(filterStock === 'bas' ? 'ALL' : 'bas')} style={{ cursor: 'pointer' }}>
          <StatCard icon="⚠️" label="Stock bas" value={stats.basCount} color="orange" />
        </div>
      </div>

      {/* Filter Pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[{ id: 'ALL', label: 'Tous' }, { id: 'epuise', label: '🔴 Épuisé' }, { id: 'bas', label: '⚠️ Bas' }, { id: 'normal', label: '✅ Normal' }].map(f => (
          <button key={f.id} onClick={() => setFilterStock(f.id)} className={`filter-pill ${filterStock === f.id ? 'active' : ''}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Search & Category Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Input placeholder="🔍 Rechercher un produit..." value={search} onChange={setSearch} uppercase={false} />
        </div>
        <Select
          value={filterCategory}
          onChange={setFilterCategory}
          options={[{ value: 'ALL', label: 'Toutes les catégories' }, ...CATEGORIES.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))]}
        />
      </div>

      {/* Category Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
        {CATEGORIES.map(cat => {
          const data = categorySummary[cat.id] || { count: 0, value: 0 };
          const isActive = filterCategory === cat.id;
          return (
            <div
              key={cat.id}
              onClick={() => setFilterCategory(isActive ? 'ALL' : cat.id)}
              className="ios-card"
              style={{
                padding: '14px 16px', textAlign: 'center', cursor: 'pointer',
                border: isActive ? '2px solid var(--blue)' : '1px solid var(--border)',
                background: isActive ? '#f0f6ff' : 'var(--surface)',
              }}
            >
              <span style={{ fontSize: 22 }}>{cat.icon}</span>
              <p style={{ fontSize: 11, color: 'var(--text-2)', margin: '4px 0 2px' }}>{cat.name}</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: isActive ? 'var(--blue)' : 'var(--text-1)', margin: 0 }}>{data.count}</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>{fmtMoney(data.value)}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="ios-card" style={{ overflow: 'hidden' }}>
        {filteredStock.length === 0 ? (
          <EmptyState icon="📦" message="Aucun produit trouvé" action={<Button onClick={resetFilters}>Réinitialiser</Button>} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Produit <SortIcon field="name" /></th>
                  <th>Catégorie</th>
                  <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('quantity')}>Quantité <SortIcon field="quantity" /></th>
                  <th style={{ textAlign: 'right' }}>Prix Moy.</th>
                  <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('value')}>Valeur <SortIcon field="value" /></th>
                  <th style={{ textAlign: 'center' }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((item, idx) => (
                  <tr key={idx} style={{ background: item.status === 'epuise' ? '#fff2f1' : item.status === 'bas' ? '#fff8f0' : 'transparent' }}>
                    <td style={{ fontWeight: 600, color: 'var(--text-1)' }}>{item.name}</td>
                    <td><Badge color={getCategoryColor(item.category)}>{item.category}</Badge></td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: item.status === 'epuise' ? 'var(--red)' : item.status === 'bas' ? 'var(--orange)' : 'var(--text-1)' }}>
                      {fmt(item.quantity)} {item.unit}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>{fmtMoney(item.price)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>{fmtMoney(item.value)}</td>
                    <td style={{ textAlign: 'center' }}>{getStatusBadge(item.status)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--surface-2)', fontWeight: 700 }}>
                  <td style={{ color: 'var(--text-1)' }}>TOTAL ({filteredStock.length} produits)</td>
                  <td></td>
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

export default Stock;
