import { useCallback, useEffect, useState } from "react"; import { Link, useParams } from "react-router-dom"; import { ArrowLeftRight, ChevronLeft, Phone, Undo2, BookOpen } from "lucide-react";
import { api } from "../api.js"; import { num, rs, fdate, tone, todayPK, monthStart, daysAgo, KIND } from "../format.js"; import { useAuth } from "../auth.jsx";
import { Modal, Field, Loading, Empty, useToast } from "../components/ui.jsx"; import { PartyForm } from "./Parties.jsx"; import { PayForm } from "./Payments.jsx";
const REV = ["opening", "transfer_out", "transfer_in", "adjustment", "advance", "installment", "salary_deduction"];
function Transfer({ party, onClose, onDone }) {
  const toast = useToast(); const [all, setAll] = useState([]); const [f, setF] = useState({ from: party.id, to: "", amount: "", date: todayPK(), note: "" }); const [busy, setBusy] = useState(false);
  useEffect(() => { api("/parties?active=true").then(setAll); }, []);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v })); const name = (id) => all.find((p) => p.id === id)?.name;
  const save = async (e) => { e.preventDefault(); setBusy(true); try { await api("/ledger/transfer", { method: "POST", body: { ...f, amount: Number(f.amount) } }); toast("Transfer saved in both ledgers"); onDone(); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  return <Modal title="Move an amount to another person" onClose={onClose}><form onSubmit={save}>
    <Field label="Take it off"><select value={f.from} onChange={(e) => set("from", e.target.value)}>{all.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
    <Field label="Add it to"><select value={f.to} onChange={(e) => set("to", e.target.value)} required><option value="">Choose a person</option>{all.filter((p) => p.id !== f.from).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
    <Field label="Amount (Rs)"><input type="number" step="0.01" min="0.01" inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value)} required /></Field>
    <Field label="Date"><input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} required /></Field>
    <Field label="Note"><input value={f.note} onChange={(e) => set("note", e.target.value)} /></Field>
    {f.to && f.amount > 0 && <p className="note">{name(f.from)} owes you {rs(f.amount)} less. {name(f.to)} owes you {rs(f.amount)} more. Both ledgers change together.</p>}
    <footer><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={busy}>Save transfer</button></footer></form></Modal>;
}
function Opening({ party, onClose, onDone }) {
  const toast = useToast(); const [f, setF] = useState({ amount: "", side: "receivable", date: todayPK(), note: "" }); const [busy, setBusy] = useState(false); const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const save = async (e) => { e.preventDefault(); setBusy(true); try { await api(`/parties/${party.id}/opening-balance`, { method: "POST", body: { ...f, amount: Number(f.amount) } }); toast("Opening balance saved"); onDone(); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  return <Modal title="Opening balance" onClose={onClose}><form onSubmit={save}>
    <Field label="Who owes whom"><select value={f.side} onChange={(e) => set("side", e.target.value)}><option value="receivable">{party.name} owes us</option><option value="payable">We owe {party.name}</option></select></Field>
    <Field label="Amount (Rs)" hint="Copy it from the closing balance in your Excel sheet."><input type="number" step="0.01" min="0.01" inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value)} required autoFocus /></Field>
    <Field label="As on date"><input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} required /></Field>
    <footer><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={busy}>Save opening balance</button></footer></form></Modal>;
}
function Entry({ party, type, balance, onClose, onDone }) {
  const toast = useToast(); const [f, setF] = useState({ side: "they_owe_more", amount: type === "salary_deduction" && balance > 0 ? String(balance) : "", date: todayPK(), note: "" }); const [busy, setBusy] = useState(false); const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const T = { goods_credit: ["Goods on credit", "Write what the goods were, for example: 2 cartons tissue."], salary_deduction: ["Deduct from salary", "Write the month, for example: October salary."], adjustment: ["Add or adjust an amount", "Write why, for example: Installment due for November."] }[type];
  const save = async (e) => { e.preventDefault(); setBusy(true); try { await api(`/accounts/${party.id}/entry`, { method: "POST", body: { type, side: f.side, amount: Number(f.amount), date: f.date, note: f.note } }); toast("Saved"); onDone(); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  return <Modal title={T[0] + ": " + party.name} onClose={onClose}><form onSubmit={save}>
    {type === "adjustment" && <Field label="What changes"><select value={f.side} onChange={(e) => set("side", e.target.value)}><option value="they_owe_more">{party.name} owes us more (or we owe less)</option><option value="we_owe_more">We owe {party.name} more (or they owe less)</option></select></Field>}
    <Field label="Amount (Rs)" hint={type === "salary_deduction" ? `Up to Rs ${num(balance)}, the full amount owed.` : undefined}><input type="number" step="0.01" min="0.01" inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value)} required autoFocus /></Field>
    <Field label="Date"><input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} required /></Field>
    <Field label="Note" hint={T[1]}><input value={f.note} onChange={(e) => set("note", e.target.value)} required /></Field>
    <footer><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={busy}>Save</button></footer></form></Modal>;
}
export default function Ledger() {
  const { id } = useParams(); const { isOwner } = useAuth(); const toast = useToast();
  const [r, setR] = useState({ from: "", to: "" }); const [d, setD] = useState(null); const [dlg, setDlg] = useState(null); const [rev, setRev] = useState(null);
  const load = useCallback(() => { const qs = new URLSearchParams(Object.entries(r).filter(([, v]) => v)).toString(); api(`/parties/${id}/ledger?${qs}`).then(setD).catch((e) => toast(e.message, "err")); }, [id, r]);
  useEffect(() => { setD(null); load(); }, [load]);
  if (!d) return <Loading />;
  const p = d.party, c = d.closing, t = tone(c.direction), hasOpening = d.entries.some((e) => e.kind === "opening" && !e.reversed);
  const done = () => { setDlg(null); load(); };
  const doReverse = async () => { try { await api(`/ledger/${rev.id}/reverse`, { method: "POST", body: {} }); toast("Entry corrected"); setRev(null); load(); } catch (x) { toast(x.message, "err"); setRev(null); } };
  const chip = (l, from, to) => <button className={"chip" + (r.from === from && r.to === to ? " on" : "")} onClick={() => setR({ from, to })}>{l}</button>;
  return <>
    <Link to="/parties" className="back"><ChevronLeft size={18} /> All parties</Link>
    <header className="pagehead"><div><h1>{p.name}</h1><p>{[p.isCustomer && "Customer", p.isSupplier && "Supplier", p.category === "special" && "Special account", p.category === "worker" && "Worker"].filter(Boolean).join(" and ")}{p.phone && <> · <Phone size={13} /> {p.phone}</>}</p></div>
      <div className="actions"><button className="btn ghost" onClick={() => setDlg("edit")}>Edit details</button>{p.category === "special" && <><button className="btn" onClick={() => setDlg("pay")}>Record payment</button><button className="btn ghost" onClick={() => setDlg("adjustment")}>Add or adjust</button></>}{p.category === "worker" && <><button className="btn" onClick={() => setDlg("pay")}>Give advance</button><button className="btn ghost" onClick={() => setDlg("goods_credit")}>Goods on credit</button><button className="btn ghost" onClick={() => setDlg("salary_deduction")}>Deduct from salary</button></>}<button className="btn ghost" onClick={() => setDlg("transfer")}><ArrowLeftRight size={17} /> Move amount</button>{isOwner && !hasOpening && <button className="btn ghost" onClick={() => setDlg("opening")}><BookOpen size={17} /> Opening balance</button>}</div></header>
    {p.category !== "trade" && <p className="note">This account is kept out of profit and loss.{p.notes && " " + p.notes}</p>}
    <section className={"stmt " + t}>
      <div><span>{c.direction === "settled" ? "All settled" : c.direction === "party_owes_us" && p.category === "worker" ? "To deduct at salary time" : c.direction === "party_owes_us" ? `${p.name} owes you` : `You owe ${p.name}`}</span><strong>{c.direction === "settled" ? "Rs 0" : rs(c.balance)}</strong>
        <small>{d.opening.balance > 0 && r.from ? `Before ${fdate(r.from)}: ${d.opening.direction === "party_owes_us" ? "owed you" : "you owed"} ${rs(d.opening.balance)}` : "Closing balance for the dates shown"}</small></div>
    </section>
    <div className="filters"><div className="chips">{chip("All time", "", "")}{chip("This month", monthStart(), "")}{chip("Last 30 days", daysAgo(30), "")}</div>
      <div className="dates"><label>From <input type="date" value={r.from} onChange={(e) => setR({ ...r, from: e.target.value })} /></label><label>To <input type="date" value={r.to} onChange={(e) => setR({ ...r, to: e.target.value })} /></label></div></div>
    {d.entries.length === 0 ? <Empty title="No entries for these dates" text="Invoices, payments and transfers will appear here." /> : <>
      <p className="legend">Debit raises what {p.name} owes you. Credit lowers it. A minus balance means you owe them.</p>
      <div className="khata"><div className="lrow head"><div>Date</div><div>Details</div><div className="a">Debit</div><div className="a">Credit</div><div className="a">Balance</div></div>
        {d.entries.map((e) => <div key={e.id} className={"lrow" + (e.reversed ? " void" : "")}>
          <div className="ld">{fdate(e.date)}</div>
          <div className="ln"><b>{KIND[e.kind] || e.kind}{e.reversed && " (corrected)"}</b><span>{[e.ref, e.mode, e.broughtBy && "by " + e.broughtBy, e.note].filter(Boolean).join(" · ")}</span>
            {isOwner && !e.reversed && !e.isReversal && REV.includes(e.kind) && <button className="link" onClick={() => setRev(e)}><Undo2 size={13} /> Correct this entry</button>}</div>
          <div className="a dr" data-l="Debit">{e.debit ? num(e.debit) : ""}</div><div className="a cr" data-l="Credit">{e.credit ? num(e.credit) : ""}</div>
          <div className={"a bl " + (e.balance < 0 ? "owe" : "gain")} data-l="Balance">{num(e.balance)}</div></div>)}</div></>}
    {dlg === "pay" && <PayForm presetParty={p} presetDirection="out" askPaidTo={p.category === "special"} onClose={() => setDlg(null)} onDone={done} />}
    {["adjustment", "goods_credit", "salary_deduction"].includes(dlg) && <Entry party={p} type={dlg} balance={d.closingSigned} onClose={() => setDlg(null)} onDone={done} />}
    {dlg === "edit" && <PartyForm party={p} onClose={() => setDlg(null)} onDone={done} />}
    {dlg === "transfer" && <Transfer party={p} onClose={() => setDlg(null)} onDone={done} />}
    {dlg === "opening" && <Opening party={p} onClose={() => setDlg(null)} onDone={done} />}
    {rev && <Modal title="Correct this entry?" onClose={() => setRev(null)}><p>This adds an opposite entry so the balance goes back. The original stays visible and the change is recorded under your name.{rev.kind !== "opening" && " The matching entry in the other person's ledger is corrected too."}</p>
      <footer><button className="btn ghost" onClick={() => setRev(null)}>Keep it</button><button className="btn danger" onClick={doReverse}>Correct entry</button></footer></Modal>}
  </>;
}
