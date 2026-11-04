import { useEffect, useState } from "react"; import { Plus, Ban } from "lucide-react";
import { api } from "../api.js"; import { num, rs, fdate, todayPK } from "../format.js"; import { useAuth } from "../auth.jsx"; import { Modal, Field, Empty, Loading, useToast } from "../components/ui.jsx";
const CAT = { rent: "Rent", electricity: "Electricity", gas: "Gas", vehicle: "Vehicle", fuel: "Fuel", repairs: "Repairs", food: "Food", other: "Other" }; const MODES = { cash: "Cash", meezan: "Meezan", easypaisa: "Easy Paisa" };
function Form({ onClose, onDone }) {
  const toast = useToast(); const [f, setF] = useState({ category: "fuel", amount: "", mode: "cash", date: todayPK(), note: "" }); const [busy, setBusy] = useState(false); const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const save = async (e) => { e.preventDefault(); setBusy(true); try { await api("/expenses", { method: "POST", body: { ...f, amount: Number(f.amount) } }); toast("Expense saved"); onDone(); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  return <Modal title="Add an expense" onClose={onClose}><form onSubmit={save}>
    <Field label="Category"><div className="catgrid">{Object.entries(CAT).map(([k, l]) => <button type="button" key={k} className={f.category === k ? "on" : ""} aria-pressed={f.category === k} onClick={() => set("category", k)}>{l}</button>)}</div></Field>
    <Field label="Amount (Rs)"><input type="number" step="0.01" min="0.01" inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value)} required autoFocus /></Field>
    <div className="pills" role="radiogroup" aria-label="Paid by">{Object.entries(MODES).map(([k, l]) => <button type="button" key={k} role="radio" aria-checked={f.mode === k} className={f.mode === k ? "on" : ""} onClick={() => set("mode", k)}>{l}</button>)}</div>
    <Field label="Date"><input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} required /></Field>
    <Field label="What was it for? (optional)"><input value={f.note} onChange={(e) => set("note", e.target.value)} /></Field>
    <footer><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={busy}>Save expense</button></footer></form></Modal>;
}
function Budget({ cat, month, current, onClose, onDone }) {
  const toast = useToast(); const [a, setA] = useState(current ? String(current) : ""); const [busy, setBusy] = useState(false);
  const save = async (e) => { e.preventDefault(); setBusy(true); try { await api("/expenses/budget", { method: "PUT", body: { month, category: cat, amount: Number(a) || 0 } }); toast("Budget saved"); onDone(); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  return <Modal title={`${CAT[cat]} budget`} onClose={onClose}><form onSubmit={save}><Field label="Monthly budget (Rs)" hint={`Applies from ${month} and every month after, until you change it. Enter 0 for no budget.`}><input type="number" step="1" min="0" inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} required autoFocus /></Field>
    <footer><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={busy}>Save budget</button></footer></form></Modal>;
}
export default function Expenses() {
  const { isOwner } = useAuth(); const toast = useToast(); const [month, setMonth] = useState(todayPK().slice(0, 7)); const [sum, setSum] = useState(null); const [rows, setRows] = useState(null); const [cat, setCat] = useState("");
  const [add, setAdd] = useState(false); const [bud, setBud] = useState(null); const [cx, setCx] = useState(null); const [why, setWhy] = useState("");
  const load = () => { api("/expenses/summary?month=" + month).then(setSum).catch((e) => toast(e.message, "err")); api(`/expenses?from=${month}-01&to=${month}-31${cat ? "&category=" + cat : ""}`).then(setRows).catch((e) => toast(e.message, "err")); };
  useEffect(() => { setSum(null); setRows(null); load(); }, [month, cat]);
  const cancel = async () => { try { await api(`/expenses/${cx.id}/cancel`, { method: "POST", body: { reason: why } }); toast("Expense cancelled"); setCx(null); setWhy(""); load(); } catch (x) { toast(x.message, "err"); } };
  const t = sum?.totals;
  return <>
    <header className="pagehead"><div><h1>Expenses</h1><p>Daily running costs, compared with the monthly budget.</p></div><div className="actions"><input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Month" style={{ width: "auto" }} /><button className="btn" onClick={() => setAdd(true)}><Plus size={18} /> Add expense</button></div></header>
    {!sum ? <Loading /> : <>
      <section className="stmt even"><div><span>Spent in {month}</span><strong>{rs(t.spent)}</strong><small>{t.budget ? `${t.pct}% of the ${rs(t.budget)} budget · ` : ""}Last month {rs(t.prevSpent)}</small></div></section>
      <ul className="plist">{sum.categories.map((c) => <li key={c.category}><div className="erow"><button className="rowbtn" onClick={() => setCat(cat === c.category ? "" : c.category)} aria-pressed={cat === c.category}><div><b>{CAT[c.category]}{cat === c.category && " (showing below)"}</b><small>{c.count} entr{c.count === 1 ? "y" : "ies"} · last month {rs(c.prevSpent)}</small></div>
        <div className="bal"><b>{rs(c.spent)}</b><small className={c.left != null && c.left < 0 ? "owe" : ""}>{c.budget == null ? "No budget" : c.left < 0 ? `${rs(-c.left)} over budget` : `${rs(c.left)} left of ${rs(c.budget)}`}</small></div></button>
        {isOwner && <button className="btn ghost sm" onClick={() => setBud(c)}>Budget</button>}</div>
        {c.budget != null && <div className="bar slim"><i className={c.pct > 100 ? "over" : c.pct > 85 ? "warn" : ""} style={{ width: Math.min(c.pct, 100) + "%" }} /></div>}</li>)}</ul></>}
    <h3 style={{ margin: "22px 0 10px" }}>{cat ? CAT[cat] + " entries" : "All entries"}</h3>
    {!rows ? <Loading /> : rows.length === 0 ? <Empty title="No expenses here" text="Add an expense and it shows in the totals above." /> : <ul className="plist">{rows.map((e) => <li key={e.id} className={e.status === "cancelled" ? "off" : ""}><div className="rowflex"><div><b>{CAT[e.category]}{e.note && " · " + e.note}</b><small>{fdate(e.date)} · {MODES[e.mode]}{e.status === "cancelled" && " · Cancelled: " + e.cancelReason}</small></div>
      <div className="rowact"><b className="amt">{num(e.amount)}</b>{isOwner && e.status === "active" && <button className="icon" onClick={() => setCx(e)} aria-label="Cancel expense" title="Cancel expense"><Ban size={17} /></button>}</div></div></li>)}</ul>}
    {add && <Form onClose={() => setAdd(false)} onDone={() => { setAdd(false); load(); }} />}
    {bud && <Budget cat={bud.category} month={month} current={bud.budget} onClose={() => setBud(null)} onDone={() => { setBud(null); load(); }} />}
    {cx && <Modal title="Cancel this expense?" onClose={() => setCx(null)}><p>{CAT[cx.category]}, {rs(cx.amount)} on {fdate(cx.date)}. It stops counting in the totals. The record stays, marked cancelled.</p><Field label="Reason"><input value={why} onChange={(e) => setWhy(e.target.value)} autoFocus /></Field>
      <footer><button className="btn ghost" onClick={() => setCx(null)}>Keep it</button><button className="btn danger" onClick={cancel}>Cancel expense</button></footer></Modal>}
  </>;
}
