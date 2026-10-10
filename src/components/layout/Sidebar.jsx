import React, { useState } from 'react';
import { useIMS } from '../../context/IMSContext';
import Icon from '../common/Icon';

const MENU = [
  { t: 'Dashboard', i: 'home', r: 'dashboard' },
  {
    t: 'Inventory',
    i: 'box',
    c: [
      ['Item Master', 'item-master'],
      ['Stock Overview', 'inventory-stock'],
      ['Stock Summary', 'stock-summary'],
      ['Stock Ledger', 'inventory-ledger']
    ]
  },
  {
    t: 'Purchase',
    i: 'truck',
    c: [
      ['Purchase Requests', 'purchase-requests'],
      ['Purchase Orders', 'purchase-orders'],
      ['Goods Receipts (GRN)', 'purchase-grn'],
      ['Supplier Bills', 'purchase-bills'],
      ['Purchase Returns', 'purchase-returns'],
      ['Suppliers', 'suppliers']
    ]
  },
  {
    t: 'Sales',
    i: 'cart',
    c: [
      ['Quotations', 'quotations'],
      ['Sales Orders', 'sales-orders'],
      ['Deliveries', 'sales-deliveries'],
      ['Invoices', 'sales-invoices'],
      ['Sales Returns', 'sales-returns'],
      ['Customers', 'customers']
    ]
  },
  {
    t: 'Reports',
    i: 'chart',
    c: [
      ['Sales Report', 'reports/sales'],
      ['Purchase Report', 'reports/purchase'],
      ['Stock Valuation', 'reports/stock'],
      ['Profit by Month', 'reports/profit'],
      ['Ageing', 'reports/recaging']
    ]
  }
];

export default function Sidebar({ isOpen, onClose }) {
  const { currentRoute, navigate, resetDemo } = useIMS();
  const [openGroups, setOpenGroups] = useState(new Set(['Inventory', 'Purchase', 'Sales']));

  const toggleGroup = (title) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const isActive = (r) => {
    if (r.includes('/')) return currentRoute === r;
    return currentRoute.split('/')[0] === r;
  };

  const handleNav = (r) => {
    navigate(r);
    if (onClose) onClose();
  };

  return (
    <>
      <div className={`scrim ${isOpen ? 'show' : ''}`} onClick={onClose} />
      <aside className={`side ${isOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="lg">N</div>
          <div>
            Nexora IMS
            <small>Inventory • Purchase • Sales</small>
          </div>
        </div>

        <nav className="nav">
          {MENU.map((m, i) => {
            if (m.c) {
              const isGrpOpen = openGroups.has(m.t) || m.c.some((c) => isActive(c[1]));
              return (
                <div key={i} className={`grp ${isGrpOpen ? 'open' : ''}`}>
                  <button className="gh" onClick={() => toggleGroup(m.t)}>
                    <Icon name={m.i} />
                    <span>{m.t}</span>
                    <span className="ch">
                      <Icon name="chevron" size={15} />
                    </span>
                  </button>
                  <div className="sub">
                    {m.c.map((c, j) => (
                      <a
                        key={j}
                        href={`#/${c[1]}`}
                        className={isActive(c[1]) ? 'active' : ''}
                        onClick={(e) => {
                          e.preventDefault();
                          handleNav(c[1]);
                        }}
                      >
                        {c[0]}
                      </a>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <a
                key={i}
                href={`#/${m.r}`}
                className={`it ${isActive(m.r) ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleNav(m.r);
                }}
              >
                <Icon name={m.i} />
                <span>{m.t}</span>
              </a>
            );
          })}
        </nav>

        <div className="sfoot">
          <button onClick={resetDemo}>
            <Icon name="refresh" size={15} /> Reset demo data
          </button>
        </div>
      </aside>
    </>
  );
}
