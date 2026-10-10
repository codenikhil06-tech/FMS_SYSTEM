import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  KEY,
  T0,
  getInitialSeed,
  r2,
  sum,
  inr,
  addDays,
  fmtD,
  nid,
  diffDays
} from '../utils/helpers';

const IMSContext = createContext(null);

export function IMSProvider({ children }) {
  const [db, setDb] = useState(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.products && parsed.settings) {
          if (parsed.settings.today < T0) parsed.settings.today = T0;
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    const seed = getInitialSeed();
    try {
      localStorage.setItem(KEY, JSON.stringify(seed));
    } catch (e) {}
    return seed;
  });

  const [theme, setTheme] = useState(() => localStorage.getItem('nexora_ims_theme') || 'light');
  const [currentRoute, setCurrentRoute] = useState(() => {
    try {
      return (window.location.hash || '').replace(/^#\/?/, '') || 'dashboard';
    } catch (e) {
      return 'dashboard';
    }
  });

  const [toasts, setToasts] = useState([]);
  const [notifRead, setNotifRead] = useState(false);

  // Modals state
  const [activeDocId, setActiveDocId] = useState(null);
  const [orderModal, setOrderModal] = useState({ open: false, type: 'PO' }); // PO, SO, QT
  const [receiveModal, setReceiveModal] = useState({ open: false, poId: null });
  const [paymentModal, setPaymentModal] = useState({ open: false, kind: 'inv', id: null });
  const [returnModal, setReturnModal] = useState({ open: false, kind: 'P', id: null });
  const [productModal, setProductModal] = useState({ open: false, sku: null });
  const [partyModal, setPartyModal] = useState({ open: false, type: 'sup', id: null }); // sup, cus
  const [stockAdjustModal, setStockAdjustModal] = useState({ open: false, sku: null });
  const [quotePreviewId, setQuotePreviewId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, msg: '', onConfirm: null, label: 'Confirm' });

  // Sync state to LocalStorage
  const updateDb = (updater) => {
    setDb((prevDb) => {
      const nextDb = typeof updater === 'function' ? updater(prevDb) : { ...prevDb, ...updater };
      try {
        localStorage.setItem(KEY, JSON.stringify(nextDb));
      } catch (e) {
        console.error('Failed to save to localStorage', e);
      }
      return nextDb;
    });
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('nexora_ims_theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleHashChange = () => {
      let h = '';
      try {
        h = window.location.hash.replace(/^#\/?/, '');
      } catch (e) {}
      setCurrentRoute(h || 'dashboard');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (route) => {
    setCurrentRoute(route);
    try {
      window.history.replaceState(null, '', '#/' + route);
    } catch (e) {}
    window.scrollTo(0, 0);
  };

  const addToast = (message, type = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Helper selectors
  const D = db.settings.today;
  const gstR = db.settings.gst_rate / 100;
  const P = (sku) => db.products.find((p) => p.sku === sku);
  const SUP = (id) => db.suppliers.find((x) => x.supplier_id === id) || { name: '—', lead_days: 5, terms_days: 0 };
  const CUS = (id) => db.customers.find((x) => x.customer_id === id) || { name: '—', terms_days: 0, credit_limit: 0 };
  const SO = (id) => db.sos.find((x) => x.so_id === id);
  const PO = (id) => db.pos.find((x) => x.po_id === id);
  const INV = (id) => db.invs.find((x) => x.inv_id === id);
  const BILL = (id) => db.bills.find((x) => x.bill_id === id);

  const POEN = ['Draft', 'Pending Approval', 'Approved', 'Partially Received'];
  const SOACT = ['Confirmed', 'Ready', 'Partially Delivered', 'On Hold'];

  const incoming = (sku) =>
    sum(
      db.pos.filter((o) => POEN.includes(o.status)),
      (o) => sum(o.lines.filter((l) => l.sku === sku), (l) => l.qty - l.received)
    ) +
    sum(
      db.prs.filter((r) => r.status === 'Open'),
      (r) => sum(r.lines.filter((l) => l.sku === sku), (l) => l.qty)
    );

  const demand = (sku) =>
    sum(
      db.sos.filter((s) => SOACT.includes(s.status)),
      (s) => sum(s.lines.filter((l) => l.sku === sku), (l) => l.qty - l.delivered)
    );

  const projected = (sku) => {
    const p = P(sku);
    return p ? p.on_hand + incoming(sku) - demand(sku) : 0;
  };

  const stockStatus = (p) => {
    if (!p) return 'Healthy';
    if (p.on_hand <= 0) return 'Out of Stock';
    if (projected(p.sku) <= p.reorder_level) return 'Reorder Needed';
    if (p.on_hand <= p.reorder_level) return 'Low — PO incoming';
    return 'Healthy';
  };

  const outstanding = (cid) => sum(db.invs.filter((i) => i.customer_id === cid), (i) => i.amount - i.paid);

  const totOf = (lines, k) => {
    const s = sum(lines, (l) => l.qty * l[k]);
    return { sub: r2(s), tax: r2(s * gstR), total: r2(s * (1 + gstR)) };
  };

  // BUSINESS ACTIONS & ENGINE
  const runEngineAction = (fn) => {
    updateDb((draft) => {
      const copy = JSON.parse(JSON.stringify(draft));
      fn(copy);
      return copy;
    });
  };

  const createPR = (lines, source) => {
    let newPr = null;
    runEngineAction((d) => {
      const pSku = d.products.find((x) => x.sku === lines[0].sku);
      const pr_id = 'PR-' + String(Math.max(0, ...d.prs.map((x) => parseInt(String(x.pr_id).split('-')[1]) || 0)) + 1).padStart(4, '0');
      const pr = {
        pr_id,
        n: ++d.seq,
        date: d.settings.today,
        supplier_id: pSku ? pSku.supplier_id : 'S1',
        lines,
        status: 'Open',
        source,
        po_id: ''
      };
      d.prs.push(pr);
      d.log.push({
        n: ++d.seq,
        date: d.settings.today,
        module: 'Purchase',
        text: `${pr.pr_id} created (${source}): ${lines.map((l) => l.qty + ' × ' + (d.products.find((x) => x.sku === l.sku)?.name || l.sku)).join(', ')}`,
        ref: pr.pr_id
      });
      newPr = pr;

      if (d.settings.auto_po) {
        // Auto convert to PO
        const s = d.suppliers.find((x) => x.supplier_id === pr.supplier_id) || { lead_days: 5 };
        const po_id = 'PO-' + String(Math.max(0, ...d.pos.map((x) => parseInt(String(x.po_id).split('-')[1]) || 0)) + 1).padStart(4, '0');
        const po = {
          po_id,
          n: ++d.seq,
          date: d.settings.today,
          supplier_id: pr.supplier_id,
          lines: pr.lines.map((l) => ({ sku: l.sku, qty: l.qty, rate: d.products.find((x) => x.sku === l.sku)?.cost || 0, received: 0 })),
          status: 'Draft',
          expected_date: addDays(d.settings.today, s.lead_days),
          source_pr: pr.pr_id
        };
        d.pos.push(po);
        pr.status = 'Converted';
        pr.po_id = po.po_id;
        d.log.push({
          n: ++d.seq,
          date: d.settings.today,
          module: 'Purchase',
          text: `${pr.pr_id} → ${po.po_id} (PR converted to Purchase Order)`,
          ref: po.po_id
        });
        // poSubmit
        const sub = sum(po.lines, (l) => l.qty * l.rate);
        const t = sub * (1 + d.settings.gst_rate / 100);
        if (t <= d.settings.approval_limit) {
          po.status = 'Approved';
        } else {
          po.status = 'Pending Approval';
        }
      }
    });
    return newPr;
  };

  const prToPO = (id, submit = true) => {
    let poRes = null;
    runEngineAction((d) => {
      const pr = d.prs.find((x) => x.pr_id === id);
      if (!pr || pr.status !== 'Open') return;
      const s = d.suppliers.find((x) => x.supplier_id === pr.supplier_id) || { lead_days: 5 };
      const po_id = 'PO-' + String(Math.max(0, ...d.pos.map((x) => parseInt(String(x.po_id).split('-')[1]) || 0)) + 1).padStart(4, '0');
      const po = {
        po_id,
        n: ++d.seq,
        date: d.settings.today,
        supplier_id: pr.supplier_id,
        lines: pr.lines.map((l) => ({ sku: l.sku, qty: l.qty, rate: d.products.find((x) => x.sku === l.sku)?.cost || 0, received: 0 })),
        status: 'Draft',
        expected_date: addDays(d.settings.today, s.lead_days),
        source_pr: pr.pr_id
      };
      d.pos.push(po);
      pr.status = 'Converted';
      pr.po_id = po.po_id;
      d.log.push({
        n: ++d.seq,
        date: d.settings.today,
        module: 'Purchase',
        text: `${pr.pr_id} → ${po.po_id} (PR converted to Purchase Order)`,
        ref: po.po_id
      });

      if (submit) {
        const sub = sum(po.lines, (l) => l.qty * l.rate);
        const t = sub * (1 + d.settings.gst_rate / 100);
        if (t <= d.settings.approval_limit) {
          po.status = 'Approved';
          d.log.push({
            n: ++d.seq,
            date: d.settings.today,
            module: 'Purchase',
            text: `${po.po_id} auto-approved → sent to supplier`,
            ref: po.po_id
          });
        } else {
          po.status = 'Pending Approval';
          d.log.push({
            n: ++d.seq,
            date: d.settings.today,
            module: 'Purchase',
            text: `${po.po_id} needs manual approval — exceeds limit`,
            ref: po.po_id
          });
        }
      }
      poRes = po;
    });
    return poRes;
  };

  const createPO = (sid, lines, src) => {
    let poRes = null;
    runEngineAction((d) => {
      const s = d.suppliers.find((x) => x.supplier_id === sid) || { name: '—', lead_days: 5 };
      const po_id = 'PO-' + String(Math.max(0, ...d.pos.map((x) => parseInt(String(x.po_id).split('-')[1]) || 0)) + 1).padStart(4, '0');
      const po = {
        po_id,
        n: ++d.seq,
        date: d.settings.today,
        supplier_id: sid,
        lines,
        status: 'Draft',
        expected_date: addDays(d.settings.today, s.lead_days),
        source_pr: src || ''
      };
      d.pos.push(po);
      d.log.push({
        n: ++d.seq,
        date: d.settings.today,
        module: 'Purchase',
        text: `${po.po_id} drafted for ${s.name}${src ? ' from ' + src : ''}`,
        ref: po.po_id
      });
      poRes = po;
    });
    return poRes;
  };

  const poSubmit = (id) => {
    runEngineAction((d) => {
      const po = d.pos.find((x) => x.po_id === id);
      if (!po || po.status !== 'Draft') return;
      const sub = sum(po.lines, (l) => l.qty * l.rate);
      const t = sub * (1 + d.settings.gst_rate / 100);
      const s = d.suppliers.find((x) => x.supplier_id === po.supplier_id) || { name: '—' };
      if (t <= d.settings.approval_limit) {
        po.status = 'Approved';
        d.log.push({
          n: ++d.seq,
          date: d.settings.today,
          module: 'Purchase',
          text: `${id} auto-approved (${inr(t)} ≤ limit ${inr(d.settings.approval_limit)}) → sent to ${s.name}, ETA ${fmtD(po.expected_date)}`,
          ref: id
        });
      } else {
        po.status = 'Pending Approval';
        d.log.push({
          n: ++d.seq,
          date: d.settings.today,
          module: 'Purchase',
          text: `${id} needs manual approval — ${inr(t)} exceeds limit ${inr(d.settings.approval_limit)}`,
          ref: id
        });
      }
    });
  };

  const poApprove = (id) => {
    runEngineAction((d) => {
      const po = d.pos.find((x) => x.po_id === id);
      if (!po || po.status !== 'Pending Approval') return;
      po.status = 'Approved';
      const s = d.suppliers.find((x) => x.supplier_id === po.supplier_id) || { name: '—' };
      d.log.push({
        n: ++d.seq,
        date: d.settings.today,
        module: 'Purchase',
        text: `${id} approved manually → sent to ${s.name}, ETA ${fmtD(po.expected_date)}`,
        ref: id
      });
    });
  };

  const receivePO = (id, qmap) => {
    let grnRes = null;
    runEngineAction((d) => {
      const po = d.pos.find((x) => x.po_id === id);
      if (!po || !['Approved', 'Partially Received'].includes(po.status)) return;
      const grn_id = 'GRN-' + String(Math.max(0, ...d.grns.map((x) => parseInt(String(x.grn_id).split('-')[1]) || 0)) + 1).padStart(4, '0');
      const lines = [];

      po.lines.forEach((l) => {
        const rem = l.qty - l.received;
        const q = Math.min(rem, qmap ? +qmap[l.sku] || 0 : rem);
        if (q > 0) {
          const p = d.products.find((x) => x.sku === l.sku);
          if (p) {
            const old = p.on_hand;
            p.cost = r2((old * p.cost + q * l.rate) / (old + q));
            p.on_hand += q;
            d.ledger.push({
              n: ++d.seq,
              date: d.settings.today,
              sku: l.sku,
              type: 'Purchase Receipt',
              qty: q,
              balance: p.on_hand,
              ref: grn_id,
              note: 'Received against ' + id,
              value: r2(q * l.rate)
            });
          }
          l.received += q;
          lines.push({ sku: l.sku, qty: q, rate: l.rate });
        }
      });

      if (!lines.length) return;

      const grn = {
        grn_id,
        n: ++d.seq,
        po_id: id,
        supplier_id: po.supplier_id,
        date: d.settings.today,
        lines,
        billed: false
      };
      d.grns.push(grn);
      po.status = po.lines.every((l) => l.received >= l.qty) ? 'Received' : 'Partially Received';

      d.log.push({
        n: ++d.seq,
        date: d.settings.today,
        module: 'Purchase',
        text: `${grn_id}: goods received against ${id} (${lines.map((l) => l.qty + ' × ' + (d.products.find((x) => x.sku === l.sku)?.name || l.sku)).join(', ')}) → stock updated`,
        ref: grn_id
      });

      // Auto Bill if enabled
      if (d.settings.auto_bill) {
        const sub = sum(grn.lines, (l) => l.qty * l.rate);
        const tax = sub * (d.settings.gst_rate / 100);
        const tot = sub + tax;
        const s = d.suppliers.find((x) => x.supplier_id === grn.supplier_id) || { terms_days: 30, name: '—' };
        const b = {
          bill_id: 'BILL-' + String(Math.max(0, ...d.bills.map((x) => parseInt(String(x.bill_id).split('-')[1]) || 0)) + 1).padStart(4, '0'),
          n: ++d.seq,
          grn_id: grn.grn_id,
          po_id: grn.po_id,
          supplier_id: grn.supplier_id,
          date: d.settings.today,
          due_date: addDays(d.settings.today, s.terms_days),
          subtotal: r2(sub),
          amount: r2(tot),
          paid: 0,
          status: 'Unpaid'
        };
        d.bills.push(b);
        grn.billed = true;
        d.log.push({
          n: ++d.seq,
          date: d.settings.today,
          module: 'Finance',
          text: `${b.bill_id} generated for ${s.name} — ${inr(b.amount)} due ${fmtD(b.due_date)}`,
          ref: b.bill_id
        });
      }

      // Stock allocation check for newly arrived stock
      lines.forEach(({ sku }) => {
        const p = d.products.find((x) => x.sku === sku);
        if (!p) return;
        let av = p.on_hand - p.reserved;
        if (av <= 0) return;
        d.sos
          .filter((s) => ['Confirmed', 'Ready', 'Partially Delivered'].includes(s.status))
          .sort((a, b) => a.n - b.n)
          .forEach((so) => {
            so.lines
              .filter((l) => l.sku === sku)
              .forEach((l) => {
                const need = l.qty - l.delivered - l.reserved;
                const take = Math.min(need, av);
                if (take > 0) {
                  l.reserved += take;
                  p.reserved += take;
                  av -= take;
                  d.log.push({
                    n: ++d.seq,
                    date: d.settings.today,
                    module: 'Inventory',
                    text: `Reserved ${take} × ${p.name} for ${so.so_id}`,
                    ref: so.so_id
                  });

                  // Update SO status
                  if (so.lines.every((line) => line.delivered >= line.qty)) so.status = 'Delivered';
                  else if (so.lines.every((line) => line.delivered + line.reserved >= line.qty)) so.status = 'Ready';
                  else if (so.lines.some((line) => line.delivered > 0)) so.status = 'Partially Delivered';
                  else so.status = 'Confirmed';
                }
              });
          });
      });

      grnRes = grn;
    });
    return grnRes;
  };

  const createBill = (grn_id) => {
    let billRes = null;
    runEngineAction((d) => {
      const g = d.grns.find((x) => x.grn_id === grn_id);
      if (!g || g.billed) return;
      const sub = sum(g.lines, (l) => l.qty * l.rate);
      const tax = sub * (d.settings.gst_rate / 100);
      const tot = sub + tax;
      const s = d.suppliers.find((x) => x.supplier_id === g.supplier_id) || { terms_days: 30, name: '—' };
      const b = {
        bill_id: 'BILL-' + String(Math.max(0, ...d.bills.map((x) => parseInt(String(x.bill_id).split('-')[1]) || 0)) + 1).padStart(4, '0'),
        n: ++d.seq,
        grn_id,
        po_id: g.po_id,
        supplier_id: g.supplier_id,
        date: d.settings.today,
        due_date: addDays(d.settings.today, s.terms_days),
        subtotal: r2(sub),
        amount: r2(tot),
        paid: 0,
        status: 'Unpaid'
      };
      d.bills.push(b);
      g.billed = true;
      d.log.push({
        n: ++d.seq,
        date: d.settings.today,
        module: 'Finance',
        text: `${b.bill_id} generated for ${s.name} — ${inr(b.amount)} due ${fmtD(b.due_date)}`,
        ref: b.bill_id
      });
      billRes = b;
    });
    return billRes;
  };

  const createSO = (cid, lines, noAuto) => {
    let soRes = null;
    runEngineAction((d) => {
      const so_id = 'SO-' + String(Math.max(0, ...d.sos.map((x) => parseInt(String(x.so_id).split('-')[1]) || 0)) + 1).padStart(4, '0');
      const sub = sum(lines, (l) => l.qty * l.price);
      const tot = sub * (1 + d.settings.gst_rate / 100);
      const c = d.customers.find((x) => x.customer_id === cid) || { name: '—' };
      const so = {
        so_id,
        n: ++d.seq,
        date: d.settings.today,
        customer_id: cid,
        lines,
        status: 'Draft'
      };
      d.sos.push(so);
      d.log.push({
        n: ++d.seq,
        date: d.settings.today,
        module: 'Sales',
        text: `${so.so_id} created for ${c.name} — ${inr(tot)}`,
        ref: so.so_id
      });

      if (d.settings.auto_confirm && !noAuto) {
        // Auto confirm
        const out = sum(d.invs.filter((i) => i.customer_id === cid), (i) => i.amount - i.paid);
        if (!d.settings._hist && out + tot > c.credit_limit) {
          so.status = 'On Hold';
          d.log.push({
            n: ++d.seq,
            date: d.settings.today,
            module: 'Sales',
            text: `${so.so_id} ON HOLD — credit limit ${inr(c.credit_limit)} exceeded for ${c.name}`,
            ref: so.so_id
          });
        } else {
          so.status = 'Confirmed';
          d.log.push({
            n: ++d.seq,
            date: d.settings.today,
            module: 'Sales',
            text: `${so.so_id} confirmed for ${c.name}`,
            ref: so.so_id
          });

          // Allocate stock
          lines.forEach((l) => {
            const p = d.products.find((x) => x.sku === l.sku);
            if (!p) return;
            const av = p.on_hand - p.reserved;
            if (av > 0) {
              const take = Math.min(l.qty, av);
              l.reserved = take;
              p.reserved += take;
              d.log.push({
                n: ++d.seq,
                date: d.settings.today,
                module: 'Inventory',
                text: `Reserved ${take} × ${p.name} for ${so.so_id}`,
                ref: so.so_id
              });
            }
          });

          // Check SO status after allocation
          if (so.lines.every((l) => l.delivered >= l.qty)) so.status = 'Delivered';
          else if (so.lines.every((l) => l.delivered + l.reserved >= l.qty)) so.status = 'Ready';
          else if (so.lines.some((l) => l.delivered > 0)) so.status = 'Partially Delivered';
          else so.status = 'Confirmed';
        }
      }
      soRes = so;
    });
    return soRes;
  };

  const confirmSO = (id) => {
    runEngineAction((d) => {
      const so = d.sos.find((x) => x.so_id === id);
      if (!so || !['Draft', 'On Hold'].includes(so.status)) return;
      const c = d.customers.find((x) => x.customer_id === so.customer_id) || { name: '—', credit_limit: 0 };
      const sub = sum(so.lines, (l) => l.qty * l.price);
      const t = sub * (1 + d.settings.gst_rate / 100);
      const out = sum(d.invs.filter((i) => i.customer_id === c.customer_id), (i) => i.amount - i.paid);

      if (!d.settings._hist && out + t > c.credit_limit) {
        so.status = 'On Hold';
        d.log.push({
          n: ++d.seq,
          date: d.settings.today,
          module: 'Sales',
          text: `${id} ON HOLD — credit limit ${inr(c.credit_limit)} exceeded for ${c.name} (outstanding ${inr(out)})`,
          ref: id
        });
        return;
      }

      so.status = 'Confirmed';
      d.log.push({
        n: ++d.seq,
        date: d.settings.today,
        module: 'Sales',
        text: `${id} confirmed for ${c.name}`,
        ref: id
      });

      so.lines.forEach((l) => {
        const p = d.products.find((x) => x.sku === l.sku);
        if (!p) return;
        const av = p.on_hand - p.reserved;
        if (av > 0) {
          const take = Math.min(l.qty - l.delivered - l.reserved, av);
          if (take > 0) {
            l.reserved += take;
            p.reserved += take;
            d.log.push({
              n: ++d.seq,
              date: d.settings.today,
              module: 'Inventory',
              text: `Reserved ${take} × ${p.name} for ${id}`,
              ref: id
            });
          }
        }
      });

      if (so.lines.every((l) => l.delivered >= l.qty)) so.status = 'Delivered';
      else if (so.lines.every((l) => l.delivered + l.reserved >= l.qty)) so.status = 'Ready';
      else if (so.lines.some((l) => l.delivered > 0)) so.status = 'Partially Delivered';
      else so.status = 'Confirmed';
    });
  };

  const deliverSO = (id, auto = false) => {
    let dnRes = null;
    runEngineAction((d) => {
      const so = d.sos.find((x) => x.so_id === id);
      if (!so || !['Ready', 'Partially Delivered', 'Confirmed'].includes(so.status)) return;
      const dn_id = 'DN-' + String(Math.max(0, ...d.dns.map((x) => parseInt(String(x.dn_id).split('-')[1]) || 0)) + 1).padStart(4, '0');
      const lines = [];

      so.lines.forEach((l) => {
        if (l.reserved > 0) {
          const p = d.products.find((x) => x.sku === l.sku);
          if (!p) return;
          const q = l.reserved;
          p.on_hand -= q;
          p.reserved -= q;
          d.ledger.push({
            n: ++d.seq,
            date: d.settings.today,
            sku: l.sku,
            type: 'Sales Delivery',
            qty: -q,
            balance: p.on_hand,
            ref: dn_id,
            note: 'Delivered against ' + id,
            value: r2(-q * p.cost)
          });
          l.reserved = 0;
          l.delivered += q;
          lines.push({ sku: l.sku, qty: q, price: l.price, cost: p.cost });
        }
      });

      if (!lines.length) return;

      const c = d.customers.find((x) => x.customer_id === so.customer_id) || { name: '—' };
      const dn = {
        dn_id,
        n: ++d.seq,
        so_id: id,
        customer_id: so.customer_id,
        date: d.settings.today,
        lines,
        invoiced: false
      };
      d.dns.push(dn);

      if (so.lines.every((l) => l.delivered >= l.qty)) so.status = 'Delivered';
      else if (so.lines.every((l) => l.delivered + l.reserved >= l.qty)) so.status = 'Ready';
      else if (so.lines.some((l) => l.delivered > 0)) so.status = 'Partially Delivered';
      else so.status = 'Confirmed';

      d.log.push({
        n: ++d.seq,
        date: d.settings.today,
        module: 'Sales',
        text: `${dn_id}: ${lines.map((l) => l.qty + ' × ' + (d.products.find((x) => x.sku === l.sku)?.name || l.sku)).join(', ')} delivered to ${c.name}${auto ? ' (auto)' : ''} → stock reduced`,
        ref: dn_id
      });

      // Auto Invoice if enabled
      if (d.settings.auto_invoice) {
        const sub = sum(dn.lines, (l) => l.qty * l.price);
        const tax = sub * (d.settings.gst_rate / 100);
        const tot = sub + tax;
        const cogs = sum(dn.lines, (l) => l.qty * l.cost);
        const inv = {
          inv_id: 'INV-' + String(Math.max(0, ...d.invs.map((x) => parseInt(String(x.inv_id).split('-')[1]) || 0)) + 1).padStart(4, '0'),
          n: ++d.seq,
          dn_id: dn.dn_id,
          so_id: dn.so_id,
          customer_id: dn.customer_id,
          date: d.settings.today,
          due_date: addDays(d.settings.today, c.terms_days || 0),
          subtotal: r2(sub),
          tax: r2(tax),
          amount: r2(tot),
          cogs: r2(cogs),
          paid: 0,
          status: 'Unpaid'
        };
        d.invs.push(inv);
        dn.invoiced = true;
        d.log.push({
          n: ++d.seq,
          date: d.settings.today,
          module: 'Finance',
          text: `${inv.inv_id} generated for ${c.name} — ${inr(inv.amount)} (profit ${inr(inv.subtotal - inv.cogs)}) due ${fmtD(inv.due_date)}`,
          ref: inv.inv_id
        });
      }
      dnRes = dn;
    });
    return dnRes;
  };

  const createInvoice = (dn_id) => {
    let invRes = null;
    runEngineAction((d) => {
      const dn = d.dns.find((x) => x.dn_id === dn_id);
      if (!dn || dn.invoiced) return;
      const sub = sum(dn.lines, (l) => l.qty * l.price);
      const tax = sub * (d.settings.gst_rate / 100);
      const tot = sub + tax;
      const cogs = sum(dn.lines, (l) => l.qty * l.cost);
      const c = d.customers.find((x) => x.customer_id === dn.customer_id) || { name: '—', terms_days: 0 };
      const inv = {
        inv_id: 'INV-' + String(Math.max(0, ...d.invs.map((x) => parseInt(String(x.inv_id).split('-')[1]) || 0)) + 1).padStart(4, '0'),
        n: ++d.seq,
        dn_id,
        so_id: dn.so_id,
        customer_id: dn.customer_id,
        date: d.settings.today,
        due_date: addDays(d.settings.today, c.terms_days || 0),
        subtotal: r2(sub),
        tax: r2(tax),
        amount: r2(tot),
        cogs: r2(cogs),
        paid: 0,
        status: 'Unpaid'
      };
      d.invs.push(inv);
      dn.invoiced = true;
      d.log.push({
        n: ++d.seq,
        date: d.settings.today,
        module: 'Finance',
        text: `${inv.inv_id} generated for ${c.name} — ${inr(inv.amount)} (profit ${inr(inv.subtotal - inv.cogs)}) due ${fmtD(inv.due_date)}`,
        ref: inv.inv_id
      });
      invRes = inv;
    });
    return invRes;
  };

  const settle = (kind, id, amt, mode, auto = false) => {
    runEngineAction((d) => {
      const doc = kind === 'inv' ? d.invs.find((x) => x.inv_id === id) : d.bills.find((x) => x.bill_id === id);
      if (!doc) return;
      const rem = r2(doc.amount - doc.paid);
      const actualAmt = Math.min(r2(amt), rem);
      if (!(actualAmt > 0)) return;

      doc.paid = r2(doc.paid + actualAmt);
      doc.status = doc.paid >= doc.amount - 0.01 ? 'Paid' : 'Partial';

      d.payments.push({
        pay_id: 'PAY-' + String(Math.max(0, ...d.payments.map((x) => parseInt(String(x.pay_id).split('-')[1]) || 0)) + 1).padStart(4, '0'),
        n: ++d.seq,
        date: d.settings.today,
        type: kind === 'inv' ? 'Received' : 'Paid',
        ref: id,
        party_id: kind === 'inv' ? doc.customer_id : doc.supplier_id,
        amount: actualAmt,
        mode: mode || 'Bank Transfer'
      });

      d.log.push({
        n: ++d.seq,
        date: d.settings.today,
        module: 'Finance',
        text: `${kind === 'inv' ? 'Payment received' : 'Payment made'} ${inr(actualAmt)} against ${id}${auto ? ' (auto — immediate terms)' : ''}`,
        ref: id
      });
    });
  };

  const cancelSO = (id) => {
    let ok = false;
    runEngineAction((d) => {
      const so = d.sos.find((x) => x.so_id === id);
      if (!so || ['Delivered', 'Cancelled'].includes(so.status) || so.lines.some((l) => l.delivered > 0)) {
        return;
      }
      so.lines.forEach((l) => {
        const p = d.products.find((x) => x.sku === l.sku);
        if (p) p.reserved -= l.reserved;
        l.reserved = 0;
      });
      so.status = 'Cancelled';
      d.log.push({
        n: ++d.seq,
        date: d.settings.today,
        module: 'Sales',
        text: `${id} cancelled — reservations released`,
        ref: id
      });
      ok = true;
    });
    return ok;
  };

  const cancelPO = (id) => {
    let ok = false;
    runEngineAction((d) => {
      const po = d.pos.find((x) => x.po_id === id);
      if (!po || !['Draft', 'Pending Approval', 'Approved'].includes(po.status) || po.lines.some((l) => l.received > 0)) {
        return;
      }
      po.status = 'Cancelled';
      d.log.push({
        n: ++d.seq,
        date: d.settings.today,
        module: 'Purchase',
        text: `${id} cancelled`,
        ref: id
      });
      ok = true;
    });
    return ok;
  };

  const doReturn = (kind, id, qm) => {
    let res = 'Error';
    runEngineAction((d) => {
      const Pu = kind === 'P';
      const src = Pu ? d.grns.find((x) => x.grn_id === id) : d.dns.find((x) => x.dn_id === id);
      if (!src) {
        res = 'Not found';
        return;
      }
      const lines = [];

      for (const l of src.lines) {
        const q = Math.min(l.qty - (l.returned || 0), +qm[l.sku] || 0);
        if (q > 0) {
          const p = d.products.find((x) => x.sku === l.sku);
          if (Pu && p.on_hand - p.reserved < q) {
            res = 'Stock available nahi: ' + (p ? p.name : l.sku);
            return;
          }
          lines.push({ l, q });
        }
      }

      if (!lines.length) {
        res = 'Quantity enter karein';
        return;
      }

      const rid = (Pu ? 'PRT-' : 'SRT-') + String(Math.max(0, ...(Pu ? d.prets : d.srets).map((x) => parseInt(String(Pu ? x.prt_id : x.srt_id).split('-')[1]) || 0)) + 1).padStart(4, '0');
      const out = [];

      lines.forEach(({ l, q }) => {
        const p = d.products.find((x) => x.sku === l.sku);
        if (Pu) {
          p.on_hand -= q;
          d.ledger.push({
            n: ++d.seq,
            date: d.settings.today,
            sku: l.sku,
            type: 'Purchase Return',
            qty: -q,
            balance: p.on_hand,
            ref: rid,
            note: 'Returned against ' + id,
            value: r2(-q * l.rate)
          });
        } else {
          p.on_hand += q;
          d.ledger.push({
            n: ++d.seq,
            date: d.settings.today,
            sku: l.sku,
            type: 'Sales Return',
            qty: q,
            balance: p.on_hand,
            ref: rid,
            note: 'Returned against ' + id,
            value: r2(q * l.cost)
          });
        }
        l.returned = (l.returned || 0) + q;
        out.push({ sku: l.sku, qty: q, rate: Pu ? l.rate : l.price, cost: l.cost });
      });

      const sub = r2(sum(out, (x) => x.qty * x.rate));
      const gstVal = d.settings.gst_rate / 100;
      const doc = {
        n: ++d.seq,
        date: d.settings.today,
        src: id,
        lines: out,
        subtotal: sub,
        amount: r2(sub * (1 + gstVal))
      };

      if (Pu) {
        doc.prt_id = rid;
        doc.party_id = src.supplier_id;
        d.prets.push(doc);
        const b = d.bills.find((x) => x.grn_id === id);
        if (b) {
          b.subtotal = r2(b.subtotal - sub);
          b.amount = r2(b.amount - doc.amount);
          b.status = b.paid >= b.amount - 0.01 ? 'Paid' : b.paid > 0 ? 'Partial' : 'Unpaid';
        }
        d.log.push({
          n: ++d.seq,
          date: d.settings.today,
          module: 'Purchase',
          text: `${rid}: purchase return against ${id} — stock reduced, bill adjusted`,
          ref: rid
        });
      } else {
        doc.srt_id = rid;
        doc.party_id = src.customer_id;
        d.srets.push(doc);
        const i = d.invs.find((x) => x.dn_id === id);
        if (i) {
          i.subtotal = r2(i.subtotal - sub);
          i.tax = r2(i.tax - (doc.amount - sub));
          i.amount = r2(i.amount - doc.amount);
          i.cogs = r2(i.cogs - sum(out, (x) => x.qty * x.cost));
          i.status = i.paid >= i.amount - 0.01 ? 'Paid' : i.paid > 0 ? 'Partial' : 'Unpaid';
        }
        d.log.push({
          n: ++d.seq,
          date: d.settings.today,
          module: 'Sales',
          text: `${rid}: sales return against ${id} — stock increased, invoice adjusted`,
          ref: rid
        });
      }
      res = rid;
    });
    return res;
  };

  const adjustStock = (sku, qty, note) => {
    let err = '';
    runEngineAction((d) => {
      const p = d.products.find((x) => x.sku === sku);
      if (!p) {
        err = 'Product not found';
        return;
      }
      if (p.on_hand + qty < p.reserved) {
        err = 'Cannot reduce below reserved quantity (' + p.reserved + ')';
        return;
      }
      p.on_hand += qty;
      d.ledger.push({
        n: ++d.seq,
        date: d.settings.today,
        sku,
        type: 'Adjustment',
        qty,
        balance: p.on_hand,
        ref: 'ADJ',
        note: note || '',
        value: r2(qty * p.cost)
      });
      d.log.push({
        n: ++d.seq,
        date: d.settings.today,
        module: 'Inventory',
        text: `Stock adjusted ${qty > 0 ? '+' : ''}${qty} for ${p.name} — ${note}`,
        ref: sku
      });
    });
    return err;
  };

  const createQuote = (cid, lines, days = 15) => {
    let qRes = null;
    runEngineAction((d) => {
      const qt_id = 'QT-' + String(Math.max(0, ...d.quotes.map((x) => parseInt(String(x.qt_id).split('-')[1]) || 0)) + 1).padStart(4, '0');
      const q = {
        qt_id,
        n: ++d.seq,
        date: d.settings.today,
        customer_id: cid,
        lines: lines.map((l) => ({ sku: l.sku, qty: l.qty, price: l.rate })),
        valid_until: addDays(d.settings.today, days),
        status: 'Draft',
        so_id: ''
      };
      d.quotes.push(q);
      const c = d.customers.find((x) => x.customer_id === cid) || { name: '—' };
      const sub = sum(q.lines, (l) => l.qty * l.price);
      const tot = sub * (1 + d.settings.gst_rate / 100);
      d.log.push({
        n: ++d.seq,
        date: d.settings.today,
        module: 'Sales',
        text: `${q.qt_id} quotation created for ${c.name} — ${inr(tot)}`,
        ref: q.qt_id
      });
      qRes = q;
    });
    return qRes;
  };

  const qtSetStatus = (id, v) => {
    runEngineAction((d) => {
      const q = d.quotes.find((x) => x.qt_id === id);
      if (q) {
        q.status = v;
        d.log.push({
          n: ++d.seq,
          date: d.settings.today,
          module: 'Sales',
          text: `${id} marked ${v}`,
          ref: id
        });
      }
    });
  };

  const qtToSO = (id) => {
    runEngineAction((d) => {
      const q = d.quotes.find((x) => x.qt_id === id);
      if (!q) return;
      const so_id = 'SO-' + String(Math.max(0, ...d.sos.map((x) => parseInt(String(x.so_id).split('-')[1]) || 0)) + 1).padStart(4, '0');
      const so = {
        so_id,
        n: ++d.seq,
        date: d.settings.today,
        customer_id: q.customer_id,
        lines: q.lines.map((l) => ({ sku: l.sku, qty: l.qty, price: l.price, reserved: 0, delivered: 0 })),
        status: 'Draft'
      };
      d.sos.push(so);
      q.status = 'Converted';
      q.so_id = so.so_id;
      d.log.push({
        n: ++d.seq,
        date: d.settings.today,
        module: 'Sales',
        text: `${id} → ${so.so_id} (quotation converted to Sales Order)`,
        ref: so.so_id
      });
    });
  };

  const advanceDays = (n) => {
    runEngineAction((d) => {
      let rc = 0;
      for (let i = 0; i < n; i++) {
        d.settings.today = addDays(d.settings.today, 1);
        if (d.settings.auto_receive) {
          d.pos
            .filter((o) => ['Approved', 'Partially Received'].includes(o.status) && o.expected_date <= d.settings.today)
            .forEach((o) => {
              const grn_id = 'GRN-' + String(Math.max(0, ...d.grns.map((x) => parseInt(String(x.grn_id).split('-')[1]) || 0)) + 1).padStart(4, '0');
              const lines = [];
              o.lines.forEach((l) => {
                const rem = l.qty - l.received;
                if (rem > 0) {
                  const p = d.products.find((x) => x.sku === l.sku);
                  if (p) {
                    const old = p.on_hand;
                    p.cost = r2((old * p.cost + rem * l.rate) / (old + rem));
                    p.on_hand += rem;
                    d.ledger.push({
                      n: ++d.seq,
                      date: d.settings.today,
                      sku: l.sku,
                      type: 'Purchase Receipt',
                      qty: rem,
                      balance: p.on_hand,
                      ref: grn_id,
                      note: 'Received against ' + o.po_id,
                      value: r2(rem * l.rate)
                    });
                  }
                  l.received += rem;
                  lines.push({ sku: l.sku, qty: rem, rate: l.rate });
                }
              });
              if (lines.length) {
                d.grns.push({
                  grn_id,
                  n: ++d.seq,
                  po_id: o.po_id,
                  supplier_id: o.supplier_id,
                  date: d.settings.today,
                  lines,
                  billed: false
                });
                o.status = 'Received';
                rc++;
                d.log.push({
                  n: ++d.seq,
                  date: d.settings.today,
                  module: 'System',
                  text: `Supplier delivery arrived for ${o.po_id} (expected ${fmtD(o.expected_date)})`,
                  ref: o.po_id
                });
              }
            });
        }
      }
      d.log.push({
        n: ++d.seq,
        date: d.settings.today,
        module: 'System',
        text: `Time advanced ${n} day(s) → ${fmtD(d.settings.today)}; ${rc} supplier delivery(ies) auto-received`,
        ref: ''
      });
      addToast(`Moved to ${fmtD(d.settings.today)} — ${rc} PO(s) auto-received`, rc ? 'ok' : 'info');
    });
  };

  const runAutomationNow = () => {
    runEngineAction((d) => {
      let c = 0;
      // 1. PR to PO
      d.prs.filter((r) => r.status === 'Open').forEach((r) => {
        if (d.settings.auto_po) {
          const po_id = 'PO-' + String(Math.max(0, ...d.pos.map((x) => parseInt(String(x.po_id).split('-')[1]) || 0)) + 1).padStart(4, '0');
          const po = {
            po_id,
            n: ++d.seq,
            date: d.settings.today,
            supplier_id: r.supplier_id,
            lines: r.lines.map((l) => ({ sku: l.sku, qty: l.qty, rate: d.products.find((x) => x.sku === l.sku)?.cost || 0, received: 0 })),
            status: 'Draft',
            expected_date: addDays(d.settings.today, 5),
            source_pr: r.pr_id
          };
          d.pos.push(po);
          r.status = 'Converted';
          r.po_id = po.po_id;
          c++;
        }
      });
      d.log.push({
        n: ++d.seq,
        date: d.settings.today,
        module: 'System',
        text: `Automation engine run manually — ${c} action(s)`,
        ref: ''
      });
      addToast(`Automation run complete — ${c} action(s)`);
    });
  };

  const resetDemo = () => {
    setConfirmDialog({
      open: true,
      msg: 'Reset ALL data (products, orders, stock, documents) to the demo defaults?',
      label: 'Reset',
      onConfirm: () => {
        const seed = getInitialSeed();
        setDb(seed);
        try {
          localStorage.setItem(KEY, JSON.stringify(seed));
        } catch (e) {}
        addToast('Demo data reset ✔');
        navigate('dashboard');
      }
    });
  };

  const saveProduct = (data) => {
    runEngineAction((d) => {
      if (data.sku) {
        const p = d.products.find((x) => x.sku === data.sku);
        if (p) Object.assign(p, data);
      } else {
        const nextNum = Math.max(1000, ...d.products.map((x) => +x.sku.split('-')[1] || 0)) + 1;
        const newP = {
          sku: 'SKU-' + nextNum,
          ...data,
          on_hand: data.opening || 0,
          reserved: 0
        };
        delete newP.opening;
        d.products.push(newP);
        if (data.opening > 0) {
          d.ledger.push({
            n: ++d.seq,
            date: d.settings.today,
            sku: newP.sku,
            type: 'Opening Stock',
            qty: data.opening,
            balance: data.opening,
            ref: 'OPEN',
            note: 'Opening balance',
            value: r2(data.opening * data.cost)
          });
        }
      }
    });
    addToast('Item saved ✔');
  };

  const deleteProduct = (sku) => {
    const used = db.sos.some((s) => s.lines.some((l) => l.sku === sku)) || db.pos.some((s) => s.lines.some((l) => l.sku === sku));
    if (used) {
      addToast('Product used in orders — cannot delete', 'err');
      return;
    }
    setConfirmDialog({
      open: true,
      msg: 'Delete this product?',
      label: 'Delete',
      onConfirm: () => {
        runEngineAction((d) => {
          d.products = d.products.filter((p) => p.sku !== sku);
        });
        addToast('Product deleted');
      }
    });
  };

  const saveSupplier = (data) => {
    runEngineAction((d) => {
      if (data.supplier_id) {
        const s = d.suppliers.find((x) => x.supplier_id === data.supplier_id);
        if (s) Object.assign(s, data);
      } else {
        d.suppliers.push({ supplier_id: 'S' + (d.suppliers.length + 1), ...data });
      }
    });
    addToast('Supplier saved ✔');
  };

  const saveCustomer = (data) => {
    runEngineAction((d) => {
      if (data.customer_id) {
        const c = d.customers.find((x) => x.customer_id === data.customer_id);
        if (c) Object.assign(c, data);
      } else {
        d.customers.push({ customer_id: 'C' + (d.customers.length + 1), ...data });
      }
    });
    addToast('Customer saved ✔');
  };

  // Notifications summary selector
  const notifs = () => {
    const a = [];
    const low = db.products.filter((p) => projected(p.sku) <= p.reorder_level).length;
    if (low) a.push({ t: `${low} item(s) need reorder`, r: 'inventory-stock', c: '#f59e0b' });
    const pa = db.pos.filter((o) => o.status === 'Pending Approval').length;
    if (pa) a.push({ t: `${pa} purchase order(s) awaiting your approval`, r: 'purchase-orders', c: '#dc2626' });
    const oh = db.sos.filter((s) => s.status === 'On Hold').length;
    if (oh) a.push({ t: `${oh} sales order(s) on credit hold`, r: 'sales-orders', c: '#dc2626' });
    const dr = db.sos.filter((s) => s.status === 'Draft').length;
    if (dr) a.push({ t: `${dr} draft sales order(s) not confirmed`, r: 'sales-orders', c: '#2563eb' });
    const od = db.invs.filter((i) => i.status !== 'Paid' && i.due_date < D).length;
    if (od) a.push({ t: `${od} overdue customer invoice(s)`, r: 'sales-invoices', c: '#7c3aed' });
    const ob = db.bills.filter((b) => b.status !== 'Paid' && b.due_date < D).length;
    if (ob) a.push({ t: `${ob} overdue supplier bill(s)`, r: 'purchase-bills', c: '#7c3aed' });
    return a;
  };

  const value = {
    db,
    theme,
    toggleTheme,
    currentRoute,
    navigate,
    toasts,
    addToast,
    notifRead,
    setNotifRead,
    notifs,
    // Modals
    activeDocId,
    openDoc: (id) => setActiveDocId(id),
    closeDoc: () => setActiveDocId(null),
    orderModal,
    setOrderModal,
    receiveModal,
    setReceiveModal,
    paymentModal,
    setPaymentModal,
    returnModal,
    setReturnModal,
    productModal,
    setProductModal,
    partyModal,
    setPartyModal,
    stockAdjustModal,
    setStockAdjustModal,
    quotePreviewId,
    setQuotePreviewId,
    confirmDialog,
    setConfirmDialog,

    // Selectors
    D,
    gstR,
    P,
    SUP,
    CUS,
    SO,
    PO,
    INV,
    BILL,
    incoming,
    demand,
    projected,
    stockStatus,
    outstanding,
    totOf,

    // Engine actions
    createPR,
    prToPO,
    createPO,
    poSubmit,
    poApprove,
    receivePO,
    createBill,
    createSO,
    confirmSO,
    deliverSO,
    createInvoice,
    settle,
    cancelSO,
    cancelPO,
    doReturn,
    adjustStock,
    createQuote,
    qtSetStatus,
    qtToSO,
    advanceDays,
    runAutomationNow,
    resetDemo,
    saveProduct,
    deleteProduct,
    saveSupplier,
    saveCustomer
  };

  return <IMSContext.Provider value={value}>{children}</IMSContext.Provider>;
}

export function useIMS() {
  const context = useContext(IMSContext);
  if (!context) {
    throw new Error('useIMS must be used within an IMSProvider');
  }
  return context;
}
