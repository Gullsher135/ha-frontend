import { useEffect, useState } from "react"; import { Link } from "react-router-dom";
import { api } from "../api.js"; import { rs, num, todayPK, fdate } from "../format.js"; import { useAuth } from "../auth.jsx"; import { Loading, Empty, useToast } from "../components/ui.jsx";
const U = (u, q) => (u === "carton" ? (q === 1 ? "carton" : "cartons") : u === "kg" ? "kg" : "pcs");
export default function Home() {
  const { user, isOwner } = useAuth(); const toast = useToast(); const [date, setDate] = useState(todayPK()); const [d, setD] = useState(null); const [ps, setPs] = useState(null);
  useEffect(() => { api("/parties?category=trade").then(setPs).catch((e) => toast(e.message, "err")); }, []);
  useEffect(() => { setD(null); api("/reports/today?date=" + date).then(setD).catch((e) => toast(e.message, "err")); }, [date]);
  if (!d || !ps) return <Loading />;
  const rec = ps.filter((p) => p.net > 0).sort((a, b) => b.net - a.net), pay = ps.filter((p) => p.net < 0).sort((a, b) => a.net - b.net);
  const h = +new Date().toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Karachi" }), isToday = date === todayPK();
  const List = ({ rows, tone }) => rows.length ? <ul className="plain">{rows.slice(0, 5).map((p) => <li key={p.id}><Link to={"/parties/" + p.id}><span>{p.name}</span><b className={tone}>{rs(Math.abs(p.net))}</b></Link></li>)}</ul> : <p className="muted pad">Nothing here right now.</p>;
  const pct = d.month.budget ? Math.round((d.month.spent / d.month.budget) * 100) : null;
  return <>
    <header className="pagehead"><div><h1>{isToday ? (h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening") + ", " + user.name : "Day summary"}</h1><p>{isToday ? "Today, " : ""}{fdate(date)}</p></div>
      <div className="actions"><input type="date" value={date} max={todayPK()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Choose a day" style={{ width: "auto" }} /><Link className="btn" to="/invoices/new">New invoice</Link></div></header>
    {isOwner && d.pendingInvoices > 0 && <Link to="/invoices?status=pending" className="alert">{d.pendingInvoices} invoice{d.pendingInvoices > 1 ? "s" : ""} waiting for your approval <b>Review</b></Link>}
    {isOwner && d.pendingRates > 0 && <Link to="/rates" className="alert">{d.pendingRates} customer rate{d.pendingRates > 1 ? "s" : ""} waiting for your confirmation <b>Review</b></Link>}
    <section className="duo"><div className="tally gain"><span>Sales</span><strong>{rs(d.sales.goods)}</strong><small>{d.sales.count} invoice{d.sales.count === 1 ? "" : "s"}{d.sales.transport > 0 && ` · plus ${rs(d.sales.transport)} transport`}</small></div>
      <div className="tally owe"><span>Expenses</span><strong>{rs(d.expenses.total)}</strong><small>{d.expenses.count} entr{d.expenses.count === 1 ? "y" : "ies"}</small></div></section>
    <section className="duo"><div className="tally gain"><span>Money to receive</span><strong>{rs(d.receivable)}</strong><small>Total owed to you</small></div>
      <div className="tally owe"><span>Money to pay</span><strong>{rs(d.payable)}</strong><small>Total you owe</small></div></section>
    <section className="duo"><div className="panel"><h3>Goods coming in</h3>{d.goodsIn.purchases.length === 0 ? <p className="muted pad">No purchases on this day.</p> : <><ul className="plain">{d.goodsIn.purchases.map((p) => <li key={p.id}><div className="gl"><b>{p.supplier}</b><small>{p.lines.map((l) => `${l.name} ${num(l.kg)} kg`).join(", ")}</small></div></li>)}</ul><p className="gtot">Total {num(d.goodsIn.kg)} kg</p></>}</div>
      <div className="panel"><h3>Goods going out</h3>{d.goodsOut.items.length === 0 ? <p className="muted pad">No invoices on this day.</p> : <><ul className="plain">{d.goodsOut.items.map((i) => <li key={i.name + i.unit}><div className="gl row"><span>{i.name}</span><b>{num(i.qty)} {U(i.unit, i.qty)}</b></div></li>)}</ul><p className="gtot">{d.goodsOut.invoices} invoice{d.goodsOut.invoices === 1 ? "" : "s"}</p></>}</div></section>
    <section className="panel" style={{ marginBottom: 14 }}><h3>Money in and out</h3><div className="mini"><div><small>Received</small><b className="gain">{rs(d.moneyIn)}</b></div><div><small>Paid out</small><b className="owe">{rs(d.moneyOut)}</b></div>
      <div><small>This month's expenses</small><b>{rs(d.month.spent)}</b>{d.month.budget && <small>of {rs(d.month.budget)} budget</small>}</div></div>
      {pct != null && <div className="bar" aria-label={`${pct}% of budget used`}><i className={pct > 100 ? "over" : pct > 85 ? "warn" : ""} style={{ width: Math.min(pct, 100) + "%" }} /></div>}</section>
    <section className="duo"><div className="panel"><h3>Owe you the most</h3><List rows={rec} tone="gain" /></div><div className="panel"><h3>You owe the most</h3><List rows={pay} tone="owe" /></div></section>
    {ps.length === 0 && <Empty title="No customers or suppliers yet" text="Add your first party to start their ledger." action={<Link className="btn" to="/parties">Add a party</Link>} />}
  </>;
}
