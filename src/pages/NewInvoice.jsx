import { useEffect, useState } from "react"; import { useNavigate, Link } from "react-router-dom"; import { Plus, Trash2, ChevronLeft } from "lucide-react";
import { api } from "../api.js"; import { num, rs, todayPK } from "../format.js"; import { paisa, priceLine } from "../calc.js"; import { useAuth } from "../auth.jsx"; import { Field, Loading, useToast } from "../components/ui.jsx";
const MODES = { cash: "Cash", meezan: "Meezan", easypaisa: "Easy Paisa" }; const blank = () => ({ item: "", unit: "", qty: "", rateOverride: "" });
export default function NewInvoice() {
  const { isOwner } = useAuth(); const toast = useToast(); const nav = useNavigate(); const [cs, setCs] = useState(null); const [items, setItems] = useState([]); const [rates, setRates] = useState(new Map()); const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ customer: "", date: todayPK(), lines: [blank()], transport: "", received: "", mode: "cash", by: "", note: "" });
  useEffect(() => { Promise.all([api("/parties?type=customer&active=true"), api("/items")]).then(([c, i]) => { setCs(c); setItems(i); }).catch((e) => toast(e.message, "err")); }, []);
  useEffect(() => { if (!f.customer) return setRates(new Map()); api(`/rates/current?customer=${f.customer}&date=${f.date}`).then((r) => setRates(new Map(r.map((x) => [x.item, x.rate])))).catch(() => {}); }, [f.customer, f.date]);
  if (!cs) return <Loading />;
  const set = (k, v) => setF((x) => ({ ...x, [k]: v })); const setLine = (i, p) => setF((x) => ({ ...x, lines: x.lines.map((l, j) => (j === i ? { ...l, ...p } : l)) }));
  const cust = cs.find((c) => c.id === f.customer), item = (id) => items.find((x) => x._id === id), units = (it) => (it.unit === "carton" ? ["carton", "piece"] : [it.unit]);
  const priced = f.lines.map((l) => { const it = item(l.item); return it && l.unit ? priceLine(l, it, rates.get(l.item), isOwner ? l.rateOverride : "") : { rate: null, amount: null }; });
  const filled = f.lines.filter((l) => l.item); const missing = filled.some((l, i) => priced[f.lines.indexOf(l)].rate == null);
  const goods = priced.reduce((s, p) => s + (p.amount || 0), 0), T = paisa(f.transport), total = goods + T, rec = paisa(f.received), old = Math.round((cust?.net || 0) * 100), after = old + total - rec;
  const save = async (e) => { e.preventDefault(); setBusy(true);
    try { const body = { customer: f.customer, date: f.date, note: f.note, transport: Number(f.transport) || 0, received: Number(f.received) || 0, receivedMode: f.mode, receivedBy: f.by,
        lines: f.lines.filter((l) => l.item).map((l) => ({ item: l.item, unit: l.unit, qty: Number(l.qty), ...(isOwner && l.rateOverride !== "" && { rateOverride: Number(l.rateOverride) }) })) };
      const r = await api("/invoices", { method: "POST", body }); toast(r.status === "pending" ? `Invoice #${r.number} saved as Pending. The owner must approve it.` : `Invoice #${r.number} saved`); nav("/invoices/" + r.id); }
    catch (x) { toast(x.message + (x.details ? ": " + x.details.join(", ") : ""), "err"); } setBusy(false); };
  return <>
    <Link to="/invoices" className="back"><ChevronLeft size={18} /> Invoices</Link>
    <header className="pagehead"><div><h1>New invoice</h1><p>Rates come from the customer's confirmed rates.</p></div></header>
    <form onSubmit={save}>
      <div className="card2"><div className="two"><Field label="Customer"><select value={f.customer} onChange={(e) => set("customer", e.target.value)} required><option value="">Choose a customer</option>{cs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Date"><input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} required /></Field></div>
        {cust && <p className="note">{cust.direction === "party_owes_us" ? `${cust.name} owes you ${rs(cust.balance)} before this invoice.` : cust.direction === "we_owe_party" ? `You owe ${cust.name} ${rs(cust.balance)} before this invoice.` : `${cust.name} has no balance before this invoice.`}</p>}</div>
      <div className="card2">{f.lines.map((l, i) => { const it = item(l.item), p = priced[i]; return <div key={i} className="iline">
        <select aria-label="Item" value={l.item} onChange={(e) => { const x = item(e.target.value); setLine(i, { item: e.target.value, unit: x ? x.unit : "", rateOverride: "" }); }} required={i === 0}><option value="">Choose an item</option>{items.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}</select>
        <div className="qrow"><input aria-label="Quantity" type="number" min="0" step={l.unit === "kg" ? "0.001" : "1"} inputMode="decimal" placeholder="Qty" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} required={!!l.item} />
          {it && (units(it).length > 1 ? <select aria-label="Unit" value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })}>{units(it).map((u) => <option key={u} value={u}>{u === "piece" ? "pieces" : u + "s"}</option>)}</select> : <span className="unit">{l.unit === "piece" ? "pieces" : l.unit === "kg" ? "kg" : "cartons"}</span>)}</div>
        {it && <div className="rinfo">{p.rate == null ? <span className="warn">No rate. Owner must approve.</span> : <span>Rs {num(p.rate / 100)} per {l.unit}{l.unit === "carton" && it.pcsPerCarton && l.qty ? ` · ${num(l.qty * it.pcsPerCarton)} pcs` : ""}</span>}
          {isOwner && <input aria-label="Rate override" className="ro" type="number" step="0.01" min="0" inputMode="decimal" placeholder="Set rate (owner)" value={l.rateOverride} onChange={(e) => setLine(i, { rateOverride: e.target.value })} />}</div>}
        <div className="ltot"><b>{p.amount == null ? "—" : num(p.amount / 100)}</b>{f.lines.length > 1 && <button type="button" className="icon" aria-label="Remove line" onClick={() => setF((x) => ({ ...x, lines: x.lines.filter((_, j) => j !== i) }))}><Trash2 size={17} /></button>}</div></div>; })}
        <button type="button" className="link" onClick={() => set("lines", [...f.lines, blank()])}><Plus size={14} /> Add another item</button></div>
      <div className="card2"><div className="two"><Field label="Transport paid by customer (Rs)"><input type="number" step="0.01" min="0" inputMode="decimal" value={f.transport} onChange={(e) => set("transport", e.target.value)} /></Field>
        <Field label="Amount received now (Rs)"><input type="number" step="0.01" min="0" inputMode="decimal" value={f.received} onChange={(e) => set("received", e.target.value)} /></Field></div>
        {rec > 0 && <><div className="pills" role="radiogroup" aria-label="Payment mode">{Object.entries(MODES).map(([k, l]) => <button type="button" key={k} role="radio" aria-checked={f.mode === k} className={f.mode === k ? "on" : ""} onClick={() => set("mode", k)}>{l}</button>)}</div>
          <Field label="Who brought the money (optional)"><input value={f.by} onChange={(e) => set("by", e.target.value)} /></Field></>}
        <Field label="Note (optional)"><input value={f.note} onChange={(e) => set("note", e.target.value)} /></Field></div>
      <div className="sum">{missing ? <p className="warn">A rate is missing, so this invoice will be saved as <b>Pending</b>. The total is worked out when the owner approves it. Nothing is added to the ledger until then.</p> : <>
        <div><span>Goods</span><b>{num(goods / 100)}</b></div>{T > 0 && <div><span>Transport</span><b>{num(T / 100)}</b></div>}<div><span>Invoice total</span><b>{num(total / 100)}</b></div>
        <div><span>Old balance</span><b>{num(old / 100)}{old < 0 && " Cr"}</b></div>{rec > 0 && <div><span>Received</span><b>−{num(rec / 100)}</b></div>}
        <div className="net"><span>{after < 0 ? "Credit balance" : "Balance due"}</span><b>{rs(Math.abs(after) / 100)}</b></div></>}</div>
      <button className="btn big" disabled={busy || !f.customer || !filled.length || (!missing && total <= 0)}>{busy ? "Saving…" : missing ? "Save as pending" : "Save invoice"}</button>
    </form></>;
}
