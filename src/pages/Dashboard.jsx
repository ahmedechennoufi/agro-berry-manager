import React, { useMemo } from 'react';
import { useApp } from '../App';
import { FARMS } from '../lib/constants';
import { fmt, fmtMoney } from '../lib/utils';
import { calculateFarmStock, getAlerts } from '../lib/store';

const FARM_ACCENT = {
  'AGRO BERRY 1': 'var(--green)',
  'AGRO BERRY 2': 'var(--blue)',
  'AGRO BERRY 3': 'var(--purple)',
};

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

  const farmStats = useMemo(() => FARMS.map(farm => {
    const stockMap = calculateFarmStock(farm.id);
    const items = Object.entries(stockMap).filter(([_, d]) => d.quantity > 0.01);
    const emptyStock = Object.entries(stockMap).filter(([_, d]) => d.quantity <= 0 && d.hasMovements).length;
    const lowStock = items.filter(([_, p]) => p.quantity <= 10).length;
    return { ...farm, nbProducts: items.length, emptyStock, lowStock };
  }), [movements]);

  const recentMovements = useMemo(() =>
    [...movements].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6)
  , [movements]);

  const typeLabel = (type) => ({
    entry:          { label: 'Entrée',       color: 'var(--green)' },
    exit:           { label: 'Sortie',       color: 'var(--blue)' },
    consumption:    { label: 'Consommation', color: 'var(--orange)' },
    'transfer-in':  { label: 'Transfert',    color: 'var(--purple)' },
    'transfer-out': { label: 'Transfert',    color: 'var(--purple)' },
  }[type] || { label: type, color: 'var(--text-3)' });

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const totalAlerts = criticalAlerts.length + alerts.filter(a => a.severity === 'warning').length;

  const label = { fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 };

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '32px 28px' }} className="animate-fade-in">

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.5px' }}>
          Tableau de bord
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 6, margin: '6px 0 0' }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Produits',   value: products.length,             sub: 'références',     color: 'var(--blue)' },
          { label: 'Mouvements', value: stats.totalMovements,        sub: 'opérations',     color: 'var(--purple)' },
          { label: 'Achats',     value: fmtMoney(stats.totalAchats), sub: 'total cumulé',   color: 'var(--green)' },
          { label: 'Alertes',    value: totalAlerts,                   sub: criticalAlerts.length + ' critiques', color: totalAlerts > 0 ? 'var(--red)' : 'var(--green)' },
        ].map((s, i) => (
          <div key={i} className="ios-card" style={{ padding: '20px 22px' }}>
            <p style={{ ...label, marginBottom: 10 }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: s.color, margin: '0 0 4px', letterSpacing: '-0.5px' }}>{s.value}</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Fermes */}
      <p style={{ ...label, marginBottom: 12 }}>Stock par ferme</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {farmStats.map(farm => (
          <div
            key={farm.id}
            onClick={() => { localStorage.setItem('selectedFarmId', farm.id); setPage('farms'); }}
            className="ios-card"
            style={{ padding: '20px 22px', borderTop: `3px solid ${FARM_ACCENT[farm.id]}`, cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{farm.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{farm.hectares} ha</span>
            </div>
            <p style={{ fontSize: 36, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 2px', letterSpacing: '-1px' }}>{farm.nbProducts}</p>
            <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 14px' }}>produits en stock</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {farm.emptyStock > 0 && (
                <span className="badge badge-red">{farm.emptyStock} épuisé{farm.emptyStock > 1 ? 's' : ''}</span>
              )}
              {farm.lowStock > 0 && (
                <span className="badge badge-orange">{farm.lowStock} stock bas</span>
              )}
              {farm.emptyStock === 0 && farm.lowStock === 0 && (
                <span className="badge badge-green">OK</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: criticalAlerts.length > 0 ? '1fr 1fr' : '1fr', gap: 14 }}>

        {/* Alertes critiques */}
        {criticalAlerts.length > 0 && (
          <div className="ios-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <p style={label}>Alertes critiques</p>
            </div>
            {criticalAlerts.slice(0, 6).map((a, i) => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 20px', borderBottom: i < Math.min(criticalAlerts.length, 6) - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>{a.product}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-2)', background: 'var(--surface-2)', borderRadius: 6, padding: '2px 8px' }}>{a.location}</span>
              </div>
            ))}
            {criticalAlerts.length > 6 && (
              <div style={{ padding: '10px 20px', color: 'var(--text-3)', fontSize: 12 }}>+{criticalAlerts.length - 6} autres</div>
            )}
          </div>
        )}

        {/* Derniers mouvements */}
        <div className="ios-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={label}>Derniers mouvements</p>
            <button onClick={() => setPage('movements')} style={{ fontSize: 12, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0 }}>
              Voir tout
            </button>
          </div>
          {recentMovements.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>Aucun mouvement</div>
          ) : recentMovements.map((m, idx) => {
            const t = typeLabel(m.type);
            return (
              <div key={m.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 20px', borderBottom: idx < recentMovements.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.product}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>{m.date} · {t.label}{m.farm ? ' · ' + m.farm.replace('AGRO BERRY ', 'AB') : ''}</p>
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
