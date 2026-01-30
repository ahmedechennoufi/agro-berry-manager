import React from 'react';

// Card
export const Card = ({ children, className = '', onClick }) => (
  <div 
    className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md ${onClick ? 'cursor-pointer' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

// Button
export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false,
  type = 'button'
}) => {
  const variants = {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    success: 'bg-green-500 hover:bg-green-600 text-white',
    outline: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-50'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${variants[variant]} ${sizes[size]} rounded-lg font-medium transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

// Input
export const Input = ({ 
  label, 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  className = '', 
  required = false,
  min,
  max,
  step
}) => (
  <div className={className}>
    {label && (
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      min={min}
      max={max}
      step={step}
      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
    />
  </div>
);

// Select
export const Select = ({ 
  label, 
  value, 
  onChange, 
  options, 
  className = '', 
  required = false 
}) => (
  <div className={className}>
    {label && (
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// Modal
export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 fade-in">
      <div className={`bg-white rounded-xl shadow-xl w-full ${sizes[size]} max-h-[90vh] overflow-auto`}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

// Stat Card
export const StatCard = ({ icon, label, value, subValue, color = 'primary' }) => {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    gray: 'bg-gray-50 text-gray-600'
  };
  
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 ${colors[color]} rounded-xl flex items-center justify-center text-2xl`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500 truncate">{label}</p>
          <p className="text-xl md:text-2xl font-bold text-gray-800 truncate">{value}</p>
          {subValue && <p className="text-xs text-gray-400 truncate">{subValue}</p>}
        </div>
      </div>
    </Card>
  );
};

// Badge
export const Badge = ({ children, color = 'gray' }) => {
  const colors = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    purple: 'bg-purple-100 text-purple-700'
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
};

// Loading
export const Loading = () => (
  <div className="flex items-center justify-center p-8">
    <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Empty State
export const EmptyState = ({ icon = '📦', message = 'Aucune donnée' }) => (
  <div className="text-center py-12 text-gray-500">
    <p className="text-4xl mb-4">{icon}</p>
    <p>{message}</p>
  </div>
);

// Notification Toast
export const Toast = ({ message, type = 'success', onClose }) => {
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-orange-500',
    info: 'bg-blue-500'
  };
  
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className={`fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 fade-in`}>
      {message}
    </div>
  );
};

// Table
export const Table = ({ columns, data, onRowClick }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-100">
          {columns.map((col, i) => (
            <th 
              key={i} 
              className={`py-3 px-4 font-medium text-gray-600 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr 
            key={row.id || i} 
            className={`border-b border-gray-50 hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
            onClick={() => onRowClick && onRowClick(row)}
          >
            {columns.map((col, j) => (
              <td 
                key={j} 
                className={`py-3 px-4 ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.className || ''}`}
              >
                {col.render ? col.render(row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Tabs
export const Tabs = ({ tabs, activeTab, onChange }) => (
  <div className="flex gap-2 overflow-x-auto pb-2">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
          activeTab === tab.id 
            ? 'bg-primary-500 text-white' 
            : 'bg-white text-gray-600 hover:bg-gray-100'
        }`}
      >
        {tab.icon && <span className="mr-2">{tab.icon}</span>}
        {tab.label}
      </button>
    ))}
  </div>
);
