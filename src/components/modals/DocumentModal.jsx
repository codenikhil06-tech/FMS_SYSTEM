import React from 'react';
import { useIMS } from '../../context/IMSContext';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import { fmtD, inr, r2, sum } from '../../utils/helpers';

export default function DocumentModal({ docId, onClose }) {
  const {
    db,
    D,
    P,
    SUP,
    CUS,
    openDoc,
    prToPO,
    poSubmit,
    poApprove,
    receivePO,
    createBill,
    confirmSO,
    deliverSO,
    createInvoice,
    cancelSO,
    cancelPO,
    setReceiveModal,
    setPaymentModal,
    setReturnModal,
    setQuotePreviewId,
    addToast
  } = useIMS();

  if (!docId) return null;

  const prefix = docId.split('-')[0];

  const K = {
    QT: ['quotes', 'qt_id'],
    PRT: ['prets', 'prt_id'],
    SRT: ['srets', 'srt_id'],
    PR: ['prs', 'pr_id'],
    PO: ['pos', 'po_id'],
    GRN: ['grns', 'grn_id'],
    BILL: ['bills', 'bill_id'],
    SO: ['sos', 'so_id'],
    DN: ['dns', 'dn_id'],
    INV: ['invs', 'inv_id']
  };

  const keyInfo = K[prefix];
  const doc = keyInfo ? db[keyInfo[0]]?.find((x) => x[keyInfo[1]] === docId) : null;

  if (!doc) {
    return (
      <Modal title="Document Not Found" onClose={onClose}>
        <div className="warn">Document {docId} does not exist.</div>
      </Modal>
    );
  }

  const docStatus = doc.status || (doc.invoiced !== undefined ? (doc.invoiced ? 'Invoiced' : 'To Invoice') : doc.billed !== undefined ? (doc.billed ? 'Invoiced' : 'To Invoice') : '');
  const invStatus = doc.status === 'Paid' ? 'Paid' : doc.due_date < D ? 'Overdue' : doc.status;
  const displayStatus = (doc.amount !== undefined && doc.paid !== undefined) ? invStatus : docStatus;

  // Workflow Trace helper
  const getTraceNodes = () => {
    const nodes = [];
    const add = (x) => {
      if (x && !nodes.find((y) => y.id === x.id)) nodes.push(x);
    };

    const getNode = (i, lab) => {
      const k = K[i.split('-')[0]];
      const o = k ? db[k[0]]?.find((x) => x[k[1]] === i) : null;
      if (!o) return null;
      const st = o.status && (k[0] === 'invs' || k[0] === 'bills') ? (o.status === 'Paid' ? 'Paid' : o.due_date < D ? 'Overdue' : o.status) : (o.status || (o.invoiced ? 'Invoiced' : o.billed ? 'Invoiced' : ''));
      return { id: i, lab, st };
    };

    if (['PR', 'PO', 'GRN', 'BILL'].includes(prefix)) {
      const po = prefix === 'PR' ? (doc.po_id ? db.pos.find((x) => x.po_id === doc.po_id) : null) : prefix === 'PO' ? doc : db.pos.find((x) => x.po_id === doc.po_id);
      const pr = prefix === 'PR' ? doc : (po && po.source_pr ? db.prs.find((x) => x.pr_id === po.source_pr) : null);

      if (pr) add(getNode(pr.pr_id, 'Purchase Request'));
      if (po) {
        add(getNode(po.po_id, 'Purchase Order'));
        db.grns.filter((g) => g.po_id === po.po_id).forEach((g) => {
          add(getNode(g.grn_id, 'Goods Receipt'));
          db.bills.filter((b) => b.grn_id === g.grn_id).forEach((b) => {
            add(getNode(b.bill_id, 'Supplier Bill'));
            db.payments.filter((p) => p.ref === b.bill_id).forEach((p) => {
              add({ id: p.pay_id, lab: 'Payment', st: inr(p.amount) });
            });
          });
        });
      }
    } else if (['SO', 'DN', 'INV', 'QT', 'SRT'].includes(prefix)) {
      const so = prefix === 'SO' ? doc : db.sos.find((x) => x.so_id === doc.so_id);
      if (so) {
        add(getNode(so.so_id, 'Sales Order'));
        db.dns.filter((x) => x.so_id === so.so_id).forEach((x) => {
          add(getNode(x.dn_id, 'Delivery'));
          db.invs.filter((i) => i.dn_id === x.dn_id).forEach((i) => {
            add(getNode(i.inv_id, 'Invoice'));
            db.payments.filter((p) => p.ref === i.inv_id).forEach((p) => {
              add({ id: p.pay_id, lab: 'Payment', st: inr(p.amount) });
            });
          });
        });
      }
    }
    return nodes;
  };

  const traceNodes = getTraceNodes();

  // Content specific calculations
  let partyName = '';
  let headItems = [];
  let tableColumns = [];
  let tableData = [];
  let subtotal = 0;
  let tax = 0;
  let total = 0;

  const gstR = db.settings.gst_rate / 100;

  if (prefix === 'PR') {
    partyName = SUP(doc.supplier_id).name;
    headItems = [
      ['Source', doc.source],
      ['Date', fmtD(doc.date)],
      ['Converted PO', doc.po_id || '—']
    ];
    tableColumns = ['SKU', 'Product', 'Qty'];
    tableData = doc.lines.map((l) => ({
      sku: l.sku,
      name: P(l.sku)?.name || l.sku,
      qty: l.qty
    }));
  } else if (prefix === 'PO') {
    partyName = SUP(doc.supplier_id).name;
    headItems = [
      ['Date', fmtD(doc.date)],
      ['Expected', fmtD(doc.expected_date)],
      ['Source', doc.source_pr || 'Manual']
    ];
    tableColumns = ['SKU', 'Product', 'Qty', 'Rate', 'Amount', 'Received'];
    tableData = doc.lines.map((l) => ({
      sku: l.sku,
      name: P(l.sku)?.name || l.sku,
      qty: l.qty,
      rate: l.rate,
      amount: l.qty * l.rate,
      received: `${l.received}/${l.qty}`
    }));
    subtotal = sum(doc.lines, (l) => l.qty * l.rate);
    tax = subtotal * gstR;
    total = subtotal + tax;
  } else if (prefix === 'GRN') {
    partyName = SUP(doc.supplier_id).name;
    headItems = [
      ['Against PO', doc.po_id],
      ['Date', fmtD(doc.date)],
      ['Bill', db.bills.find((b) => b.grn_id === docId)?.bill_id || 'Not billed']
    ];
    tableColumns = ['SKU', 'Product', 'Qty', 'Rate', 'Amount'];
    tableData = doc.lines.map((l) => ({
      sku: l.sku,
      name: P(l.sku)?.name || l.sku,
      qty: l.qty,
      rate: l.rate,
      amount: l.qty * l.rate
    }));
    subtotal = sum(doc.lines, (l) => l.qty * l.rate);
    tax = subtotal * gstR;
    total = subtotal + tax;
  } else if (prefix === 'BILL') {
    partyName = SUP(doc.supplier_id).name;
    const g = db.grns.find((x) => x.grn_id === doc.grn_id);
    headItems = [
      ['GRN', doc.grn_id],
      ['PO', doc.po_id],
      ['Bill date', fmtD(doc.date)],
      ['Due', fmtD(doc.due_date)]
    ];
    tableColumns = ['SKU', 'Product', 'Qty', 'Rate', 'Amount'];
    tableData = g
      ? g.lines.map((l) => ({
          sku: l.sku,
          name: P(l.sku)?.name || l.sku,
          qty: l.qty,
          rate: l.rate,
          amount: l.qty * l.rate
        }))
      : [];
    subtotal = doc.subtotal;
    tax = doc.amount - doc.subtotal;
    total = doc.amount;
  } else if (prefix === 'SO') {
    partyName = CUS(doc.customer_id).name;
    headItems = [
      ['Date', fmtD(doc.date)],
      ['Customer terms', CUS(doc.customer_id).terms_days ? 'Net ' + CUS(doc.customer_id).terms_days : 'Immediate']
    ];
    tableColumns = ['SKU', 'Product', 'Qty', 'Price', 'Amount', 'Reserved', 'Delivered', 'Stock Avail.'];
    tableData = doc.lines.map((l) => {
      const p = P(l.sku);
      return {
        sku: l.sku,
        name: p?.name || l.sku,
        qty: l.qty,
        rate: l.price,
        amount: l.qty * l.price,
        reserved: l.reserved,
        delivered: `${l.delivered}/${l.qty}`,
        avail: p ? p.on_hand - p.reserved : 0
      };
    });
    subtotal = sum(doc.lines, (l) => l.qty * l.price);
    tax = subtotal * gstR;
    total = subtotal + tax;
  } else if (prefix === 'DN') {
    partyName = CUS(doc.customer_id).name;
    headItems = [
      ['Sales Order', doc.so_id],
      ['Date', fmtD(doc.date)],
      ['Invoice', db.invs.find((i) => i.dn_id === docId)?.inv_id || 'Not invoiced']
    ];
    tableColumns = ['SKU', 'Product', 'Qty', 'Price', 'Amount'];
    tableData = doc.lines.map((l) => ({
      sku: l.sku,
      name: P(l.sku)?.name || l.sku,
      qty: l.qty,
      rate: l.price,
      amount: l.qty * l.price
    }));
    subtotal = sum(doc.lines, (l) => l.qty * l.price);
    tax = subtotal * gstR;
    total = subtotal + tax;
  } else if (prefix === 'INV') {
    partyName = CUS(doc.customer_id).name;
    const dn = db.dns.find((x) => x.dn_id === doc.dn_id);
    headItems = [
      ['Sales Order', doc.so_id],
      ['Delivery', doc.dn_id],
      ['Date', fmtD(doc.date)],
      ['Due', fmtD(doc.due_date)]
    ];
    tableColumns = ['SKU', 'Product', 'Qty', 'Price', 'Amount'];
    tableData = dn
      ? dn.lines.map((l) => ({
          sku: l.sku,
          name: P(l.sku)?.name || l.sku,
          qty: l.qty,
          rate: l.price,
          amount: l.qty * l.price
        }))
      : [];
    subtotal = doc.subtotal;
    tax = doc.tax;
    total = doc.amount;
  } else if (prefix === 'QT') {
    partyName = CUS(doc.customer_id).name;
    headItems = [
      ['Date', fmtD(doc.date)],
      ['Valid till', fmtD(doc.valid_until)],
      ['Sales Order', doc.so_id || '—']
    ];
    tableColumns = ['SKU', 'Product', 'Qty', 'Price', 'Amount'];
    tableData = doc.lines.map((l) => ({
      sku: l.sku,
      name: P(l.sku)?.name || l.sku,
      qty: l.qty,
      rate: l.price,
      amount: l.qty * l.price
    }));
    subtotal = sum(doc.lines, (l) => l.qty * l.price);
    tax = subtotal * gstR;
    total = subtotal + tax;
  }

  // ACTION BUTTON HANDLERS
  const renderActions = () => {
    const buttons = [];

    if (prefix === 'PR' && doc.status === 'Open') {
      buttons.push(
        <button
          key="conv"
          className="btn xs ok"
          onClick={() => {
            const p = prToPO(docId);
            if (p) {
              addToast(`${docId} converted to ${p.po_id}`);
              openDoc(p.po_id);
            }
          }}
        >
          <Icon name="file" size={13} /> Convert to PO
        </button>
      );
    } else if (prefix === 'PO') {
      if (doc.status === 'Draft') {
        buttons.push(
          <button
            key="sub"
            className="btn xs ok"
            onClick={() => {
              poSubmit(docId);
              addToast(`${docId} submitted`);
            }}
          >
            Submit PO
          </button>
        );
      }
      if (doc.status === 'Pending Approval') {
        buttons.push(
          <button
            key="appr"
            className="btn xs ok"
            onClick={() => {
              poApprove(docId);
              addToast(`${docId} approved`);
            }}
          >
            <Icon name="check" size={13} /> Approve PO
          </button>
        );
      }
      if (['Approved', 'Partially Received'].includes(doc.status)) {
        buttons.push(
          <button
            key="rec"
            className="btn xs ok"
            onClick={() => {
              setReceiveModal({ open: true, poId: docId });
            }}
          >
            <Icon name="truck" size={13} /> Receive Goods
          </button>
        );
      }
      if (['Draft', 'Pending Approval', 'Approved'].includes(doc.status) && !doc.lines.some((l) => l.received)) {
        buttons.push(
          <button
            key="canc"
            className="btn xs no"
            onClick={() => {
              if (cancelPO(docId)) {
                addToast(`${docId} cancelled`);
                onClose();
              }
            }}
          >
            Cancel
          </button>
        );
      }
    } else if (prefix === 'GRN') {
      if (!doc.billed) {
        buttons.push(
          <button
            key="bill"
            className="btn xs ok"
            onClick={() => {
              const b = createBill(docId);
              if (b) addToast(`${b.bill_id} generated`);
            }}
          >
            <Icon name="file" size={13} /> Create Supplier Bill
          </button>
        );
      }
      buttons.push(
        <button
          key="ret"
          className="btn xs wn"
          onClick={() => {
            setReturnModal({ open: true, kind: 'P', id: docId });
          }}
        >
          ↩ Purchase Return
        </button>
      );
    } else if (prefix === 'BILL' && doc.status !== 'Paid') {
      buttons.push(
        <button
          key="pay"
          className="btn xs ok"
          onClick={() => {
            setPaymentModal({ open: true, kind: 'bill', id: docId });
          }}
        >
          <Icon name="card" size={13} /> Record Payment
        </button>
      );
    } else if (prefix === 'SO') {
      if (['Draft', 'On Hold'].includes(doc.status)) {
        buttons.push(
          <button
            key="conf"
            className="btn xs ok"
            onClick={() => {
              confirmSO(docId);
              addToast(`${docId} confirmed`);
            }}
          >
            <Icon name="check" size={13} /> {doc.status === 'On Hold' ? 'Release Hold & Confirm' : 'Confirm Order'}
          </button>
        );
      }
      if (doc.lines.some((l) => l.reserved > 0) && ['Ready', 'Partially Delivered', 'Confirmed'].includes(doc.status)) {
        buttons.push(
          <button
            key="deliv"
            className="btn xs ok"
            onClick={() => {
              const dn = deliverSO(docId);
              if (dn) addToast(`${dn.dn_id} delivered`);
            }}
          >
            <Icon name="truck" size={13} /> Deliver Reserved Stock
          </button>
        );
      }
      if (!['Delivered', 'Cancelled'].includes(doc.status) && !doc.lines.some((l) => l.delivered)) {
        buttons.push(
          <button
            key="canc"
            className="btn xs no"
            onClick={() => {
              if (cancelSO(docId)) {
                addToast(`${docId} cancelled`);
                onClose();
              }
            }}
          >
            Cancel
          </button>
        );
      }
    } else if (prefix === 'DN') {
      if (!doc.invoiced) {
        buttons.push(
          <button
            key="inv"
            className="btn xs ok"
            onClick={() => {
              const inv = createInvoice(docId);
              if (inv) addToast(`${inv.inv_id} created`);
            }}
          >
            <Icon name="file" size={13} /> Create Invoice
          </button>
        );
      }
      buttons.push(
        <button
          key="ret"
          className="btn xs wn"
          onClick={() => {
            setReturnModal({ open: true, kind: 'S', id: docId });
          }}
        >
          ↩ Sales Return
        </button>
      );
    } else if (prefix === 'INV' && doc.status !== 'Paid') {
      buttons.push(
        <button
          key="rec"
          className="btn xs ok"
          onClick={() => {
            setPaymentModal({ open: true, kind: 'inv', id: docId });
          }}
        >
          <Icon name="card" size={13} /> Receive Payment
        </button>
      );
    } else if (prefix === 'QT') {
      buttons.push(
        <button
          key="prev"
          className="btn xs sec"
          onClick={() => setQuotePreviewId(docId)}
        >
          👁 Preview
        </button>
      );
    }

    return buttons;
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{docId}</span>
          <Badge text={displayStatus} />
        </div>
      }
      size="lg"
      onClose={onClose}
      footer={
        <>
          {renderActions()}
          <button className="btn sec" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <div className="kv" style={{ marginBottom: '14px' }}>
        <div>
          <small>{['SO', 'DN', 'INV', 'QT'].includes(prefix) ? 'Customer' : 'Supplier'}</small>
          <span>{partyName}</span>
        </div>
        {headItems.map(([label, val], idx) => (
          <div key={idx}>
            <small>{label}</small>
            <span>{typeof val === 'string' && val.includes('-') ? <a onClick={() => openDoc(val)}><b>{val}</b></a> : val}</span>
          </div>
        ))}
      </div>

      <div className="tw">
        <table className="tbl" style={{ minWidth: '520px' }}>
          <thead>
            <tr>
              {tableColumns.map((col, idx) => (
                <th key={idx} className={['Amount', 'Rate', 'Price', 'Qty', 'Reserved', 'Delivered', 'Stock Avail.'].includes(col) ? 'num' : ''}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, idx) => (
              <tr key={idx}>
                <td>{row.sku}</td>
                <td>{row.name}</td>
                <td className="num">{row.qty}</td>
                {row.rate != null && <td className="num">{inr(row.rate)}</td>}
                {row.amount != null && <td className="num">{inr(row.amount)}</td>}
                {row.reserved != null && <td className="num">{row.reserved}</td>}
                {row.delivered != null && <td className="num">{row.delivered}</td>}
                {row.avail != null && <td className="num">{row.avail}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div style={{ maxWidth: '300px', marginLeft: 'auto', marginTop: '12px' }}>
          <div className="row">
            <span>Subtotal</span>
            <b>{inr(subtotal)}</b>
          </div>
          <div className="row">
            <span>GST {db.settings.gst_rate}%</span>
            <b>{inr(tax)}</b>
          </div>
          <div className="row tot">
            <span>Total</span>
            <span>{inr(total)}</span>
          </div>
          {doc.paid != null && (
            <>
              <div className="row">
                <span>{prefix === 'INV' ? 'Received' : 'Paid'}</span>
                <b className="pos">{inr(doc.paid)}</b>
              </div>
              <div className="row">
                <span>Balance</span>
                <b className="neg">{inr(doc.amount - doc.paid)}</b>
              </div>
            </>
          )}
          {doc.cogs != null && (
            <div className="row">
              <span>Gross profit</span>
              <b>{inr(doc.subtotal - doc.cogs)}</b>
            </div>
          )}
        </div>
      )}

      {traceNodes.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ margin: '16px 0 8px' }}>🔗 Connected Documents (Workflow Trace)</h4>
          <div className="tr">
            {traceNodes.map((x) => (
              <div
                key={x.id}
                className={`tn ${x.id === docId ? 'cur' : ''}`}
                onClick={() => {
                  if (!x.id.startsWith('PAY')) {
                    openDoc(x.id);
                  }
                }}
              >
                <small className="muted">{x.lab}</small>
                <b>{x.id}</b>
                {/^\d|₹/.test(x.st) || x.st[0] === '₹' ? <span className="pos">{x.st}</span> : <Badge text={x.st} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
