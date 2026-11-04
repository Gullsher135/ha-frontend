import { useEffect, useState } from "react"; import { Download, DatabaseZap } from "lucide-react";
import { api, apiBlob } from "../api.js"; import { Loading, useToast } from "../components/ui.jsx";
const when = (s) => new Date(s).toLocaleString("en-GB", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const size = (b) => (b ? (b > 1e6 ? (b / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1e3)) + " KB") : "");
export default function Backups() {
  const toast = useToast(); const [d, setD] = useState(null); const [busy, setBusy] = useState(false); const load = () => api("/backup/status").then(setD).catch((e) => toast(e.message, "err")); useEffect(() => { load(); }, []);
  if (!d) return <Loading />; const okLast = d.logs.find((l) => l.status === "ok" && l.trigger !== "download"), c = d.config, dayAgo = okLast && Date.now() - new Date(okLast.at) < 36 * 3600e3;
  const run = async () => { setBusy(true); try { const r = await api("/backup/run", { method: "POST" }); toast(r.status === "ok" ? "Backup done" : "Backup failed: " + (r.error || "")); load(); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  const dl = async () => { setBusy(true); try { const b = await apiBlob("/backup/download"), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "ha-backup-" + new Date().toISOString().slice(0, 10) + ".json.gz" + (c.encrypted ? ".enc" : ""); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); load(); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  return <>
    <header className="pagehead"><div><h1>Backups</h1><p>A copy of all your data, made every night.</p></div><div className="actions"><button className="btn ghost" onClick={dl} disabled={busy}><Download size={17} /> Download a copy</button><button className="btn" onClick={run} disabled={busy}><DatabaseZap size={17} /> Back up now</button></div></header>
    <section className={"stmt " + (dayAgo && c.offsite ? "gain" : "owe")}><div><span>{!okLast ? "No backup has run yet" : dayAgo ? "Last backup " + when(okLast.at) : "The last backup was " + when(okLast.at) + ". It is overdue."}</span><strong>{c.offsite ? "Stored off the server" : "Not stored anywhere safe"}</strong>
      <small>{c.offsite ? "Each backup is uploaded to your storage bucket." : "Backups are made but only downloaded by hand. If the server or database is lost, they are lost too."}</small></div></section>
    {!c.offsite && <div className="alert static bad">Off-server storage is not set up. Add the BACKUP_S3_* settings on Render (see the README), or download a copy regularly and keep it somewhere safe.</div>}
    {!c.encrypted && <div className="alert static">Backups are not encrypted. They contain every balance and all password hashes. Set BACKUP_PASSPHRASE on Render so the files are locked.</div>}
    {!c.cronEnabled && <div className="alert static">No outside scheduler is set (CRON_SECRET). On a free Render server that sleeps, the nightly backup may not run. See the README.</div>}
    <h3 style={{ margin: "22px 0 10px" }}>Recent backups</h3>{d.logs.length === 0 ? <p className="muted">None yet.</p> : <ul className="plist">{d.logs.map((l) => <li key={l.id}><div className="rowflex"><div><b>{{ schedule: "Nightly", cron: "Nightly (outside scheduler)", manual: "Back up now", download: "Downloaded" }[l.trigger]}</b><small>{when(l.at)}{l.bytes ? " · " + size(l.bytes) : ""}{l.offsite ? " · uploaded" : ""}{l.encrypted ? " · encrypted" : ""}{l.error && " · " + l.error}</small></div><span className={"badge " + (l.status === "ok" ? "approved" : l.status === "failed" ? "error" : "pending")}>{l.status === "ok" ? "Done" : l.status === "failed" ? "Failed" : "Running"}</span></div></li>)}</ul>}
  </>;
}
