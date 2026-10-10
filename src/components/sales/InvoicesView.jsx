import React, { useState } from 'react';
import { useIMS } from '../../context/IMSContext';
import StatCard from '../common/StatCard';
import Table from '../common/Table';
import Badge from '../common/Badge';
import { fmtD, inr, sum } from '../../utils/helpers';

export default function InvoicesView() {
  const { db, D, CUS, openDoc, setPaymentModal } = useIMS();
  const [st, setSt] = useState('');

  const getInvStatus = (i) => (i.status === 'Paid' ? 'Paid' : i.due_date < D ? 'Overdue' : i.status);

  const filtered = [...db.invs]
    .reverse()
    .filter((i) => !st || getInvStatus(i) === st);

  const rec = sum(db.invs, (i) => i.amount - i.paid);
  const overdueRec = sum(
    db.invs.filter((i) => i.status !== 'Paid' && i.due_date < D),
    (i) => i.amount - i.paid
  );
  const collected = sum(db.invs, (i) => i.paid);
  const profit = sum(db.invs, (i) => i.subtotal - i.cogs);

  const columns = [
    {
      h: 'Invoice',
      f: (i) => (
        <a onClick={() => openDoc(i.inv_id)}>
          <b>{i.inv_id}</b>
        </a>
      )
    },
    { h: 'Date', f: (i) => fmtD(i.date) },
    { h: 'Customer', f: (i) => CUS(i.customer_id).name },
    {
      h: 'SO / DN',
      f: (i) => (
        <span>
          <a onClick={() => openDoc(i.so_id)}>{i.so_id}</a> / <a onClick={() => openDoc(i.dn_id)}>{i.dn_id}</a>
        </span>
      )
    },
    { h: 'Amount', cls: 'num', f: (i) => inr(i.amount) },
    { h: 'Received', cls: 'num', f: (i) => inr(i.paid) },
    { h: 'Balance', cls: 'num', f: (i) => <b>{inr(i.amount - i.paid)}</b> },
    { h: 'Profit', cls: 'num', f: (i) => <span className="pos">{inr(i.subtotal - i.cogs)}</span> },
    { h: 'Due', f: (i) => fmtD(i.due_date) },
    { h: 'Status', f: (i) => <Badge text={getInvStatus(i)} /> },
    {
      h: '',
      f: (i) =>
        i.status !== 'Paid' ? (
          <button
            className="btn xs ok"
            onClick={() => setPaymentModal({ open: true, kind: 'inv', id: i.inv_id })}
          >
            Receive
          </button>
        ) : null
    }
  ];

  return (
    <div>
      <div className="ph">
        <div>
          <h2>Invoices & Receipts</h2>
          <p>Auto-generated on delivery • immediate-terms customers are auto-paid</p>
        </div>
      </div>

      <div className="grid g4">
        <StatCard label="Receivable" value={inr(rec)} iconName="card" colorClass="blue" />
        <StatCard label="Overdue" value={inr(overdueRec)} iconName="clock" colorClass="red" />
        <StatCard label="Collected (all time)" value={inr(collected)} iconName="check" colorClass="green" />
        <StatCard label="Gross Profit (all time)" value={inr(profit)} iconName="chart" colorClass="teal" />
      </div>

      <div className="card">
        <div className="filters">
          <div className="f">
            <label>Status</label>
            <select value={st} onChange={(e) => setSt(e.target.value)}>
              <option value="">All</option>
              {['Unpaid', 'Partial', 'Paid', 'Overdue'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Table cols={columns} rows={filtered} pageSize={10} minWidth={1000} />
      </div>
    </div>
  );
}
