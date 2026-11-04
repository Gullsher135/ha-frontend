import { useEffect, useState } from "react"; import { Plus, Trash2 } from "lucide-react";
import { api } from "../api.js"; import { num, rs, fdate, todayPK, monthStart } from "../format.js"; import { allocate, paisa } from "../calc.js"; import { useAuth } from "../auth.jsx"; import { Modal, Field, Empty, Loading, useToast } from "../components/ui.jsx";
const TM = { none: "No transport", add: "Add transport to his bill", deduct: "Deduct transport from his bill" };
const blank = () => ({ item: "", kg: "", rate: "" });
function Form({ onClose, onDone }) {
  const toast = useToast(); const [sups, setSups] = useState([]); const [items, setItems] = useState([]); const [busy, setBusy] = useState(false); const [custom, setCustom] = useState(false); const [shares, setShares] = useState([]);
  const [f, setF] = useState({ supplier: "", date: todayPK(), truckNote: "", lines: [blank()], tAmount: "", tMode: "none", discount: "", discountNote: "" });
  useEffect(() => { Promise.all([api("/parties?type=supplier&active=true"), api("/items")]).then(([s, i]) => { setSups(s); setItems(i.filter((x) => x.unit === "kg")); }); }, []);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v })); const setLine = (i, k, v) => setF((x) => ({ ...x, lines: x.lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)) }));
  const pickSup = (id) => { const s = sups.find((x) => x.id === id); setF((x) => ({ ...x, supplier: id, tMode: s?.transportMode || "none" })); };
  const kgs = f.lines.map((l) => Number(l.kg) || 0), amts = f.lines.map((l) => Math.round((Number(l.kg) || 0) * paisa(l.rate))), goods = amts.reduce((a, b) => a + b, 0);
  const T = f.tMode === "none" ? 0 : paisa(f.tAmount), sign = f.tMode === "add" ? 1 : f.tMode === "deduct" ? -1 : 0, disc = paisa(f.discount);
  const auto = allocate(T, kgs), sh = custom ? shares.map(paisa) : auto, shSum = sh.reduce((a, b) => a + b, 0), net = goods + sign * T - disc, kgTotal = kgs.reduce((a, b) => a + b, 0);
  const startCustom = () => { setShares(auto.map((p) => String(p / 100))); setCustom(true); };
  const save = async (e) => { e.preventDefault(); if (custom && shSum !== T) return toast("Transport shares must add up to the transport amount", "err"); setBusy(true);
    try { const body = { supplier: f.supplier, date: f.date, truckNote: f.truckNote, lines: f.lines.map((l) => ({ item: l.item, kg: Number(l.kg), rate: Number(l.rate) })), transport: { amount: Number(f.tAmount) || 0, mode: f.tMode }, discount: Number(f.discount) || 0, discountNote: f.discountNote, ...(custom && T && { transportShares: shares.map(Number) }) };
      const r = await api("/purchases", { method: "POST", body }); toast(`Purchase #${r.number} saved: ${rs(r.net)}`); onDone(); } catch (x) { toast(x.message + (x.details ? ": " + x.details.join(", ") : ""), "err"); } setBusy(false); };
  return <Modal title="New purchase" onClose={onClose} wide><form onSubmit={save}>
    <div className="two"><Field label="Supplier"><select value={f.supplier} onChange={(e) => pickSup(e.target.value)} required><option value="">Choose a supplier</option>{sups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <Field label="Date"><input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} required /></Field></div>
    <Field label="Truck or bill number (optional)"><input value={f.truckNote} onChange={(e) => set("truckNote", e.target.value)} /></Field>
    <div className="lines">{f.lines.map((l, i) => <div key={i} className="pline"><select aria-label="Item" value={l.item} onChange={(e) => setLine(i, "item", e.target.value)} required><option value="">Item</option>{items.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}</select>
      <input aria-label="Kg" type="number" step="0.001" min="0.001" inputMode="decimal" placeholder="Kg" value={l.kg} onChange={(e) => setLine(i, "kg", e.target.value)} required />
      <input aria-label="Rate per kg" type="number" step="0.01" min="0.01" inputMode="decimal" placeholder="Rs per kg" value={l.rate} onChange={(e) => setLine(i, "rate", e.target.value)} required />
      <b className="lamt2">{num(amts[i] / 100)}</b>{f.lines.length > 1 && <button type="button" className="icon" aria-label="Remove line" onClick={() => setF((x) => ({ ...x, lines: x.lines.filter((_, j) => j !== i) }))}><Trash2 size={17} /></button>}</div>)}
      <button type="button" className="link" onClick={() => set("lines", [...f.lines, blank()])}><Plus size={14} /> Add another item</button>{items.length === 0 && <p className="note">No kg items yet. Add them in Items first.</p>}</div>
    <div className="two"><Field label="Transport"><select value={f.tMode} onChange={(e) => set("tMode", e.target.value)}>{Object.entries(TM).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
      {f.tMode !== "none" && <Field label="Transport amount (Rs)"><input type="number" step="0.01" min="0" inputMode="decimal" value={f.tAmount} onChange={(e) => set("tAmount", e.target.value)} /></Field>}</div>
    {T > 0 && f.lines.length > 1 && <div className="share"><p>{custom ? "Set each item's share of transport yourself." : "Transport is shared by weight."} <button type="button" className="link" onClick={() => (custom ? setCustom(false) : startCustom())}>{custom ? "Go back to by weight" : "Change shares"}</button></p>
      {f.lines.map((l, i) => <div key={i} className="srow"><span>{items.find((x) => x._id === l.item)?.name || "Item " + (i + 1)} · {num(kgs[i])} kg</span>{custom ? <input aria-label="Share" type="number" step="0.01" min="0" value={shares[i] ?? ""} onChange={(e) => setShares(shares.map((v, j) => (j === i ? e.target.value : v)))} /> : <b>{num(sh[i] / 100)}</b>}</div>)}
      {custom && shSum !== T && <p className="err">Shares add up to {num(shSum / 100)}, but transport is {num(T / 100)}.</p>}</div>}
    <div className="two"><Field label="Discount for damaged goods (Rs)"><input type="number" step="0.01" min="0" inputMode="decimal" value={f.discount} onChange={(e) => set("discount", e.target.value)} /></Field>
      {disc > 0 && <Field label="Why"><input value={f.discountNote} onChange={(e) => set("discountNote", e.target.value)} /></Field>}</div>
    <div className="sum"><div><span>Goods ({num(kgTotal)} kg)</span><b>{num(goods / 100)}</b></div>{T > 0 && <div><span>Transport {sign > 0 ? "added" : "deducted"}</span><b>{sign > 0 ? "+" : "−"}{num(T / 100)}</b></div>}{disc > 0 && <div><span>Discount</span><b>−{num(disc / 100)}</b></div>}<div className="net"><span>You will owe the supplier</span><b>{rs(net / 100)}</b></div></div>
    <footer><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={busy || net <= 0}>Save purchase</button></footer></form></Modal>;
}
export default function Purchases() {
  const { isOwner } = useAuth(); const toast = useToast(); const [rows, setRows] = useState(null); const [r, setR] = useState({ from: monthStart(), to: "" }); const [add, setAdd] = useState(false); const [view, setView] = useState(null); const [why, setWhy] = useState(""); const [cx, setCx] = useState(false);
  const load = () => { const qs = new URLSearchParams(Object.entries(r).filter(([, v]) => v)).toString(); api("/purchases?" + qs).then(setRows).catch((e) => toast(e.message, "err")); }; useEffect(() => { setRows(null); load(); }, [r]);
  const open = (p) => api("/purchases/" + p.id).then(setView).catch((e) => toast(e.message, "err"));
  const cancel = async () => { try { await api(`/purchases/${view.id}/cancel`, { method: "POST", body: { reason: why } }); toast("Purchase cancelled"); setView(null); setCx(false); setWhy(""); load(); } catch (x) { toast(x.message, "err"); } };
  const live = (rows || []).filter((p) => p.status === "active");
  return <>
    <header className="pagehead"><div><h1>Purchases</h1><p>Goods bought from suppliers, in kg.</p></div><button className="btn" onClick={() => setAdd(true)}><Plus size={18} /> New purchase</button></header>
    <section className="duo"><div className="tally owe"><span>Bought in these dates</span><strong>{rs(live.reduce((s, p) => s + p.net, 0))}</strong><small>{num(live.reduce((s, p) => s + p.kg, 0))} kg in {live.length} purchases</small></div>
      <div className="dates stack"><label>From <input type="date" value={r.from} onChange={(e) => setR({ ...r, from: e.target.value })} /></label><label>To <input type="date" value={r.to} onChange={(e) => setR({ ...r, to: e.target.value })} /></label></div></section>
    {!rows ? <Loading /> : rows.length === 0 ? <Empty title="No purchases in these dates" text="Record a purchase and it is added to the supplier's ledger." /> :
      <ul className="plist">{rows.map((p) => <li key={p.id} className={p.status === "cancelled" ? "off" : ""}><button className="rowbtn" onClick={() => open(p)}><div><b>{p.supplier.name}</b><small>#{p.number} · {fdate(p.date)} · {num(p.kg)} kg{p.status === "cancelled" && " · Cancelled"}</small></div><b className="amt">{num(p.net)}</b></button></li>)}</ul>}
    {add && <Form onClose={() => setAdd(false)} onDone={() => { setAdd(false); load(); }} />}
    {view && <Modal title={`Purchase #${view.number}`} onClose={() => { setView(null); setCx(false); }} wide><p className="muted">{view.supplier.name} · {fdate(view.date)}{view.truckNote && " · " + view.truckNote}{view.status === "cancelled" && " · Cancelled: " + view.cancelReason}</p>
      <div className="vlines">{view.lines.map((l, i) => <div key={i}><div><b>{l.item.name}</b><small>{num(l.kg)} kg at Rs {num(l.rate)}</small></div><div className="a"><b>{num(l.amount)}</b><small>Real cost {num(l.landed)}</small></div></div>)}</div>
      <div className="sum"><div><span>Goods</span><b>{num(view.goods)}</b></div>{view.transportAmount > 0 && <div><span>Transport {view.transportMode === "add" ? "added" : "deducted"}</span><b>{view.transportMode === "add" ? "+" : "−"}{num(view.transportAmount)}</b></div>}{view.discount > 0 && <div><span>Discount{view.discountNote && ": " + view.discountNote}</span><b>−{num(view.discount)}</b></div>}<div className="net"><span>Owed to supplier</span><b>{rs(view.net)}</b></div></div>
      {isOwner && view.status === "active" && (cx ? <><Field label="Reason for cancelling"><input value={why} onChange={(e) => setWhy(e.target.value)} autoFocus /></Field><footer><button className="btn ghost" onClick={() => setCx(false)}>Keep it</button><button className="btn danger" onClick={cancel}>Cancel purchase</button></footer></> : <footer><button className="btn ghost" onClick={() => setCx(true)}>Cancel this purchase</button></footer>)}</Modal>}
  </>;
}
