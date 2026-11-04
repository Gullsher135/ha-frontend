import { useEffect, useState } from "react"; import { Link } from "react-router-dom"; import { Plus, Search } from "lucide-react";
import { api } from "../api.js"; import { rs, tone } from "../format.js"; import { Modal, Field, Empty, Loading, useToast } from "../components/ui.jsx";
const TABS = [["all", "Everyone"], ["customer", "Customers"], ["supplier", "Suppliers"], ["special", "Special accounts"], ["worker", "Workers"]];
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
export default function Parties() {
  const toast = useToast(); const [ps, setPs] = useState(null); const [tab, setTab] = useState("all"); const [q, setQ] = useState(""); const [adding, setAdding] = useState(false);
  const load = () => api("/parties").then(setPs).catch((e) => toast(e.message, "err")); useEffect(() => { load(); }, []);
  if (!ps) return <Loading />;
  const rows = ps.filter((p) => (tab === "all" || (tab === "customer" ? p.isCustomer : tab === "supplier" ? p.isSupplier : p.category === tab)) && p.name.toLowerCase().includes(q.toLowerCase()));
  return <>
    <header className="pagehead"><div><h1>Customers & suppliers</h1><p>{ps.length} accounts. Tap a name to open the ledger.</p></div><button className="btn" onClick={() => setAdding(true)}><Plus size={18} /> Add party</button></header>
    <div className="seg" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
    <div className="search"><Search size={18} /><input placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search by name" /></div>
    {rows.length === 0 ? <Empty title={q ? "No match" : "Nothing in this list yet"} text={q ? "Try a different spelling." : "Add a party to see it here."} /> :
      <ul className="plist">{rows.map((p) => <li key={p.id}><Link to={"/parties/" + p.id}>
        <div><b>{p.name}</b><small>{[p.isCustomer && "Customer", p.isSupplier && "Supplier", p.category === "special" && "Special account", p.category === "worker" && "Worker"].filter(Boolean).join(" and ")}</small></div>
        <div className={"bal " + tone(p.direction)}><b>{p.direction === "settled" ? "Settled" : rs(p.balance)}</b>{p.direction !== "settled" && <small>{p.direction === "party_owes_us" ? "owes you" : "you owe"}</small>}</div></Link></li>)}</ul>}
    {adding && <PartyForm onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); }} />}
  </>;
}
