import { useEffect, useState } from "react"; import { Check, X } from "lucide-react";
import { api } from "../api.js"; import { num, fdate, todayPK } from "../format.js"; import { useAuth } from "../auth.jsx"; import { Modal, Field, Empty, Loading, useToast } from "../components/ui.jsx";
const U = { carton: "carton", kg: "kg", piece: "piece" };
export default function Rates() {
  const { isOwner } = useAuth(); const toast = useToast(); const [cs, setCs] = useState(null); const [items, setItems] = useState([]); const [cid, setCid] = useState(""); const [rows, setRows] = useState(null); const [set, setSet] = useState(null); const [open, setOpen] = useState(null);
  useEffect(() => { Promise.all([api("/parties?type=customer"), api("/items")]).then(([c, i]) => { setCs(c); setItems(i); }).catch((e) => toast(e.message, "err")); }, []);
  const load = () => cid && api("/rates?customer=" + cid).then(setRows).catch((e) => toast(e.message, "err")); useEffect(() => { setRows(null); load(); }, [cid]);
  const act = async (id, what) => { try { await api(`/rates/${id}/${what}`, { method: "POST" }); toast(what === "confirm" ? "Rate confirmed" : "Rate rejected"); load(); } catch (x) { toast(x.message, "err"); } };
  if (!cs) return <Loading />; const cust = cs.find((c) => c.id === cid);
  return <>
    <header className="pagehead"><div><h1>Customer rates</h1><p>Each customer's own rate for the items he buys. Old rates are kept.</p></div></header>
    <Field label="Customer"><select value={cid} onChange={(e) => setCid(e.target.value)}><option value="">Choose a customer</option>{cs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
    {!cid ? <Empty title="Pick a customer" text="Their items and rates will show here." /> : !rows ? <Loading /> : items.length === 0 ? <Empty title="No items yet" text="Add items first, then set rates." /> :
      <ul className="plist">{items.map((it) => { const mine = rows.filter((x) => x.item === it._id), cur = mine.find((x) => x.current), pend = mine.filter((x) => x.status === "pending");
        return <li key={it._id}><div className="rowflex"><div><b>{it.name}</b><small>{cur ? <>Rs {num(cur.rate)} per {U[it.unit]} · since {fdate(cur.effectiveFrom)}</> : "No confirmed rate yet"}</small>
          {mine.length > 1 && <button className="link" onClick={() => setOpen(open === it._id ? null : it._id)}>{open === it._id ? "Hide history" : "Rate history"}</button>}</div>
          <button className="btn ghost sm" onClick={() => setSet(it)}>{cur ? "Change rate" : "Set rate"}</button></div>
          {pend.map((x) => <div key={x.id} className="pending"><span><b>Rs {num(x.rate)}</b> waiting for owner to confirm (from {fdate(x.effectiveFrom)}, entered by {x.enteredBy})</span>{isOwner && <span className="rowact"><button className="btn sm" onClick={() => act(x.id, "confirm")}><Check size={15} /> Confirm</button><button className="btn ghost sm" onClick={() => act(x.id, "reject")}><X size={15} /> Reject</button></span>}</div>)}
          {open === it._id && <ul className="hist">{mine.map((x) => <li key={x.id}><span>Rs {num(x.rate)} from {fdate(x.effectiveFrom)}</span><small>{x.status}{x.confirmedBy && " by " + x.confirmedBy}</small></li>)}</ul>}</li>; })}</ul>}
    {set && <RateForm item={set} customer={cust} isOwner={isOwner} onClose={() => setSet(null)} onDone={() => { setSet(null); load(); }} />}
  </>;
}
function RateForm({ item, customer, isOwner, onClose, onDone }) {
  const toast = useToast(); const [rate, setRate] = useState(""); const [date, setDate] = useState(todayPK()); const [busy, setBusy] = useState(false);
  const save = async (e) => { e.preventDefault(); setBusy(true); try { const r = await api("/rates", { method: "POST", body: { customer: customer.id, item: item._id, rate: Number(rate), effectiveFrom: date } }); toast(r.status === "confirmed" ? "Rate saved" : "Sent to owner for confirmation"); onDone(); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  return <Modal title={`${item.name} for ${customer.name}`} onClose={onClose}><form onSubmit={save}>
    <Field label={`Rate (Rs per ${U[item.unit]})`}><input type="number" step="0.01" min="0.01" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} required autoFocus /></Field>
    <Field label="Applies from"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
    <p className="note">{isOwner ? "As owner, your rate is confirmed straight away." : "The owner confirms it. Until then the old rate is used and invoices with no rate stay pending."}</p>
    <footer><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={busy}>Save rate</button></footer></form></Modal>;
}
