import React, { useMemo } from 'react';
import { useApp } from '../App';
import { FARMS } from '../lib/constants';
import { fmt, fmtMoney } from '../lib/utils';
import { calculateFarmStock, getAlerts } from '../lib/store';

const Dashboard = () => {
  const { products, movements, setPage } = useApp();
  const alerts = getAlerts();

  const stats = useMemo(() => {
    const entries = movements.filter(m => m.type === 'entry');
    return {
      totalAchats: entries.reduce((s, m) => s + (m.quantity || 0) * (m.price || 0), 0),
      totalMovements: movements.length,
    };
  }, [movements]);

  const farmStats = useMemo(() => {
    return FARMS.map(farm => {
      const stockMap = calculateFarmStock(farm.id);
      const items = Object.entries(stockMap).filter(([_, d]) => d.quantity > 0.01);
      const emptyStock = Object.entries(stockMap).filter(([_, d]) => d.quantity <= 0 && d.hasMovements).length;
      const lowStock = items.filter(([_, p]) => p.quantity <= 10).length;
      return { ...farm, nbProducts: items.length, emptyStock, lowStock };
    });
  }, [movements]);

  const recentMovements = useMemo(() =>
    [...movements].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5)
  , [movements]);

  const typeLabel = (type) => ({
    entry:          { label: 'Entree',       color: '#34c759' },
    exit:           { label: 'Sortie',       color: '#007aff' },
    consumption:    { label: 'Consommation', color: '#ff9500' },
    'transfer-in':  { label: 'Transfert',    color: '#af52de' },
    'transfer-out': { label: 'Transfert',    color: '#af52de' },
  }[type] || { label: type, color: '#8e8e93' });

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts  = alerts.filter(a => a.severity === 'warning');
  const totalAlerts = criticalAlerts.length + warningAlerts.length;

  const farmAccent = {
    'AGRO BERRY 1': '#34c759',
    'AGRO BERRY 2': '#007aff',
    'AGRO BERRY 3': '#af52de',
  };

  const card = {
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #f2f2f7',
  };

  const sectionLabel = {
    fontSize: 12,
    fontWeight: 600,
    color: '#8e8e93',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    margin: 0,
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1d1d1f', margin: 0, letterSpacing: '-0.5px' }}>
          Tableau de bord
        </h1>
        <p style={{ fontSize: 14, color: '#8e8e93', marginTop: 6, marginBottom: 0 }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Produits',   value: products.length,              sub: 'references',    accent: '#007aff' },
          { label: 'Mouvements', value: stats.totalMovements,         sub: 'operations',    accent: '#af52de' },
          { label: 'Achats',     value: fmtMoney(stats.totalAchats),  sub: 'total cumule',  accent: '#34c759' },
          { label: 'Alertes',    value: totalAlerts,                   sub: criticalAlerts.length + ' critiques', accent: totalAlerts > 0 ? '#ff3b30' : '#34c759' },
        ].map((s, i) => (
          <div key={i} style={{ ...card, padding: '20px 22px' }}>
            <p style={{ ...sectionLabel, marginBottom: 10 }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: s.accent, margin: '0 0 4px', letterSpacing: '-0.5px' }}>{s.value}</p>
            <p style={{ fontSize: 12, color: '#aeaeb2', margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Fermes */}
      <p style={{ ...sectionLabel, marginBottom: 12 }}>Stock par ferme</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {farmStats.map(farm => (
          <div
            key={farm.id}
            onClick={() => { localStorage.setItem('selectedFarmId', farm.id); setPage('farms'); }}
            style={{ ...card, padding: '20px 22px', borderTop: '3px solid ' + farmAccent[farm.id], cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{farm.name}</span>
              <span style={{ fontSize: 12, color: '#aeaeb2' }}>{farm.hectares} ha</span>
            </div>
            <p style={{ fontSize: 36, fontWeight: 700, color: '#1d1d1f', margin: '0 0 2px', letterSpacing: '-1px' }}>{farm.nbProducts}</p>
            <p style={{ fontSize: 13, color: '#8e8e93', margin: '0 0 14px' }}>produits en stock</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {farm.emptyStock > 0 && (
                <span style={{ fontSize: 12, fontWeight: 500, color: '#ff3b30', background: '#fff2f1', borderRadius: 20, padding: '3px 10px' }}>
                  {farm.emptyStock} epuise{farm.emptyStock > 1 ? 's' : ''}
                </span>
              )}
              {farm.lowStock > 0 && (
                <span style={{ fontSize: 12, fontWeight: 500, color: '#ff9500', background: '#fff8f0', borderRadius: 20, padding: '3px 10px' }}>
                  {farm.lowStock} stock bas
                </span>
              )}
              {farm.emptyStock === 0 && farm.lowStock === 0 && (
                <span style={{ fontSize: 12, fontWeight: 500, color: '#34c759', background: '#f0faf2', borderRadius: 20, padding: '3px 10px' }}>
                  OK
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: criticalAlerts.length > 0 ? '1fr 1fr' : '1fr', gap: 16 }}>

        {/* Alertes critiques */}
        {criticalAlerts.length > 0 && (
          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f2f2f7' }}>
              <p style={sectionLabel}>Alertes critiques</p>
            </div>
            {criticalAlerts.slice(0, 6).map((a, i) => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 20px', borderBottom: i < Math.min(criticalAlerts.length, 6) - 1 ? '1px solid #f9f9f9' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff3b30', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{a.product}</span>
                </div>
                <span style={{ fontSize: 12, color: '#aeaeb2', background: '#f9f9f9', borderRadius: 6, padding: '2px 8px' }}>{a.location}</span>
              </div>
            ))}
            {criticalAlerts.length > 6 && (
              <div style={{ padding: '10px 20px', color: '#aeaeb2', fontSize: 12 }}>+{criticalAlerts.length - 6} autres</div>
            )}
          </div>
        )}

        {/* Derniers mouvements */}
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f2f2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={sectionLabel}>Derniers mouvements</p>
            <button onClick={() => setPage('movements')} style={{ fontSize: 12, color: '#007aff', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0 }}>
              Voir tout
            </button>
          </div>
          {recentMovements.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#aeaeb2', fontSize: 14 }}>Aucun mouvement</div>
          ) : recentMovements.map((m, idx) => {
            const t = typeLabel(m.type);
            return (
              <div key={m.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: idx < recentMovements.length - 1 ? '1px solid #f9f9f9' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.product}</p>
                    <p style={{ fontSize: 12, color: '#aeaeb2', margin: 0 }}>{m.date} · {t.label}{m.farm ? ' · ' + m.farm.replace('AGRO BERRY ', 'AB') : ''}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: t.color, margin: 0 }}>
                    {m.type === 'entry' ? '+' : '-'}{fmt(m.quantity)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
