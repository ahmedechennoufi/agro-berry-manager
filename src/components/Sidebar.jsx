import React, { useState, useMemo, useEffect } from 'react';
import { getAlerts } from '../lib/store';

const menuItems = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'movements', icon: '🔄', label: 'Mouvements' },
  { id: 'consofermes', icon: '🔥', label: 'Consommation' },
  { id: 'stock', icon: '📦', label: 'Stock Global' },
  { id: 'farms', icon: '🌱', label: 'Stock Fermes' },
  { id: 'costs', icon: '💰', label: 'Coût Production' },
  { id: 'inventory', icon: '📅', label: 'Historique Stock' },
  { id: 'products', icon: '📋', label: 'Produits' },
  { id: 'settings', icon: '⚙️', label: 'Paramètres' }
];

const Sidebar = ({ currentPage, setCurrentPage, isOpen, setIsOpen, isCollapsed, setIsCollapsed }) => {
  const alertsCount = useMemo(() => {
    const alerts = getAlerts();
    return alerts.filter(a => a.severity === 'critical' || a.severity === 'warning').length;
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden" 
          onClick={() => setIsOpen(false)} 
        />
      )}
      
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 sidebar
        transform transition-all duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'w-20' : 'w-64'}
        flex flex-col
      `}>
        {/* Logo & Toggle */}
        <div className="p-4">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-xl">🫐</span>
            </div>
            {!isCollapsed && (
              <div className="flex-1">
                <h1 className="font-bold text-white text-lg">Agro Berry</h1>
                <p className="text-xs text-white/60">Manager Pro</p>
              </div>
            )}
            {/* Toggle Button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all duration-200"
              title={isCollapsed ? 'Afficher le menu' : 'Masquer le menu'}
            >
              {isCollapsed ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {menuItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => { setCurrentPage(item.id); setIsOpen(false); }}
              className={`
                sidebar-item w-full 
                ${currentPage === item.id ? 'active' : ''}
                ${isCollapsed ? 'justify-center px-2' : ''}
              `}
              title={isCollapsed ? item.label : ''}
            >
              <span className={`text-lg ${isCollapsed ? 'w-auto' : 'w-6'} text-center`}>{item.icon}</span>
              {!isCollapsed && <span className="flex-1 text-left">{item.label}</span>}
              {item.showBadge && alertsCount > 0 && !isCollapsed && (
                <span className="notification-badge">
                  {alertsCount > 99 ? '99+' : alertsCount}
                </span>
              )}
              {item.showBadge && alertsCount > 0 && isCollapsed && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
