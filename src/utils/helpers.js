export const KEY = 'nexora_ims_v2';
export const T0 = new Date().toISOString().slice(0, 10);

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));

export const pad = (n) => String(n).padStart(2, '0');
export const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
export const num = (n) => Number(r2(n || 0)).toLocaleString('en-IN');
export const inr = (n) => (n < 0 ? '-' : '') + '₹' + Math.round(Math.abs(n || 0)).toLocaleString('en-IN');

export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parse = (s) => {
  if (!s) return new Date();
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addD = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const addDays = (s, n) => ymd(addD(parse(s), n));
export const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 864e5);

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fmtD = (s) => {
  if (!s) return '—';
  const d = parse(s.slice(0, 10));
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const sum = (a, f) => a.reduce((x, y) => x + f(y), 0);

export const totOf = (lines, k, gstRate = 18) => {
  const s = sum(lines, (l) => l.qty * (l[k] || 0));
  const tax = r2(s * (gstRate / 100));
  return { sub: r2(s), tax, total: r2(s + tax) };
};

export const nid = (pre, list, key) =>
  pre + '-' + String(Math.max(0, ...list.map((x) => parseInt(String(x[key]).split('-')[1]) || 0)) + 1).padStart(4, '0');

export function rng(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const stripHTML = (h) =>
  String(h)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

export const BC = {
  Draft: 'gray',
  Open: 'amber',
  Converted: 'blue',
  'Pending Approval': 'amber',
  Approved: 'blue',
  'Partially Received': 'purple',
  Received: 'green',
  Cancelled: 'red',
  Confirmed: 'blue',
  Ready: 'teal',
  'Partially Delivered': 'purple',
  Delivered: 'green',
  'On Hold': 'red',
  Unpaid: 'amber',
  Partial: 'purple',
  Paid: 'green',
  Overdue: 'red',
  Healthy: 'green',
  'Reorder Needed': 'amber',
  'Out of Stock': 'red',
  'Low — PO incoming': 'blue',
  Purchase: 'amber',
  Sales: 'blue',
  Inventory: 'purple',
  Finance: 'teal',
  System: 'gray',
  Invoiced: 'green',
  'To Invoice': 'amber',
  Sent: 'amber',
  Accepted: 'green',
  Rejected: 'red',
  Expired: 'red'
};

export const exportCSV = (name, cols, rows) => {
  const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
  const csv = [
    cols.map((c) => q(stripHTML(c.h))).join(','),
    ...rows.map((r) => cols.map((c) => q(stripHTML(c.f(r)))).join(','))
  ].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = name + '.csv';
  a.click();
};

export function getInitialSeed() {
  const d = {
    settings: {
      today: T0,
      gst_rate: 18,
      approval_limit: 1e9,
      auto_confirm: true,
      auto_deliver: true,
      auto_invoice: true,
      auto_payment: true,
      auto_reorder: false,
      auto_po: true,
      auto_bill: true,
      auto_receive: true,
      _hist: true
    },
    seq: 0,
    products: [],
    suppliers: [],
    customers: [],
    prs: [],
    pos: [],
    grns: [],
    bills: [],
    sos: [],
    dns: [],
    invs: [],
    payments: [],
    ledger: [],
    log: [],
    quotes: [],
    prets: [],
    srets: []
  };

  d.suppliers = [
    ['S1', 'TechSource Distributors', 5, 30, '9811100011'],
    ['S2', 'Digital World Imports', 7, 30, '9822200022'],
    ['S3', 'Paper & Co. Wholesale', 3, 15, '9833300033'],
    ['S4', 'Urban Furnishings Ltd', 10, 45, '9844400044']
  ].map((x) => ({
    supplier_id: x[0],
    name: x[1],
    lead_days: x[2],
    terms_days: x[3],
    phone: x[4],
    email: x[1].split(' ')[0].toLowerCase() + '@supplier.in'
  }));

  d.customers = [
    ['C1', 'Apex Solutions Pvt Ltd', 30, 300000],
    ['C2', 'BrightEdge Retail', 15, 150000],
    ['C3', 'Walk-in Customer', 0, 50000],
    ['C4', 'Orion Enterprises', 30, 500000],
    ['C5', 'Sunrise Traders', 15, 40000],
    ['C6', 'Kiran Stores', 0, 50000]
  ].map((x) => ({
    customer_id: x[0],
    name: x[1],
    terms_days: x[2],
    credit_limit: x[3],
    phone: '98' + String(10000000 + x[0].charCodeAt(1) * 137911).slice(0, 8),
    email: x[1].split(' ')[0].toLowerCase() + '@client.in'
  }));

  const PR = [
    ['SKU-1001', 'Wireless Mouse', 'Accessories', 'pcs', 350, 599, 25, 60, 'S1', 150],
    ['SKU-1002', 'Mechanical Keyboard', 'Accessories', 'pcs', 1800, 2799, 15, 30, 'S1', 70],
    ['SKU-1003', '24" LED Monitor', 'Electronics', 'pcs', 7200, 9499, 8, 15, 'S2', 40],
    ['SKU-1004', 'Laptop Stand', 'Accessories', 'pcs', 650, 999, 20, 40, 'S3', 90],
    ['SKU-1005', 'USB-C Hub', 'Electronics', 'pcs', 900, 1499, 20, 50, 'S2', 80],
    ['SKU-1006', 'Ergonomic Chair', 'Furniture', 'pcs', 6500, 8999, 5, 10, 'S4', 20],
    ['SKU-1007', 'Office Desk', 'Furniture', 'pcs', 5200, 7499, 4, 8, 'S4', 14],
    ['SKU-1008', 'A4 Paper Ream (500)', 'Stationery', 'ream', 220, 329, 50, 150, 'S3', 300],
    ['SKU-1009', 'Gel Pen Box (50)', 'Stationery', 'box', 160, 249, 30, 100, 'S3', 350],
    ['SKU-1010', 'Webcam HD', 'Electronics', 'pcs', 1400, 2199, 10, 25, 'S2', 45]
  ];

  const gstR = () => d.settings.gst_rate / 100;
  const day = (o) => addDays(T0, o);
  const at = (o) => {
    d.settings.today = day(o);
  };

  const moveStockSeed = (sku, qty, type, ref, note, val) => {
    const p = d.products.find((x) => x.sku === sku);
    p.on_hand += qty;
    d.ledger.push({
      n: ++d.seq,
      date: d.settings.today,
      sku,
      type,
      qty,
      balance: p.on_hand,
      ref: ref || '',
      note: note || '',
      value: r2(val != null ? val : qty * p.cost)
    });
  };

  const START = -62;
  at(START);
  PR.forEach((x) => {
    d.products.push({
      sku: x[0],
      name: x[1],
      category: x[2],
      unit: x[3],
      cost: x[4],
      price: x[5],
      reorder_level: x[6],
      reorder_qty: x[7],
      supplier_id: x[8],
      on_hand: 0,
      reserved: 0
    });
    moveStockSeed(x[0], x[9], 'Opening Stock', 'OPEN', 'Opening balance');
  });

  const r = rng('ims-hist');

  const createPOSeed = (sid, lines, src) => {
    const s = d.suppliers.find((x) => x.supplier_id === sid) || { lead_days: 5 };
    const po = {
      po_id: 'PO-' + String(Math.max(0, ...d.pos.map((x) => parseInt(String(x.po_id).split('-')[1]) || 0)) + 1).padStart(4, '0'),
      n: ++d.seq,
      date: d.settings.today,
      supplier_id: sid,
      lines,
      status: 'Draft',
      expected_date: addDays(d.settings.today, s.lead_days),
      source_pr: src || ''
    };
    d.pos.push(po);
    return po;
  };

  const poSubmitSeed = (id) => {
    const po = d.pos.find((x) => x.po_id === id);
    if (!po) return;
    const sub = sum(po.lines, (l) => l.qty * l.rate);
    const t = sub * (1 + gstR());
    if (t <= d.settings.approval_limit) {
      po.status = 'Approved';
    } else {
      po.status = 'Pending Approval';
    }
  };

  const replenish = () =>
    d.suppliers.forEach((s) => {
      const lines = d.products
        .filter((p) => p.supplier_id === s.supplier_id)
        .map((p) => ({ sku: p.sku, qty: Math.round(p.reorder_qty * (0.6 + r() * 0.9)), rate: p.cost, received: 0 }));
      const po = createPOSeed(s.supplier_id, lines);
      poSubmitSeed(po.po_id);
    });

  const createSOSeed = (cid, lines) => {
    const so = {
      so_id: 'SO-' + String(Math.max(0, ...d.sos.map((x) => parseInt(String(x.so_id).split('-')[1]) || 0)) + 1).padStart(4, '0'),
      n: ++d.seq,
      date: d.settings.today,
      customer_id: cid,
      lines,
      status: 'Draft'
    };
    d.sos.push(so);
  };

  const histSales = () => {
    const n = 1 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const c = d.customers[Math.floor(r() * d.customers.length)];
      const lines = [];
      const used = new Set();
      const k = 1 + Math.floor(r() * 3);
      for (let j = 0; j < k; j++) {
        const p = d.products[Math.floor(r() * d.products.length)];
        if (used.has(p.sku)) continue;
        used.add(p.sku);
        const mx = p.category === 'Furniture' ? 2 : p.category === 'Stationery' ? 25 : 7;
        const q = 1 + Math.floor(r() * mx);
        if (p.on_hand - p.reserved >= q) lines.push({ sku: p.sku, qty: q, price: p.price, reserved: 0, delivered: 0 });
      }
      if (lines.length) createSOSeed(c.customer_id, lines);
    }
  };

  for (let o = START + 1; o <= -1; o++) {
    at(o);
    if ([-58, -40, -22, -7].includes(o)) replenish();
    if (o > -60 && r() < 0.65) histSales();
  }

  /* Live phase setup */
  at(0);
  Object.assign(d.settings, { _hist: false, approval_limit: 75000, auto_reorder: true });

  const tgt = (sku, t) => {
    const p = d.products.find((x) => x.sku === sku);
    if (!p) return;
    const diff = t - p.on_hand;
    if (diff) moveStockSeed(sku, diff, 'Adjustment', 'CYCLE-COUNT', 'Physical stock count correction');
  };

  tgt('SKU-1001', 22);
  tgt('SKU-1002', 18);
  tgt('SKU-1003', 14);
  tgt('SKU-1006', 9);
  tgt('SKU-1010', 7);

  d.log.push({ n: ++d.seq, date: d.settings.today, module: 'System', text: 'Live demo started — all automation rules ACTIVE', ref: '' });

  const L = (sku, qty) => {
    const p = d.products.find((x) => x.sku === sku);
    return { sku, qty, price: p.price, reserved: 0, delivered: 0 };
  };

  createSOSeed('C3', [L('SKU-1002', 3), L('SKU-1001', 2)]);
  createSOSeed('C4', [L('SKU-1006', 4), L('SKU-1003', 6)]);
  createSOSeed('C5', [L('SKU-1003', 5)]);
  createSOSeed('C1', [L('SKU-1010', 12), L('SKU-1005', 6)]);

  const po4 = createPOSeed('S4', [{ sku: 'SKU-1006', qty: 20, rate: 6500, received: 0 }]);
  poSubmitSeed(po4.po_id);

  createPOSeed('S3', [
    { sku: 'SKU-1008', qty: 100, rate: 220, received: 0 },
    { sku: 'SKU-1009', qty: 60, rate: 160, received: 0 }
  ]);

  d.settings.auto_confirm = false;
  createSOSeed('C6', [L('SKU-1009', 10), L('SKU-1004', 4)]);

  Object.assign(d.settings, {
    auto_confirm: false,
    auto_deliver: false,
    auto_invoice: false,
    auto_payment: false,
    auto_reorder: false,
    auto_po: false,
    auto_bill: false,
    auto_receive: false
  });

  d.quotes.push({
    qt_id: 'QT-0001',
    n: ++d.seq,
    date: d.settings.today,
    customer_id: 'C1',
    lines: [
      { sku: 'SKU-1004', qty: 10, price: 999 },
      { sku: 'SKU-1005', qty: 5, price: 1499 }
    ],
    valid_until: addDays(d.settings.today, 15),
    status: 'Draft',
    so_id: ''
  });

  return d;
}
