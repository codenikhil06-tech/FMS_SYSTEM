import React, { useState, useEffect } from 'react';
import { useIMS } from '../../context/IMSContext';
import Icon from '../common/Icon';
import { fmtD } from '../../utils/helpers';

const ROUTE_TITLES = {
  'item-master': 'Item Master',
  'stock-summary': 'Stock Summary',
  quotations: 'Quotations',
  'purchase-returns': 'Purchase Returns',
  'sales-returns': 'Sales Returns',
  dashboard: 'Dashboard',
  'inventory-stock': 'Stock Overview',
  'inventory-ledger': 'Stock Ledger',
  products: 'Products',
  'purchase-requests': 'Purchase Requests',
  'purchase-orders': 'Purchase Orders',
  'purchase-grn': 'Goods Receipts',
  'purchase-bills': 'Supplier Bills',
  suppliers: 'Suppliers',
  'sales-orders': 'Sales Orders',
  'sales-deliveries': 'Deliveries',
  'sales-invoices': 'Invoices',
  customers: 'Customers',
  reports: 'Reports'
};

export default function Header({ onToggleSidebar }) {
  const { currentRoute, theme, toggleTheme, D, notifs, notifRead, setNotifRead, navigate } = useIMS();
  const [showNotifs, setShowNotifs] = useState(false);

  const mainRoute = currentRoute.split('/')[0];
  const title = ROUTE_TITLES[mainRoute] || 'Dashboard';
  const alertList = notifs();
  const unreadCount = notifRead ? 0 : alertList.length;

  // Close notifications if clicked outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (!e.target.closest('.notif') && !e.target.closest('#bellBtn')) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, []);

  return (
    <>
      <header className="top">
        <button className="ib hamb" onClick={onToggleSidebar}>
          <Icon name="menu" />
        </button>

        <h1>{title}</h1>
        <div className="sp" />

        <div className="vdate">
          <Icon name="clock" size={15} />
          <span className="l">System date</span> {fmtD(D)}
        </div>

        <button
          id="bellBtn"
          className="ib"
          onClick={() => setShowNotifs((prev) => !prev)}
        >
          <Icon name="bell" />
          {unreadCount > 0 && <span className="dot">{unreadCount}</span>}
        </button>

        <button className="ib" onClick={toggleTheme}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
      </header>

      {showNotifs && (
        <div className="notif">
          <h4>
            <b>Alerts</b>
            <a
              style={{ float: 'right', fontSize: '12px' }}
              onClick={() => {
                setNotifRead(true);
                setShowNotifs(false);
              }}
            >
              Mark all read
            </a>
          </h4>
          {alertList.length > 0 ? (
            alertList.map((n, i) => (
              <a
                key={i}
                href={`#/${n.r}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(n.r);
                  setShowNotifs(false);
                }}
              >
                <i style={{ background: n.c }} />
                <span>{n.t}</span>
              </a>
            ))
          ) : (
            <div className="muted" style={{ padding: '20px', textAlign: 'center' }}>
              All clear ✔
            </div>
          )}
        </div>
      )}
    </>
  );
}
