import { useState, useEffect } from 'react';
import { getAlerts, calculateFarmStock, getProducts } from '../lib/store';

export default function Alertes() {
  const [alerts, setAlerts] = useState([]);
  const [reserveAlerts, setReserveAlerts] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const all = getAlerts();
    setAlerts(all);

    // Calculer les alertes réserve mélanges AGB1
    const products = getProducts();
    const ab1Stock = calculateFarmStock('AGRO BERRY 1');
    const reserve = [];

    products.forEach(p => {
      if (!p.qtyPerApp || !p.threshold) return;
      const stockData = ab1Stock[p.name];
      const stock = stockData?.quantity || 0;
      const qtyPerApp = p.qtyPerApp;
      const threshold = p.threshold;
      const melangesCouverts = stock > 0 ? Math.floor(stock / qtyPerApp) : 0;
      const melangesRequis = Math.round(threshold / qtyPerApp);

      reserve.push({
        id: `reserve-${p.name}`,
        name: p.name,
        unit: p.unit || 'KG',
        stock,
        qtyPerApp,
        threshold,
        melangesCouverts,
        melangesRequis,
        insuffisant: stock < threshold,
        critique: stock <= 0
      });
    });

    // Trier: insuffisants d'abord, puis par mélanges couverts croissants
    reserve.sort((a, b) => {
      if (a.insuffisant && !b.insuffisant) return -1;
      if (!a.insuffisant && b.insuffisant) return 1;
      return a.melangesCouverts - b.melangesCouverts;
    });

    setReserveAlerts(reserve);
  }, []);

  const otherAlerts = alerts.filter(a => a.type !== 'reserve');
  const critiques = otherAlerts.filter(a => a.severity === 'critical');
  const warnings = otherAlerts.filter(a => a.severity === 'warning');
  const infos = otherAlerts.filter(a => a.severity === 'info');
  const reserveInsuffisant = reserveAlerts.filter(a => a.insuffisant);
  const reserveOk = reserveAlerts.filter(a => !a.insuffisant);

  const tabs = [
    { id: 'all',     label: 'Tout',             count: reserveInsuffisant.length + critiques.length + warnings.length },
    { id: 'reserve', label: '🧮 Réserve Mélanges', count: reserveInsuffisant.length },
    { id: 'stock',   label: '📦 Stock',           count: critiques.length + warnings.length },
    { id: 'info',    label: 'ℹ️ Info',             count: infos.length },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', margin: 0 }}>
          🔔 Alertes
        </h1>
        <p style={{ color: '#6e6e73', fontSize: 13, marginTop: 6 }}>
          Produits nécessitant une attention — réserve mélanges et niveaux de stock
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Réserve insuffisante', value: reserveInsuffisant.length, color: '#dc2626', bg: '#fef2f2' },
          { label: 'Stock critique/bas', value: critiques.length + warnings.length, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Réserve OK', value: reserveOk.length, color: '#16a34a', bg: '#f0fff4' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)} style={{
            padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: filter === t.id ? 700 : 500,
            background: filter === t.id ? '#1d1d1f' : '#f5f5f7',
            color: filter === t.id ? '#fff' : '#6e6e73',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            {t.label}
            {t.count > 0 && (
              <span style={{
                background: filter === t.id ? 'rgba(255,255,255,0.25)' : '#dc2626',
                color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* === SECTION RÉSERVE MÉLANGES === */}
      {(filter === 'all' || filter === 'reserve') && reserveInsuffisant.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 16 }}>
          <div style={{ padding: '14px 20px', background: '#fef2f2', borderBottom: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🧮</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>
              Réserve insuffisante — {reserveInsuffisant.length} produit{reserveInsuffisant.length > 1 ? 's' : ''} ne couvrent pas les {reserveInsuffisant[0]?.melangesRequis} mélanges
            </span>
          </div>

          {/* Header table */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 120px 140px', padding: '10px 20px', background: '#f9f9f9', borderBottom: '1px solid #f0f0f0', gap: 12 }}>
            {['PRODUIT', 'STOCK', 'SEUIL (×5)', 'MÉLANGES OK', 'COUVERTURE'].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#6e6e73', letterSpacing: '.04em' }}>{h}</div>
            ))}
          </div>

          {reserveInsuffisant.map((r, i) => {
            const pct = r.threshold > 0 ? Math.min(100, (r.stock / r.threshold) * 100) : 0;
            return (
              <div key={r.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 100px 120px 120px 140px',
                padding: '12px 20px', gap: 12, alignItems: 'center',
                borderBottom: i < reserveInsuffisant.length - 1 ? '1px solid #f0f0f0' : 'none',
                background: r.critique ? '#fff5f5' : '#fff'
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>
                    {r.critique ? '🔴' : '🟡'} {r.name}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: r.critique ? '#dc2626' : '#f59e0b' }}>
                  {r.stock % 1 === 0 ? r.stock : r.stock.toFixed(1)} {r.unit}
                </div>
                <div style={{ fontSize: 13, color: '#6e6e73' }}>
                  {r.threshold} {r.unit}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: r.melangesCouverts === 0 ? '#dc2626' : '#f59e0b' }}>
                  {r.melangesCouverts} / {r.melangesRequis}
                </div>
                <div>
                  <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: `${pct}%`,
                      background: pct < 30 ? '#dc2626' : pct < 70 ? '#f59e0b' : '#16a34a',
                      transition: 'width 0.3s'
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 3 }}>{pct.toFixed(0)}% de réserve</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Réserve OK */}
      {filter === 'reserve' && reserveOk.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 16 }}>
          <div style={{ padding: '14px 20px', background: '#f0fff4', borderBottom: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>
              ✅ Réserve suffisante — {reserveOk.length} produit{reserveOk.length > 1 ? 's' : ''}
            </span>
          </div>
          {reserveOk.map((r, i) => (
            <div key={r.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 120px 120px',
              padding: '10px 20px', gap: 12, alignItems: 'center',
              borderBottom: i < reserveOk.length - 1 ? '1px solid #f0f0f0' : 'none'
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>✅ {r.name}</div>
              <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>{r.stock % 1 === 0 ? r.stock : r.stock.toFixed(1)} {r.unit}</div>
              <div style={{ fontSize: 13, color: '#6e6e73' }}>{r.threshold} {r.unit}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>{r.melangesCouverts} mélanges ✅</div>
            </div>
          ))}
        </div>
      )}

      {/* === SECTION STOCK ALERTES === */}
      {(filter === 'all' || filter === 'stock') && (critiques.length > 0 || warnings.length > 0) && (
        <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 16 }}>
          <div style={{ padding: '14px 20px', background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#d97706' }}>
              📦 Alertes stock — {critiques.length + warnings.length} produit{critiques.length + warnings.length > 1 ? 's' : ''}
            </span>
          </div>
          {[...critiques, ...warnings].map((a, i) => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 20px',
              borderBottom: i < critiques.length + warnings.length - 1 ? '1px solid #f0f0f0' : 'none',
              background: a.severity === 'critical' ? '#fff5f5' : '#fff'
            }}>
              <span style={{ fontSize: 18 }}>{a.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f' }}>{a.title}</div>
                <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 2 }}>{a.message}</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 12, color: '#aaa' }}>{a.location}</div>
            </div>
          ))}
        </div>
      )}

      {/* Aucune alerte */}
      {filter === 'all' && reserveInsuffisant.length === 0 && critiques.length === 0 && warnings.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#86868b' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Tout est bon !</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Aucune alerte de stock ou de réserve</div>
        </div>
      )}

      {reserveAlerts.length === 0 && filter === 'reserve' && (
        <div style={{ textAlign: 'center', padding: 40, color: '#86868b', fontSize: 13 }}>
          Configure les seuils dans <strong>Réserve & Seuils</strong> pour voir les alertes mélanges
        </div>
      )}
    </div>
  );
}
