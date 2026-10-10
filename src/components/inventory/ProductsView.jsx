import React, { useState } from 'react';
import { useIMS } from '../../context/IMSContext';
import Table from '../common/Table';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import { inr, esc } from '../../utils/helpers';

export default function ProductsView() {
  const { db, setProductModal, deleteProduct, navigate } = useIMS();

  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');

  const categories = [...new Set(db.products.map((p) => p.category))];

  const filtered = db.products.filter(
    (p) =>
      (!q ||
        (p.name + p.sku + (p.hsn || '') + (p.barcode || '') + (p.brand || ''))
          .toLowerCase()
          .includes(q.toLowerCase())) &&
      (!cat || p.category === cat)
  );

  const columns = [
    { h: 'Item Code', f: (p) => p.sku },
    {
      h: 'Item',
      f: (p) => (
        <div>
          <b>{p.name}</b>
          <div className="muted sm">
            {p.brand || ''} {p.barcode ? '• ' + p.barcode : ''}
          </div>
        </div>
      )
    },
    { h: 'Category', f: (p) => p.category },
    { h: 'HSN', f: (p) => p.hsn || '—' },
    { h: 'Unit', f: (p) => p.unit },
    { h: 'Cost', cls: 'num', f: (p) => inr(p.cost) },
    { h: 'Sale Price', cls: 'num', f: (p) => inr(p.price) },
    { h: 'Margin', cls: 'num', f: (p) => Math.round(((p.price - p.cost) / p.price) * 100) + '%' },
    { h: 'Stock', cls: 'num', f: (p) => <b>{p.on_hand}</b> },
    { h: 'Reorder', f: (p) => `${p.reorder_level} / ${p.reorder_qty}` },
    { h: 'Supplier', f: (p) => db.suppliers.find((s) => s.supplier_id === p.supplier_id)?.name || '—' },
    {
      h: 'Status',
      f: (p) => (p.active === false ? <Badge text="Cancelled" /> : <Badge text="Healthy" />)
    },
    {
      h: '',
      f: (p) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="btn xs sec" onClick={() => setProductModal({ open: true, sku: p.sku })}>
            <Icon name="edit" size={13} /> Edit
          </button>
          <button className="btn xs sec" onClick={() => navigate('inventory-ledger')}>
            Ledger
          </button>
          <button className="btn xs no" onClick={() => deleteProduct(p.sku)}>
            <Icon name="trash" size={13} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="ph">
        <div>
          <h2>Item Master</h2>
          <p>
            Ek jagah item banao — price, cost, supplier, reorder sab yahin se Quotation / Sales / Purchase me auto-fill hota hai
          </p>
        </div>
        <div className="acts noprint">
          <button className="btn" onClick={() => setProductModal({ open: true, sku: null })}>
            <Icon name="plus" size={15} /> Add Item
          </button>
        </div>
      </div>

      <div className="card">
        <div className="filters">
          <div className="f grow">
            <label>Search</label>
            <input
              placeholder="Name, code, HSN, barcode…"
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
        </div>

        <Table cols={columns} rows={filtered} pageSize={10} minWidth={1150} />
      </div>
    </div>
  );
}
