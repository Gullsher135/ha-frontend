import { useEffect, useState } from "react"; import { api } from "../api.js"; import { useAuth } from "../auth.jsx"; import { num, rs, todayPK } from "../format.js"; import { Field, Loading, useToast } from "../components/ui.jsx";
const KEYS = [["jumbo_rolls", "Jumbo rolls"], ["cores", "Cores"], ["plastic", "Plastic"], ["finished_cartons", "Finished cartons"], ["other", "Other stock"]];
const when = (s) => new Date(s).toLocaleString("en-GB", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
export default function Stock() {
  const { isOwner } = useAuth(); const toast = useToast(); const [month, setMonth] = useState(todayPK().slice(0, 7)); const [d, setD] = useState(null); const [v, setV] = useState({}); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false);
  const load = () => api("/stock/" + month).then((r) => { setD(r); setV(Object.fromEntries(KEYS.map(([k]) => [k, r.current ? String(r.current.values[k] || "") : ""]))); setNote(""); }).catch((e) => toast(e.message, "err")); useEffect(() => { setD(null); load(); }, [month]);
  if (!d) return <Loading />;
  const locked = !!d.current && !isOwner, total = KEYS.reduce((s, [k]) => s + (Number(v[k]) || 0), 0), changed = d.current && Math.round(total * 100) !== Math.round(d.current.total * 100);
  const save = async (e) => { e.preventDefault(); setBusy(true); try { await api("/stock", { method: "POST", body: { month, note, values: Object.fromEntries(KEYS.map(([k]) => [k, Number(v[k]) || 0])) } }); toast("Stock value saved"); load(); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  return <>
    <header className="pagehead"><div><h1>Stock count</h1><p>At the end of each month, count what is left by hand and enter its value. Profit and loss uses this.</p></div><input type="month" value={month} max={todayPK().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" style={{ width: "auto" }} /></header>
    <section className={"stmt " + (d.current ? "even" : "owe")}><div><span>{d.current ? `Stock left at the end of ${month}` : `Not counted yet for ${month}`}</span><strong>{d.current ? rs(d.current.total) : "—"}</strong>
      <small>{d.previousClosing != null ? `Last month's closing stock was ${rs(d.previousClosing)}` : "No count for last month yet, so profit for this month cannot be worked out fully."}</small></div></section>
    <form className="card2" onSubmit={save} style={{ maxWidth: 560 }}>
      {KEYS.map(([k, l]) => <Field key={k} label={`${l} (Rs)`}><input type="number" step="0.01" min="0" inputMode="decimal" disabled={locked} value={v[k] || ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} placeholder="0" /></Field>)}
      <div className="sum"><div className="net"><span>Total stock value</span><b>{rs(total)}</b></div></div>
      <Field label="Note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder={d.current ? "Why are you changing it?" : ""} /></Field>
      {locked && <p className="note">This month is already counted. Only the owner can change a saved count.</p>}
      <button className="btn" disabled={locked || busy || (d.current && !changed && !note)}>{d.current ? "Save recount" : "Save stock value"}</button>
      {d.current && <p className="muted" style={{ marginBottom: 0 }}>A recount keeps the old value in the history below. Profit and loss uses the latest one.</p>}</form>
    {d.history.length > 0 && <><h3 style={{ margin: "22px 0 10px" }}>History for {month}</h3><ul className="plist">{d.history.map((h, i) => <li key={h.id}><div className="rowflex"><div><b>{i === 0 ? "Current value" : "Earlier value"}</b><small>{when(h.at)} · {h.by}{h.note && " · " + h.note}</small></div><b className="amt">{num(h.total)}</b></div></li>)}</ul></>}
  </>;
}
