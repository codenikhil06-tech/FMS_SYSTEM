import React from 'react';
import { useIMS } from '../../context/IMSContext';
import Modal from '../common/Modal';
import { fmtD, inr, totOf, esc } from '../../utils/helpers';

export default function QuotationPreviewModal({ quoteId, onClose }) {
  const { db, P, CUS, addToast } = useIMS();

  if (!quoteId) return null;

  const q = db.quotes.find((x) => x.qt_id === quoteId);
  if (!q) return null;

  const c = CUS(q.customer_id);
  const T = totOf(q.lines, 'price');

  const getHTML = (full = false) => {
    const css = `.qt{font-family:Segoe UI,Arial,sans-serif;color:#1a2540;background:#fff;padding:26px;font-size:13px}.qt h1{margin:0;font-size:24px;color:#2563eb;letter-spacing:1px}.qt table{width:100%;border-collapse:collapse;margin-top:16px}.qt th{background:#2563eb;color:#fff;text-align:left;padding:8px;font-size:12px}.qt td{padding:8px;border-bottom:1px solid #e1e6ef}.qt .r{text-align:right}.qt .hd{display:flex;justify-content:space-between;border-bottom:3px solid #2563eb;padding-bottom:12px}.qt .bx{display:flex;justify-content:space-between;margin-top:16px;gap:20px}.qt .tt{width:280px;margin-left:auto;margin-top:12px}.qt .tt div{display:flex;justify-content:space-between;padding:5px 0}.qt .gt{font-weight:800;font-size:15px;border-top:2px solid #1a2540}.qt .ft{margin-top:26px;font-size:11.5px;color:#68738a}`;
    const body = `<div class="qt"><div class="hd"><div><h1>QUOTATION</h1><div>Nexora IMS<br>Inventory • Purchase • Sales</div></div><div style="text-align:right"><b>${q.qt_id}</b><br>Date: ${fmtD(q.date)}<br>Valid till: ${fmtD(q.valid_until)}</div></div><div class="bx"><div><b>Quotation For</b><br>${esc(c.name)}<br>${esc(c.phone || '')}<br>${esc(c.email || '')}</div><div style="text-align:right"><b>Payment Terms</b><br>${c.terms_days ? 'Net ' + c.terms_days + ' days' : 'Immediate'}</div></div><table><thead><tr><th>#</th><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>${q.lines.map((l, i) => `<tr><td>${i + 1}</td><td>${esc(P(l.sku)?.name || l.sku)}<div style="color:#68738a;font-size:11px">${l.sku}</div></td><td class="r">${l.qty} ${esc(P(l.sku)?.unit || '')}</td><td class="r">${inr(l.price)}</td><td class="r">${inr(l.qty * l.price)}</td></tr>`).join('')}</tbody></table><div class="tt"><div><span>Subtotal</span><span>${inr(T.sub)}</span></div><div><span>GST ${db.settings.gst_rate}%</span><span>${inr(T.tax)}</span></div><div class="gt"><span>Total</span><span>${inr(T.total)}</span></div></div><div class="ft">Is quotation ke prices ${fmtD(q.valid_until)} tak valid hain. Stock availability order confirmation par depend karti hai.</div></div>`;
    return full ? `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${q.qt_id}</title><style>body{margin:0}${css}</style></head><body>${body}</body></html>` : `<style>${css}</style>${body}`;
  };

  const handlePrint = () => {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
    f.srcdoc = getHTML(true);
    f.onload = () =>
      setTimeout(() => {
        f.contentWindow.focus();
        f.contentWindow.print();
        setTimeout(() => f.remove(), 3000);
      }, 300);
    document.body.appendChild(f);
    addToast('Print window me "Save as PDF" select karein', 'info');
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([getHTML(true)], { type: 'text/html' }));
    a.download = q.qt_id + '.html';
    a.click();
    addToast('Downloaded ✔');
  };

  return (
    <Modal
      title={`Quotation Preview — ${q.qt_id}`}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button className="btn ok" onClick={handlePrint}>
            ⬇ Download PDF
          </button>
          <button className="btn out" onClick={handleDownload}>
            Download HTML
          </button>
          <button className="btn sec" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <div
        style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}
        dangerouslySetInnerHTML={{ __html: getHTML(false) }}
      />
    </Modal>
  );
}
