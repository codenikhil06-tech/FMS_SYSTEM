import React from 'react';
import { useIMS } from '../../context/IMSContext';
import Table from '../common/Table';
import { fmtD, inr } from '../../utils/helpers';

export default function SalesReturnsView() {
  const { db, P, CUS, openDoc } = useIMS();

  const columns = [
    {
      h: 'No.',
      f: (r) => (
        <a onClick={() => openDoc(r.srt_id)}>
          <b>{r.srt_id}</b>
        </a>
      )
    },
    { h: 'Date', f: (r) => fmtD(r.date) },
    {
      h: 'Against',
      f: (r) => (
        <a onClick={() => openDoc(r.src)}>
          <b>{r.src}</b>
        </a>
      )
    },
    { h: 'Customer', f: (r) => CUS(r.party_id).name },
    {
      h: 'Items',
      f: (r) =>
        r.lines
          .map((l) => `${l.qty} × ${P(l.sku)?.name || l.sku}`)
          .join(', ')
          .slice(0, 60)
    },
    { h: 'Value', cls: 'num', f: (r) => inr(r.amount) }
  ];

  return (
    <div>
      <div className="ph">
        <div>
          <h2>Sales Returns</h2>
          <p>Customer se wapas aaya maal — Delivery se banao (Deliveries page → Sales Return)</p>
        </div>
      </div>

      <div className="card">
        <Table cols={columns} rows={[...db.srets].reverse()} pageSize={10} minWidth={800} />
      </div>
    </div>
  );
}
