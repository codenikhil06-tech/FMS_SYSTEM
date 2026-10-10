import React, { useState, useEffect } from 'react';
import { useIMS } from '../../context/IMSContext';
import Modal from '../common/Modal';

export default function StockAdjustModal({ open, sku, onClose }) {
  const { db, adjustStock, addToast } = useIMS();

  const [selectedSku, setSelectedSku] = useState(sku || db.products[0]?.sku || '');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('Physical count correction');

  useEffect(() => {
    setSelectedSku(sku || db.products[0]?.sku || '');
    setQty(1);
    setNote('Physical count correction');
  }, [sku, open, db]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!qty) {
      addToast('Enter quantity', 'err');
      return;
    }
    const err = adjustStock(selectedSku, +qty, note);
    if (err) {
      addToast(err, 'err');
      return;
    }
    addToast('Stock adjusted — connected modules updated');
    onClose();
  };

  return (
    <Modal
      title="Stock Adjustment"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button className="btn sec" onClick={onClose}>
            Cancel
          </button>
          <button className="btn ok" onClick={handleSubmit}>
            Save Adjustment
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="fgrid">
        <div className="fg full">
          <label>Product</label>
          <select value={selectedSku} onChange={(e) => setSelectedSku(e.target.value)}>
            {db.products.map((p) => (
              <option key={p.sku} value={p.sku}>
                {p.name} (on hand {p.on_hand})
              </option>
            ))}
          </select>
        </div>

        <div className="fg full">
          <label>Quantity (+ add / − remove)</label>
          <input
            type="number"
            step="1"
            required
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>

        <div className="fg full">
          <label>Reason</label>
          <select value={note} onChange={(e) => setNote(e.target.value)}>
            <option value="Physical count correction">Physical count correction</option>
            <option value="Damaged goods">Damaged goods</option>
            <option value="Return from customer">Return from customer</option>
            <option value="Return to supplier">Return to supplier</option>
            <option value="Found stock">Found stock</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}
