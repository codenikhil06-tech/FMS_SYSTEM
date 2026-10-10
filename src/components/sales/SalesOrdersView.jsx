import React, { useState } from 'react';
import { useIMS } from '../../context/IMSContext';
import Table from '../common/Table';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import { fmtD, inr, sum, totOf } from '../../utils/helpers';

export default function SalesOrdersView() {
  const { db, P, CUS, openDoc, confirmSO, deliverSO, setOrderModal, addToast } = useIMS();
  const [st, setSt] = useState('');

  const filtered = [...db.sos]
    .reverse()
    .filter((s) => !st || s.status === st);

  const columns = [
    {
      h: 'SO No.',
      f: (s) => (
        <a onClick={() => openDoc(s.so_id)}>
          <b>{s.so_id}</b>
        </a>
      )
    },
    { h: 'Date', f: (s) => fmtD(s.date) },
    { h: 'Customer', f: (s) => CUS(s.customer_id).name },
    {
      h: 'Items',
      f: (s) =>
        s.lines
          .map((l) => `${l.qty} × ${P(l.sku)?.name || l.sku}`)
          .join(', ')
          .slice(0, 55)
    },
    { h: 'Total', cls: 'num', f: (s) => inr(totOf(s.lines, 'price').total) },
    { h: 'Reserved', cls: 'num', f: (s) => sum(s.lines, (l) => l.reserved) },
    {
      h: 'Delivered',
      cls: 'num',
      f: (s) => `${sum(s.lines, (l) => l.delivered)}/${sum(s.lines, (l) => l.qty)}`
    },
    { h: 'Status', f: (s) => <Badge text={s.status} /> },
    {
      h: 'Actions',
      f: (s) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="btn xs sec" onClick={() => openDoc(s.so_id)}>
            <Icon name="eye" size={13} /> View
          </button>
          {['Draft', 'On Hold'].includes(s.status) && (
            <button
              className="btn xs ok"
              onClick={() => {
                confirmSO(s.so_id);
                addToast(`${s.so_id} confirmed`);
              }}
            >
              {s.status === 'Draft' ? 'Confirm' : 'Release'}
            </button>
          )}
          {s.lines.some((l) => l.reserved > 0) && ['Ready', 'Partially Delivered', 'Confirmed'].includes(s.status) && (
            <button
              className="btn xs ok"
              onClick={() => {
                const dn = deliverSO(s.so_id);
                if (dn) addToast(`${dn.dn_id} delivered`);
              }}
            >
              Deliver
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
          <h2>Sales Orders</h2>
          <p>SO → credit check → stock reservation → delivery → invoice → payment</p>
        </div>
        <div className="acts noprint">
          <button className="btn" onClick={() => setOrderModal({ open: true, type: 'SO' })}>
            <Icon name="plus" size={15} /> New Sales Order
          </button>
          <button className="btn out" onClick={() => setOrderModal({ open: true, type: 'QT' })}>
            <Icon name="file" size={15} /> New Quotation
          </button>
        </div>
      </div>

      <div className="card">
        <div className="filters">
          <div className="f">
            <label>Status</label>
            <select value={st} onChange={(e) => setSt(e.target.value)}>
              <option value="">All</option>
              {['Draft', 'On Hold', 'Confirmed', 'Ready', 'Partially Delivered', 'Delivered', 'Cancelled'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Table cols={columns} rows={filtered} pageSize={9} minWidth={1100} />
      </div>
    </div>
  );
}
