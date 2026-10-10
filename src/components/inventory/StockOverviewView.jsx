import React, { useState } from 'react';
import { useIMS } from '../../context/IMSContext';
import Table from '../common/Table';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import { inr } from '../../utils/helpers';

export default function StockOverviewView() {
  const { db, stockStatus, incoming, demand, projected, createPR, setStockAdjustModal, navigate, addToast } = useIMS();

  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [st, setSt] = useState('');

  const categories = [...new Set(db.products.map((p) => p.category))];

  const filtered = db.products.filter(
    (p) =>
      (!q || (p.name + p.sku).toLowerCase().includes(q.toLowerCase())) &&
      (!cat || p.category === cat) &&
      (!st || stockStatus(p) === st)
  );

  const handleReorderCheck = () => {
    let createdCount = 0;
    db.products.forEach((p) => {
      const prVal = projected(p.sku);
      if (prVal <= p.reorder_level) {
        const qtyNeeded = p.reorder_qty + Math.max(0, p.reorder_level - prVal);
        createPR([{ sku: p.sku, qty: qtyNeeded }], 'Manual (Reorder Check)');
        createdCount++;
      }
    });
    addToast(
      createdCount > 0 ? `${createdCount} purchase request(s) created` : 'No items need reorder',
      'info'
    );
  };

  const columns = [
    { h: 'SKU', f: (p) => p.sku },
    {
      h: 'Product',
      f: (p) => (
        <div>
          <b>{p.name}</b>
          <div className="muted sm">{p.category}</div>
        </div>
      )
    },
    { h: 'On Hand', cls: 'num', f: (p) => <b>{p.on_hand}</b> },
    { h: 'Reserved', cls: 'num', f: (p) => p.reserved },
    { h: 'Available', cls: 'num', f: (p) => p.on_hand - p.reserved },
    { h: 'On Order', cls: 'num', f: (p) => incoming(p.sku) },
    { h: 'Open Demand', cls: 'num', f: (p) => demand(p.sku) },
    { h: 'Reorder Lvl', cls: 'num', f: (p) => p.reorder_level },
    { h: 'Avg Cost', cls: 'num', f: (p) => inr(p.cost) },
    { h: 'Value', cls: 'num', f: (p) => inr(p.on_hand * p.cost) },
    { h: 'Status', f: (p) => <Badge text={stockStatus(p)} /> },
    {
      h: '',
      f: (p) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="btn xs sec" onClick={() => navigate('inventory-ledger')}>
            Ledger
          </button>
          <button
            className="btn xs sec"
            onClick={() => setStockAdjustModal({ open: true, sku: p.sku })}
          >
            Adjust
          </button>
          {projected(p.sku) <= p.reorder_level && (
            <button
              className="btn xs wn"
              onClick={() => {
                const prVal = projected(p.sku);
                const qNeeded = p.reorder_qty + Math.max(0, p.reorder_level - prVal);
                createPR([{ sku: p.sku, qty: qNeeded }], 'Manual (alert)');
                addToast('Purchase request created');
              }}
            >
              Create PR
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="ph">
        <div>
          <h2>Stock Overview</h2>
          <p>
            Real-time stock — updated automatically by purchase receipts, sales deliveries and adjustments
          </p>
        </div>
        <div className="acts noprint">
          <button className="btn out" onClick={handleReorderCheck}>
            <Icon name="refresh" size={15} /> Run Reorder Check
          </button>
          <button className="btn" onClick={() => setStockAdjustModal({ open: true, sku: null })}>
            <Icon name="plus" size={15} /> Stock Adjustment
          </button>
        </div>
      </div>

      <div className="card">
        <div className="filters">
          <div className="f grow">
            <label>Search</label>
            <input
              placeholder="Name or SKU…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="f">
            <label>Category</label>
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="f">
            <label>Status</label>
            <select value={st} onChange={(e) => setSt(e.target.value)}>
              <option value="">All</option>
              {['Healthy', 'Low — PO incoming', 'Reorder Needed', 'Out of Stock'].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Table cols={columns} rows={filtered} pageSize={9} minWidth={1150} />
      </div>
    </div>
  );
}
