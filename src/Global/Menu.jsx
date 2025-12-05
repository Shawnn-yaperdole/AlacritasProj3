// src/Global/Menu.jsx
import React from "react";

const Menu = ({ isOpen, close, logout }) => {
  return (
    <>
      {/* Overlay */}
      {isOpen && <div className="menu-overlay" onClick={close}></div>}

      {/* Side Menu */}
      <div className={`side-menu ${isOpen ? "open" : ""}`}>
        {/* Top Row */}
        <div className="menu-top-row">
          <div className="menu-title">Menu</div>

          <div className="menu-buttons">
            {/* Notification Button */}
            <button className="notif-btn">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="notif-icon"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.657A2 2 0 0113 19H11a2 2 0 01-1.857-1.343M6 8a6 6 0 1112 0c0 2.577.67 4.157 1.318 5.135.46.689.682 1.023.682 1.365 0 .772-.657 1.5-2 1.5H6c-1.343 0-2-.728-2-1.5 0-.342.222-.676.682-1.365C5.33 12.157 6 10.577 6 8z"
                />
              </svg>
            </button>

            {/* Close Button */}
            <button className="close-btn" onClick={close}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                className="close-icon"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Menu Items + Logout */}
        <div className="menu-items-wrapper">
          <div className="menu-items">
            <button className="menu-item">Settings</button>
            <button className="menu-item">Preference & Appearance</button>
            <button className="menu-item">Report A Problem</button>
            <button className="menu-item">Get Help</button>
          </div>

          <button className="menu-item logout" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default Menu;
