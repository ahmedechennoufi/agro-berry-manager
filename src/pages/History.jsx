import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../App';
import { fmt, fmtMoney, downloadExcel } from '../lib/utils';
import { calculateFarmStock, getPhysicalInventories, getAveragePrice } from '../lib/store';
import stockHistoryData from '../lib/stockHistory.json';

const STORAGE_KEY = 'agro_stock_history_v1';

const fmtDate = (d) => {
  if (!d) return '';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
};

const FC = {
  AB1: { text: '#1a8a36', bg: '#f0faf2', border: 'rgba(52,199,89,.2)' },
  AB2: { text: '#0066cc', bg: '#f0f6ff', border: 'rgba(0,122,255,.2)' },
  AB3: { text: '#7c3aed', bg: '#f5f0ff', border: 'rgba(124,58,237,.2)' },
};

const History = () => {
  const { movements, products } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedFarm, setSelectedFarm] = useState('ALL');
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let hist = saved ? JSON.parse(saved) : [];
    const md = {
      'SEPTEMBRE':    { date: '2025-09-25', month: 'Septembre 2025' },
      'OCTOBRE':      { date: '2025-10-25', month: 'Octobre 2025' },
      'NOVEMBRE':     { date: '2025-11-25', month: 'Novembre 2025' },
      'DECEMBRE':     { date: '2025-12-25', month: 'Décembre 2025' },
      'DECEMBRE_2025':{ date: '2025-12-25', month: 'Décembre 2025' },
      'JANVIER':      { date: '2026-01-25', month: 'Janvier 2026' },
      'FEVRIER':      { date: '2026-02-25', month: 'Février 2026' },
      'MARS':         { date: '2026-03-25', month: 'Mars 2026' },
      'AVRIL':        { date: '2026-04-25', month: 'Avril 2026' },
    };
    const fromJson = Object.entries(stockHistoryData)
      .filter(([k]) => k !== 'DECEMBRE_2025')
      .map(([k, v]) => ({ ...v, month: v.name || md[k]?.month || k, date: v.date || md[k]?.date || '2025-01-25' }));
    const existing = new Set(hist.map(h => h.date));
    fromJson.forEach(h => { if (!existing.has(h.date)) hist.push(h); });
    hist.sort((a, b) => a.date.localeCompare(b.date));
    setHistory(hist);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hist));
    if (hist.length) setSelectedMonth(hist[hist.length - 1].date);
  }, []);

  const physicalInventoryMonths = useMemo(() => {
    const physInvs = getPhysicalInventories();
    if (!physInvs.length) return {};
    const byMonth = {};
    physInvs.forEach(inv => {
      if (!inv.date || !inv.data || !inv.farm) return;
      const ym = inv.date.substring(0, 7);
      if (!byMonth[ym]) byMonth[ym] = {};
      const fk = inv.farm === 'AGRO BERRY 1' ? 'AB1' : inv.farm === 'AGRO BERRY 2' ? 'AB2' : inv.farm === 'AGRO BERRY 3' ? 'AB3' : null;
      if (!fk) return;
      if (!byMonth[ym][fk] || inv.date >= (byMonth[ym][fk].date || '')) byMonth[ym][fk] = inv;
    });
    const result = {};
    Object.entries(byMonth).forEach(([ym, farms]) => {
      const m = { AB1: [], AB2: [], AB3: [], isPhysical: true, physicalFarms: [] };
      ['AB1','AB2','AB3'].forEach(fk => {
        const inv = farms[fk];
        if (!inv) return;
        m.physicalFarms.push(fk);
        const map = {};
        if (inv.data) {
          Object.entries(inv.data).forEach(([prod, qty]) => {
            const q = parseFloat(qty);
            if (!isNaN(q) && qty !== '' && qty !== null && q > 0)
              map[prod.toUpperCase()] = { product: prod, quantity: q, price: getAveragePrice(prod) || 0 };
          });
        }
        if (inv.comparison) {
          inv.comparison.forEach(item => {
            const k = (item.name||'').toUpperCase();
            if (!map[k] && item.physical != null) {
              const q = parseFloat(item.physical) || 0;
              if (q > 0) map[k] = { product: item.name, quantity: q, price: getAveragePrice(item.name)||0 };
            }
          });
        }
        m[fk] = Object.values(map);
      });
      result[ym] = m;
    });
    return result;
  }, [movements]);

  const currentStock = useMemo(() => {
    const toArr = (s) => Object.entries(s).map(([product,d]) => ({ product, quantity: d.quantity, price: d.price||0 }));
    const now = new Date();
    return {
      date: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-25`,
      month: now.toLocaleString('fr-FR', { month:'long', year:'numeric' }),
      AB1: toArr(calculateFarmStock('AGRO BERRY 1')),
      AB2: toArr(calculateFarmStock('AGRO BERRY 2')),
      AB3: toArr(calculateFarmStock('AGRO BERRY 3')),
      isCalculated: true,
    };
  }, [movements]);

  const allMonths = useMemo(() => {
    const cur = currentStock.date;
    const months = history.filter(m => m.date !== cur);
    months.push(currentStock);
    months.forEach((m, idx) => {
      if (!m.date || m.date === cur) return;
      const ym = m.date.substring(0,7);
      const phys = physicalInventoryMonths[ym];
      if (phys?.physicalFarms.length) {
        const merge = (pAB, hAB) => {
          if (!pAB?.length) return hAB||[];
          if (!hAB?.length) return pAB;
          const map = {};
          (hAB||[]).forEach(i => { map[i.product?.toUpperCase()] = i; });
          (pAB||[]).forEach(i => { map[i.product?.toUpperCase()] = i; });
          return Object.values(map);
        };
        months[idx] = { ...m, isPhysical:true, physicalFarms:[...phys.physicalFarms], AB1:merge(phys.AB1,m.AB1), AB2:merge(phys.AB2,m.AB2), AB3:merge(phys.AB3,m.AB3) };
      }
    });
    return months.sort((a,b) => a.date.localeCompare(b.date));
  }, [history, currentStock, physicalInventoryMonths]);

  const selectedData = useMemo(() => allMonths.find(m => m.date === selectedMonth)||null, [allMonths, selectedMonth]);

  const getUnit = (name) => products.find(p => p.name?.toUpperCase()===name?.toUpperCase())?.unit||'KG';

  const displayProducts = useMemo(() => {
    if (!selectedData) return [];
    const map = {};
    ['AB1','AB2','AB3'].forEach(fk => {
      (selectedData[fk]||[]).forEach(item => {
        const key = item.product?.toUpperCase();
        if (!key) return;
        if (!map[key]) map[key] = { product: item.product||key, AB1:0, AB2:0, AB3:0, price:0, unit: getUnit(item.product) };
        map[key][fk] = item.quantity||0;
        if (item.price > 0) map[key].price = item.price;
      });
    });
    let list = Object.values(map);
    if (selectedFarm !== 'ALL') { const fk = selectedFarm.replace('AGRO BERRY ','AB'); list = list.filter(p => p[fk]>0); }
    if (search) list = list.filter(p => p.product.toLowerCase().includes(search.toLowerCase()));
    list.forEach(p => { p.total = p.AB1+p.AB2+p.AB3; p.value = p.total*p.price; });
    return list.sort((a,b) => b.value-a.value);
  }, [selectedData, selectedFarm, search, products]);

  const stats = useMemo(() => ({
    nb: displayProducts.length,
    qty: displayProducts.reduce((s,p)=>s+p.total,0),
    value: displayProducts.reduce((s,p)=>s+p.value,0),
  }), [displayProducts]);

  const saveSnapshot = () => {
    const next = history.filter(h=>h.date!==currentStock.date);
    next.push({ ...currentStock, isCalculated:false });
    next.sort((a,b)=>a.date.localeCompare(b.date));
    setHistory(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSelectedMonth(currentStock.date);
  };

  const handleExport = async () => {
    const rows = displayProducts.map(p => ({ Produit:p.product, Unité:p.unit, 'AGB 1':p.AB1, 'AGB 2':p.AB2, 'AGB 3':p.AB3, Total:p.total, 'Prix Unit.':p.price, 'Valeur MAD':p.value }));
    await downloadExcel(rows, `stock-${selectedData?.month||'historique'}.xlsx`);
  };

  const colStyle = (fk, val) => val===0 ? { color:'var(--text-3)' } : val<0 ? { color:'var(--red)', fontWeight:700 } : { color: FC[fk].text, fontWeight:600 };

  return (
    <div style={{ padding:'20px 20px', maxWidth:1400, margin:'0 auto', display:'flex', flexDirection:'column', gap:14 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:'var(--text-1)', margin:0 }}>📅 Historique Stock</h1>
          <p style={{ fontSize:12, color:'var(--text-2)', margin:'2px 0 0' }}>Campagne 2025-2026</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {selectedData?.isCalculated && <button onClick={saveSnapshot} style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:9, padding:'7px 13px', fontSize:12, cursor:'pointer', color:'var(--text-1)', fontWeight:600 }}>💾 Sauvegarder</button>}
          {selectedData && <button onClick={handleExport} style={{ background:'#1a8a36', color:'#fff', border:'none', borderRadius:9, padding:'7px 14px', fontSize:12, cursor:'pointer', fontWeight:600 }}>📥 Excel</button>}
        </div>
      </div>

      {/* Month pills */}
      <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
        {allMonths.map(m => {
          const active = selectedMonth===m.date;
          return (
            <button key={m.date} onClick={()=>setSelectedMonth(m.date)} style={{ padding:'7px 13px', borderRadius:18, border: active ? '2px solid #1a8a36' : '1.5px solid var(--border)', background: active ? '#1a8a36' : 'var(--surface)', color: active ? '#fff' : 'var(--text-1)', cursor:'pointer', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:4, whiteSpace:'nowrap', transition:'all .15s' }}>
              <span style={{ textTransform:'uppercase', letterSpacing:.3 }}>{m.month}</span>
              {m.isPhysical && <span style={{ fontSize:10, background: active?'rgba(255,255,255,.25)':'#e8f8ed', color: active?'#fff':'#1a8a36', borderRadius:7, padding:'1px 5px' }}>📋</span>}
              {m.isCalculated && !m.isPhysical && <span style={{ fontSize:10, background: active?'rgba(255,255,255,.25)':'#fff8f0', color: active?'#fff':'var(--orange)', borderRadius:7, padding:'1px 5px' }}>⚡</span>}
            </button>
          );
        })}
      </div>

      {/* Stats */}
      {selectedData && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:10 }}>
          <div style={{ background:FC.AB2.bg, borderRadius:11, padding:'12px 14px', border:`1px solid ${FC.AB2.border}` }}>
            <div style={{ fontSize:10, color:FC.AB2.text, fontWeight:600, textTransform:'uppercase', marginBottom:3 }}>📦 Produits</div>
            <div style={{ fontSize:24, fontWeight:700, color:FC.AB2.text }}>{stats.nb}</div>
          </div>
          <div style={{ background:FC.AB3.bg, borderRadius:11, padding:'12px 14px', border:`1px solid ${FC.AB3.border}` }}>
            <div style={{ fontSize:10, color:FC.AB3.text, fontWeight:600, textTransform:'uppercase', marginBottom:3 }}>📊 Quantité</div>
            <div style={{ fontSize:18, fontWeight:700, color:FC.AB3.text }}>{fmt(stats.qty)}</div>
          </div>
          <div style={{ background:FC.AB1.bg, borderRadius:11, padding:'12px 14px', border:`1px solid ${FC.AB1.border}`, gridColumn:'span 2' }}>
            <div style={{ fontSize:10, color:FC.AB1.text, fontWeight:600, textTransform:'uppercase', marginBottom:3 }}>💰 Valeur Totale</div>
            <div style={{ fontSize:18, fontWeight:700, color:FC.AB1.text }}>{fmtMoney(stats.value)}</div>
          </div>
          <div style={{ background:'#fff8f0', borderRadius:11, padding:'12px 14px', border:'1px solid rgba(255,149,0,.2)' }}>
            <div style={{ fontSize:10, color:'var(--orange)', fontWeight:600, textTransform:'uppercase', marginBottom:3 }}>📅 Date</div>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--orange)' }}>{fmtDate(selectedData.date)}</div>
            {selectedData.isPhysical && <div style={{ fontSize:10, color:'#1a8a36', fontWeight:600, marginTop:2 }}>📋 Physique</div>}
          </div>
        </div>
      )}

      {/* Filters */}
      {selectedData && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <input placeholder="🔍 Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{ flex:1, minWidth:150, padding:'8px 12px', borderRadius:9, border:'1.5px solid var(--border)', fontSize:12, color:'var(--text-1)', background:'var(--surface)', outline:'none' }} />
          {['ALL','AGRO BERRY 1','AGRO BERRY 2','AGRO BERRY 3'].map(f => {
            const label = f==='ALL'?'Toutes':f.replace('AGRO BERRY ','AGB ');
            const fk = f.replace('AGRO BERRY ','AB');
            const col = f==='ALL' ? { text:'#555', bg:'#f0f0f0' } : { text:FC[fk].text, bg:FC[fk].bg };
            const active = selectedFarm===f;
            return <button key={f} onClick={()=>setSelectedFarm(f)} style={{ padding:'8px 12px', borderRadius:9, border:`1.5px solid ${active?col.text:'var(--border)'}`, background:active?col.bg:'var(--surface)', color:active?col.text:'var(--text-2)', fontWeight:active?700:500, fontSize:12, cursor:'pointer' }}>{label}</button>;
          })}
        </div>
      )}

      {/* Table */}
      {!selectedData ? (
        <div style={{ background:'var(--surface)', borderRadius:13, padding:40, textAlign:'center' }}>
          <div style={{ fontSize:38 }}>📅</div>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--text-2)', marginTop:8 }}>Sélectionnez un mois</div>
        </div>
      ) : displayProducts.length===0 ? (
        <div style={{ background:'var(--surface)', borderRadius:13, padding:40, textAlign:'center' }}>
          <div style={{ fontSize:38 }}>📦</div>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--text-2)', marginTop:8 }}>Aucun produit trouvé</div>
        </div>
      ) : (
        <div style={{ background:'var(--surface)', borderRadius:13, overflow:'hidden', border:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', padding:'9px 14px', background:'var(--surface-2)', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:12, fontWeight:600, color:'var(--text-2)' }}>{displayProducts.length} produits</span>
            {selectedData.isPhysical && <span style={{ marginLeft:8, fontSize:10, background:'#e8f8ed', color:'#1a8a36', borderRadius:7, padding:'2px 7px', fontWeight:600 }}>📋 Inventaire Physique</span>}
            {selectedData.isCalculated && !selectedData.isPhysical && <span style={{ marginLeft:8, fontSize:10, background:'#fff8f0', color:'var(--orange)', borderRadius:7, padding:'2px 7px', fontWeight:600 }}>⚡ Calculé</span>}
          </div>
          <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
            <table style={{ width:'100%', minWidth:680, borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--surface-2)', borderBottom:'2px solid var(--border)' }}>
                  <th style={{ textAlign:'left', padding:'10px 14px', fontWeight:700, color:'var(--text-2)', fontSize:11, textTransform:'uppercase', minWidth:170, position:'sticky', left:0, background:'var(--surface-2)', zIndex:2 }}>Produit</th>
                  <th style={{ textAlign:'center', padding:'10px 8px', fontWeight:700, color:'var(--text-2)', fontSize:11, width:50 }}>Unité</th>
                  <th style={{ textAlign:'right', padding:'10px 12px', fontWeight:700, color:FC.AB1.text, fontSize:11, width:85 }}>🌿 AGB 1</th>
                  <th style={{ textAlign:'right', padding:'10px 12px', fontWeight:700, color:FC.AB2.text, fontSize:11, width:85 }}>🌱 AGB 2</th>
                  <th style={{ textAlign:'right', padding:'10px 12px', fontWeight:700, color:FC.AB3.text, fontSize:11, width:85 }}>🪴 AGB 3</th>
                  <th style={{ textAlign:'right', padding:'10px 12px', fontWeight:700, color:'var(--text-1)', fontSize:11, width:85 }}>Total</th>
                  <th style={{ textAlign:'right', padding:'10px 12px', fontWeight:700, color:'var(--text-2)', fontSize:11, width:75 }}>Prix</th>
                  <th style={{ textAlign:'right', padding:'10px 14px', fontWeight:700, color:'#1a8a36', fontSize:11, width:105 }}>Valeur</th>
                </tr>
              </thead>
              <tbody>
                {displayProducts.map((p, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid var(--border)', background: i%2===0 ? 'var(--surface)' : 'var(--surface-2)' }}>
                    <td style={{ padding:'9px 14px', fontWeight:600, color:'var(--text-1)', position:'sticky', left:0, background: i%2===0?'var(--surface)':'var(--surface-2)', zIndex:1 }}>{p.product}</td>
                    <td style={{ padding:'9px 8px', textAlign:'center', color:'var(--text-3)', fontSize:11 }}>{p.unit}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', ...colStyle('AB1',p.AB1) }}>{p.AB1 ? fmt(p.AB1) : <span style={{color:'var(--text-3)'}}>—</span>}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', ...colStyle('AB2',p.AB2) }}>{p.AB2 ? fmt(p.AB2) : <span style={{color:'var(--text-3)'}}>—</span>}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', ...colStyle('AB3',p.AB3) }}>{p.AB3 ? fmt(p.AB3) : <span style={{color:'var(--text-3)'}}>—</span>}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', fontWeight:700, color: p.total<0?'var(--red)':'var(--text-1)', background: i%2===0?'#f9fafb':'#f3f4f6' }}>{fmt(p.total)}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', color:'var(--text-2)', fontSize:12 }}>{p.price ? fmt(p.price) : <span style={{color:'var(--text-3)'}}>—</span>}</td>
                    <td style={{ padding:'9px 14px', textAlign:'right', fontWeight:700, color:'#1a8a36' }}>{fmtMoney(p.value)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background:'#f0faf2', fontWeight:700, borderTop:'2px solid rgba(52,199,89,.3)' }}>
                  <td style={{ padding:'11px 14px', color:'var(--text-1)', fontSize:12, position:'sticky', left:0, background:'#f0faf2' }}>TOTAL — {displayProducts.length} produits</td>
                  <td></td>
                  <td style={{ padding:'11px 12px', textAlign:'right', color:FC.AB1.text }}>{fmt(displayProducts.reduce((s,p)=>s+p.AB1,0))}</td>
                  <td style={{ padding:'11px 12px', textAlign:'right', color:FC.AB2.text }}>{fmt(displayProducts.reduce((s,p)=>s+p.AB2,0))}</td>
                  <td style={{ padding:'11px 12px', textAlign:'right', color:FC.AB3.text }}>{fmt(displayProducts.reduce((s,p)=>s+p.AB3,0))}</td>
                  <td style={{ padding:'11px 12px', textAlign:'right', color:'var(--text-1)' }}>{fmt(stats.qty)}</td>
                  <td></td>
                  <td style={{ padding:'11px 14px', textAlign:'right', color:'#1a8a36', fontSize:13 }}>{fmtMoney(stats.value)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
// v3.0 - responsive sticky col pill months
