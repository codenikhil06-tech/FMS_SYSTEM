import React, { useState } from 'react';
import { useIMS } from '../../context/IMSContext';
import Table from '../common/Table';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import { fmtD, inr, totOf } from '../../utils/helpers';

export default function PurchaseOrdersView() {
  const { db, P, SUP, openDoc, poSubmit, poApprove, setOrderModal, setReceiveModal, addToast } = useIMS();
  const [st, setSt] = useState('');

  const filtered = [...db.pos]
    .reverse()
    .filter((o) => !st || o.status === st);

  const columns = [
    {
      h: 'PO No.',
      f: (o) => (
        <a onClick={() => openDoc(o.po_id)}>
          <b>{o.po_id}</b>
        </a>
      )
    },
    { h: 'Date', f: (o) => fmtD(o.date) },
    { h: 'Supplier', f: (o) => SUP(o.supplier_id).name },
    {
      h: 'Items',
      f: (o) =>
        o.lines
          .map((l) => `${l.qty} × ${P(l.sku)?.name || l.sku}`)
          .join(', ')
          .slice(0, 60)
    },
    { h: 'Total', cls: 'num', f: (o) => inr(totOf(o.lines, 'rate').total) },
    { h: 'Expected', f: (o) => fmtD(o.expected_date) },
    {
      h: 'Source',
      f: (o) =>
        o.source_pr ? (
          <a onClick={() => openDoc(o.source_pr)}>
            <b>{o.source_pr}</b>
          </a>
        ) : (
          'Manual'
        )
    },
    { h: 'Status', f: (o) => <Badge text={o.status} /> },
    {
      h: 'Actions',
      f: (o) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="btn xs sec" onClick={() => openDoc(o.po_id)}>
            <Icon name="eye" size={13} /> View
          </button>
          {o.status === 'Draft' && (
            <button
              className="btn xs ok"
              onClick={() => {
                poSubmit(o.po_id);
                addToast(`${o.po_id} submitted`);
              }}
            >
              Submit
            </button>
          )}
          {o.status === 'Pending Approval' && (
            <button
              className="btn xs ok"
              onClick={() => {
                poApprove(o.po_id);
                addToast(`${o.po_id} approved`);
              }}
            >
              Approve
            </button>
          )}
          {['Approved', 'Partially Received'].includes(o.status) && (
            <button
              className="btn xs ok"
              onClick={() => setReceiveModal({ open: true, poId: o.po_id })}
            >
              Receive
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
          <h2>Purchase Orders</h2>
          <p>PO → approval → supplier delivery → GRN → stock → bill → payment</p>
        </div>
        <div className="acts noprint">
          <button className="btn" onClick={() => setOrderModal({ open: true, type: 'PO' })}>
            <Icon name="plus" size={15} /> New Purchase Order
          </button>
        </div>
      </div>

      <div className="card">
        <div className="filters">
          <div className="f">
            <label>Status</label>
            <select value={st} onChange={(e) => setSt(e.target.value)}>
              <option value="">All</option>
              {['Draft', 'Pending Approval', 'Approved', 'Partially Received', 'Received', 'Cancelled'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Table cols={columns} rows={filtered} pageSize={9} minWidth={1050} />
      </div>
    </div>
  );
}
