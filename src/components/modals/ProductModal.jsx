import React, { useState, useEffect } from 'react';
import { useIMS } from '../../context/IMSContext';
import Modal from '../common/Modal';

export default function ProductModal({ open, sku, onClose }) {
  const { db, P, saveProduct } = useIMS();

  const existingProduct = sku ? P(sku) : null;

  const [form, setForm] = useState({
    name: '',
    category: '',
    brand: '',
    hsn: '',
    barcode: '',
    unit: 'pcs',
    supplier_id: '',
    cost: 0,
    price: 0,
    reorder_level: 10,
    reorder_qty: 20,
    active: 'yes',
    opening: 0
  });

  useEffect(() => {
    if (existingProduct) {
      setForm({
        name: existingProduct.name || '',
        category: existingProduct.category || '',
        brand: existingProduct.brand || '',
        hsn: existingProduct.hsn || '',
        barcode: existingProduct.barcode || '',
        unit: existingProduct.unit || 'pcs',
        supplier_id: existingProduct.supplier_id || db.suppliers[0]?.supplier_id || '',
        cost: existingProduct.cost || 0,
        price: existingProduct.price || 0,
        reorder_level: existingProduct.reorder_level || 10,
        reorder_qty: existingProduct.reorder_qty || 20,
        active: existingProduct.active === false ? 'no' : 'yes',
        opening: 0
      });
    } else {
      setForm({
        name: '',
        category: '',
        brand: '',
        hsn: '',
        barcode: '',
        unit: 'pcs',
        supplier_id: db.suppliers[0]?.supplier_id || '',
        cost: 0,
        price: 0,
        reorder_level: 10,
        reorder_qty: 20,
        active: 'yes',
        opening: 0
      });
    }
  }, [sku, open, db]);

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
    const payload = {
      ...form,
      sku,
      active: form.active !== 'no'
    };
    saveProduct(payload);
    onClose();
  };

  return (
    <Modal
      title={existingProduct ? `Edit Item — ${sku}` : 'Add Item'}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button className="btn sec" onClick={onClose}>
            Cancel
          </button>
          <button className="btn ok" onClick={handleSubmit}>
            Save Item
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="fgrid">
        <div className="fg">
          <label>Item Name <i>*</i></label>
          <input name="name" required value={form.name} onChange={handleChange} />
        </div>

        <div className="fg">
          <label>Category <i>*</i></label>
          <input name="category" required value={form.category} onChange={handleChange} />
        </div>

        <div className="fg">
          <label>Brand</label>
          <input name="brand" value={form.brand} onChange={handleChange} />
        </div>

        <div className="fg">
          <label>HSN Code</label>
          <input name="hsn" value={form.hsn} onChange={handleChange} />
        </div>

        <div className="fg">
          <label>Barcode</label>
          <input name="barcode" value={form.barcode} onChange={handleChange} />
        </div>

        <div className="fg">
          <label>Unit</label>
          <input name="unit" value={form.unit} onChange={handleChange} />
        </div>

        <div className="fg">
          <label>Preferred Supplier</label>
          <select name="supplier_id" value={form.supplier_id} onChange={handleChange}>
            {db.suppliers.map((s) => (
              <option key={s.supplier_id} value={s.supplier_id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="fg">
          <label>Cost Price (₹) <i>*</i></label>
          <input name="cost" type="number" min="0" step="0.01" required value={form.cost} onChange={handleChange} />
        </div>

        <div className="fg">
          <label>Selling Price (₹) <i>*</i></label>
          <input name="price" type="number" min="0" step="0.01" required value={form.price} onChange={handleChange} />
        </div>

        <div className="fg">
          <label>Reorder Level</label>
          <input name="reorder_level" type="number" min="0" value={form.reorder_level} onChange={handleChange} />
        </div>

        <div className="fg">
          <label>Reorder Quantity</label>
          <input name="reorder_qty" type="number" min="1" value={form.reorder_qty} onChange={handleChange} />
        </div>

        <div className="fg">
          <label>Status</label>
          <select name="active" value={form.active} onChange={handleChange}>
            <option value="yes">Active</option>
            <option value="no">Inactive</option>
          </select>
        </div>

        {!existingProduct && (
          <div className="fg">
            <label>Opening Stock</label>
            <input name="opening" type="number" min="0" value={form.opening} onChange={handleChange} />
          </div>
        )}
      </form>
    </Modal>
  );
}
