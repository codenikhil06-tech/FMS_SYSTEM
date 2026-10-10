import React, { useState, useEffect } from 'react';
import { useIMS } from '../../context/IMSContext';
import Modal from '../common/Modal';

export default function ReturnModal({ open, kind = 'P', id, onClose }) {
  const { db, P, doReturn, addToast, openDoc } = useIMS();
  const [quantities, setQuantities] = useState({});

  const isPu = kind === 'P';
  const src = id ? (isPu ? db.grns.find((x) => x.grn_id === id) : db.dns.find((x) => x.dn_id === id)) : null;
  const lines = src ? src.lines.filter((l) => l.qty > (l.returned || 0)) : [];

  useEffect(() => {
    if (src) {
      const init = {};
      src.lines.forEach((l) => {
        if (l.qty > (l.returned || 0)) {
          init[l.sku] = 0;
        }
      });
      setQuantities(init);
    }
  }, [id, kind]);

  if (!open || !src) return null;

  if (!lines.length) {
    return (
      <Modal title={`${isPu ? 'Purchase Return — ' : 'Sales Return — '}${id}`} size="sm" onClose={onClose}>
        <div className="warn">Sab qty already return ho chuki hai.</div>
      </Modal>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    const r = doReturn(kind, id, quantities);
    if (!/^(PRT|SRT)-/.test(r)) {
      addToast(r, 'err');
      return;
    }
    addToast(`${r} saved — stock & ${isPu ? 'bill' : 'invoice'} updated`);
    onClose();
    openDoc(r);
  };

  return (
    <Modal
      title={`${isPu ? 'Purchase Return — ' : 'Sales Return — '}${id}`}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button className="btn sec" onClick={onClose}>
            Cancel
          </button>
          <button className="btn ok" onClick={handleSubmit}>
            Save Return
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="fgrid">
        {lines.map((l) => {
          const maxQ = l.qty - (l.returned || 0);
          const p = P(l.sku);
          return (
            <div key={l.sku} className="fg full">
              <label>
                {p?.name || l.sku} (max {maxQ})
              </label>
              <input
                type="number"
                min="0"
                max={maxQ}
                step="1"
                value={quantities[l.sku] ?? ''}
                onChange={(e) => setQuantities({ ...quantities, [l.sku]: +e.target.value })}
              />
              <small>0 = return nahi</small>
            </div>
          );
        })}
      </form>
    </Modal>
  );
}
