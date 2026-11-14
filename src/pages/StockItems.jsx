import { useEffect, useMemo, useState } from "react"; import { Link } from "react-router-dom"; import { Plus, Pencil, Trash2, ChevronLeft, ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, History, Search } from "lucide-react";
import { api } from "../api.js"; import { num, rs, todayPK, fdate } from "../format.js"; import { useAuth } from "../auth.jsx"; import { Modal, Field, Empty, Loading, useToast } from "../components/ui.jsx";
export const CATS = [["jumbo_rolls", "Jumbo rolls"], ["cores", "Cores"], ["plastic", "Plastic / wrappers"], ["finished_cartons", "Finished cartons"], ["other", "Other stock"]];
export const UNITS = ["kg", "pcs", "roll", "bundle", "carton", "bag", "meter"];
export const UnitList = () => <datalist id="stock-units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>;
const STATUS = { ok: ["In stock", "approved"], low: ["Low stock", "pending"], out: ["Out of stock", "cancelled"] };
const TYPE = { opening: "Opening stock", in: "Stock in", out: "Stock out", adjust: "Recount" };
const Badge = ({ s }) => <span className={"badge " + STATUS[s][1]} style={s === "out" ? { background: "#FBE4E1", color: "var(--owe)" } : s === "low" ? { background: "#FBF0D9", color: "#8A5A00" } : undefined}>{STATUS[s][0]}</span>;

// Add / edit an item. A new item can start with an opening quantity and amount.
function Form({ item, presetCategory, onClose, onDone }) {
  const toast = useToast(); const [f, setF] = useState(item ? { category: item.category, name: item.name, unit: item.unit || "", rate: item.rate == null ? "" : String(item.rate), minQty: item.minQty == null ? "" : String(item.minQty), oq: "", oa: "" } : { category: presetCategory || "jumbo_rolls", name: "", unit: "", rate: "", minQty: "", oq: "", oa: "" }); const [busy, setBusy] = useState(false); const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const save = async (e) => { e.preventDefault(); setBusy(true);
    try { const body = { category: f.category, name: f.name, unit: f.unit, rate: f.rate === "" ? null : Number(f.rate), minQty: f.minQty === "" ? null : Number(f.minQty), ...(!item && Number(f.oq) > 0 && { opening: { qty: Number(f.oq), amount: Number(f.oa) || 0 } }) };
      await api(item ? "/stock-items/" + item.id : "/stock-items", { method: item ? "PATCH" : "POST", body }); toast(item ? "Stock item updated" : "Stock item added"); onDone(); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  return <Modal title={item ? "Edit stock item" : "Add a stock item"} onClose={onClose}><form onSubmit={save}>
    <Field label="Which stock is it?"><select value={f.category} onChange={(e) => set("category", e.target.value)}>{CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
    <Field label="Name or variety" hint="Write it yourself. For example: Pink, White, Dream, 3 inch core, Printed wrapper."><input value={f.name} onChange={(e) => set("name", e.target.value)} required autoFocus /></Field>
    <div className="two"><Field label="Unit"><input list="stock-units" value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="kg, pcs, roll…" /></Field><Field label="Usual rate per unit (Rs, optional)"><input type="number" min="0" step="0.01" inputMode="decimal" value={f.rate} onChange={(e) => set("rate", e.target.value)} /></Field></div>
    <Field label="Tell me when it is low (optional)" hint="When the quantity falls to this number or less, the item shows as Low stock."><input type="number" min="0" step="0.001" inputMode="decimal" value={f.minQty} onChange={(e) => set("minQty", e.target.value)} /></Field>
    {!item && <div className="two"><Field label="Stock already in hand (optional)"><input type="number" min="0" step="0.001" inputMode="decimal" value={f.oq} onChange={(e) => set("oq", e.target.value)} placeholder="Quantity" /></Field><Field label="What it cost in total (Rs)"><input type="number" min="0" step="0.01" inputMode="decimal" value={f.oa} onChange={(e) => set("oa", e.target.value)} disabled={!(Number(f.oq) > 0)} /></Field></div>}
    <UnitList /><footer><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={busy}>{item ? "Save changes" : "Add item"}</button></footer></form></Modal>;
}

// Stock coming in / going out, or fixing an old line (entry = the line being corrected). Type quantity and amount (or rate); the other one is worked out.
function Move({ item, kind, entry, onClose, onDone }) {
  const toast = useToast(); const isIn = kind !== "out"; const [f, setF] = useState(entry ? { date: entry.date, qty: String(entry.qty), amount: isIn ? String(entry.amount) : "", rate: "", by: "amount", ref: entry.ref || "", note: entry.note || "" } : { date: todayPK(), qty: "", amount: "", rate: "", by: "amount", ref: "", note: "" }); const [busy, setBusy] = useState(false); const set = (p) => setF((x) => ({ ...x, ...p }));
  const q = Number(f.qty) || 0, amount = f.by === "amount" ? Number(f.amount) || 0 : q * (Number(f.rate) || 0), rate = f.by === "rate" ? Number(f.rate) || 0 : q > 0 ? (Number(f.amount) || 0) / q : 0;
  const save = async (e) => { e.preventDefault(); if (!(q > 0)) return toast("Enter the quantity", "err"); if (isIn && !(f.by === "amount" ? f.amount !== "" : f.rate !== "")) return toast("Enter the total amount or the rate per unit", "err"); setBusy(true);
    try { const body = { date: f.date, qty: q, ref: f.ref, note: f.note, ...(isIn && (f.by === "amount" ? { amount: Number(f.amount) } : { rate: Number(f.rate) })) };
      await api(entry ? "/stock-items/movements/" + entry.id : `/stock-items/${item.id}/${isIn ? "in" : "out"}`, { method: entry ? "PUT" : "POST", body }); toast(entry ? "Entry corrected" : isIn ? "Stock added" : "Stock taken out"); onDone(); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  const after = entry ? null : isIn ? item.qty + q : item.qty - q;
  return <Modal title={`${entry ? "Correct entry: " : isIn ? "Add stock: " : "Take out: "}${item.name}`} onClose={onClose}><form onSubmit={save}>
    <div className="two"><Field label={`Quantity (${item.unit || "units"})`}><input type="number" min="0" step="0.001" inputMode="decimal" value={f.qty} onChange={(e) => set({ qty: e.target.value })} autoFocus required /></Field><Field label="Date"><input type="date" max={todayPK()} value={f.date} onChange={(e) => set({ date: e.target.value })} required /></Field></div>
    {isIn && <div className="two"><Field label="Total amount (Rs)"><input type="number" min="0" step="0.01" inputMode="decimal" value={f.by === "amount" ? f.amount : amount ? String(Math.round(amount * 100) / 100) : ""} onChange={(e) => set({ amount: e.target.value, by: "amount" })} /></Field><Field label="or Rate per unit (Rs)"><input type="number" min="0" step="0.01" inputMode="decimal" value={f.by === "rate" ? f.rate : rate ? String(Math.round(rate * 100) / 100) : ""} onChange={(e) => set({ rate: e.target.value, by: "rate" })} /></Field></div>}
    {isIn && q > 0 && amount > 0 && <p className="note">{num(q)} {item.unit} × {rs(rate)} = <b>{rs(amount)}</b></p>}
    <Field label={isIn ? "Supplier / bill number (optional)" : "Used for (optional)"}><input value={f.ref} onChange={(e) => set({ ref: e.target.value })} maxLength={60} placeholder={isIn ? "e.g. Bill 123" : "e.g. Production, sold, wasted"} /></Field>
    <Field label="Note (optional)"><input value={f.note} onChange={(e) => set({ note: e.target.value })} maxLength={200} /></Field>
    {after != null && q > 0 && <p className="muted">Quantity will change from {num(item.qty)} to <b style={after < 0 ? { color: "var(--owe)" } : undefined}>{num(after)}</b> {item.unit}.</p>}
    <footer><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={busy}>{entry ? "Save correction" : isIn ? "Add to stock" : "Take out"}</button></footer></form></Modal>;
}

// Physical recount: compare system quantity with what is really there.
function Recount({ item, onClose, onDone }) {
  const toast = useToast(); const [p, setP] = useState(""); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false); const has = p !== "", diff = has ? Math.round((Number(p) - item.qty) * 1000) / 1000 : 0;
  const save = async (e) => { e.preventDefault(); setBusy(true); try { await api(`/stock-items/${item.id}/adjust`, { method: "POST", body: { physical: Number(p), note } }); toast("Recount saved"); onDone(); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  return <Modal title={`Recount: ${item.name}`} onClose={onClose}><form onSubmit={save}>
    <div className="sum"><div><span>System quantity</span><b>{num(item.qty)} {item.unit}</b></div><div><span>Physical quantity (what you counted)</span><b>{has ? num(Number(p)) + " " + item.unit : "—"}</b></div><div className="net"><span>Difference</span><b style={diff < 0 ? undefined : { color: "var(--pine)" }}>{has ? (diff > 0 ? "+" : "") + num(diff) : "—"}</b></div></div>
    <Field label={`Quantity you found on the shelf (${item.unit || "units"})`}><input type="number" min="0" step="0.001" inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} required autoFocus /></Field>
    <Field label="Reason / note (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="e.g. damaged, counting mistake" /></Field>
    <footer><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={busy || !has || diff === 0}>Confirm adjustment</button></footer></form></Modal>;
}

// Why is the quantity what it is? Every movement with the balance before and after.
function Hist({ item, onClose, onChanged }) {
  const toast = useToast(); const [d, setD] = useState(null); const [edit, setEdit] = useState(null); const [cancel, setCancel] = useState(null); const [reason, setReason] = useState("");
  const load = () => api(`/stock-items/${item.id}/movements`).then(setD).catch((e) => toast(e.message, "err")); useEffect(() => { load(); }, []);
  const doCancel = async () => { try { await api(`/stock-items/movements/${cancel.id}/void`, { method: "POST", body: { reason } }); toast("Entry cancelled"); setCancel(null); setReason(""); load(); onChanged(); } catch (x) { toast(x.message, "err"); } };
  return <Modal wide title={`Stock history: ${item.name}`} onClose={onClose}>
    {!d ? <Loading /> : <>
      <p className="muted" style={{ marginTop: 0 }}>Now: <b>{num(d.item.qty)} {item.unit}</b> worth <b>{rs(d.item.value)}</b>{d.item.avgRate != null && <> (average {rs(d.item.avgRate)} per {item.unit || "unit"})</>}</p>
      {d.movements.length === 0 ? <Empty title="No movements yet" text="Add stock to see the history here." /> : <ul className="plist">{d.movements.map((m) => { const dead = m.status !== "active", up = m.delta >= 0;
        return <li key={m.id} style={dead ? { opacity: 0.55 } : undefined}><div className="rowflex"><div style={dead ? { textDecoration: "line-through" } : undefined}><b>{TYPE[m.type]} <small>· {fdate(m.date)}</small></b>
          <small>{dead ? "" : <>Balance {num(m.before)} → {num(m.after)} {item.unit} · </>}{m.type === "adjust" && !dead ? `physical ${num(m.physical)} · ` : ""}{m.type !== "out" && m.type !== "adjust" ? `${rs(m.amount)}${m.rate != null ? ` (${rs(m.rate)} each)` : ""} · ` : ""}{m.ref && m.ref + " · "}{m.note && m.note + " · "}{m.by}</small>
          {m.status === "corrected" && <small style={{ display: "block", textDecoration: "none" }}>Corrected — see the newer entry</small>}{m.status === "voided" && <small style={{ display: "block" }}>Cancelled: {m.voidReason}</small>}{m.corrects && <small style={{ display: "block" }}>Corrected entry</small>}</div>
          <div style={{ textAlign: "right" }}>{!dead && <b className="amt" style={{ color: up ? "var(--pine)" : "var(--owe)" }}>{up ? "+" : ""}{num(m.delta)}</b>}
            {!dead && m.fromPurchase && <small>From a purchase</small>}{!dead && !m.fromPurchase && <div className="rowact" style={{ justifyContent: "flex-end" }}>{m.type !== "adjust" && <button className="icon" aria-label="Edit entry" onClick={() => setEdit(m)}><Pencil size={16} /></button>}<button className="btn ghost sm" onClick={() => setCancel(m)}>Cancel</button></div>}</div></div></li>; })}</ul>}
    </>}
    {edit && <Move item={d.item} kind={edit.type === "out" ? "out" : "in"} entry={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); onChanged(); }} />}
    {cancel && <Modal title="Cancel this entry?" onClose={() => setCancel(null)}><p>The line stays in the history marked as cancelled, and the quantity is worked out again without it.</p><Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus /></Field><footer><button className="btn ghost" onClick={() => setCancel(null)}>Keep it</button><button className="btn danger" onClick={doCancel} disabled={reason.trim().length < 3}>Cancel entry</button></footer></Modal>}
  </Modal>;
}

export default function StockItems() {
  const { isOwner } = useAuth(); const toast = useToast(); const [rows, setRows] = useState(null); const [sum, setSum] = useState(null); const [edit, setEdit] = useState(null); const [del, setDel] = useState(null); const [act, setAct] = useState(null); const [q, setQ] = useState(""); const [cat, setCat] = useState("all"); const [only, setOnly] = useState("all");
  const load = () => { api("/stock-items?active=all").then(setRows).catch((e) => toast(e.message, "err")); api("/stock-items/summary").then(setSum).catch(() => {}); }; useEffect(() => { load(); }, []);
  const shown = useMemo(() => (rows || []).filter((i) => (cat === "all" || i.category === cat) && (only === "all" || i.status === only) && (!q.trim() || i.name.toLowerCase().includes(q.trim().toLowerCase()))), [rows, q, cat, only]);
  if (!rows) return <Loading />;
  const toggle = async (i) => { try { await api("/stock-items/" + i.id, { method: "PATCH", body: { active: !i.active } }); load(); } catch (x) { toast(x.message, "err"); } };
  const remove = async () => { try { await api("/stock-items/" + del.id, { method: "DELETE" }); toast("Deleted"); setDel(null); load(); } catch (x) { toast(x.message, "err"); setDel(null); } };
  const done = () => { setAct(null); load(); };
  return <>
    <Link to="/stock" className="back"><ChevronLeft size={18} /> Stock count</Link>
    <header className="pagehead"><div><h1>Stock items</h1><p>Save each kind of stock once (Jumbo roll: Pink, White, Dream…). Add stock with quantity and amount, and the system works out the rate and the value.</p></div><button className="btn" onClick={() => setEdit({})}><Plus size={18} /> Add stock item</button></header>
    {sum && <section className={"stmt " + (sum.items ? "even" : "owe")}><div><span>Total stock value</span><strong>{rs(sum.totalValue)}</strong><small>{sum.items} items{Object.entries(sum.qtyByUnit).length > 0 && " · " + Object.entries(sum.qtyByUnit).filter(([, v]) => v > 0).map(([u, v]) => `${num(v)} ${u}`).join(", ")}</small>
      {(sum.low.length > 0 || sum.out.length > 0) && <div className="chips" style={{ marginTop: 10 }}>{sum.out.length > 0 && <button className={"chip" + (only === "out" ? " on" : "")} onClick={() => setOnly(only === "out" ? "all" : "out")} style={{ color: "var(--owe)" }}>{sum.out.length} out of stock</button>}{sum.low.length > 0 && <button className={"chip" + (only === "low" ? " on" : "")} onClick={() => setOnly(only === "low" ? "all" : "low")}>{sum.low.length} low stock</button>}</div>}</div></section>}
    {rows.length > 0 && <div className="two" style={{ marginBottom: 12 }}><label className="field" style={{ margin: 0 }}><span className="sr" style={{ position: "absolute", left: -9999 }}>Search</span><div style={{ position: "relative" }}><Search size={16} style={{ position: "absolute", left: 12, top: 14, color: "var(--muted)" }} /><input style={{ paddingLeft: 34 }} placeholder="Search item…" value={q} onChange={(e) => setQ(e.target.value)} /></div></label>
      <select aria-label="Stock type" value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">All stock types</option>{CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>}
    {rows.length === 0 ? <Empty title="No stock items yet" text="Add your first one, for example Jumbo roll, Pink, kg. Then use Add stock to put quantity and amount in." /> :
      CATS.map(([k, label]) => { const mine = shown.filter((i) => i.category === k); if (!mine.length && (q || only !== "all" || cat !== "all")) return null; return <div key={k}><div className="rowflex" style={{ padding: "18px 0 6px" }}><h3 style={{ margin: 0 }}>{label}</h3><button className="btn ghost sm" onClick={() => setEdit({ preset: k })}><Plus size={14} /> Add</button></div>
        {mine.length === 0 ? <p className="muted" style={{ marginTop: 0 }}>Nothing saved yet.</p> : <ul className="plist">{mine.map((i) => <li key={i.id} className={i.active ? "" : "off"}><div className="rowflex"><div><b>{i.name} {i.active && <Badge s={i.status} />}</b>
          <small>{num(i.qty)} {i.unit || "units"}{i.avgRate != null ? ` · average ${rs(i.avgRate)} per ${i.unit || "unit"}` : i.rate != null ? ` · usual rate ${rs(i.rate)}` : ""}{!i.active && " · Hidden"}</small></div><b className="amt">{rs(i.value)}</b></div>
          <div className="rowact" style={{ padding: "0 18px 12px", flexWrap: "wrap" }}><button className="btn sm" onClick={() => setAct({ k: "in", i })}><ArrowDownToLine size={15} /> Add stock</button><button className="btn ghost sm" onClick={() => setAct({ k: "out", i })} disabled={i.qty <= 0}><ArrowUpFromLine size={15} /> Take out</button><button className="btn ghost sm" onClick={() => setAct({ k: "count", i })}><ClipboardCheck size={15} /> Recount</button><button className="btn ghost sm" onClick={() => setAct({ k: "hist", i })}><History size={15} /> History</button>
            <button className="icon" onClick={() => setEdit(i)} aria-label={"Edit " + i.name}><Pencil size={17} /></button><button className="btn ghost sm" onClick={() => toggle(i)}>{i.active ? "Hide" : "Show"}</button>{isOwner && <button className="icon" onClick={() => setDel(i)} aria-label={"Delete " + i.name}><Trash2 size={17} /></button>}</div></li>)}</ul>}</div>; })}
    {edit && <Form item={edit.id ? edit : null} presetCategory={edit.preset} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
    {act?.k === "in" && <Move item={act.i} kind="in" onClose={() => setAct(null)} onDone={done} />}{act?.k === "out" && <Move item={act.i} kind="out" onClose={() => setAct(null)} onDone={done} />}
    {act?.k === "count" && <Recount item={act.i} onClose={() => setAct(null)} onDone={done} />}{act?.k === "hist" && <Hist item={act.i} onClose={() => setAct(null)} onChanged={load} />}
    {del && <Modal title={`Delete ${del.name}?`} onClose={() => setDel(null)}><p>This only works if it has no stock entries and was never used in a saved stock count. Otherwise the system will ask you to hide it instead.</p><footer><button className="btn ghost" onClick={() => setDel(null)}>Keep it</button><button className="btn danger" onClick={remove}>Delete</button></footer></Modal>}
  </>;
}
