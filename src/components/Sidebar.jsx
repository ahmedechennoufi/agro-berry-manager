import React from 'react';

const menuItems = [
  { id: 'dashboard', icon: '📊', label: 'Tableau de Bord' },
  { id: 'stock', icon: '📦', label: 'Stock Global' },
  { id: 'movements', icon: '🚚', label: 'Mouvements' },
  { id: 'farms', icon: '🌱', label: 'Fermes' },
  { id: 'transfers', icon: '🔄', label: 'Transferts' },
  { id: 'consumption', icon: '🔥', label: 'Consommation' },
  { id: 'costs', icon: '💰', label: 'Coûts Production' },
  { id: 'history', icon: '📈', label: 'Historique' },
  { id: 'comparison', icon: '📊', label: 'Comparaison' },
  { id: 'products', icon: '📋', label: 'Produits' },
  { id: 'settings', icon: '⚙️', label: 'Paramètres' }
];

const Sidebar = ({ currentPage, setCurrentPage, isOpen, setIsOpen }) => {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-gradient-to-b from-primary-600 to-primary-700 
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col
      `}>
        {/* Header */}
        <div className="p-4 border-b border-primary-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-xl">🫐</span>
            </div>
            <div>
              <h1 className="font-bold text-white">Agro Berry</h1>
              <p className="text-xs text-primary-200">Manager v1.0</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPage(item.id);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                ${currentPage === item.id
                  ? 'bg-white/20 text-white'
                  : 'text-primary-100 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-primary-500/30 text-primary-200 text-xs text-center">
          © 2025 Agro Berry Manager
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
