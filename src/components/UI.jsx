import React from 'react';

// iOS Card
export const Card = ({ children, className = '', onClick }) => (
  <div className={`ios-card p-4 ${onClick ? 'cursor-pointer active:bg-gray-50' : ''} ${className}`} onClick={onClick}>
    {children}
  </div>
);

// iOS Button
export const Button = ({ children, onClick, variant = 'primary', size = 'md', className = '', disabled = false, type = 'button' }) => {
  const variants = {
    primary: 'ios-btn-blue',
    secondary: 'ios-btn-gray',
    danger: 'ios-btn-red',
    orange: 'bg-orange-500 text-white'
  };
  const sizes = { sm: 'px-3 py-2 text-sm', md: 'px-5 py-2.5', lg: 'px-6 py-3 text-lg' };
  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled}
      className={`ios-btn ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

// iOS Input
export const Input = ({ label, type = 'text', value, onChange, placeholder, className = '', required = false, min, max, step, list }) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium text-ios-gray mb-1.5 ml-1">{label}</label>}
    <input 
      type={type} 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      placeholder={placeholder} 
      required={required} 
      min={min} 
      max={max} 
      step={step} 
      list={list}
      className="ios-input" 
    />
  </div>
);

// iOS Select
export const Select = ({ label, value, onChange, options, className = '', required = false }) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium text-ios-gray mb-1.5 ml-1">{label}</label>}
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      required={required}
      className="ios-input cursor-pointer"
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

// iOS Modal
export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl', xl: 'max-w-2xl', full: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 ios-modal-overlay flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className={`ios-modal w-full ${sizes[size]} max-h-[85vh] overflow-auto animate-slideUp`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200/50 bg-white rounded-t-xl">
          <h3 className="text-lg font-semibold text-ios-dark">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
            ✕
          </button>
        </div>
        <div className="p-4 bg-white rounded-b-xl">{children}</div>
      </div>
    </div>
  );
};

// iOS Stat Card
export const StatCard = ({ icon, label, value, subValue, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-500',
    green: 'bg-green-50 text-green-500',
    orange: 'bg-orange-50 text-orange-500',
    red: 'bg-red-50 text-red-500',
    purple: 'bg-purple-50 text-purple-500'
  };
  const textColors = {
    blue: 'text-ios-blue',
    green: 'text-ios-green',
    orange: 'text-ios-orange',
    red: 'text-ios-red',
    purple: 'text-purple-500'
  };
  return (
    <div className="ios-stat">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center text-lg`}>
          {icon}
        </div>
        <span className="text-ios-gray text-sm font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${textColors[color]}`}>{value}</p>
      {subValue && <p className="text-xs text-ios-gray mt-1">{subValue}</p>}
    </div>
  );
};

// iOS Badge
export const Badge = ({ children, color = 'gray' }) => {
  const colors = {
    gray: 'ios-badge-gray',
    green: 'ios-badge-green',
    blue: 'ios-badge-blue',
    red: 'ios-badge-red',
    orange: 'ios-badge-orange'
  };
  return <span className={`ios-badge ${colors[color]}`}>{children}</span>;
};

// Empty State
export const EmptyState = ({ icon = '📦', message = 'Aucune donnée' }) => (
  <div className="text-center py-12">
    <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center text-3xl mb-3">{icon}</div>
    <p className="text-ios-gray">{message}</p>
  </div>
);

// Toast
export const Toast = ({ message, type = 'success', onClose }) => {
  const colors = { success: 'bg-ios-green', error: 'bg-ios-red', warning: 'bg-ios-orange' };
  React.useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  return (
    <div className={`fixed top-6 right-6 ${colors[type]} text-white px-5 py-3 rounded-xl shadow-lg z-50 animate-slideUp font-medium`}>
      {message}
    </div>
  );
};

// Tabs
export const Tabs = ({ tabs, activeTab, onChange }) => (
  <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
    {tabs.map(tab => (
      <button 
        key={tab.id} 
        onClick={() => onChange(tab.id)}
        className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all
          ${activeTab === tab.id ? 'bg-white text-ios-dark shadow-sm' : 'text-ios-gray'}`}
      >
        {tab.icon && <span className="mr-1.5">{tab.icon}</span>}{tab.label}
      </button>
    ))}
  </div>
);
