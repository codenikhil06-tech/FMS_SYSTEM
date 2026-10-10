import React, { useState } from 'react';
import { useIMS } from '../../context/IMSContext';
import Table from '../common/Table';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import { fmtD, inr, totOf } from '../../utils/helpers';

export default function QuotationsView() {
  const { db, D, P, CUS, openDoc, setOrderModal, setQuotePreviewId, qtToSO, addToast } = useIMS();
  const [st, setSt] = useState('');

  const getQuoteStatus = (q) => (q.status === 'Sent' && q.valid_until < D ? 'Expired' : q.status);

  const filtered = [...db.quotes]
    .reverse()
    .filter((q) => !st || getQuoteStatus(q) === st);

  const columns = [
    {
      h: 'Quote No.',
      f: (q) => (
        <a onClick={() => openDoc(q.qt_id)}>
          <b>{q.qt_id}</b>
        </a>
      )
    },
    { h: 'Date', f: (q) => fmtD(q.date) },
    { h: 'Customer', f: (q) => CUS(q.customer_id).name },
    {
      h: 'Items',
      f: (q) =>
        q.lines
          .map((l) => `${l.qty} × ${P(l.sku)?.name || l.sku}`)
          .join(', ')
          .slice(0, 50)
    },
    { h: 'Total', cls: 'num', f: (q) => inr(totOf(q.lines, 'price').total) },
    { h: 'Valid till', f: (q) => fmtD(q.valid_until) },
    { h: 'Status', f: (q) => <Badge text={getQuoteStatus(q)} /> },
    {
      h: 'Actions',
      f: (q) => {
        const isConvertible = ['Draft', 'Sent', 'Accepted'].includes(q.status) && q.valid_until >= D;
        return (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn xs sec" onClick={() => setQuotePreviewId(q.qt_id)}>
              Preview
            </button>
            <button
              className="btn xs ok"
              onClick={() => {
                setQuotePreviewId(q.qt_id);
              }}
            >
              <Icon name="download" size={13} /> PDF
            </button>
            {isConvertible && (
              <button
                className="btn xs pu"
                onClick={() => {
                  qtToSO(q.qt_id);
                  addToast(`${q.qt_id} converted to Sales Order`);
                }}
              >
                → Order
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div>
      <div className="ph">
        <div>
          <h2>Quotations</h2>
          <p>Quotation banao → Preview / PDF download → customer accept kare to ek click me Sales Order</p>
        </div>
        <div className="acts noprint">
          <button className="btn" onClick={() => setOrderModal({ open: true, type: 'QT' })}>
            <Icon name="plus" size={15} /> New Quotation
          </button>
        </div>
      </div>

      <div className="card">
        <div className="filters">
          <div className="f">
            <label>Status</label>
            <select value={st} onChange={(e) => setSt(e.target.value)}>
              <option value="">All</option>
              {['Draft', 'Sent', 'Accepted', 'Converted', 'Rejected', 'Expired'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Table cols={columns} rows={filtered} pageSize={10} minWidth={950} />
      </div>
    </div>
  );
}
