import React, { useState } from 'react';

const menuItems = [
  { id: 'dashboard',          label: 'Tableau de bord' },
  { id: 'movements',          label: 'Mouvements'      },
  { id: 'consofermes',        label: 'Consommation'    },
  { id: 'stock',              label: 'Stock Global'    },
  { id: 'farms',              label: 'Stock Fermes'    },
  { id: 'inventory',          label: 'Historique Stock'},
  { id: 'physical-inventory', label: 'Inventaire Physique' },
  { id: 'commandes',          label: 'Commandes'       },
  { id: 'products',           label: 'Produits'        },
  { id: 'seuils',             label: 'Réserve & Seuils'},
  { id: 'settings',           label: 'Parametres'      },
];

const Icon = ({ id, size = 15 }) => {
  const icons = {
    dashboard:           'M3 3h7v7H3zm0 0',
    movements:           'M8 4l4 4-4 4M4 8h8',
    consofermes:         'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z',
    stock:               'M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z',
    farms:               'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',
    inventory:           'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    'physical-inventory':'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2',
    commandes:           'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2',
    products:            'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10',
    seuils:              'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    settings:            'M12 15a3 3 0 100-6 3 3 0 000 6z',
  };
  const d = icons[id] || icons.dashboard;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
};

const Sidebar = ({ currentPage, setCurrentPage, isOpen, setIsOpen, isCollapsed, setIsCollapsed }) => {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      <aside style={{
        width: isCollapsed ? 60 : 220,
        minWidth: isCollapsed ? 60 : 220,
        background: '#1c1c1e',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
        position: 'relative',
      }}>

        {/* Logo */}
        <div style={{ padding: isCollapsed ? '20px 0' : '20px 16px', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {!isCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#34c759', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 00-7.35 16.76M12 2a10 10 0 017.35 16.76M12 2v20" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1 }}>Agro Berry</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Manager</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#34c759', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 00-7.35 16.76M12 2a10 10 0 017.35 16.76M12 2v20" />
              </svg>
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
              title="Réduire"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {isCollapsed && (
            <button
              onClick={() => setIsCollapsed(false)}
              style={{ position: 'absolute', top: 20, right: -10, background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: '4px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', zIndex: 10 }}
              title="Agrandir"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {menuItems.map(item => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setCurrentPage(item.id); setIsOpen(false); }}
                title={isCollapsed ? item.label : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: isCollapsed ? '9px 0' : '9px 12px',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: 2,
                  background: active ? '#007aff' : 'transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  transition: 'background 0.15s, color 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; } }}
              >
                <Icon id={item.id} size={15} />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
