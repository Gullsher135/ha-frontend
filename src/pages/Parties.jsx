import { useEffect, useState } from "react"; import { Link } from "react-router-dom"; import { Plus, Search, Pencil, Trash2, Archive, RotateCcw } from "lucide-react";
import { api } from "../api.js"; import { rs, tone, todayPK } from "../format.js"; import { useAuth } from "../auth.jsx"; import { Modal, Field, Empty, Loading, useToast } from "../components/ui.jsx";
const TABS = [["all", "Everyone"], ["customer", "Customers"], ["supplier", "Suppliers"], ["special", "Special accounts"], ["worker", "Workers"], ["closed", "Closed"]];
export function PartyForm({ party, presetCategory, onDone, onClose }) {
  const toast = useToast(); const trade0 = !presetCategory;
  const [f, setF] = useState(party ? { name: party.name, phone: party.phone || "", address: party.address || "", notes: party.notes || "", isCustomer: party.isCustomer, isSupplier: party.isSupplier, category: party.category, transportMode: party.transportMode || "none" }
    : { name: "", phone: "", address: "", notes: "", isCustomer: trade0, isSupplier: false, category: presetCategory || "trade", transportMode: "none" }); const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const save = async (e) => { e.preventDefault(); setBusy(true);
    try { const { category, ...rest } = f; const body = party ? rest : { ...f, ...(f.category !== "trade" && { isCustomer: false, isSupplier: false }) };
      const p = await api(party ? "/parties/" + party.id : "/parties", { method: party ? "PATCH" : "POST", body }); toast(party ? "Details saved" : "Added"); onDone(p); }
    catch (x) { toast(x.message, "err"); } setBusy(false); };
  const title = party ? "Edit details" : presetCategory === "worker" ? "Add a worker" : presetCategory === "special" ? "Add a special account" : "Add a party";
  return <Modal title={title} onClose={onClose}><form onSubmit={save}>
    {!party && !presetCategory && <Field label="Account type"><select value={f.category} onChange={(e) => set("category", e.target.value)}><option value="trade">Customer or supplier</option><option value="special">Special account (installment, machine advance)</option><option value="worker">Worker account</option></select></Field>}
    <Field label="Name"><input value={f.name} onChange={(e) => set("name", e.target.value)} required autoFocus /></Field>
    <Field label="Phone" hint="With country code, like 923001234567. Needed for WhatsApp sharing."><input value={f.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" /></Field>
    {f.category === "trade" && <Field label="Address"><input value={f.address} onChange={(e) => set("address", e.target.value)} /></Field>}
    {f.category === "special" && <Field label="What is this account for?" hint="For example: Vehicle installment, or Machine advance."><input value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>}
    {f.category === "trade" && <div className="checks"><label><input type="checkbox" checked={f.isCustomer} onChange={(e) => set("isCustomer", e.target.checked)} /> Customer</label><label><input type="checkbox" checked={f.isSupplier} onChange={(e) => set("isSupplier", e.target.checked)} /> Supplier</label></div>}
    {f.category === "trade" && f.isSupplier && <Field label="Transport agreed with this supplier" hint="Used as the starting choice on every purchase. You can change it per purchase."><select value={f.transportMode} onChange={(e) => set("transportMode", e.target.value)}><option value="none">No transport</option><option value="add">Add transport to his bill</option><option value="deduct">Deduct transport from his bill</option></select></Field>}
    {f.category !== "trade" && <p className="note">This account stays out of profit and loss.</p>}
    <footer><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={busy}>{party ? "Save details" : "Add"}</button></footer></form></Modal>;
}
export function ResignDialog({ party, balance, onClose, onDone }) {
  const toast = useToast(); const [f, setF] = useState({ date: todayPK(), note: "" }); const [busy, setBusy] = useState(false);
  const save = async (e) => { e.preventDefault(); setBusy(true); try { await api(`/parties/${party.id}/resign`, { method: "POST", body: f }); toast(`${party.name} marked as resigned`); onDone(); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  return <Modal title={`${party.name} is leaving`} onClose={onClose}><form onSubmit={save}>
    <Field label="Last working day"><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required /></Field>
    <Field label="Note (optional)"><input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="For example: found another job" /></Field>
    {balance != null && balance !== 0 && <p className="note">{balance > 0 ? `${party.name} still owes ${rs(balance)} (advance or goods on credit). Deduct it from the final salary, or record the money when he pays it back.` : `You owe ${party.name} ${rs(-balance)}. Pay it before closing the account.`} The account stays open until that is settled. After that, close it.</p>}
    <footer><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={busy}>Mark as resigned</button></footer></form></Modal>;
}
export function useAccountActions(reload) {
  const toast = useToast(); const [dlg, setDlg] = useState(null); const [busy, setBusy] = useState(false);
  const run = async (fn, ok) => { setBusy(true); try { await fn(); toast(ok); setDlg(null); reload(); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  const close = (p) => run(() => api("/parties/" + p.id, { method: "PATCH", body: { active: false } }), "Account closed");
  const reopen = (p) => run(() => api("/parties/" + p.id, { method: "PATCH", body: { active: true } }), "Account reopened");
  const del = (p) => run(() => api("/parties/" + p.id, { method: "DELETE" }), "Account deleted");
  const modal = dlg && <Modal title={dlg.kind === "delete" ? `Delete ${dlg.p.name}?` : `Close ${dlg.p.name}?`} onClose={() => setDlg(null)}>
    {dlg.kind === "delete" ? <p>This removes the account for good. It only works for an account that was added by mistake and has no ledger history. If it has history, the system will refuse and you can close it instead. If the history came from a wrong Excel import (before go-live), clear it first under Data import, then delete the account.</p>
      : <p>A closed account disappears from the lists and cannot get new entries, but its history stays safe and you can reopen it any time. The balance must be zero (settled) before you can close it.</p>}
    <footer><button className="btn ghost" onClick={() => setDlg(null)}>Keep it</button><button className="btn danger" disabled={busy} onClick={() => (dlg.kind === "delete" ? del(dlg.p) : close(dlg.p))}>{dlg.kind === "delete" ? "Delete account" : "Close account"}</button></footer></Modal>;
  return { ask: (kind, p) => setDlg({ kind, p }), reopen, modal, busy };
}
export default function Parties() {
  const toast = useToast(); const { isOwner } = useAuth(); const [ps, setPs] = useState(null); const [tab, setTab] = useState("all"); const [q, setQ] = useState(""); const [adding, setAdding] = useState(false); const [ed, setEd] = useState(null);
  const load = () => api("/parties?active=" + (tab === "closed" ? "false" : "true")).then(setPs).catch((e) => toast(e.message, "err")); useEffect(() => { setPs(null); load(); }, [tab === "closed"]);
  const acts = useAccountActions(load);
  if (!ps) return <Loading />;
  const rows = ps.filter((p) => (tab === "all" || tab === "closed" || (tab === "customer" ? p.isCustomer : tab === "supplier" ? p.isSupplier : p.category === tab)) && p.name.toLowerCase().includes(q.toLowerCase()));
  return <>
    <header className="pagehead"><div><h1>Customers & suppliers</h1><p>{ps.length} {tab === "closed" ? "closed " : ""}accounts. Tap a name to open the ledger. Use the pencil to edit details.</p></div><button className="btn" onClick={() => setAdding(true)}><Plus size={18} /> Add party</button></header>
    <div className="seg" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
    <div className="search"><Search size={18} /><input placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search by name" /></div>
    {rows.length === 0 ? <Empty title={q ? "No match" : "Nothing in this list yet"} text={q ? "Try a different spelling." : "Add a party to see it here."} /> :
      <ul className="plist">{rows.map((p) => <li key={p.id}><div className="rowfull"><Link to={"/parties/" + p.id}>
        <div><b>{p.name}</b><small>{[p.isCustomer && "Customer", p.isSupplier && "Supplier", p.category === "special" && "Special account", p.category === "worker" && (p.employment === "resigned" ? "Worker (resigned)" : "Worker")].filter(Boolean).join(" and ")}</small></div>
        <div className={"bal " + tone(p.direction)}><b>{p.direction === "settled" ? "Settled" : rs(p.balance)}</b>{p.direction !== "settled" && <small>{p.direction === "party_owes_us" ? "owes you" : "you owe"}</small>}</div></Link>
        <div className="rowact">{tab === "closed" ? (isOwner && <button className="btn ghost sm" disabled={acts.busy} onClick={() => acts.reopen(p)}><RotateCcw size={14} /> Reopen</button>) : <><button className="icon" aria-label={"Edit " + p.name} title="Edit details" onClick={() => setEd(p)}><Pencil size={17} /></button>
          {isOwner && <button className="icon" aria-label={"Close " + p.name} title="Close account" onClick={() => acts.ask("close", p)}><Archive size={17} /></button>}{isOwner && <button className="icon" aria-label={"Delete " + p.name} title="Delete account" onClick={() => acts.ask("delete", p)}><Trash2 size={17} /></button>}</>}</div></div></li>)}</ul>}
    {ed && <PartyForm party={ed} onClose={() => setEd(null)} onDone={() => { setEd(null); load(); }} />}
    {acts.modal}
    {adding && <PartyForm onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); }} />}
  </>;
}
