import React, { useState } from 'react';
import { useIMS } from '../../context/IMSContext';
import Table from '../common/Table';
import Badge from '../common/Badge';
import { fmtD, inr } from '../../utils/helpers';

export default function StockLedgerView() {
  const { db, P, openDoc } = useIMS();

  const [selectedSku, setSelectedSku] = useState('');
  const [movementType, setMovementType] = useState('');

  const filteredLedger = [...db.ledger]
    .reverse()
    .filter(
      (l) =>
        (!selectedSku || l.sku === selectedSku) &&
        (!movementType || l.type === movementType)
    );

  const columns = [
    { h: 'Date', f: (l) => fmtD(l.date) },
    { h: 'Product', f: (l) => P(l.sku)?.name || l.sku },
    {
      h: 'Type',
      f: (l) => (
        <span>
          <Badge
            text={
              /Purchase/.test(l.type)
                ? 'Purchase'
                : /Sales/.test(l.type)
                ? 'Sales'
                : 'Inventory'
            }
          />{' '}
          {l.type}
        </span>
      )
    },
    {
      h: 'Document',
      f: (l) =>
        /^(GRN|DN|PRT|SRT)-/.test(l.ref) ? (
          <a onClick={() => openDoc(l.ref)}>
            <b>{l.ref}</b>
          </a>
        ) : (
          l.ref
        )
    },
    { h: 'Note', f: (l) => l.note },
    {
      h: 'Qty',
      cls: 'num',
      f: (l) => (
        <b className={l.qty > 0 ? 'pos' : 'neg'}>
          {l.qty > 0 ? '+' : ''}
          {l.qty}
        </b>
      )
    },
    { h: 'Balance', cls: 'num', f: (l) => l.balance },
    { h: 'Value', cls: 'num', f: (l) => inr(l.value) }
  ];

  return (
    <div>
      <div className="ph">
        <div>
          <h2>Stock Ledger</h2>
          <p>Every stock movement with its source document</p>
        </div>
      </div>

      <div className="card">
        <div className="filters">
          <div className="f">
            <label>Product</label>
            <select value={selectedSku} onChange={(e) => setSelectedSku(e.target.value)}>
              <option value="">All products</option>
              {db.products.map((p) => (
                <option key={p.sku} value={p.sku}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="f">
            <label>Movement type</label>
            <select value={movementType} onChange={(e) => setMovementType(e.target.value)}>
              <option value="">All</option>
              {[
                'Opening Stock',
                'Purchase Receipt',
                'Sales Delivery',
                'Purchase Return',
                'Sales Return',
                'Adjustment'
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Table cols={columns} rows={filteredLedger} pageSize={12} minWidth={900} />
      </div>
    </div>
  );
}
