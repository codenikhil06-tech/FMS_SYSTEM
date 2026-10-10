import React from 'react';
import { useIMS } from '../../context/IMSContext';
import Table from '../common/Table';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import { fmtD } from '../../utils/helpers';

export default function PurchaseRequestsView() {
  const { db, P, SUP, openDoc, prToPO, addToast } = useIMS();

  const columns = [
    {
      h: 'PR No.',
      f: (r) => (
        <a onClick={() => openDoc(r.pr_id)}>
          <b>{r.pr_id}</b>
        </a>
      )
    },
    { h: 'Date', f: (r) => fmtD(r.date) },
    {
      h: 'Items',
      f: (r) => r.lines.map((l) => `${l.qty} × ${P(l.sku)?.name || l.sku}`).join(', ')
    },
    { h: 'Supplier', f: (r) => SUP(r.supplier_id).name },
    {
      h: 'Source',
      f: (r) =>
        r.source.startsWith('Auto') ? (
          <span className="bdg purple">⚡ {r.source}</span>
        ) : (
          r.source
        )
    },
    {
      h: 'PO',
      f: (r) =>
        r.po_id ? (
          <a onClick={() => openDoc(r.po_id)}>
            <b>{r.po_id}</b>
          </a>
        ) : (
          '—'
        )
    },
    { h: 'Status', f: (r) => <Badge text={r.status} /> },
    {
      h: '',
      f: (r) => (
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="btn xs sec" onClick={() => openDoc(r.pr_id)}>
            <Icon name="eye" size={13} /> View
          </button>
          {r.status === 'Open' && (
            <button
              className="btn xs ok"
              onClick={() => {
                const po = prToPO(r.pr_id);
                if (po) {
                  addToast(`${r.pr_id} converted to ${po.po_id}`);
                  openDoc(po.po_id);
                }
              }}
            >
              Convert to PO
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
          <h2>Purchase Requests</h2>
          <p>Created automatically when stock runs low (or short for a sales order) — or manually</p>
        </div>
      </div>

      <div className="card">
        <Table cols={columns} rows={[...db.prs].reverse()} pageSize={10} minWidth={850} />
      </div>
    </div>
  );
}
