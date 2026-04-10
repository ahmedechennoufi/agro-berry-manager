import React from 'react';

// ─── CARD ─────────────────────────────────────────
export const Card = ({ children, className = '', onClick, style = {} }) => (
  <div
    className={`ios-card p-5 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    onClick={onClick}
    style={style}
  >
    {children}
  </div>
);

// ─── STAT CARD ────────────────────────────────────
export const StatCard = ({ icon, label, value, subValue, color = 'blue' }) => {
  const colors = {
    green:  { bg: '#f0faf2', text: '#1a8a36' },
    blue:   { bg: '#f0f6ff', text: '#007aff' },
    orange: { bg: '#fff8f0', text: '#c97300' },
    red:    { bg: '#fff2f1', text: '#ff3b30' },
    purple: { bg: '#f8f0ff', text: '#8a35b0' },
    cyan:   { bg: '#f0f9ff', text: '#0078c0' },
    gray:   { bg: '#f9f9fb', text: '#6e6e73' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div style={{ background: c.bg, borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(0,0,0,0.06)' }}>
      {icon && <span style={{ fontSize: 20, display: 'block', marginBottom: 10 }}>{icon}</span>}
      <p style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: '0 0 3px', letterSpacing: '-0.3px' }}>{value}</p>
      <p style={{ fontSize: 12, color: '#6e6e73', margin: 0, fontWeight: 500 }}>{label}</p>
      {subValue && <p style={{ fontSize: 11, color: '#aeaeb2', margin: '3px 0 0' }}>{subValue}</p>}
    </div>
  );
};

// ─── BADGE ────────────────────────────────────────
export const Badge = ({ children, color = 'blue' }) => (
  <span className={`badge badge-${color}`}>{children}</span>
);

// ─── BUTTON ───────────────────────────────────────
export const Button = ({ children, onClick, variant = 'primary', className = '', disabled, style = {} }) => {
  const cls = variant === 'primary'   ? 'btn-primary'
            : variant === 'danger'    ? 'btn-danger'
            : variant === 'blue'      ? 'btn-blue'
            : 'btn-secondary';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${cls} ${className}`}
      style={{ opacity: disabled ? 0.45 : 1, cursor: disabled ? 'not-allowed' : 'pointer', ...style }}
    >
      {children}
    </button>
  );
};

// ─── INPUT ────────────────────────────────────────
export const Input = ({ label, type = 'text', value, onChange, placeholder, className = '', uppercase = true, required }) => (
  <div className={className}>
    {label && (
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}{required && <span style={{ color: '#ff3b30', marginLeft: 3 }}>*</span>}
      </label>
    )}
    <input
      type={type}
      value={value}
      onChange={e => onChange(type === 'text' && uppercase ? e.target.value.toUpperCase() : e.target.value)}
      placeholder={placeholder}
      className={`input-field ${type === 'text' && uppercase ? 'uppercase' : ''}`}
    />
  </div>
);

// ─── SELECT ───────────────────────────────────────
export const Select = ({ label, value, onChange, options, className = '', required }) => (
  <div className={className}>
    {label && (
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}{required && <span style={{ color: '#ff3b30', marginLeft: 3 }}>*</span>}
      </label>
    )}
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="select-field"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// ─── MODAL ────────────────────────────────────────
export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content ${size === 'lg' ? 'modal-lg' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f', margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: '50%', background: '#f2f2f7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6e6e73', fontSize: 14, fontWeight: 600 }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ─── EMPTY STATE ──────────────────────────────────
export const EmptyState = ({ icon, message, action }) => (
  <div style={{ textAlign: 'center', padding: '48px 20px' }}>
    <span style={{ fontSize: 40, display: 'block', marginBottom: 12, opacity: 0.4 }}>{icon}</span>
    <p style={{ fontSize: 14, color: '#aeaeb2', marginBottom: 16 }}>{message}</p>
    {action}
  </div>
);

// ─── TOAST ────────────────────────────────────────
export const Toast = ({ message, type = 'success', onClose }) => {
  React.useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg = type === 'success' ? '#34c759' : type === 'error' ? '#ff3b30' : '#ff9500';

  return (
    <div className="animate-slide-up" style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: bg, color: '#fff',
      padding: '12px 18px', borderRadius: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      fontSize: 13, fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: 8,
      maxWidth: 320,
    }}>
      <span style={{ fontSize: 16 }}>{type === 'success' ? '✓' : type === 'error' ? '✕' : '!'}</span>
      {message}
    </div>
  );
};

// ─── PROGRESS BAR ─────────────────────────────────
export const ProgressBar = ({ value, max, color = 'blue' }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const colors = { green: '#34c759', blue: '#007aff', purple: '#af52de', orange: '#ff9500', red: '#ff3b30' };
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${pct}%`, background: colors[color] || colors.blue }} />
    </div>
  );
};

// ─── ALERT BOX ────────────────────────────────────
export const AlertBox = ({ type = 'info', title, children, icon }) => (
  <div className={`alert-${type}`}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, marginBottom: 6, fontSize: 13 }}>
      {icon && <span>{icon}</span>}
      <span>{title}</span>
    </div>
    <div style={{ fontSize: 13, opacity: 0.85 }}>{children}</div>
  </div>
);

// ─── FILTER PILL ──────────────────────────────────
export const FilterPill = ({ children, active, onClick }) => (
  <button onClick={onClick} className={`filter-pill ${active ? 'active' : ''}`}>
    {children}
  </button>
);

// ─── TABS ─────────────────────────────────────────
export const Tabs = ({ tabs, activeTab, onChange }) => (
  <div style={{ display: 'flex', gap: 4, padding: 4, background: '#f2f2f7', borderRadius: 12 }}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        style={{
          flex: 1, padding: '7px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
          background: activeTab === tab.id ? '#fff' : 'transparent',
          color: activeTab === tab.id ? '#1d1d1f' : '#6e6e73',
          boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          transition: 'all 0.15s', fontFamily: 'inherit',
        }}
      >
        {tab.icon && <span style={{ marginRight: 5 }}>{tab.icon}</span>}
        {tab.label}
      </button>
    ))}
  </div>
);
