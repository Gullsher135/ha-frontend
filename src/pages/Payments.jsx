import { useEffect, useState } from "react"; import { Plus, Ban } from "lucide-react";
import { api } from "../api.js"; import { num, rs, fdate, todayPK, monthStart } from "../format.js"; import { useAuth } from "../auth.jsx"; import { Modal, Field, Empty, Loading, useToast } from "../components/ui.jsx";
export const MODES = { cash: "Cash", meezan: "Meezan", easypaisa: "Easy Paisa" };
export function PayForm({ onClose, onDone, presetParty, presetDirection = "in", askPaidTo }) {
  const toast = useToast(); const [ps, setPs] = useState([]); const [f, setF] = useState({ direction: presetDirection, party: presetParty?.id || "", amount: "", mode: "cash", date: todayPK(), broughtBy: "", paidTo: "", note: "" }); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!presetParty) api("/parties?active=true").then(setPs); }, []); const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const save = async (e) => { e.preventDefault(); setBusy(true); try { const r = await api("/payments", { method: "POST", body: { ...f, amount: Number(f.amount) } }); toast(`${f.direction === "in" ? "Receipt" : "Voucher"} #${r.number} saved`); onDone(); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  return <Modal title={presetParty ? "Payment: " + presetParty.name : "Record a payment"} onClose={onClose}><form onSubmit={save}>
    <div className="pills" role="radiogroup" aria-label="Direction"><button type="button" role="radio" aria-checked={f.direction === "in"} className={f.direction === "in" ? "on in" : ""} onClick={() => set("direction", "in")}>Money received</button><button type="button" role="radio" aria-checked={f.direction === "out"} className={f.direction === "out" ? "on out" : ""} onClick={() => set("direction", "out")}>Money paid</button></div>
    {!presetParty && <Field label={f.direction === "in" ? "Received from" : "Paid to"}><select value={f.party} onChange={(e) => set("party", e.target.value)} required><option value="">Choose a person</option>{ps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>}
    <Field label="Amount (Rs)"><input type="number" step="0.01" min="0.01" inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value)} required autoFocus={!!presetParty} /></Field>
    <div className="pills" role="radiogroup" aria-label="Payment mode">{Object.entries(MODES).map(([k, l]) => <button type="button" key={k} role="radio" aria-checked={f.mode === k} className={f.mode === k ? "on" : ""} onClick={() => set("mode", k)}>{l}</button>)}</div>
    <Field label="Date"><input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} required /></Field>
    <Field label={f.direction === "out" ? "Who paid it (optional)" : "Who brought the money (optional)"}><input value={f.broughtBy} onChange={(e) => set("broughtBy", e.target.value)} placeholder={f.direction === "out" && askPaidTo ? "For example: Owner" : ""} /></Field>
    {askPaidTo && f.direction === "out" && <Field label="Paid to (optional)" hint="If the money went through someone else, like Tahir."><input value={f.paidTo} onChange={(e) => set("paidTo", e.target.value)} /></Field>}
    <Field label="Note (optional)"><input value={f.note} onChange={(e) => set("note", e.target.value)} /></Field>
    <footer><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={busy}>Save payment</button></footer></form></Modal>;
}
export default function Payments() {
  const { isOwner } = useAuth(); const toast = useToast(); const [rows, setRows] = useState(null); const [r, setR] = useState({ from: monthStart(), to: "", mode: "" }); const [add, setAdd] = useState(false); const [cx, setCx] = useState(null); const [why, setWhy] = useState("");
  const load = () => { const qs = new URLSearchParams(Object.entries(r).filter(([, v]) => v)).toString(); api("/payments?" + qs).then(setRows).catch((e) => toast(e.message, "err")); }; useEffect(() => { setRows(null); load(); }, [r]);
  const cancel = async () => { try { await api(`/payments/${cx.id}/cancel`, { method: "POST", body: { reason: why } }); toast("Payment cancelled"); setCx(null); setWhy(""); load(); } catch (x) { toast(x.message, "err"); } };
  const live = (rows || []).filter((p) => p.status === "active"), sum = (d) => live.filter((p) => p.direction === d).reduce((s, p) => s + p.amount, 0);
  return <>
    <header className="pagehead"><div><h1>Payments</h1><p>Cash, Meezan and Easy Paisa, in and out.</p></div><button className="btn" onClick={() => setAdd(true)}><Plus size={18} /> Record payment</button></header>
    <section className="duo"><div className="tally gain"><span>Received</span><strong>{rs(sum("in"))}</strong></div><div className="tally owe"><span>Paid out</span><strong>{rs(sum("out"))}</strong></div></section>
    <div className="filters"><div className="chips">{[["", "All modes"], ...Object.entries(MODES)].map(([k, l]) => <button key={k} className={"chip" + (r.mode === k ? " on" : "")} onClick={() => setR({ ...r, mode: k })}>{l}</button>)}</div>
      <div className="dates"><label>From <input type="date" value={r.from} onChange={(e) => setR({ ...r, from: e.target.value })} /></label><label>To <input type="date" value={r.to} onChange={(e) => setR({ ...r, to: e.target.value })} /></label></div></div>
    {!rows ? <Loading /> : rows.length === 0 ? <Empty title="No payments in these dates" text="Record a payment and it appears here and in the person's ledger." /> :
      <ul className="plist">{rows.map((p) => <li key={p.id} className={p.status === "cancelled" ? "off" : ""}><div className="rowflex"><div><b>{p.party.name}</b><small>{p.direction === "in" ? "Receipt" : "Voucher"} #{p.number} · {fdate(p.date)} · {MODES[p.mode]}{p.broughtBy && " · by " + p.broughtBy}{p.status === "cancelled" && " · Cancelled: " + p.cancelReason}</small></div>
        <div className="rowact"><b className={"amt " + (p.direction === "in" ? "gain" : "owe")}>{p.direction === "in" ? "+" : "−"}{num(p.amount)}</b>{isOwner && p.status === "active" && <button className="icon" onClick={() => setCx(p)} aria-label="Cancel payment" title="Cancel payment"><Ban size={17} /></button>}</div></div></li>)}</ul>}
    {add && <PayForm onClose={() => setAdd(false)} onDone={() => { setAdd(false); load(); }} />}
    {cx && <Modal title={`Cancel payment #${cx.number}?`} onClose={() => setCx(null)}><p>{cx.party.name}'s ledger goes back as if this {rs(cx.amount)} never happened. The record stays, marked cancelled.</p><Field label="Reason"><input value={why} onChange={(e) => setWhy(e.target.value)} autoFocus /></Field>
      <footer><button className="btn ghost" onClick={() => setCx(null)}>Keep it</button><button className="btn danger" onClick={cancel}>Cancel payment</button></footer></Modal>}
  </>;
}
