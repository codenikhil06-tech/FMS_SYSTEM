import React from 'react';
import { useIMS } from '../../context/IMSContext';
import Table from '../common/Table';
import Badge from '../common/Badge';
import { fmtD, inr, totOf } from '../../utils/helpers';

export default function GoodsReceiptsView() {
  const { db, P, SUP, openDoc } = useIMS();

  const columns = [
    {
      h: 'GRN No.',
      f: (g) => (
        <a onClick={() => openDoc(g.grn_id)}>
          <b>{g.grn_id}</b>
        </a>
      )
    },
    { h: 'Date', f: (g) => fmtD(g.date) },
    {
      h: 'PO',
      f: (g) => (
        <a onClick={() => openDoc(g.po_id)}>
          <b>{g.po_id}</b>
        </a>
      )
    },
    { h: 'Supplier', f: (g) => SUP(g.supplier_id).name },
    {
      h: 'Items',
      f: (g) =>
        g.lines
          .map((l) => `${l.qty} × ${P(l.sku)?.name || l.sku}`)
          .join(', ')
          .slice(0, 60)
    },
    { h: 'Value', cls: 'num', f: (g) => inr(totOf(g.lines, 'rate').total) },
    {
      h: 'Bill',
      f: (g) => (g.billed ? <Badge text="Invoiced" /> : <Badge text="To Invoice" />)
    }
  ];

  return (
    <div>
      <div className="ph">
        <div>
          <h2>Goods Receipts (GRN)</h2>
          <p>Stock-IN documents — created when PO goods arrive</p>
        </div>
      </div>

      <div className="card">
        <Table cols={columns} rows={[...db.grns].reverse()} pageSize={10} minWidth={800} />
      </div>
    </div>
  );
}
