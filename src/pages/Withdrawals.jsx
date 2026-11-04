import { useEffect, useState } from "react"; import { Plus, Ban } from "lucide-react";
import { api } from "../api.js"; import { num, rs, fdate, todayPK } from "../format.js"; import { Modal, Field, Empty, Loading, useToast } from "../components/ui.jsx";
const MODES = { cash: "Cash", meezan: "Meezan", easypaisa: "Easy Paisa" };
export default function Withdrawals() {
  const toast = useToast(); const [month, setMonth] = useState(todayPK().slice(0, 7)); const [rows, setRows] = useState(null); const [add, setAdd] = useState(false); const [cx, setCx] = useState(null); const [why, setWhy] = useState("");
  const [f, setF] = useState({ amount: "", mode: "cash", date: todayPK(), note: "" }); const [busy, setBusy] = useState(false); const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const load = () => api(`/withdrawals?from=${month}-01&to=${month}-31`).then(setRows).catch((e) => toast(e.message, "err")); useEffect(() => { setRows(null); load(); }, [month]);
  const save = async (e) => { e.preventDefault(); setBusy(true); try { await api("/withdrawals", { method: "POST", body: { ...f, amount: Number(f.amount) } }); toast("Withdrawal saved"); setAdd(false); setF({ ...f, amount: "", note: "" }); load(); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  const cancel = async () => { try { await api(`/withdrawals/${cx.id}/cancel`, { method: "POST", body: { reason: why } }); toast("Withdrawal cancelled"); setCx(null); setWhy(""); load(); } catch (x) { toast(x.message, "err"); } };
  const total = (rows || []).filter((w) => w.status === "active").reduce((s, w) => s + w.amount, 0);
  return <>
    <header className="pagehead"><div><h1>Owner withdrawals</h1><p>Personal money taken from the business. Kept apart from expenses and profit and loss.</p></div><div className="actions"><input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" style={{ width: "auto" }} /><button className="btn" onClick={() => setAdd(true)}><Plus size={18} /> Add withdrawal</button></div></header>
    <section className="stmt even"><div><span>Taken in {month}</span><strong>{rs(total)}</strong><small>Only the owner can see this page</small></div></section>
    {!rows ? <Loading /> : rows.length === 0 ? <Empty title="No withdrawals this month" text="Record money you take for personal use here, not in expenses." /> : <ul className="plist">{rows.map((w) => <li key={w.id} className={w.status === "cancelled" ? "off" : ""}><div className="rowflex"><div><b>{w.note || "Withdrawal"}</b><small>{fdate(w.date)} · {MODES[w.mode]}{w.status === "cancelled" && " · Cancelled: " + w.cancelReason}</small></div>
      <div className="rowact"><b className="amt">{num(w.amount)}</b>{w.status === "active" && <button className="icon" onClick={() => setCx(w)} aria-label="Cancel withdrawal" title="Cancel withdrawal"><Ban size={17} /></button>}</div></div></li>)}</ul>}
    {add && <Modal title="Add a withdrawal" onClose={() => setAdd(false)}><form onSubmit={save}><Field label="Amount (Rs)"><input type="number" step="0.01" min="0.01" inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value)} required autoFocus /></Field>
      <div className="pills" role="radiogroup" aria-label="Taken from">{Object.entries(MODES).map(([k, l]) => <button type="button" key={k} role="radio" aria-checked={f.mode === k} className={f.mode === k ? "on" : ""} onClick={() => set("mode", k)}>{l}</button>)}</div>
      <Field label="Date"><input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} required /></Field><Field label="Note (optional)"><input value={f.note} onChange={(e) => set("note", e.target.value)} /></Field>
      <footer><button type="button" className="btn ghost" onClick={() => setAdd(false)}>Cancel</button><button className="btn" disabled={busy}>Save withdrawal</button></footer></form></Modal>}
    {cx && <Modal title="Cancel this withdrawal?" onClose={() => setCx(null)}><p>{rs(cx.amount)} on {fdate(cx.date)}. The record stays, marked cancelled.</p><Field label="Reason"><input value={why} onChange={(e) => setWhy(e.target.value)} autoFocus /></Field>
      <footer><button className="btn ghost" onClick={() => setCx(null)}>Keep it</button><button className="btn danger" onClick={cancel}>Cancel withdrawal</button></footer></Modal>}
  </>;
}
