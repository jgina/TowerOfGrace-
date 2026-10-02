import { LOSS_REASONS, PAYMENT_METHODS, TRIP_STATUS } from '../utils/constants';
import { formatCurrency, formatDate, formatDateTime, humanize } from '../utils/format';
import './FarmStatement.css';

const n = (v) => Number(v || 0).toLocaleString('en-NG');
const money = (v) => formatCurrency(v || 0);
const product = (r) => (r.variantLabel ? `${r.productName} — ${r.variantLabel}` : r.productName);

function Section({ number, title, children, note }) {
  return (
    <section className="stmt-section">
      <h3>
        <span>{number}</span> {title}
      </h3>
      {children}
      {note && <p className="stmt-note">{note}</p>}
    </section>
  );
}

const Empty = ({ cols, text }) => (
  <tr>
    <td colSpan={cols} className="stmt-empty">
      {text}
    </td>
  </tr>
);

/** Printable farm activity statement (A4). Pure presentation of the /admin/reports/statement payload. */
export default function FarmStatement({ statement: s }) {
  const { period, company, summary, stock } = s;
  // Stock movements are itemised only from the day the stock ledger started recording.
  const ledgerStart = stock.ledgerStartedAt ? new Date(stock.ledgerStartedAt) : null;
  const stockNote = !ledgerStart
    ? 'Itemised stock movements are recorded from the first stock change after this system update; until then opening and closing show the stock on hand.'
    : ledgerStart > new Date(period.start)
    ? `Itemised stock movements are recorded from ${formatDate(ledgerStart)}. Changes before that date are not itemised, so opening stock reflects the balance on that date.`
    : '';
  let section = 0;
  const next = () => {
    section += 1;
    return section;
  };

  return (
    <article className="statement" aria-label={`Farm activity statement ${period.label}`}>
      {/* ---------- Letterhead ---------- */}
      <header className="stmt-head">
        <div className="stmt-brand">
          <img src={company.logo || '/brand/logo.jpg'} alt="Tower of Grace Farms" />
          <div>
            <strong>{company.name}</strong>
            {company.address && <span>{company.address}</span>}
            <span>{[company.phone, company.email].filter(Boolean).join(' · ')}</span>
          </div>
        </div>
        <div className="stmt-title">
          <h2>Farm Activity Statement</h2>
          <dl>
            <div>
              <dt>Statement No.</dt>
              <dd>{period.statementNumber}</dd>
            </div>
            <div>
              <dt>Period</dt>
              <dd>{period.label}</dd>
            </div>
            <div>
              <dt>Covering</dt>
              <dd>
                {formatDate(period.start)} – {formatDate(period.end)}
              </dd>
            </div>
            <div>
              <dt>Generated</dt>
              <dd>
                {formatDateTime(s.generatedAt)} by {s.generatedBy}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      {/* ---------- Summary ---------- */}
      <section className="stmt-summary">
        <div className="stmt-summary__main">
          <span>Total revenue</span>
          <strong>{money(summary.totalRevenue)}</strong>
          <small>
            Online {money(summary.onlineRevenue)} · Market {money(summary.marketRevenue)}
          </small>
        </div>
        <dl className="stmt-summary__grid">
          <div>
            <dt>Opening stock</dt>
            <dd>{n(stock.totals.opening)} units</dd>
          </div>
          <div>
            <dt>Closing stock</dt>
            <dd>{n(stock.totals.closing)} units</dd>
          </div>
          <div>
            <dt>Units sold</dt>
            <dd>
              {n(summary.unitsSold)} <small>({n(summary.unitsSoldOnline)} online · {n(summary.unitsSoldMarket)} market)</small>
            </dd>
          </div>
          <div>
            <dt>Paid online orders</dt>
            <dd>{n(summary.paidOrders)}</dd>
          </div>
          <div>
            <dt>Market trips</dt>
            <dd>{n(summary.marketTrips)}</dd>
          </div>
          <div>
            <dt>Birds lost</dt>
            <dd>{n(summary.birdsLost)}</dd>
          </div>
          <div>
            <dt>Egg packs lost</dt>
            <dd>{n(summary.eggsLost)}</dd>
          </div>
          <div>
            <dt>Birds processed</dt>
            <dd>
              {n(summary.birdsProcessed)}
              {summary.meatLost ? <small> ({n(summary.meatLost)} meat spoiled)</small> : null}
            </dd>
          </div>
          <div>
            <dt>Unpaid orders</dt>
            <dd>
              {n(summary.outstandingOrders)} <small>({money(summary.outstandingValue)})</small>
            </dd>
          </div>
          <div>
            <dt>New customers</dt>
            <dd>{n(summary.newCustomers)}</dd>
          </div>
          <div>
            <dt>Bulk requests</dt>
            <dd>{n(summary.bulkRequests)}</dd>
          </div>
        </dl>
      </section>

      {/* ---------- Revenue transactions ---------- */}
      <Section number={next()} title="Revenue Transactions" note="Online orders are listed on the date payment was confirmed; market sales on the trip date.">
        <table className="stmt-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Reference</th>
              <th>Description</th>
              <th>Channel</th>
              <th className="num">Amount</th>
              <th className="num">Balance</th>
            </tr>
          </thead>
          <tbody>
            {s.transactions.length ? (
              s.transactions.map((t) => (
                <tr key={`${t.reference}-${t.date}`}>
                  <td className="nowrap">{formatDate(t.date)}</td>
                  <td className="mono">{t.reference}</td>
                  <td>{t.description}</td>
                  <td className="nowrap">{t.channel === 'MARKET' ? 'Market' : PAYMENT_METHODS[t.channel.replace(/ /g, '_')]?.label || humanize(t.channel)}</td>
                  <td className="num">{money(t.amount)}</td>
                  <td className="num strong">{money(t.balance)}</td>
                </tr>
              ))
            ) : (
              <Empty cols={6} text="No revenue was recorded in this period." />
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Total revenue for the period</td>
              <td className="num">{money(summary.totalRevenue)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </Section>

      {/* ---------- Sales by product ---------- */}
      <Section number={next()} title="Sales by Product">
        <table className="stmt-table">
          <thead>
            <tr>
              <th>Product</th>
              <th className="num">Online units</th>
              <th className="num">Online revenue</th>
              <th className="num">Market units</th>
              <th className="num">Market revenue</th>
              <th className="num">Total units</th>
              <th className="num">Total revenue</th>
            </tr>
          </thead>
          <tbody>
            {s.salesByProduct.length ? (
              s.salesByProduct.map((r) => (
                <tr key={product(r)}>
                  <td>
                    {product(r)}
                    {r.categoryName && <small>{r.categoryName}</small>}
                  </td>
                  <td className="num">{n(r.onlineUnits)}</td>
                  <td className="num">{money(r.onlineRevenue)}</td>
                  <td className="num">{n(r.marketUnits)}</td>
                  <td className="num">{money(r.marketRevenue)}</td>
                  <td className="num strong">{n(r.totalUnits)}</td>
                  <td className="num strong">{money(r.totalRevenue)}</td>
                </tr>
              ))
            ) : (
              <Empty cols={7} text="No sales in this period." />
            )}
          </tbody>
        </table>
      </Section>

      {/* ---------- Stock movement ---------- */}
      <Section
        number={next()}
        title="Stock Movement"
        note={`Opening + added ± processed − online sales − taken to market + returned from market − losses = closing. "Added" covers opening stock, restocks and manual corrections; "Processed" is live birds taken for meat processing (−) and the prepared meat produced (+).${
          stockNote ? ` ${stockNote}` : ''
        }`}
      >
        <table className="stmt-table stmt-table--stock">
          <thead>
            <tr>
              <th>Product</th>
              <th className="num">Opening</th>
              <th className="num">Added</th>
              <th className="num">Processed</th>
              <th className="num">Online sales</th>
              <th className="num">To market</th>
              <th className="num">Returned</th>
              <th className="num">Losses</th>
              <th className="num">Closing</th>
            </tr>
          </thead>
          <tbody>
            {stock.rows.length ? (
              stock.rows.map((r) => (
                <tr key={product(r) + (r.categoryName || '')}>
                  <td>
                    {product(r)}
                    {r.categoryName && <small>{r.categoryName}</small>}
                  </td>
                  <td className="num">{n(r.opening)}</td>
                  <td className="num">{r.added ? `+${n(r.added)}` : '–'}</td>
                  <td className="num">{r.processing ? `${r.processing > 0 ? '+' : '−'}${n(Math.abs(r.processing))}` : '–'}</td>
                  <td className="num">{r.onlineSales ? `−${n(r.onlineSales)}` : '–'}</td>
                  <td className="num">{r.marketOut ? `−${n(r.marketOut)}` : '–'}</td>
                  <td className="num">{r.marketReturn ? `+${n(r.marketReturn)}` : '–'}</td>
                  <td className="num">{r.losses ? `−${n(r.losses)}` : '–'}</td>
                  <td className="num strong">{n(r.closing)}</td>
                </tr>
              ))
            ) : (
              <Empty cols={9} text="No stock on record for this period." />
            )}
          </tbody>
          <tfoot>
            <tr>
              <td>Totals</td>
              <td className="num">{n(stock.totals.opening)}</td>
              <td className="num">+{n(stock.totals.added)}</td>
              <td className="num">{stock.totals.processing ? `${stock.totals.processing > 0 ? '+' : '−'}${n(Math.abs(stock.totals.processing))}` : '–'}</td>
              <td className="num">−{n(stock.totals.onlineSales)}</td>
              <td className="num">−{n(stock.totals.marketOut)}</td>
              <td className="num">+{n(stock.totals.marketReturn)}</td>
              <td className="num">−{n(stock.totals.losses)}</td>
              <td className="num">{n(stock.totals.closing)}</td>
            </tr>
          </tfoot>
        </table>
      </Section>

      {/* ---------- Losses ---------- */}
      <Section number={next()} title="Mortality & Losses">
        <table className="stmt-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Reason</th>
              <th className="num">Qty</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {s.losses.length ? (
              s.losses.map((l, i) => (
                <tr key={i}>
                  <td className="nowrap">{formatDate(l.date)}</td>
                  <td>{product(l)}</td>
                  <td>{LOSS_REASONS[l.reason]?.label || humanize(l.reason)}</td>
                  <td className="num">{n(l.quantity)}</td>
                  <td className="muted">{l.notes || '—'}</td>
                </tr>
              ))
            ) : (
              <Empty cols={5} text="No losses were recorded in this period." />
            )}
          </tbody>
          {s.lossByReason.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3}>{s.lossByReason.map((r) => `${LOSS_REASONS[r.reason]?.label.split(' (')[0] || r.reason}: ${n(r.units)}`).join('  ·  ')}</td>
                <td className="num">{n(summary.birdsLost + summary.eggsLost + (summary.meatLost || 0))}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </Section>

      {/* ---------- Market trips ---------- */}
      <Section number={next()} title="Market Trips">
        <table className="stmt-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Trip</th>
              <th>Market</th>
              <th>Status</th>
              <th className="num">Out</th>
              <th className="num">Sold</th>
              <th className="num">Returned</th>
              <th className="num">Lost</th>
              <th className="num">Sales</th>
            </tr>
          </thead>
          <tbody>
            {s.marketTrips.length ? (
              s.marketTrips.map((t) => (
                <tr key={t.tripNumber}>
                  <td className="nowrap">{formatDate(t.date)}</td>
                  <td className="mono">{t.tripNumber}</td>
                  <td>{t.market}</td>
                  <td>{TRIP_STATUS[t.status]?.label}</td>
                  <td className="num">{n(t.out)}</td>
                  <td className="num">{t.status === 'CLOSED' ? n(t.sold) : '–'}</td>
                  <td className="num">{t.status === 'OUT' ? '–' : n(t.returned)}</td>
                  <td className="num">{t.status === 'CLOSED' ? n(t.lost) : '–'}</td>
                  <td className="num">{t.status === 'CLOSED' ? money(t.sales) : '–'}</td>
                </tr>
              ))
            ) : (
              <Empty cols={9} text="No market trips in this period." />
            )}
          </tbody>
        </table>
      </Section>

      {/* ---------- Meat processing ---------- */}
      <Section
        number={next()}
        title="Meat Processing"
        note="Live birds processed into prepared meat. Yield is dressed weight as a share of live weight, where both were recorded."
      >
        <table className="stmt-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Run</th>
              <th>Birds from</th>
              <th className="num">Birds</th>
              <th className="num">Condemned</th>
              <th>Meat produced</th>
              <th className="num">Dressed kg</th>
              <th className="num">Yield</th>
            </tr>
          </thead>
          <tbody>
            {s.processing?.runs?.length ? (
              s.processing.runs.map((r) => (
                <tr key={r.runNumber}>
                  <td className="nowrap">{formatDate(r.date)}</td>
                  <td className="mono">{r.runNumber}</td>
                  <td>{r.source}</td>
                  <td className="num">{n(r.birdsIn)}</td>
                  <td className="num">{r.condemned ? n(r.condemned) : '–'}</td>
                  <td>{r.products}</td>
                  <td className="num">{r.dressedKg ? n(r.dressedKg) : '–'}</td>
                  <td className="num">{r.yieldPct ? `${r.yieldPct}%` : '–'}</td>
                </tr>
              ))
            ) : (
              <Empty cols={8} text="No meat processing in this period." />
            )}
          </tbody>
          {s.processing?.runs?.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3}>
                  {n(s.processing.totals.runs)} run{s.processing.totals.runs === 1 ? '' : 's'}
                  {s.processing.totals.processingCost ? ` · processing cost ${money(s.processing.totals.processingCost)}` : ''}
                </td>
                <td className="num">{n(s.processing.totals.birdsIn)}</td>
                <td className="num">{n(s.processing.totals.condemned)}</td>
                <td>{n(s.processing.totals.unitsOut)} units</td>
                <td className="num">{s.processing.totals.dressedKg ? n(s.processing.totals.dressedKg) : '–'}</td>
                <td className="num">{s.processing.totals.yieldPct ? `${s.processing.totals.yieldPct}%` : '–'}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </Section>

      {/* ---------- Orders ---------- */}
      <Section number={next()} title="Online Orders Placed">
        <div className="stmt-two">
          <table className="stmt-table">
            <thead>
              <tr>
                <th>Order status</th>
                <th className="num">Orders</th>
                <th className="num">Value</th>
              </tr>
            </thead>
            <tbody>
              {s.ordersByStatus.length ? (
                s.ordersByStatus.map((r) => (
                  <tr key={r.key}>
                    <td>{humanize(r.key)}</td>
                    <td className="num">{n(r.count)}</td>
                    <td className="num">{money(r.value)}</td>
                  </tr>
                ))
              ) : (
                <Empty cols={3} text="No orders placed." />
              )}
            </tbody>
          </table>
          <table className="stmt-table">
            <thead>
              <tr>
                <th>Payment method</th>
                <th className="num">Orders</th>
                <th className="num">Value</th>
              </tr>
            </thead>
            <tbody>
              {s.ordersByPayment.length ? (
                s.ordersByPayment.map((r) => (
                  <tr key={r.key}>
                    <td>{PAYMENT_METHODS[r.key]?.label || humanize(r.key)}</td>
                    <td className="num">{n(r.count)}</td>
                    <td className="num">{money(r.value)}</td>
                  </tr>
                ))
              ) : (
                <Empty cols={3} text="No orders placed." />
              )}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ---------- Monthly (annual only) ---------- */}
      {s.monthly && (
        <Section number={next()} title="Month-by-Month Summary">
          <table className="stmt-table">
            <thead>
              <tr>
                <th>Month</th>
                <th className="num">Orders</th>
                <th className="num">Units sold</th>
                <th className="num">Losses</th>
                <th className="num">Online revenue</th>
                <th className="num">Market revenue</th>
                <th className="num">Total revenue</th>
              </tr>
            </thead>
            <tbody>
              {s.monthly.map((m) => (
                <tr key={m.month}>
                  <td>{m.month}</td>
                  <td className="num">{n(m.orders)}</td>
                  <td className="num">{n(m.unitsSold)}</td>
                  <td className="num">{n(m.losses)}</td>
                  <td className="num">{money(m.online)}</td>
                  <td className="num">{money(m.market)}</td>
                  <td className="num strong">{money(m.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Year total</td>
                <td className="num">{n(s.monthly.reduce((t, m) => t + m.orders, 0))}</td>
                <td className="num">{n(summary.unitsSold)}</td>
                <td className="num">{n(summary.birdsLost + summary.eggsLost)}</td>
                <td className="num">{money(summary.onlineRevenue)}</td>
                <td className="num">{money(summary.marketRevenue)}</td>
                <td className="num">{money(summary.totalRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        </Section>
      )}

      {/* ---------- Declaration ---------- */}
      <footer className="stmt-foot">
        <p>
          This statement was generated from the records of {company.name} for the period {period.label}. Revenue includes online orders with
          confirmed payment and closed market trips. Amounts are in Nigerian Naira (NGN).
        </p>
        <div className="stmt-sign">
          <div>
            <span />
            <small>Prepared by (name & signature)</small>
          </div>
          <div>
            <span />
            <small>Approved by (name & signature)</small>
          </div>
          <div>
            <span />
            <small>Date</small>
          </div>
          <div className="stmt-stamp">Company stamp</div>
        </div>
      </footer>
    </article>
  );
}
