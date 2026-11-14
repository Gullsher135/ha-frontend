import { useEffect, useState } from "react"; import { Link } from "react-router-dom"; import { Plus, LogOut, Archive, RotateCcw, UserCheck } from "lucide-react"; import { useAuth } from "../auth.jsx"; import { api as http } from "../api.js";
import { api } from "../api.js"; import { rs, tone } from "../format.js"; import { Empty, Loading, useToast } from "../components/ui.jsx"; import { PartyForm, ResignDialog, useAccountActions } from "./Parties.jsx";
const T = { special: { h: "Special accounts", p: "Things that are not normal buying and selling, like a vehicle installment or a machine advance. Kept out of profit and loss.", add: "Add account", none: "No special accounts yet", noneText: "Add one, for example Imran's vehicle installment or Arif's machine advance." },
  worker: { h: "Workers", p: "Advance salary and goods taken on credit. The total below is what to deduct at salary time.", add: "Add worker", none: "No workers yet", noneText: "Add each worker to keep his advance and credit in one place." } };
export default function Accounts({ category }) {
  const toast = useToast(); const { isOwner } = useAuth(); const t = T[category]; const [rows, setRows] = useState(null); const [add, setAdd] = useState(false); const [tab, setTab] = useState("working"); const [res, setRes] = useState(null); const isW = category === "worker";
  const qs = !isW ? "" : tab === "closed" ? "&active=false" : tab === "resigned" ? "&employment=resigned" : "&employment=working";
  const load = () => api("/parties?category=" + category + qs).then(setRows).catch((e) => toast(e.message, "err")); useEffect(() => { setRows(null); load(); }, [category, tab]);
  const acts = useAccountActions(load); const back = async (p) => { try { await http(`/parties/${p.id}/reinstate`, { method: "POST" }); toast(p.name + " is working again"); load(); } catch (x) { toast(x.message, "err"); } };
  if (!rows) return <Loading />;
  const owed = rows.filter((p) => p.net > 0).reduce((s, p) => s + p.net, 0), owe = rows.filter((p) => p.net < 0).reduce((s, p) => s - p.net, 0);
  return <>
    <header className="pagehead"><div><h1>{t.h}</h1><p>{t.p}</p></div><button className="btn" onClick={() => setAdd(true)}><Plus size={18} /> {t.add}</button></header>
    {isW && <div className="seg" role="tablist">{[["working", "Working"], ["resigned", "Resigned (to settle)"], ["closed", "Closed"]].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>}
    {rows.length > 0 && <section className="duo">{category === "worker" ? <div className="tally gain"><span>To deduct at salary time</span><strong>{rs(owed)}</strong><small>across {rows.filter((p) => p.net > 0).length} workers</small></div> :
      <><div className="tally gain"><span>Owed to you</span><strong>{rs(owed)}</strong></div><div className="tally owe"><span>You owe</span><strong>{rs(owe)}</strong></div></>}</section>}
    {rows.length === 0 ? <Empty title={isW && tab !== "working" ? (tab === "resigned" ? "No resigned workers" : "No closed accounts") : t.none} text={isW && tab === "resigned" ? "When a worker leaves, open his account and tap Resign. He moves here until his advance is settled." : isW && tab === "closed" ? "Settled workers you closed appear here." : t.noneText} /> : <ul className="plist">{rows.map((p) => <li key={p.id}><div className="rowfull"><Link to={"/parties/" + p.id}><div><b>{p.name}</b><small>{p.employment === "resigned" ? `Resigned ${p.resignedOn || ""}${p.resignNote ? " · " + p.resignNote : ""}` : p.notes || (category === "worker" ? "Worker" : "Special account")}</small></div>
      <div className={"bal " + tone(p.direction)}><b>{p.direction === "settled" ? "Settled" : rs(p.balance)}</b>{p.direction !== "settled" && <small>{category === "worker" && p.direction === "party_owes_us" ? "to deduct" : p.direction === "party_owes_us" ? "owes you" : "you owe"}</small>}</div></Link>
      {isW && <div className="rowact">{tab === "working" && <button className="btn ghost sm" onClick={() => setRes(p)}><LogOut size={14} /> Resign</button>}
        {tab === "resigned" && <><button className="btn ghost sm" onClick={() => back(p)}><UserCheck size={14} /> Working again</button>{isOwner && <button className="btn ghost sm" disabled={p.direction !== "settled"} title={p.direction !== "settled" ? "Settle the balance first" : "Close account"} onClick={() => acts.ask("close", p)}><Archive size={14} /> Close</button>}</>}
        {tab === "closed" && isOwner && <button className="btn ghost sm" onClick={() => acts.reopen(p)}><RotateCcw size={14} /> Reopen</button>}</div>}</div></li>)}</ul>}
    {res && <ResignDialog party={res} balance={res.net} onClose={() => setRes(null)} onDone={() => { setRes(null); load(); }} />}
    {acts.modal}
    {add && <PartyForm presetCategory={category} onClose={() => setAdd(false)} onDone={() => { setAdd(false); load(); }} />}
  </>;
}
