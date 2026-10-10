import React from 'react';
import { useIMS } from '../../context/IMSContext';
import Table from '../common/Table';
import Icon from '../common/Icon';
import { inr } from '../../utils/helpers';

export default function CustomersView() {
  const { db, setPartyModal, outstanding } = useIMS();

  const columns = [
    { h: 'ID', f: (c) => c.customer_id },
    { h: 'Customer', f: (c) => <b>{c.name}</b> },
    { h: 'Phone', f: (c) => c.phone },
    { h: 'Terms', f: (c) => (c.terms_days ? 'Net ' + c.terms_days : 'Immediate') },
    { h: 'Credit Limit', cls: 'num', f: (c) => inr(c.credit_limit) },
    { h: 'Outstanding', cls: 'num', f: (c) => inr(outstanding(c.customer_id)) },
    {
      h: 'Orders',
      cls: 'ctr',
      f: (c) => db.sos.filter((s) => s.customer_id === c.customer_id).length
    },
    {
      h: 'Credit Used',
      f: (c) => {
        const out = outstanding(c.customer_id);
        const u = Math.min(100, (out / (c.credit_limit || 1)) * 100);
        return (
          <div style={{ minWidth: '90px' }}>
            <div className="prog">
              <div
                style={{
                  width: `${u}%`,
                  background: u > 80 ? 'var(--red)' : 'var(--primary)'
                }}
              />
            </div>
          </div>
        );
      }
    },
    {
      h: '',
      f: (c) => (
        <button
          className="btn xs sec"
          onClick={() => setPartyModal({ open: true, type: 'cus', id: c.customer_id })}
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
          <h2>Customers</h2>
          <p>Customer master with credit limits</p>
        </div>
        <div className="acts noprint">
          <button className="btn" onClick={() => setPartyModal({ open: true, type: 'cus', id: null })}>
            <Icon name="plus" size={15} /> Add Customer
          </button>
        </div>
      </div>

      <div className="card">
        <Table cols={columns} rows={db.customers} pageSize={10} minWidth={800} />
      </div>
    </div>
  );
}
