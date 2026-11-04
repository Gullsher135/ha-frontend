import { useEffect, useState } from "react"; import { api } from "../api.js"; import { Loading, Empty, useToast } from "../components/ui.jsx";
export default function Activity() {
  const toast = useToast(); const [rows, setRows] = useState(null); const [page, setPage] = useState(1); const [total, setTotal] = useState(0);
  useEffect(() => { api("/audit?page=" + page).then((r) => { setRows((x) => (page === 1 ? r.rows : [...x, ...r.rows])); setTotal(r.total); }).catch((e) => toast(e.message, "err")); }, [page]);
  if (!rows) return <Loading />;
  const when = (s) => new Date(s).toLocaleString("en-GB", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  return <><header className="pagehead"><div><h1>Activity</h1><p>Every change, with who made it and when.</p></div></header>
    {rows.length === 0 ? <Empty title="No activity yet" text="Changes will be listed here." /> : <ul className="plist feed">{rows.map((r) => <li key={r._id}><div><b>{r.summary || r.action}</b><small>{r.username} ({r.role})</small></div><time>{when(r.at)}</time></li>)}</ul>}
    {rows.length < total && <button className="btn ghost wide" onClick={() => setPage(page + 1)}>Show older</button>}</>;
}
