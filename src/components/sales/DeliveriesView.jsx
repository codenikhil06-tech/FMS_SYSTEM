import React from 'react';
import { useIMS } from '../../context/IMSContext';
import Table from '../common/Table';
import Badge from '../common/Badge';
import { fmtD, inr, totOf } from '../../utils/helpers';

export default function DeliveriesView() {
  const { db, P, CUS, openDoc, createInvoice, addToast } = useIMS();

  const columns = [
    {
      h: 'DN No.',
      f: (d) => (
        <a onClick={() => openDoc(d.dn_id)}>
          <b>{d.dn_id}</b>
        </a>
      )
    },
    { h: 'Date', f: (d) => fmtD(d.date) },
    {
      h: 'Sales Order',
      f: (d) => (
        <a onClick={() => openDoc(d.so_id)}>
          <b>{d.so_id}</b>
        </a>
      )
    },
    { h: 'Customer', f: (d) => CUS(d.customer_id).name },
    {
      h: 'Items',
      f: (d) =>
        d.lines
          .map((l) => `${l.qty} × ${P(l.sku)?.name || l.sku}`)
          .join(', ')
          .slice(0, 55)
    },
    { h: 'Value', cls: 'num', f: (d) => inr(totOf(d.lines, 'price').total) },
    {
      h: 'Invoice',
      f: (d) => {
        const inv = db.invs.find((i) => i.dn_id === d.dn_id);
        return d.invoiced && inv ? (
          <a onClick={() => openDoc(inv.inv_id)}>
            <b>{inv.inv_id}</b>
          </a>
        ) : (
          <Badge text="To Invoice" />
        );
      }
    },
    {
      h: '',
      f: (d) =>
        !d.invoiced ? (
          <button
            className="btn xs ok"
            onClick={() => {
              const inv = createInvoice(d.dn_id);
              if (inv) addToast(`${inv.inv_id} created`);
            }}
          >
            Invoice
          </button>
        ) : null
    }
  ];

  return (
    <div>
      <div className="ph">
        <div>
          <h2>Deliveries</h2>
          <p>Stock-OUT documents created from sales orders</p>
        </div>
      </div>

      <div className="card">
        <Table cols={columns} rows={[...db.dns].reverse()} pageSize={10} minWidth={850} />
      </div>
    </div>
  );
}
