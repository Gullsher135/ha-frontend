import { useEffect, useState } from "react"; import { Link } from "react-router-dom"; import { Plus } from "lucide-react";
import { api } from "../api.js"; import { rs, tone } from "../format.js"; import { Empty, Loading, useToast } from "../components/ui.jsx"; import { PartyForm } from "./Parties.jsx";
const T = { special: { h: "Special accounts", p: "Things that are not normal buying and selling, like a vehicle installment or a machine advance. Kept out of profit and loss.", add: "Add account", none: "No special accounts yet", noneText: "Add one, for example Imran's vehicle installment or Arif's machine advance." },
  worker: { h: "Workers", p: "Advance salary and goods taken on credit. The total below is what to deduct at salary time.", add: "Add worker", none: "No workers yet", noneText: "Add each worker to keep his advance and credit in one place." } };
export default function Accounts({ category }) {
  const toast = useToast(); const t = T[category]; const [rows, setRows] = useState(null); const [add, setAdd] = useState(false);
  const load = () => api("/parties?category=" + category).then(setRows).catch((e) => toast(e.message, "err")); useEffect(() => { setRows(null); load(); }, [category]);
  if (!rows) return <Loading />;
  const owed = rows.filter((p) => p.net > 0).reduce((s, p) => s + p.net, 0), owe = rows.filter((p) => p.net < 0).reduce((s, p) => s - p.net, 0);
  return <>
    <header className="pagehead"><div><h1>{t.h}</h1><p>{t.p}</p></div><button className="btn" onClick={() => setAdd(true)}><Plus size={18} /> {t.add}</button></header>
    {rows.length > 0 && <section className="duo">{category === "worker" ? <div className="tally gain"><span>To deduct at salary time</span><strong>{rs(owed)}</strong><small>across {rows.filter((p) => p.net > 0).length} workers</small></div> :
      <><div className="tally gain"><span>Owed to you</span><strong>{rs(owed)}</strong></div><div className="tally owe"><span>You owe</span><strong>{rs(owe)}</strong></div></>}</section>}
    {rows.length === 0 ? <Empty title={t.none} text={t.noneText} /> : <ul className="plist">{rows.map((p) => <li key={p.id}><Link to={"/parties/" + p.id}><div><b>{p.name}</b><small>{p.notes || (category === "worker" ? "Worker" : "Special account")}</small></div>
      <div className={"bal " + tone(p.direction)}><b>{p.direction === "settled" ? "Settled" : rs(p.balance)}</b>{p.direction !== "settled" && <small>{category === "worker" && p.direction === "party_owes_us" ? "to deduct" : p.direction === "party_owes_us" ? "owes you" : "you owe"}</small>}</div></Link></li>)}</ul>}
    {add && <PartyForm presetCategory={category} onClose={() => setAdd(false)} onDone={() => { setAdd(false); load(); }} />}
  </>;
}
