import React from 'react';
import Modal from '../common/Modal';

export default function ConfirmModal({ open, msg, label = 'Confirm', onConfirm, onClose }) {
  if (!open) return null;

  return (
    <Modal
      title="Please confirm"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button className="btn sec" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn no"
            onClick={() => {
              onClose();
              if (onConfirm) onConfirm();
            }}
          >
            {label}
          </button>
        </>
      }
    >
      <p>{msg}</p>
    </Modal>
  );
}
