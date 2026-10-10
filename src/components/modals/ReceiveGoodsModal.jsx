import React, { useState, useEffect } from 'react';
import { useIMS } from '../../context/IMSContext';
import Modal from '../common/Modal';

export default function ReceiveGoodsModal({ open, poId, onClose }) {
  const { PO, P, receivePO, addToast, openDoc } = useIMS();
  const [quantities, setQuantities] = useState({});

  const po = poId ? PO(poId) : null;
  const lines = po ? po.lines.filter((l) => l.qty > l.received) : [];

  useEffect(() => {
    if (po) {
      const initial = {};
      po.lines.forEach((l) => {
        if (l.qty > l.received) {
          initial[l.sku] = l.qty - l.received;
        }
      });
      setQuantities(initial);
    }
  }, [poId]);

  if (!open || !po) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const g = receivePO(poId, quantities);
    if (!g) {
      addToast('Nothing received', 'err');
      return;
    }
    addToast(`${g.grn_id} created — stock updated`);
    onClose();
    openDoc(g.grn_id);
  };

  return (
    <Modal
      title={`Receive Goods — ${poId}`}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button className="btn sec" onClick={onClose}>
            Cancel
          </button>
          <button className="btn ok" onClick={handleSubmit}>
            Receive & Update Stock
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="fgrid">
        {lines.map((l) => {
          const p = P(l.sku);
          return (
            <div key={l.sku} className="fg full">
              <label>
                {p?.name || l.sku} (pending {l.qty - l.received})
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={quantities[l.sku] ?? ''}
                onChange={(e) =>
                  setQuantities({ ...quantities, [l.sku]: +e.target.value })
                }
              />
            </div>
          );
        })}
      </form>
    </Modal>
  );
}
