import React, { useState } from 'react';
import { useIMS } from '../../context/IMSContext';
import StatCard from '../common/StatCard';
import Table from '../common/Table';
import Icon from '../common/Icon';
import { num, sum, addDays, exportCSV } from '../../utils/helpers';

export default function StockSummaryView() {
  const { db, D, navigate } = useIMS();

  const [q, setQ] = useState('');
  const [fromDate, setFromDate] = useState(addDays(D, -30));
  const [toDate, setToDate] = useState(D);

  const getSummaryRows = () => {
    return db.products
      .filter((p) => !q || (p.name + p.sku).toLowerCase().includes(q.toLowerCase()))
      .map((p) => {
        const r = { p, open: 0, pur: 0, sal: 0, pret: 0, sret: 0, adj: 0 };
        db.ledger
          .filter((l) => l.sku === p.sku && l.date <= toDate)
          .forEach((l) => {
            if (l.date < fromDate || l.type === 'Opening Stock') {
              r.open += l.qty;
              return;
            }
            if (l.type === 'Purchase Receipt') r.pur += l.qty;
            else if (l.type === 'Sales Delivery') r.sal -= l.qty;
            else if (l.type === 'Purchase Return') r.pret -= l.qty;
            else if (l.type === 'Sales Return') r.sret += l.qty;
            else r.adj += l.qty;
          });
        r.close = r.open + r.pur - r.sal - r.pret + r.sret + r.adj;
        return r;
      });
  };

  const rows = getSummaryRows();
  const tot = (k) => sum(rows, (x) => x[k]);

  const columns = [
    {
      h: 'Item',
      f: (r) => (
        <div>
          <b>{r.p.name}</b>
          <div className="muted sm">
            {r.p.sku} • {r.p.category}
          </div>
        </div>
      )
    },
    { h: 'Opening Qty', cls: 'num', f: (r) => r.open },
    { h: 'Purchase Qty', cls: 'num', f: (r) => <span className="pos">+{r.pur}</span> },
    { h: 'Sales Qty', cls: 'num', f: (r) => <span className="neg">−{r.sal}</span> },
    { h: 'Purchase Return', cls: 'num', f: (r) => <span className="neg">−{r.pret}</span> },
    { h: 'Sales Return', cls: 'num', f: (r) => <span className="pos">+{r.sret}</span> },
    { h: 'Adjust', cls: 'num', f: (r) => (r.adj > 0 ? '+' : '') + r.adj },
    { h: 'Closing Qty', cls: 'num', f: (r) => <b>{r.close}</b> },
    {
      h: '',
      f: (r) => (
        <button className="btn xs sec" onClick={() => navigate('inventory-ledger')}>
          Ledger
        </button>
      )
    }
  ];

  const handleExportCSV = () => {
    exportCSV('stock-summary-' + D, columns.slice(0, 8), rows);
  };

  return (
    <div>
      <div className="ph">
        <div>
          <h2>Stock Summary</h2>
          <p>Har item ka ek row: Opening → Purchase → Sales → Returns → Closing (date range ke hisab se)</p>
        </div>
        <div className="acts noprint">
          <button className="btn out" onClick={handleExportCSV}>
            <Icon name="download" size={15} /> CSV
          </button>
        </div>
      </div>

      <div className="grid g4">
        <StatCard label="Opening Qty" value={num(tot('open'))} iconName="box" colorClass="purple" />
        <StatCard label="Purchased" value={num(tot('pur'))} subtext={'Returned ' + num(tot('pret'))} iconName="truck" colorClass="amber" />
        <StatCard label="Sold" value={num(tot('sal'))} subtext={'Returned ' + num(tot('sret'))} iconName="cart" colorClass="blue" />
        <StatCard label="Closing Qty" value={num(tot('close'))} iconName="check" colorClass="green" />
      </div>

      <div className="card">
        <div className="filters">
          <div className="f grow">
            <label>Search</label>
            <input placeholder="Item…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <div className="f">
            <label>From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>

          <div className="f">
            <label>To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>

        <Table cols={columns} rows={rows} pageSize={12} minWidth={1000} />
      </div>
    </div>
  );
}
