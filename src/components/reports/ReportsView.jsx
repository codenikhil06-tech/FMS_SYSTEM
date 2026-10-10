import React, { useState, useEffect } from 'react';
import { useIMS } from '../../context/IMSContext';
import Table from '../common/Table';
import Icon from '../common/Icon';
import { fmtD, inr, addDays, diffDays, exportCSV, esc } from '../../utils/helpers';

const REPS = {
  sales: 'Sales Report',
  purchase: 'Purchase Report',
  stock: 'Stock Valuation',
  profit: 'Profit by Month',
  products: 'Product Performance',
  recaging: 'Receivables Ageing',
  payaging: 'Payables Ageing'
};

export default function ReportsView({ subType = 'sales' }) {
  const { db, D, P, SUP, CUS, navigate } = useIMS();

  const [repType, setRepType] = useState(subType);
  const [fromDate, setFromDate] = useState(addDays(D, -30));
  const [toDate, setToDate] = useState(D);

  useEffect(() => {
    if (subType && REPS[subType]) {
      setRepType(subType);
    }
  }, [subType]);

  const inR = (d) => d >= fromDate && d <= toDate;

  const getAging = (kind) => {
    const arr = kind === 'inv' ? db.invs : db.bills;
    const key = kind === 'inv' ? 'customer_id' : 'supplier_id';
    const m = {};
    arr
      .filter((x) => x.status !== 'Paid')
      .forEach((x) => {
        const k = x[key];
        const o = diffDays(D, x.due_date);
        const b = o <= 0 ? 0 : o <= 15 ? 1 : o <= 30 ? 2 : 3;
        m[k] = m[k] || [0, 0, 0, 0, k];
        m[k][b] += x.amount - x.paid;
      });
    return Object.values(m);
  };

  const buildReport = () => {
    if (repType === 'sales') {
      return {
        cols: [
          { h: 'Invoice', f: (i) => i.inv_id },
          { h: 'Date', f: (i) => fmtD(i.date) },
          { h: 'Customer', f: (i) => CUS(i.customer_id).name },
          { h: 'Subtotal', cls: 'num', f: (i) => inr(i.subtotal) },
          { h: 'GST', cls: 'num', f: (i) => inr(i.tax) },
          { h: 'Total', cls: 'num', f: (i) => inr(i.amount) },
          { h: 'COGS', cls: 'num', f: (i) => inr(i.cogs) },
          { h: 'Profit', cls: 'num', f: (i) => inr(i.subtotal - i.cogs) },
          { h: 'Status', f: (i) => i.status }
        ],
        rows: db.invs.filter((i) => inR(i.date))
      };
    }

    if (repType === 'purchase') {
      return {
        cols: [
          { h: 'Bill', f: (b) => b.bill_id },
          { h: 'Date', f: (b) => fmtD(b.date) },
          { h: 'Supplier', f: (b) => SUP(b.supplier_id).name },
          { h: 'PO', f: (b) => b.po_id },
          { h: 'Subtotal', cls: 'num', f: (b) => inr(b.subtotal) },
          { h: 'Total', cls: 'num', f: (b) => inr(b.amount) },
          { h: 'Paid', cls: 'num', f: (b) => inr(b.paid) },
          { h: 'Status', f: (b) => b.status }
        ],
        rows: db.bills.filter((b) => inR(b.date))
      };
    }

    if (repType === 'stock') {
      return {
        cols: [
          { h: 'SKU', f: (p) => p.sku },
          { h: 'Product', f: (p) => p.name },
          { h: 'Category', f: (p) => p.category },
          { h: 'On Hand', cls: 'num', f: (p) => p.on_hand },
          { h: 'Avg Cost', cls: 'num', f: (p) => inr(p.cost) },
          { h: 'Stock Value', cls: 'num', f: (p) => inr(p.on_hand * p.cost) },
          { h: 'Retail Value', cls: 'num', f: (p) => inr(p.on_hand * p.price) }
        ],
        rows: db.products
      };
    }

    if (repType === 'profit') {
      const m = {};
      db.invs.forEach((i) => {
        const k = i.date.slice(0, 7);
        m[k] = m[k] || { k, rev: 0, cogs: 0, n: 0 };
        m[k].rev += i.subtotal;
        m[k].cogs += i.cogs;
        m[k].n++;
      });
      return {
        cols: [
          { h: 'Month', f: (x) => x.k },
          { h: 'Invoices', cls: 'num', f: (x) => x.n },
          { h: 'Revenue', cls: 'num', f: (x) => inr(x.rev) },
          { h: 'COGS', cls: 'num', f: (x) => inr(x.cogs) },
          { h: 'Gross Profit', cls: 'num', f: (x) => inr(x.rev - x.cogs) },
          { h: 'Margin', cls: 'num', f: (x) => (x.rev ? Math.round(((x.rev - x.cogs) / x.rev) * 100) : 0) + '%' }
        ],
        rows: Object.values(m).sort((a, b) => b.k.localeCompare(a.k))
      };
    }

    if (repType === 'products') {
      const m = {};
      db.dns
        .filter((d) => inR(d.date))
        .forEach((d) =>
          d.lines.forEach((l) => {
            m[l.sku] = m[l.sku] || { sku: l.sku, q: 0, rev: 0, cost: 0 };
            m[l.sku].q += l.qty;
            m[l.sku].rev += l.qty * l.price;
            m[l.sku].cost += l.qty * l.cost;
          })
        );
      return {
        cols: [
          { h: 'SKU', f: (x) => x.sku },
          { h: 'Product', f: (x) => P(x.sku)?.name || x.sku },
          { h: 'Qty Sold', cls: 'num', f: (x) => x.q },
          { h: 'Revenue', cls: 'num', f: (x) => inr(x.rev) },
          { h: 'Profit', cls: 'num', f: (x) => inr(x.rev - x.cost) }
        ],
        rows: Object.values(m).sort((a, b) => b.rev - a.rev)
      };
    }

    const k = repType === 'recaging' ? 'inv' : 'bill';
    return {
      cols: [
        { h: k === 'inv' ? 'Customer' : 'Supplier', f: (x) => (k === 'inv' ? CUS(x[4]) : SUP(x[4])).name },
        { h: 'Current', cls: 'num', f: (x) => inr(x[0]) },
        { h: '1–15 days', cls: 'num', f: (x) => inr(x[1]) },
        { h: '16–30 days', cls: 'num', f: (x) => inr(x[2]) },
        { h: '30+ days', cls: 'num', f: (x) => inr(x[3]) },
        { h: 'Total', cls: 'num', f: (x) => <b>{inr(x[0] + x[1] + x[2] + x[3])}</b> }
      ],
      rows: getAging(k)
    };
  };

  const reportData = buildReport();
  const showDateRange = ['sales', 'purchase', 'products'].includes(repType);

  const handleExportCSV = () => {
    exportCSV(repType + '-report-' + D, reportData.cols, reportData.rows);
  };

  return (
    <div>
      <div className="ph">
        <div>
          <h2>Reports</h2>
          <p>Sales, purchase, stock and finance reports</p>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: '12px' }}>
        {Object.keys(REPS).map((k) => (
          <div
            key={k}
            className="card"
            style={{
              cursor: 'pointer',
              padding: '12px',
              ...(k === repType ? { borderColor: 'var(--primary)', background: 'var(--primary-l)' } : {})
            }}
            onClick={() => {
              setRepType(k);
              navigate(`reports/${k}`);
            }}
          >
            <b>{REPS[k]}</b>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>
          {REPS[repType]}
          <span className="sp" />
          <button className="btn out" onClick={handleExportCSV}>
            <Icon name="download" size={15} /> CSV
          </button>
        </h3>

        {showDateRange && (
          <div className="filters">
            <div className="f">
              <label>From</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>

            <div className="f">
              <label>To</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
        )}

        <Table cols={reportData.cols} rows={reportData.rows} pageSize={12} minWidth={800} />
      </div>
    </div>
  );
}
