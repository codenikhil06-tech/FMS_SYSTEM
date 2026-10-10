import React from 'react';
import Icon from './Icon';

export default function Modal({ title, children, footer, size = '', onClose }) {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div className="mback" onClick={handleBackdropClick}>
      <div className={`modal ${size}`}>
        <div className="mh">
          <h3>{title}</h3>
          <button className="ib" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className="mb">{children}</div>
        {footer && <div className="mf">{footer}</div>}
      </div>
    </div>
  );
}
