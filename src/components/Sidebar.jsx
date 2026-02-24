import React, { useState } from 'react';

const menuItems = [
  { id: 'dashboard', icon: '📊', label: 'Tableau de Bord' },
  { id: 'consofermes', icon: '🔥', label: 'Consommation Fermes' },
  { id: 'stock', icon: '📦', label: 'Stock Global' },
  { id: 'movements', icon: '🚚', label: 'Mouvements' },
  { id: 'farms', icon: '🌱', label: 'Stock Fermes' },
  { id: 'transfers', icon: '🔄', label: 'Transferts' },
  { id: 'history', icon: '📈', label: 'Historique' },
  { id: 'products', icon: '📋', label: 'Produits' },
  { id: 'settings', icon: '⚙️', label: 'Paramètres' }
];

const coutSubMenu = [
  { id: 'saisie', icon: '✏️', label: 'Saisie Consommation' },
  { id: 'melange', icon: '🧪', label: 'Mélanges' },
  { id: 'costs', icon: '📊', label: 'Coûts Production' }
];

const Sidebar = ({ currentPage, setCurrentPage, isOpen, setIsOpen }) => {
  const [coutOpen, setCoutOpen] = useState(false);
  const isCoutPage = ['saisie', 'melange', 'costs'].includes(currentPage);

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setIsOpen(false)} />}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-72 ios-sidebar transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col`}>
        
        {/* Logo */}
        <div className="p-5 border-b border-gray-200/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-sm">
              <span className="text-xl">🫐</span>
            </div>
            <div>
              <h1 className="font-semibold text-lg text-ios-dark">Agro Berry</h1>
              <p className="text-xs text-ios-gray">Manager v2.0</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {menuItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => { setCurrentPage(item.id); setIsOpen(false); setCoutOpen(false); }}
              className={`ios-sidebar-item w-full flex items-center gap-3 ${currentPage === item.id ? 'active' : ''}`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium text-[15px]">{item.label}</span>
            </button>
          ))}
          
          {/* Coût Production */}
          <div className="mt-4 pt-4 mx-4 border-t border-gray-200/50">
            <button 
              onClick={() => setCoutOpen(!coutOpen)}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all
                ${isCoutPage || coutOpen ? 'bg-orange-500 text-white' : 'text-ios-dark hover:bg-gray-100'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">💰</span>
                <span className="font-medium text-[15px]">Coût Production</span>
              </div>
              <svg className={`w-4 h-4 transition-transform ${coutOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {coutOpen && (
              <div className="mt-2 space-y-1 animate-slideUp">
                {coutSubMenu.map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => { setCurrentPage(item.id); setIsOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm
                      ${currentPage === item.id ? 'bg-orange-100 text-orange-600' : 'text-ios-gray hover:bg-gray-100'}`}
                  >
                    <span>{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200/50 text-center">
          <p className="text-xs text-ios-gray">© 2025 Agro Berry</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
