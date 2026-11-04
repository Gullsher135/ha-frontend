import { useEffect, useState } from "react"; import { Link, useSearchParams } from "react-router-dom"; import { Plus, Search } from "lucide-react";
import { api } from "../api.js"; import { rs, fdate, monthStart } from "../format.js"; import { Empty, Loading, useToast } from "../components/ui.jsx";
export const Badge = ({ s }) => <span className={"badge " + s}>{s === "pending" ? "Pending" : s === "approved" ? "Approved" : "Cancelled"}</span>;
export default function Invoices() {
  const toast = useToast(); const [sp, setSp] = useSearchParams(); const [rows, setRows] = useState(null); const [r, setR] = useState({ from: sp.get("status") ? "" : monthStart(), to: "", number: "" }); const status = sp.get("status") || "";
  useEffect(() => { setRows(null); const qs = new URLSearchParams(Object.entries({ ...r, status }).filter(([, v]) => v)).toString(); api("/invoices?" + qs).then(setRows).catch((e) => toast(e.message, "err")); }, [r, status]);
  return <>
    <header className="pagehead"><div><h1>Invoices</h1><p>Numbers start from 1 and are never reused.</p></div><Link className="btn" to="/invoices/new"><Plus size={18} /> New invoice</Link></header>
    <div className="seg">{[["", "All"], ["pending", "Pending"], ["approved", "Approved"], ["cancelled", "Cancelled"]].map(([k, l]) => <button key={k} aria-selected={status === k} onClick={() => setSp(k ? { status: k } : {})}>{l}</button>)}</div>
    <div className="filters"><div className="search" style={{ flex: 1, minWidth: 180, marginBottom: 0 }}><Search size={18} /><input placeholder="Invoice number" inputMode="numeric" value={r.number} onChange={(e) => setR({ ...r, number: e.target.value.replace(/\D/g, "") })} aria-label="Invoice number" /></div>
      <div className="dates"><label>From <input type="date" value={r.from} onChange={(e) => setR({ ...r, from: e.target.value })} /></label><label>To <input type="date" value={r.to} onChange={(e) => setR({ ...r, to: e.target.value })} /></label></div></div>
    {!rows ? <Loading /> : rows.length === 0 ? <Empty title="No invoices here" text="Create an invoice and it appears in this list." action={<Link className="btn" to="/invoices/new">New invoice</Link>} /> :
      <ul className="plist">{rows.map((i) => <li key={i.id} className={i.status === "cancelled" ? "off" : ""}><Link to={"/invoices/" + i.id}><div><b>#{i.number} · {i.customerName}</b><small>{fdate(i.date)}{i.missing > 0 && ` · ${i.missing} rate${i.missing > 1 ? "s" : ""} missing`}</small></div>
        <div className="bal"><b>{i.total == null ? "—" : rs(i.total)}</b><Badge s={i.status} /></div></Link></li>)}</ul>}
  </>;
}
