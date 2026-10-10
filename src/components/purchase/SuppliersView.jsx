import React from 'react';
import { useIMS } from '../../context/IMSContext';
import Table from '../common/Table';
import Icon from '../common/Icon';
import { inr, sum } from '../../utils/helpers';

export default function SuppliersView() {
  const { db, setPartyModal } = useIMS();

  const columns = [
    { h: 'ID', f: (s) => s.supplier_id },
    { h: 'Supplier', f: (s) => <b>{s.name}</b> },
    { h: 'Phone', f: (s) => s.phone },
    { h: 'Email', f: (s) => s.email },
    { h: 'Lead Time', f: (s) => s.lead_days + ' days' },
    { h: 'Payment Terms', f: (s) => 'Net ' + s.terms_days },
    {
      h: 'POs',
      cls: 'ctr',
      f: (s) => db.pos.filter((p) => p.supplier_id === s.supplier_id).length
    },
    {
      h: 'Payable',
      cls: 'num',
      f: (s) =>
        inr(
          sum(
            db.bills.filter((b) => b.supplier_id === s.supplier_id),
            (b) => b.amount - b.paid
          )
        )
    },
    {
      h: '',
      f: (s) => (
        <button
          className="btn xs sec"
          onClick={() => setPartyModal({ open: true, type: 'sup', id: s.supplier_id })}
        >
          <Icon name="edit" size={13} /> Edit
        </button>
      )
    }
  ];

  return (
    <div>
      <div className="ph">
        <div>
          <h2>Suppliers</h2>
          <p>Vendor master</p>
        </div>
        <div className="acts noprint">
          <button className="btn" onClick={() => setPartyModal({ open: true, type: 'sup', id: null })}>
            <Icon name="plus" size={15} /> Add Supplier
          </button>
        </div>
      </div>

      <div className="card">
        <Table cols={columns} rows={db.suppliers} pageSize={10} minWidth={800} />
      </div>
    </div>
  );
}
