import { useEffect, useState } from "react"; import { Link } from "react-router-dom"; import { Plus, Pencil, Trash2, ChevronLeft } from "lucide-react";
import { api } from "../api.js"; import { num, rs } from "../format.js"; import { useAuth } from "../auth.jsx"; import { Modal, Field, Empty, Loading, useToast } from "../components/ui.jsx";
export const CATS = [["jumbo_rolls", "Jumbo rolls"], ["cores", "Cores"], ["plastic", "Plastic / wrappers"], ["finished_cartons", "Finished cartons"], ["other", "Other stock"]];
export const UNITS = ["kg", "pcs", "roll", "bundle", "carton", "bag", "meter"];
export const UnitList = () => <datalist id="stock-units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>;
function Form({ item, presetCategory, onClose, onDone }) {
  const toast = useToast(); const [f, setF] = useState(item ? { category: item.category, name: item.name, unit: item.unit || "", rate: item.rate == null ? "" : String(item.rate) } : { category: presetCategory || "jumbo_rolls", name: "", unit: "", rate: "" }); const [busy, setBusy] = useState(false); const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const save = async (e) => { e.preventDefault(); setBusy(true);
    try { const body = { category: f.category, name: f.name, unit: f.unit, rate: f.rate === "" ? null : Number(f.rate) }; await api(item ? "/stock-items/" + item.id : "/stock-items", { method: item ? "PATCH" : "POST", body }); toast(item ? "Stock item updated" : "Stock item added"); onDone(); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  return <Modal title={item ? "Edit stock item" : "Add a stock item"} onClose={onClose}><form onSubmit={save}>
    <Field label="Which stock is it?"><select value={f.category} onChange={(e) => set("category", e.target.value)}>{CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
    <Field label="Name or variety" hint="For example: Pink, White, Dream, 3 inch core, Printed wrapper."><input value={f.name} onChange={(e) => set("name", e.target.value)} required autoFocus /></Field>
    <div className="two"><Field label="Unit"><input list="stock-units" value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="kg, pcs, roll…" /></Field><Field label="Usual rate per unit (Rs, optional)" hint="Only a starting value. You can change it in every stock count."><input type="number" min="0" step="0.01" inputMode="decimal" value={f.rate} onChange={(e) => set("rate", e.target.value)} /></Field></div>
    <UnitList /><footer><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={busy}>{item ? "Save changes" : "Add item"}</button></footer></form></Modal>;
}
export default function StockItems() {
  const { isOwner } = useAuth(); const toast = useToast(); const [rows, setRows] = useState(null); const [edit, setEdit] = useState(null); const [del, setDel] = useState(null);
  const load = () => api("/stock-items?active=all").then(setRows).catch((e) => toast(e.message, "err")); useEffect(() => { load(); }, []);
  if (!rows) return <Loading />;
  const toggle = async (i) => { try { await api("/stock-items/" + i.id, { method: "PATCH", body: { active: !i.active } }); load(); } catch (x) { toast(x.message, "err"); } };
  const remove = async () => { try { await api("/stock-items/" + del.id, { method: "DELETE" }); toast("Deleted"); setDel(null); load(); } catch (x) { toast(x.message, "err"); setDel(null); } };
  return <>
    <Link to="/stock" className="back"><ChevronLeft size={18} /> Stock count</Link>
    <header className="pagehead"><div><h1>Stock items</h1><p>Save each kind of stock once (Jumbo roll: Pink, White, Dream…). Then pick it in the stock count and only enter the quantity.</p></div><button className="btn" onClick={() => setEdit({})}><Plus size={18} /> Add stock item</button></header>
    {rows.length === 0 ? <Empty title="No stock items yet" text="Add your first one, for example Jumbo roll, Pink, kg. Items you type into a stock count are saved here automatically too." /> :
      CATS.map(([k, label]) => { const mine = rows.filter((i) => i.category === k); return <div key={k}><div className="rowflex" style={{ padding: "18px 0 6px" }}><h3 style={{ margin: 0 }}>{label}</h3><button className="btn ghost sm" onClick={() => setEdit({ preset: k })}><Plus size={14} /> Add</button></div>
        {mine.length === 0 ? <p className="muted" style={{ marginTop: 0 }}>Nothing saved yet.</p> : <ul className="plist">{mine.map((i) => <li key={i.id} className={i.active ? "" : "off"}><div className="rowflex"><div><b>{i.name}</b><small>{i.unit || "No unit"}{i.rate != null && ` · usual rate ${rs(i.rate)} per ${i.unit || "unit"}`}{!i.active && " · Hidden"}</small></div>
          <div className="rowact"><button className="icon" onClick={() => setEdit(i)} aria-label={"Edit " + i.name}><Pencil size={17} /></button><button className="btn ghost sm" onClick={() => toggle(i)}>{i.active ? "Hide" : "Show"}</button>{isOwner && <button className="icon" onClick={() => setDel(i)} aria-label={"Delete " + i.name}><Trash2 size={17} /></button>}</div></div></li>)}</ul>}</div>; })}
    {edit && <Form item={edit.id ? edit : null} presetCategory={edit.preset} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
    {del && <Modal title={`Delete ${del.name}?`} onClose={() => setDel(null)}><p>This only works if it was never used in a saved stock count. Otherwise the system will ask you to hide it instead. Old stock counts are never changed.</p><footer><button className="btn ghost" onClick={() => setDel(null)}>Keep it</button><button className="btn danger" onClick={remove}>Delete</button></footer></Modal>}
  </>;
}
