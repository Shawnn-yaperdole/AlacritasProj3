// src/Global/Header.jsx
import React from 'react';

const Header = ({ userMode, toggleMode, setIsMenuOpen, currentView, setCurrentView }) => {
  const themeColor = userMode === 'client' ? 'var(--primary-client)' : 'var(--primary-provider)';

  const navItems = [
    { key: 'home', label: 'Home', icon: '🏠' },
    { key: 'messages', label: 'Messages', icon: '💬' },
    { key: 'offers', label: 'Offers', icon: '📄' },
    { key: 'profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <header
      className="
        header w-full flex items-center justify-between
        px-4 py-2
        fixed z-50 bg-white
        md:static md:flex-row
      "
    >
      {/* Desktop Logo */}
      <div className="hidden md:flex items-center gap-4">
        <div className="logo text-lg font-bold" style={{ color: themeColor }}>
          Alacritas{' '}
          <small className="text-gray-700">
            ({userMode === 'client' ? 'Client' : 'Provider'})
          </small>
        </div>
      </div>

      {/* Nav Buttons */}
      <nav className="flex-1 flex items-center justify-around md:justify-center w-full">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setCurrentView(item.key)}
            className="
              nav-btn flex flex-col items-center justify-center
              px-2 py-1 transition-all
            "
            style={{
              color: currentView === item.key ? themeColor : '#666',
              borderBottom:
                currentView === item.key
                  ? `3px solid ${themeColor}`
                  : '3px solid transparent',
            }}
          >
            {/* Icon (shown on mobile & desktop) */}
            <span className="icon-only text-2xl md:hidden">{item.icon}</span>
            {/* Label (desktop only) */}
            <span className="label-text hidden md:block text-base font-medium">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Switch + Menu */}
      <div className="flex items-center gap-3">
        {/* Switch Button */}
        <button
          className="switch-btn"
          onClick={toggleMode}
          style={{ color: themeColor }}
        >
          <span className="hidden md:inline">
            Switch to {userMode === 'client' ? 'Provider' : 'Client'}
          </span>
          <span className="md:hidden">🔄</span> {/* Mobile icon only */}
        </button>

        {/* Menu Button */}
        <button
          className="menu-btn"
          onClick={() => setIsMenuOpen(true)}
        >
          ☰
        </button>
      </div>
    </header>
  );
};

export default Header;
