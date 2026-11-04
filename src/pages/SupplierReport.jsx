import { useEffect, useState } from "react"; import { Link } from "react-router-dom"; import { Printer, Share2 } from "lucide-react";
import { api } from "../api.js"; import { rs, num, fdate, todayPK } from "../format.js"; import { Empty, Loading, useToast } from "../components/ui.jsx";
export default function SupplierReport() {
  const toast = useToast(); const [date, setDate] = useState(todayPK()); const [d, setD] = useState(null);
  useEffect(() => { setD(null); api("/reports/suppliers?date=" + date).then(setD).catch((e) => toast(e.message, "err")); }, [date]);
  if (!d) return <Loading />;
  const text = () => [`Supplier balances as on ${fdate(d.date)}`, "", d.weOwe.length ? "We owe:" : "", ...d.weOwe.map((x) => `${x.name}: Rs ${num(x.amount)}`), d.weOwe.length ? `Total we owe: Rs ${num(d.totals.weOwe)}` : "", d.theyOwe.length ? "\nHolding our money / owe us:" : "", ...d.theyOwe.map((x) => `${x.name}: Rs ${num(x.amount)}`), d.theyOwe.length ? `Total: Rs ${num(d.totals.theyOwe)}` : ""].filter((x) => x !== "").join("\n");
  const share = async () => { try { if (navigator.share) await navigator.share({ text: text() }); else { await navigator.clipboard.writeText(text()); toast("Copied. Paste it in WhatsApp."); } } catch (x) { if (x.name !== "AbortError") toast("Could not share", "err"); } };
  const none = !d.weOwe.length && !d.theyOwe.length && !d.settled.length;
  const Block = ({ title, sub, rows, tone, total }) => <section className="panel" style={{ marginBottom: 14 }}><h3>{title}</h3><p className="muted" style={{ margin: "0 0 6px" }}>{sub}</p>{rows.length === 0 ? <p className="muted pad">None.</p> : <ul className="plain">{rows.map((x) => <li key={x.id}><Link to={"/parties/" + x.id}><span>{x.name}</span><b className={tone}>{rs(x.amount)}</b></Link></li>)}<li className="tot"><span>Total</span><b className={tone}>{rs(total)}</b></li></ul>}</section>;
  return <>
    <header className="pagehead"><div><h1>Supplier balances</h1><p>As on {fdate(d.date)}. Both directions, every supplier.</p></div>
      <div className="actions np"><input type="date" value={date} max={todayPK()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="As on date" style={{ width: "auto" }} /><button className="btn ghost" onClick={() => window.print()}><Printer size={17} /> Print</button><button className="btn" onClick={share}><Share2 size={17} /> Share</button></div></header>
    {none ? <Empty title="No suppliers yet" text="Add a party and tick Supplier to see balances here." /> : <>
      <Block title="You owe" sub="Money you have to pay suppliers" rows={d.weOwe} tone="owe" total={d.totals.weOwe} />
      <Block title="Hold your money" sub="Suppliers you have paid in advance, so they owe you" rows={d.theyOwe} tone="gain" total={d.totals.theyOwe} />
      {d.settled.length > 0 && <p className="muted">Settled (nothing either way): {d.settled.map((x) => x.name).join(", ")}</p>}</>}
  </>;
}
