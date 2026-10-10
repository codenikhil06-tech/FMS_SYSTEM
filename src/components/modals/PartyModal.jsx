import React, { useState, useEffect } from 'react';
import { useIMS } from '../../context/IMSContext';
import Modal from '../common/Modal';

export default function PartyModal({ open, type = 'sup', id, onClose }) {
  const { SUP, CUS, saveSupplier, saveCustomer } = useIMS();

  const isSup = type === 'sup';
  const existingParty = id ? (isSup ? SUP(id) : CUS(id)) : null;

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    lead_days: 5,
    terms_days: 30,
    credit_limit: 100000
  });

  useEffect(() => {
    if (existingParty) {
      setForm({
        name: existingParty.name || '',
        phone: existingParty.phone || '',
        email: existingParty.email || '',
        lead_days: existingParty.lead_days || 5,
        terms_days: existingParty.terms_days != null ? existingParty.terms_days : 30,
        credit_limit: existingParty.credit_limit || 100000
      });
    } else {
      setForm({
        name: '',
        phone: '',
        email: '',
        lead_days: 5,
        terms_days: isSup ? 30 : 15,
        credit_limit: 100000
      });
    }
  }, [id, type, open]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : +value) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSup) {
      saveSupplier({ supplier_id: id, ...form });
    } else {
      saveCustomer({ customer_id: id, ...form });
    }
    onClose();
  };

  return (
    <Modal
      title={
        existingParty
          ? `Edit ${isSup ? 'Supplier' : 'Customer'}`
          : `Add ${isSup ? 'Supplier' : 'Customer'}`
      }
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button className="btn sec" onClick={onClose}>
            Cancel
          </button>
          <button className="btn ok" onClick={handleSubmit}>
            Save
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="fgrid">
        <div className="fg full">
          <label>
            {isSup ? 'Supplier' : 'Customer'} Name <i>*</i>
          </label>
          <input name="name" required value={form.name} onChange={handleChange} />
        </div>

        <div className="fg">
          <label>Phone</label>
          <input name="phone" value={form.phone} onChange={handleChange} />
        </div>

        <div className="fg">
          <label>Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} />
        </div>

        {isSup ? (
          <>
            <div className="fg">
              <label>Lead Time (days)</label>
              <input name="lead_days" type="number" min="0" value={form.lead_days} onChange={handleChange} />
            </div>
            <div className="fg">
              <label>Payment Terms (days)</label>
              <input name="terms_days" type="number" min="0" value={form.terms_days} onChange={handleChange} />
            </div>
          </>
        ) : (
          <>
            <div className="fg">
              <label>Payment Terms (0 = Immediate)</label>
              <input name="terms_days" type="number" min="0" value={form.terms_days} onChange={handleChange} />
            </div>
            <div className="fg">
              <label>Credit Limit (₹)</label>
              <input name="credit_limit" type="number" min="0" value={form.credit_limit} onChange={handleChange} />
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
