import React from 'react';

// iOS Card
export const Card = ({ children, className = '', onClick }) => (
  <div 
    className={`ios-card p-5 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

// Stat Card with colored background
export const StatCard = ({ icon, label, value, subValue, color = 'blue', trend, trendUp }) => {
  const colorClasses = {
    green: 'stat-card-green',
    blue: 'stat-card-blue',
    purple: 'stat-card-purple',
    orange: 'stat-card-orange',
    red: 'stat-card-red',
    cyan: 'stat-card-cyan'
  };
  
  const textColors = {
    green: 'text-green-700',
    blue: 'text-blue-700',
    purple: 'text-purple-700',
    orange: 'text-orange-700',
    red: 'text-red-700',
    cyan: 'text-cyan-700'
  };
  
  return (
    <div className={`stat-card ${colorClasses[color]}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${textColors[color]} mb-1`}>{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
      {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
    </div>
  );
};

// Badge
export const Badge = ({ children, color = 'blue' }) => {
  const colorClass = `badge-${color}`;
  return <span className={`badge ${colorClass}`}>{children}</span>;
};

// Button
export const Button = ({ children, onClick, variant = 'primary', className = '', disabled }) => {
  const variantClass = variant === 'primary' ? 'btn-primary' : 
                       variant === 'danger' ? 'btn-danger' :
                       variant === 'blue' ? 'btn-blue' : 'btn-secondary';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${variantClass} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

// Input
export const Input = ({ label, type = 'text', value, onChange, placeholder, className = '', uppercase = true }) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium text-gray-600 mb-2">{label}</label>}
    <input
      type={type}
      value={value}
      onChange={(e) => {
        const val = e.target.value;
        // Convert to uppercase for text inputs (not for date, number, etc.)
        onChange(type === 'text' && uppercase ? val.toUpperCase() : val);
      }}
      placeholder={placeholder}
      className={`input-field ${type === 'text' && uppercase ? 'uppercase' : ''}`}
    />
  </div>
);

// Select
export const Select = ({ label, value, onChange, options, className = '' }) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium text-gray-600 mb-2">{label}</label>}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="select-field"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// Modal
export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// Empty State
export const EmptyState = ({ icon, message, action }) => (
  <div className="text-center py-12">
    <span className="text-5xl mb-4 block">{icon}</span>
    <p className="text-gray-500 mb-4">{message}</p>
    {action}
  </div>
);

// Toast notification
export const Toast = ({ message, type = 'success', onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white'
  };

  return (
    <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg animate-slide-up ${colors[type]}`}>
      <div className="flex items-center gap-3">
        <span>{type === 'success' ? '✓' : type === 'error' ? '✕' : '⚠'}</span>
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );
};

// Progress Bar
export const ProgressBar = ({ value, max, color = 'blue' }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const colors = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500'
  };
  
  return (
    <div className="progress-bar">
      <div 
        className={`progress-fill ${colors[color]}`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
};

// Alert Box
export const AlertBox = ({ type, title, children, icon }) => {
  const styles = {
    critical: 'alert-critical',
    warning: 'alert-warning',
    info: 'alert-info'
  };
  
  const textColors = {
    critical: 'text-red-700',
    warning: 'text-yellow-800',
    info: 'text-blue-700'
  };
  
  return (
    <div className={styles[type]}>
      <div className={`flex items-center gap-2 font-semibold mb-2 ${textColors[type]}`}>
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      <div className={`text-sm ${textColors[type]} opacity-90`}>{children}</div>
    </div>
  );
};

// Filter Pills
export const FilterPill = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`filter-pill ${active ? 'active' : ''}`}
  >
    {children}
  </button>
);

// Tabs
export const Tabs = ({ tabs, activeTab, onChange }) => (
  <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          activeTab === tab.id 
            ? 'bg-white text-gray-900 shadow-sm' 
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        {tab.icon && <span className="mr-2">{tab.icon}</span>}
        {tab.label}
      </button>
    ))}
  </div>
);

// Data Table
export const DataTable = ({ columns, data, onRowClick }) => (
  <div className="overflow-x-auto">
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((col, i) => (
            <th key={i} className={col.align === 'right' ? 'text-right' : ''}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr 
            key={i} 
            onClick={() => onRowClick?.(row)}
            className={onRowClick ? 'cursor-pointer' : ''}
          >
            {columns.map((col, j) => (
              <td key={j} className={col.align === 'right' ? 'text-right' : ''}>
                {col.render ? col.render(row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
