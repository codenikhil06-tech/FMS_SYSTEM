import React from 'react';
import { useIMS } from '../../context/IMSContext';
import Table from '../common/Table';
import { fmtD, inr } from '../../utils/helpers';

export default function PurchaseReturnsView() {
  const { db, P, SUP, openDoc } = useIMS();

  const columns = [
    {
      h: 'No.',
      f: (r) => (
        <a onClick={() => openDoc(r.prt_id)}>
          <b>{r.prt_id}</b>
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
    { h: 'Supplier', f: (r) => SUP(r.party_id).name },
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
          <h2>Purchase Returns</h2>
          <p>Supplier ko wapas bheja maal — GRN se banao (GRN page → Purchase Return)</p>
        </div>
      </div>

      <div className="card">
        <Table cols={columns} rows={[...db.prets].reverse()} pageSize={10} minWidth={800} />
      </div>
    </div>
  );
}
