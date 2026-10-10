import React, { useState } from 'react';
import { useIMS } from '../../context/IMSContext';
import StatCard from '../common/StatCard';
import Table from '../common/Table';
import Badge from '../common/Badge';
import { fmtD, inr, sum } from '../../utils/helpers';

export default function SupplierBillsView() {
  const { db, D, SUP, openDoc, setPaymentModal } = useIMS();
  const [st, setSt] = useState('');

  const getInvStatus = (b) => (b.status === 'Paid' ? 'Paid' : b.due_date < D ? 'Overdue' : b.status);

  const filtered = [...db.bills]
    .reverse()
    .filter((b) => !st || getInvStatus(b) === st);

  const totalPayable = sum(db.bills, (b) => b.amount - b.paid);
  const overduePayable = sum(
    db.bills.filter((b) => b.status !== 'Paid' && b.due_date < D),
    (b) => b.amount - b.paid
  );
  const totalPaid = sum(db.bills, (b) => b.paid);

  const columns = [
    {
      h: 'Bill No.',
      f: (b) => (
        <a onClick={() => openDoc(b.bill_id)}>
          <b>{b.bill_id}</b>
        </a>
      )
    },
    { h: 'Date', f: (b) => fmtD(b.date) },
    { h: 'Supplier', f: (b) => SUP(b.supplier_id).name },
    {
      h: 'GRN / PO',
      f: (b) => (
        <span>
          <a onClick={() => openDoc(b.grn_id)}>{b.grn_id}</a> / <a onClick={() => openDoc(b.po_id)}>{b.po_id}</a>
        </span>
      )
    },
    { h: 'Amount', cls: 'num', f: (b) => inr(b.amount) },
    { h: 'Paid', cls: 'num', f: (b) => inr(b.paid) },
    { h: 'Balance', cls: 'num', f: (b) => <b>{inr(b.amount - b.paid)}</b> },
    { h: 'Due', f: (b) => fmtD(b.due_date) },
    { h: 'Status', f: (b) => <Badge text={getInvStatus(b)} /> },
    {
      h: '',
      f: (b) =>
        b.status !== 'Paid' ? (
          <button
            className="btn xs ok"
            onClick={() => setPaymentModal({ open: true, kind: 'bill', id: b.bill_id })}
          >
            Pay
          </button>
        ) : null
    }
  ];

  return (
    <div>
      <div className="ph">
        <div>
          <h2>Supplier Bills</h2>
          <p>Payables generated from goods receipts</p>
        </div>
      </div>

      <div className="grid g4">
        <StatCard label="Total Payable" value={inr(totalPayable)} iconName="card" colorClass="amber" />
        <StatCard label="Overdue" value={inr(overduePayable)} iconName="clock" colorClass="red" />
        <StatCard label="Paid (all time)" value={inr(totalPaid)} iconName="check" colorClass="green" />
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

        <Table cols={columns} rows={filtered} pageSize={10} minWidth={950} />
      </div>
    </div>
  );
}
