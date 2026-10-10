import React from 'react';

export default function ToastContainer({ toasts = [] }) {
  if (!toasts.length) return null;
  return (
    <div id="toast-root">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
