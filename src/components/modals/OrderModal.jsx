import React, { useState, useEffect } from 'react';
import { useIMS } from '../../context/IMSContext';
import Modal from '../common/Modal';
import Icon from '../common/Icon';
import { fmtD, inr } from '../../utils/helpers';

export default function OrderModal({ open, type = 'PO', onClose }) {
  const { db, D, gstR, P, createPO, poSubmit, createSO, confirmSO, createQuote, addToast, navigate, openDoc, setQuotePreviewId } = useIMS();

  const isPO = type === 'PO';
  const isQT = type === 'QT';

  const [partyId, setPartyId] = useState('');
  const [validDays, setValidDays] = useState(15);
  const [lines, setLines] = useState([]);

  useEffect(() => {
    if (open) {
      const defaultParty = isPO
        ? db.suppliers[0]?.supplier_id || ''
        : db.customers[0]?.customer_id || '';
      setPartyId(defaultParty);
      setValidDays(15);

      const firstProd = db.products[0];
      if (firstProd) {
        setLines([
          {
            sku: firstProd.sku,
            qty: 1,
            rate: isPO ? firstProd.cost : firstProd.price
          }
        ]);
      } else {
        setLines([]);
      }
    }
  }, [open, type, db]);

  if (!open) return null;

  const title = isPO ? 'New Purchase Order' : isQT ? 'New Quotation' : 'New Sales Order';

  const partyOptions = isPO
    ? db.suppliers.map((s) => ({ v: s.supplier_id, l: s.name }))
    : db.customers.map((c) => ({
        v: c.customer_id,
        l: `${c.name} (${c.terms_days ? 'Net ' + c.terms_days : 'Immediate'})`
      }));

  const handleLineChange = (index, field, value) => {
    setLines((prev) => {
      const next = [...prev];
      if (field === 'sku') {
        const prod = P(value);
        next[index] = {
          sku: value,
          qty: next[index].qty || 1,
          rate: isPO ? (prod ? prod.cost : 0) : (prod ? prod.price : 0)
        };
      } else {
        next[index] = {
          ...next[index],
          [field]: field === 'qty' || field === 'rate' ? +value || 0 : value
        };
      }
      return next;
    });
  };

  const addLine = () => {
    const firstProd = db.products[0];
    if (firstProd) {
      setLines((prev) => [
        ...prev,
        { sku: firstProd.sku, qty: 1, rate: isPO ? firstProd.cost : firstProd.price }
      ]);
    }
  };

  const removeLine = (index) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = lines.reduce((acc, l) => acc + l.qty * l.rate, 0);
  const tax = subtotal * gstR;
  const total = subtotal + tax;

  const handleSave = (processNow) => {
    const activeLines = lines.filter((l) => l.qty > 0);
    if (!activeLines.length) {
      addToast('Add at least one item', 'err');
      return;
    }

    if (isQT) {
      const q = createQuote(partyId, activeLines, validDays);
      addToast(`${q.qt_id} created`);
      onClose();
      if (processNow) {
        setQuotePreviewId(q.qt_id);
      } else {
        openDoc(q.qt_id);
      }
      return;
    }

    let docId = '';
    if (isPO) {
      const po = createPO(
        partyId,
        activeLines.map((l) => ({ sku: l.sku, qty: l.qty, rate: l.rate, received: 0 }))
      );
      docId = po.po_id;
      if (processNow) {
        poSubmit(docId);
      }
    } else {
      const so = createSO(
        partyId,
        activeLines.map((l) => ({ sku: l.sku, qty: l.qty, price: l.rate, reserved: 0, delivered: 0 })),
        true
      );
      docId = so.so_id;
      if (processNow) {
        confirmSO(docId);
      }
    }

    addToast(`${docId} created`);
    onClose();
    openDoc(docId);
  };

  return (
    <Modal
      title={title}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button className="btn sec" onClick={onClose}>
            Cancel
          </button>
          <button className="btn sec" onClick={() => handleSave(false)}>
            Save as Draft
          </button>
          <button className="btn ok" onClick={() => handleSave(true)}>
            {isPO ? 'Submit PO' : isQT ? 'Save & Preview' : 'Confirm Order'}
          </button>
        </>
      }
    >
      <div className="fgrid" style={{ marginBottom: '14px' }}>
        <div className="fg">
          <label>{isPO ? 'Supplier' : 'Customer'}</label>
          <select value={partyId} onChange={(e) => setPartyId(e.target.value)}>
            {partyOptions.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        </div>

        <div className="fg">
          <label>Date</label>
          <input readOnly value={fmtD(D)} />
        </div>

        {isQT && (
          <div className="fg">
            <label>Valid for (days)</label>
            <input
              type="number"
              min="1"
              value={validDays}
              onChange={(e) => setValidDays(+e.target.value || 1)}
            />
          </div>
        )}
      </div>

      <div className="tw">
        <table className="olt">
          <thead>
            <tr>
              <th>Product</th>
              <th style={{ width: '90px' }}>Qty</th>
              <th style={{ width: '120px' }}>{isPO ? 'Cost Rate' : 'Price'}</th>
              <th style={{ width: '110px' }}>Amount</th>
              <th style={{ width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const prod = P(l.sku);
              return (
                <tr key={i}>
                  <td>
                    <select
                      value={l.sku}
                      onChange={(e) => handleLineChange(i, 'sku', e.target.value)}
                    >
                      {db.products
                        .filter((p) => p.active !== false || p.sku === l.sku)
                        .map((p) => (
                          <option key={p.sku} value={p.sku}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                    </select>
                    {!isPO ? (
                      <small className="muted">
                        Available:{' '}
                        {prod ? prod.on_hand - prod.reserved : 0} {prod?.unit}
                      </small>
                    ) : (
                      <small className="muted">
                        On hand {prod?.on_hand || 0}
                      </small>
                    )}
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={l.qty}
                      onChange={(e) => handleLineChange(i, 'qty', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={l.rate}
                      onChange={(e) => handleLineChange(i, 'rate', e.target.value)}
                    />
                  </td>
                  <td>{inr(l.qty * l.rate)}</td>
                  <td>
                    {lines.length > 1 && (
                      <button className="btn xs no" onClick={() => removeLine(i)}>
                        <Icon name="x" size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button className="btn xs sec" style={{ marginTop: '8px' }} onClick={addLine}>
        <Icon name="plus" size={13} /> Add Item
      </button>

      <div style={{ maxWidth: '300px', marginLeft: 'auto', marginTop: '10px' }}>
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
      </div>
    </Modal>
  );
}
