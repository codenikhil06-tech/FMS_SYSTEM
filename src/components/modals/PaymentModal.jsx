import React, { useState, useEffect } from 'react';
import { useIMS } from '../../context/IMSContext';
import Modal from '../common/Modal';
import { inr, r2 } from '../../utils/helpers';

export default function PaymentModal({ open, kind = 'inv', id, onClose }) {
  const { INV, BILL, settle, addToast, openDoc } = useIMS();

  const isInv = kind === 'inv';
  const doc = id ? (isInv ? INV(id) : BILL(id)) : null;
  const rem = doc ? r2(doc.amount - doc.paid) : 0;

  const [amount, setAmount] = useState(rem);
  const [mode, setMode] = useState('Bank Transfer');

  useEffect(() => {
    if (doc) {
      setAmount(r2(doc.amount - doc.paid));
      setMode('Bank Transfer');
    }
  }, [id, kind]);

  if (!open || !doc) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (+amount > rem + 0.01) {
      addToast('Amount exceeds balance', 'err');
      return;
    }
    settle(kind, id, +amount, mode);
    addToast('Payment recorded ✔');
    onClose();
    openDoc(id);
  };

  return (
    <Modal
      title={`${isInv ? 'Receive Payment' : 'Make Payment'} — ${id}`}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button className="btn sec" onClick={onClose}>
            Cancel
          </button>
          <button className="btn ok" onClick={handleSubmit}>
            Save Payment
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="fgrid">
        <div className="fg full">
          <label>Amount (balance {inr(rem)})</label>
          <input
            type="number"
            min="1"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="fg full">
          <label>Payment Mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="UPI">UPI</option>
            <option value="Cash">Cash</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}
