import { useEffect, useState } from "react"; import { Plus, Pencil } from "lucide-react";
import { api } from "../api.js"; import { Modal, Field, Empty, Loading, useToast } from "../components/ui.jsx";
const KINDS = { product: "Finished product", b_grade: "B-grade goods", waste: "Waste", raw: "Raw material", other: "Other" };
function Form({ item, onClose, onDone }) {
  const toast = useToast(); const [f, setF] = useState(item || { name: "", unit: "carton", pcsPerCarton: "", kind: "product" }); const [busy, setBusy] = useState(false); const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const save = async (e) => { e.preventDefault(); setBusy(true);
    try { const body = { name: f.name, unit: f.unit, kind: f.kind, ...(f.unit === "carton" && { pcsPerCarton: Number(f.pcsPerCarton) }) };
      await api(item ? "/items/" + item._id : "/items", { method: item ? "PATCH" : "POST", body }); toast(item ? "Item updated" : "Item added"); onDone(); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  return <Modal title={item ? "Edit item" : "Add an item"} onClose={onClose}><form onSubmit={save}>
    <Field label="Item name"><input value={f.name} onChange={(e) => set("name", e.target.value)} required autoFocus /></Field>
    <Field label="Sold or counted in"><select value={f.unit} onChange={(e) => set("unit", e.target.value)}><option value="carton">Carton</option><option value="kg">Kg</option><option value="piece">Piece</option></select></Field>
    {f.unit === "carton" && <Field label="Pieces in each carton"><input type="number" min="1" step="1" inputMode="numeric" value={f.pcsPerCarton || ""} onChange={(e) => set("pcsPerCarton", e.target.value)} required /></Field>}
    <Field label="Kind" hint="Keep B-grade goods and waste as separate items."><select value={f.kind} onChange={(e) => set("kind", e.target.value)}>{Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
    <footer><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={busy}>{item ? "Save changes" : "Add item"}</button></footer></form></Modal>;
}
export default function Items() {
  const toast = useToast(); const [rows, setRows] = useState(null); const [edit, setEdit] = useState(null);
  const load = () => api("/items?active=all").then(setRows).catch((e) => toast(e.message, "err")); useEffect(() => { load(); }, []);
  if (!rows) return <Loading />;
  const toggle = async (i) => { try { await api("/items/" + i._id, { method: "PATCH", body: { active: !i.active } }); load(); } catch (x) { toast(x.message, "err"); } };
  return <>
    <header className="pagehead"><div><h1>Items</h1><p>Your product list with units and pieces per carton.</p></div><button className="btn" onClick={() => setEdit({})}><Plus size={18} /> Add item</button></header>
    {rows.length === 0 ? <Empty title="No items yet" text="Add the items you buy and sell. You can change them later." /> :
      <ul className="plist">{rows.map((i) => <li key={i._id} className={i.active ? "" : "off"}><div className="rowflex"><div><b>{i.name}</b><small>{KINDS[i.kind]} · {i.unit === "carton" ? `Carton of ${i.pcsPerCarton}` : i.unit === "kg" ? "Per kg" : "Per piece"}{!i.active && " · Hidden"}</small></div>
        <div className="rowact"><button className="icon" onClick={() => setEdit(i)} aria-label={"Edit " + i.name}><Pencil size={17} /></button><button className="btn ghost sm" onClick={() => toggle(i)}>{i.active ? "Hide" : "Show"}</button></div></div></li>)}</ul>}
    {edit && <Form item={edit._id ? edit : null} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
  </>;
}
