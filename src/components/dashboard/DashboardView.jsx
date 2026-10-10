import React from 'react';
import { useIMS } from '../../context/IMSContext';
import StatCard from '../common/StatCard';
import Badge from '../common/Badge';
import Icon from '../common/Icon';
import { fmtD, inr, num, sum, diffDays, esc } from '../../utils/helpers';

export default function DashboardView() {
  const { db, D, P, projected, stockStatus, incoming, demand, navigate, setOrderModal } = useIMS();

  const mk = D.slice(0, 7);
  const PS = db.products;
  const units = sum(PS, (p) => p.on_hand);
  const val = sum(PS, (p) => p.on_hand * p.cost);
  const low = PS.filter((p) => projected(p.sku) <= p.reorder_level).length;

  const POEN = ['Pending Approval', 'Approved', 'Partially Received'];
  const SOACT = ['Confirmed', 'Ready', 'Partially Delivered', 'On Hold'];

  const oPO = db.pos.filter((o) => POEN.includes(o.status));
  const oSO = db.sos.filter((s) => SOACT.includes(s.status));
  const invM = db.invs.filter((i) => i.date.startsWith(mk));
  const bilM = db.bills.filter((b) => b.date.startsWith(mk));

  const sales = sum(invM, (i) => i.subtotal);
  const gp = sales - sum(invM, (i) => i.cogs);
  const rec = sum(db.invs, (i) => i.amount - i.paid);
  const pay = sum(db.bills, (b) => b.amount - b.paid);
  const res = sum(PS, (p) => p.reserved);

  // Weekly bucket calculation for Bar Chart
  const wk = [...Array(8)].map((_, i) => 7 - i);
  const labels = wk.map((w) => (w === 0 ? 'This wk' : w + 'w ago'));

  const bucket = (arr, k) =>
    wk.map((w) =>
      sum(
        arr.filter((x) => Math.floor(diffDays(D, x.date) / 7) === w),
        (x) => x[k]
      )
    );

  const salesWeekly = bucket(db.invs, 'subtotal');
  const purWeekly = bucket(db.bills, 'subtotal');

  // SVG Bar Chart Math
  const W = 640;
  const H = 240;
  const L = 54;
  const B = 30;
  const T = 12;

  const maxVal0 = Math.max(1, ...labels.map((_, i) => Math.max(salesWeekly[i], purWeekly[i])));
  const pow = Math.pow(10, Math.floor(Math.log10(maxVal0)));
  const mx = Math.ceil((maxVal0 / pow) * 2) / 2 * pow || 1;

  const iw = W - L - 10;
  const ih = H - B - T;
  const gw = iw / labels.length;
  const bw = Math.min(24, (gw * 0.7) / 2);

  const fmtAxis = (v) => (v >= 1e5 ? (v / 1e5).toFixed(1) + 'L' : Math.round(v / 1e3) + 'k');

  // Category Donut Math
  const cats = {};
  PS.forEach((p) => {
    cats[p.category] = (cats[p.category] || 0) + p.on_hand * p.cost;
  });
  const catItems = Object.keys(cats).map((k, i) => ({
    label: k,
    value: cats[k],
    color: ['#2563eb', '#7c3aed', '#0d9488', '#f59e0b', '#dc2626'][i % 5]
  }));

  const totDonut = sum(catItems, (i) => i.value) || 1;
  const R_donut = 60;
  const C_donut = 2 * Math.PI * R_donut;
  let offset = 0;

  return (
    <div>
      <div className="ph">
        <div>
          <h2>Integrated Dashboard</h2>
          <p>
            Inventory ⇄ Purchase ⇄ Sales • System date <b>{fmtD(D)}</b>
          </p>
        </div>
        <div className="acts noprint">
          <button className="btn" onClick={() => setOrderModal({ open: true, type: 'SO' })}>
            <Icon name="plus" size={15} /> New Sale
          </button>
          <button className="btn pu" onClick={() => setOrderModal({ open: true, type: 'PO' })}>
            <Icon name="plus" size={15} /> New Purchase
          </button>
          <button className="btn out" onClick={() => setOrderModal({ open: true, type: 'QT' })}>
            <Icon name="file" size={15} /> New Quotation
          </button>
        </div>
      </div>

      <div className="grid g4">
        <StatCard
          label="Stock Value"
          value={inr(val)}
          subtext={`${num(units)} units • ${res} reserved`}
          iconName="box"
          colorClass="purple"
          onClick={() => navigate('inventory-stock')}
        />
        <StatCard
          label="Reorder Alerts"
          value={low}
          subtext="Items at / below reorder level"
          iconName="bell"
          colorClass={low ? 'amber' : 'green'}
          onClick={() => navigate('inventory-stock')}
        />
        <StatCard
          label="Open Purchase Orders"
          value={oPO.length}
          subtext={inr(sum(oPO, (o) => sum(o.lines, (l) => l.qty * l.rate) * 1.18)) + ' on order'}
          iconName="truck"
          colorClass="amber"
          onClick={() => navigate('purchase-orders')}
        />
        <StatCard
          label="Open Sales Orders"
          value={oSO.length}
          subtext={inr(sum(oSO, (s) => sum(s.lines, (l) => l.qty * l.price) * 1.18)) + ' pipeline'}
          iconName="cart"
          colorClass="blue"
          onClick={() => navigate('sales-orders')}
        />

        <StatCard
          label="Sales (this month)"
          value={inr(sales)}
          subtext={`Gross profit ${inr(gp)}`}
          iconName="chart"
          colorClass="green"
          onClick={() => navigate('sales-invoices')}
        />
        <StatCard
          label="Purchases (this month)"
          value={inr(sum(bilM, (b) => b.subtotal))}
          subtext={`${bilM.length} bills`}
          iconName="file"
          colorClass="teal"
          onClick={() => navigate('purchase-bills')}
        />
        <StatCard
          label="Receivables"
          value={inr(rec)}
          subtext={`${db.invs.filter((i) => i.status !== 'Paid' && i.due_date < D).length} overdue invoices`}
          iconName="card"
          colorClass="red"
          onClick={() => navigate('sales-invoices')}
        />
        <StatCard
          label="Payables"
          value={inr(pay)}
          subtext={`${db.bills.filter((b) => b.status !== 'Paid' && b.due_date < D).length} overdue bills`}
          iconName="card"
          colorClass="amber"
          onClick={() => navigate('purchase-bills')}
        />
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <h3>🔄 Live Data Flow — how Purchase, Inventory & Sales are connected</h3>

        <div className="lanetag" style={{ color: 'var(--amber)' }}>
          ① Purchase flow
        </div>
        <div className="lane">
          <div className="step clk pu" onClick={() => navigate('inventory-stock')}>
            <b>Reorder Alerts</b>
            <div className="v">{low}</div>
            <small>low-stock detection</small>
          </div>
          <div className="step clk pu" onClick={() => navigate('purchase-requests')}>
            <b>Purchase Requests</b>
            <div className="v">{db.prs.filter((r) => r.status === 'Open').length} open</div>
            <small>{db.prs.length} total</small>
          </div>
          <div className="step clk pu" onClick={() => navigate('purchase-orders')}>
            <b>Purchase Orders</b>
            <div className="v">{oPO.length} open</div>
            <small>{db.pos.filter((o) => o.status === 'Pending Approval').length} awaiting approval</small>
          </div>
          <div className="step clk pu" onClick={() => navigate('purchase-grn')}>
            <b>Goods Receipts</b>
            <div className="v">{db.grns.length}</div>
            <small>stock IN</small>
          </div>
          <div className="step clk pu" onClick={() => navigate('purchase-bills')}>
            <b>Supplier Bills</b>
            <div className="v">{inr(pay)}</div>
            <small>payable</small>
          </div>
        </div>

        <div className="conn">
          <span>⬇ GRN adds stock</span>
          <span>⬆ Low / short stock triggers PR → PO</span>
          <span>⬇ Stock reserved & delivered to customers</span>
        </div>

        <div className="invbox" onClick={() => navigate('inventory-stock')}>
          <div className="t">📦 INVENTORY CORE</div>
          <div>
            <b>{num(units)}</b>
            <small>units on hand</small>
          </div>
          <div>
            <b>{inr(val)}</b>
            <small>stock value</small>
          </div>
          <div>
            <b>{res}</b>
            <small>reserved for orders</small>
          </div>
          <div>
            <b>{num(sum(PS, (p) => incoming(p.sku)))}</b>
            <small>incoming (PR/PO)</small>
          </div>
          <div>
            <b>{num(sum(PS, (p) => demand(p.sku)))}</b>
            <small>open demand</small>
          </div>
        </div>

        <div className="conn">
          <span>⬆ Sales order reserves stock</span>
          <span>⬇ Delivery deducts stock</span>
          <span>Invoice → Payment</span>
        </div>

        <div className="lanetag" style={{ color: 'var(--primary)' }}>
          ② Sales flow
        </div>
        <div className="lane">
          <div className="step clk sl" onClick={() => navigate('sales-orders')}>
            <b>Sales Orders</b>
            <div className="v">{oSO.length} open</div>
            <small>{db.sos.filter((s) => s.status === 'On Hold').length} on hold</small>
          </div>
          <div className="step clk sl" onClick={() => navigate('inventory-stock')}>
            <b>Reserved Stock</b>
            <div className="v">{res} units</div>
            <small>allocated to orders</small>
          </div>
          <div className="step clk sl" onClick={() => navigate('sales-deliveries')}>
            <b>Deliveries</b>
            <div className="v">{db.dns.length}</div>
            <small>{db.dns.filter((d) => !d.invoiced).length} to invoice</small>
          </div>
          <div className="step clk sl" onClick={() => navigate('sales-invoices')}>
            <b>Invoices</b>
            <div className="v">{db.invs.length}</div>
            <small>{inr(rec)} receivable</small>
          </div>
          <div className="step clk sl" onClick={() => navigate('sales-invoices')}>
            <b>Collected</b>
            <div className="v">
              {inr(
                sum(
                  db.payments.filter((p) => p.type === 'Received' && p.date.startsWith(mk)),
                  (p) => p.amount
                )
              )}
            </div>
            <small>this month</small>
          </div>
        </div>
      </div>

      <div className="grid g21">
        {/* Weekly Bar Chart */}
        <div className="card">
          <h3>Sales vs Purchases (weekly)</h3>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
            {[0, 1, 2, 3, 4].map((i) => {
              const y = T + ih - (ih * i) / 4;
              return (
                <g key={i}>
                  <line x1={L} x2={W - 6} y1={y} y2={y} stroke="var(--border)" />
                  <text x={L - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
                    {fmtAxis((mx * i) / 4)}
                  </text>
                </g>
              );
            })}

            {labels.map((lb, i) => {
              const cx = L + gw * i + gw / 2;
              const hSales = (ih * salesWeekly[i]) / mx;
              const xSales = cx - bw;

              const hPur = (ih * purWeekly[i]) / mx;
              const xPur = cx;

              return (
                <g key={i}>
                  <text x={cx} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--muted)">
                    {lb}
                  </text>

                  <rect x={xSales} y={T + ih - hSales} width={bw - 2} height={hSales} fill="#2563eb" rx="3">
                    <title>Sales: {inr(salesWeekly[i])}</title>
                  </rect>

                  <rect x={xPur} y={T + ih - hPur} width={bw - 2} height={hPur} fill="#f59e0b" rx="3">
                    <title>Purchases: {inr(purWeekly[i])}</title>
                  </rect>
                </g>
              );
            })}
          </svg>
          <div className="legend">
            <span>
              <i style={{ background: '#2563eb' }} /> Sales
            </span>
            <span>
              <i style={{ background: '#f59e0b' }} /> Purchases
            </span>
          </div>
        </div>

        {/* Category Donut */}
        <div className="card">
          <h3>Stock Value by Category</h3>
          <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
            <svg width="160" height="160" viewBox="0 0 160 160">
              <g transform="rotate(-90 80 80)">
                {catItems.map((item, idx) => {
                  const strokeLen = (C_donut * item.value) / totDonut;
                  const circleElem = (
                    <circle
                      key={idx}
                      r={R_donut}
                      cx="80"
                      cy="80"
                      fill="none"
                      stroke={item.color}
                      strokeWidth="22"
                      strokeDasharray={`${strokeLen} ${C_donut - strokeLen}`}
                      strokeDashoffset={-offset}
                    >
                      <title>
                        {item.label}: {inr(item.value)}
                      </title>
                    </circle>
                  );
                  offset += strokeLen;
                  return circleElem;
                })}
              </g>
              <text x="80" y="82" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--text)">
                {inr(val)}
              </text>
            </svg>

            <div className="legend" style={{ flexDirection: 'column', gap: '6px' }}>
              {catItems.map((item, idx) => (
                <span key={idx}>
                  <i style={{ background: item.color }} /> {item.label} — <b>{inr(item.value)}</b>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid g2">
        {/* Recent Activity Feed */}
        <div className="card feed">
          <h3>🕘 Recent Activity</h3>
          {[...db.log]
            .reverse()
            .slice(0, 9)
            .map((l, i) => (
              <div key={i} className="row">
                <Badge text={l.module} />
                <div style={{ flex: 1 }}>
                  {esc(l.text)}
                  <div className="muted sm">{fmtD(l.date)}</div>
                </div>
              </div>
            ))}
        </div>

        {/* Low Stock / Action Required */}
        <div className="card">
          <h3>Low Stock / Needs Action</h3>
          {PS.filter((p) => stockStatus(p) !== 'Healthy').map((p) => (
            <div key={p.sku} className="row">
              <div>
                <b>{p.name}</b>
                <div className="muted sm">
                  On hand {p.on_hand} • reserved {p.reserved} • incoming {incoming(p.sku)} • level {p.reorder_level}
                </div>
              </div>
              <Badge text={stockStatus(p)} />
            </div>
          )) || <div className="muted">All items healthy 🎉</div>}
        </div>
      </div>
    </div>
  );
}
