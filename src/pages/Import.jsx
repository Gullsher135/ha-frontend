import { useEffect, useMemo, useState } from "react"; import { Link } from "react-router-dom";
import { api } from "../api.js"; import { num, rs, fdate } from "../format.js"; import { parseTable } from "../csv.js"; import { Modal, Field, Empty, Loading, useToast } from "../components/ui.jsx";
const SB = ({ s }) => <span className={"badge " + s}>{{ ok: "OK", repaired: "Repaired", unclear: "Check", skipped: "Left out", error: "Problem", exists: "Already there", duplicate: "Twice in file" }[s] || s}</span>;
const TA = ({ value, onChange, placeholder }) => <textarea className="ta" rows={7} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} spellCheck={false} />;
const readFile = (setter) => async (e) => { const f = e.target.files?.[0]; if (f) setter(await f.text()); e.target.value = ""; };
/* ---------------- 1. accounts ---------------- */
function Accounts() {
  const toast = useToast(); const [text, setText] = useState(""); const [res, setRes] = useState(null); const [busy, setBusy] = useState(false);
  const rows = useMemo(() => { const t = parseTable(text); if (!t.length) return []; const head = t[0].map((h) => h.toLowerCase()), has = head.some((h) => /name/.test(h)), ix = (re, d) => { const i = head.findIndex((h) => re.test(h)); return has && i >= 0 ? i : d; };
    const [n, p, ty, no] = [ix(/name/, 0), ix(/phone|mobile|cell|contact/, 1), ix(/type|kind|category/, 2), ix(/note|remark|detail/, 3)]; return (has ? t.slice(1) : t).map((r) => ({ name: r[n], phone: r[p], type: r[ty], notes: r[no] })); }, [text]);
  useEffect(() => setRes(null), [text]);
  const check = async () => { setBusy(true); try { setRes(await api("/import/parties/preview", { method: "POST", body: { rows } })); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  const commit = async () => { setBusy(true); try { const r = await api("/import/parties/commit", { method: "POST", body: { rows } }); toast(`${r.created} accounts added`); setText(""); setRes(null); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  const ok = res?.counts.ok || 0;
  return <><p className="muted">Paste your list from Excel, or choose a CSV file. Columns: <b>Name, Phone, Type, Notes</b>. Type is customer, supplier, both, special or worker. Each customer or supplier is added once. Names already in the system are skipped.</p>
    <TA value={text} onChange={setText} placeholder={"Name\tPhone\tType\nZahid\t0300 1234567\tboth\nArif\t\tboth\nBilal\t\tworker"} />
    <div className="actions" style={{ margin: "10px 0 16px" }}><label className="btn ghost">Choose a file<input type="file" accept=".csv,.tsv,.txt" hidden onChange={readFile(setText)} /></label><button className="btn" disabled={!rows.length || busy} onClick={check}>Check {rows.length || ""} rows</button></div>
    {res && <><ul className="plist">{res.rows.filter((r) => r.status !== "skipped").map((r) => <li key={r.index}><div className="rowflex"><div><b>{r.name}</b><small>{r.type || ""}{r.phone ? " · " + r.phone : ""}{r.reason && " · " + r.reason}</small></div><SB s={r.status} /></div></li>)}</ul>
      <button className="btn big" style={{ marginTop: 14 }} disabled={!ok || busy} onClick={commit}>Add {ok} account{ok === 1 ? "" : "s"}</button></>}</>;
}
/* ---------------- 2. one ledger ---------------- */
const guess = (head, re) => { const i = head.findIndex((h) => re.test(String(h).toLowerCase())); return i >= 0 ? String(i) : ""; };
function Ledgers() {
  const toast = useToast(); const [parties, setParties] = useState(null); const [batches, setBatches] = useState([]); const [f, setF] = useState({ party: "", year: "2026", order: "dmy", header: true, swap: false, oAmt: "", oSide: "owes_us", eAmt: "", eSide: "owes_us" });
  const [text, setText] = useState(""); const [map, setMap] = useState({ date: "", details: "", debit: "", credit: "" }); const [rows, setRows] = useState(null); const [res, setRes] = useState(null); const [dirty, setDirty] = useState(true); const [busy, setBusy] = useState(false); const [rm, setRm] = useState(null);
  const loadB = () => api("/import/batches").then((b) => setBatches(b.filter((x) => x.kind === "ledger" && !x.removed))).catch(() => {});
  useEffect(() => { api("/parties?active=true").then(setParties).catch((e) => toast(e.message, "err")); loadB(); }, []);
  const table = useMemo(() => parseTable(text), [text]), head = f.header && table.length ? table[0] : (table[0] || []).map((_, i) => "Column " + (i + 1)), body = f.header ? table.slice(1) : table;
  useEffect(() => { setRows(null); setRes(null); const h = head.map((x) => String(x).toLowerCase()); setMap({ date: guess(h, /date|tarikh|dt\b/), details: guess(h, /detail|desc|narration|particular|remark|note|item/), debit: guess(h, /debit|^dr|sale|bill|due|banam/), credit: guess(h, /credit|^cr|receiv|recv|payment|paid|jama/) }); }, [text, f.header]);
  if (!parties) return <Loading />;
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setDirty(true); }; const cell = (r, k) => (map[k] === "" ? "" : r[+map[k]] ?? "");
  const build = () => body.map((r) => ({ date: cell(r, "date"), details: cell(r, "details"), debit: cell(r, f.swap ? "credit" : "debit"), credit: cell(r, f.swap ? "debit" : "credit"), markCheck: false }));
  const payload = (rs_) => ({ party: f.party, order: f.order, year: +f.year || undefined, rows: rs_.map((r) => ({ ...r, date: r.date || "" })),
    ...(Number(f.oAmt) > 0 && { opening: { amount: Number(f.oAmt), side: f.oSide, date: `${f.year || 2026}-01-01` } }), ...(f.eAmt !== "" && { expected: { amount: Number(f.eAmt), side: f.eSide } }) });
  const check = async (rs_) => { setBusy(true); try { const r = await api("/import/ledger/preview", { method: "POST", body: payload(rs_) });
    setRows(rs_.map((x, i) => ({ ...x, date: r.rows[i]?.date || x.date }))); setRes(r); setDirty(false); } catch (x) { toast(x.message + (x.details ? ": " + x.details.join(", ") : ""), "err"); } setBusy(false); };
  const edit = (i, p) => { setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r))); setDirty(true); };
  const commit = async () => { setBusy(true); try { const r = await api("/import/ledger/commit", { method: "POST", body: payload(rows) }); toast(`${r.party}: ${r.entries} entries imported${r.flagged ? `, ${r.flagged} marked for the owner to check` : ""}`); setText(""); setRows(null); setRes(null); setF({ ...f, party: "", oAmt: "", eAmt: "" }); loadB(); }
    catch (x) { toast(x.message + (x.details ? ": " + x.details.join(" · ") : ""), "err"); } setBusy(false); };
  const remove = async () => { try { await api(`/import/batches/${rm.id}/remove`, { method: "POST" }); toast("Import removed. You can load it again."); setRm(null); loadB(); } catch (x) { toast(x.message, "err"); setRm(null); } };
  const sel = (k) => <select value={map[k]} onChange={(e) => { setMap({ ...map, [k]: e.target.value }); setDirty(true); }}><option value="">(none)</option>{head.map((h, i) => <option key={i} value={i}>{h || "Column " + (i + 1)}</option>)}</select>;
  const money = (m) => (m.text === "settled" ? "Rs 0" : `${rs(m.rupees)} (${m.text})`);
  return <>
    <p className="muted">Load one account's ledger at a time. It is only saved when the total matches the closing balance in your Excel sheet.</p>
    <div className="two"><Field label="Account"><select value={f.party} onChange={(e) => set("party", e.target.value)}><option value="">Choose an account</option>{parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Year of the ledger"><input value={f.year} onChange={(e) => set("year", e.target.value)} inputMode="numeric" /></Field></div>
    <TA value={text} onChange={setText} placeholder={"Paste the ledger rows from Excel here (include the heading row)"} />
    <div className="actions" style={{ margin: "8px 0 14px" }}><label className="btn ghost">Choose a file<input type="file" accept=".csv,.tsv,.txt" hidden onChange={readFile(setText)} /></label><label className="checks" style={{ margin: 0 }}><span><input type="checkbox" checked={f.header} onChange={(e) => set("header", e.target.checked)} /> First row is a heading</span></label></div>
    {table.length > 0 && <div className="card2"><h3>Which column is which?</h3><p className="muted" style={{ marginTop: 0 }}>{body.length} rows found. Debit = the customer owes you more (a sale). Credit = money received or returned.</p>
      <div className="two"><Field label="Date column">{sel("date")}</Field><Field label="Details column">{sel("details")}</Field><Field label="Debit column">{sel("debit")}</Field><Field label="Credit column">{sel("credit")}</Field></div>
      <label className="checks"><span><input type="checkbox" checked={f.swap} onChange={(e) => set("swap", e.target.checked)} /> My sheet's left amount column is actually the payments (swap debit and credit)</span></label>
      <div className="two"><Field label="Dates in the sheet are"><select value={f.order} onChange={(e) => set("order", e.target.value)}><option value="dmy">Day / Month / Year</option><option value="mdy">Month / Day / Year</option></select></Field><span /></div>
      <div className="two"><Field label="Balance brought forward (optional)"><input type="number" step="0.01" min="0" value={f.oAmt} onChange={(e) => set("oAmt", e.target.value)} placeholder="Amount at the start of the year" /></Field><Field label=" "><select value={f.oSide} onChange={(e) => set("oSide", e.target.value)}><option value="owes_us">They owe us</option><option value="we_owe">We owe them</option></select></Field></div>
      <div className="two"><Field label="Closing balance in your Excel sheet" hint="The ledger must add up to exactly this."><input type="number" step="0.01" min="0" value={f.eAmt} onChange={(e) => set("eAmt", e.target.value)} placeholder="0 if settled" /></Field><Field label=" "><select value={f.eSide} onChange={(e) => set("eSide", e.target.value)}><option value="owes_us">They owe us</option><option value="we_owe">We owe them</option></select></Field></div>
      <button className="btn" disabled={busy || !f.party || !body.length || map.date === "" || (map.debit === "" && map.credit === "")} onClick={() => check(rows && !dirty ? rows : rows && dirty ? rows : build())}>{rows ? "Check again" : "Check this ledger"}</button>
      {rows && <button className="btn ghost" style={{ marginLeft: 8 }} disabled={busy} onClick={() => check(build())}>Start over from the pasted text</button>}</div>}
    {res && rows && <>
      <section className={"stmt " + (res.canCommit && !dirty ? "gain" : "owe")}><div><span>{res.canCommit && !dirty ? "Matches your Excel sheet" : "Not ready yet"}</span><strong>{res.difference === 0 ? "Difference: Rs 0" : "Difference: " + rs(Math.abs(res.difference))}</strong>
        <small>Ledger adds up to {money(res.closing)}. Your Excel closing: {money(res.expected)}.</small></div></section>
      {res.blockers.length > 0 && <div className="alert static bad"><ul style={{ margin: 0, paddingLeft: 18 }}>{res.blockers.map((b) => <li key={b}>{b}</li>)}</ul></div>}
      <p className="muted">{res.counts.ok} fine · {res.counts.repaired} dates repaired automatically · {res.counts.unclear} unclear (will be marked for the owner to check) · {res.counts.skipped} left out · {res.counts.error} with a problem{dirty && " · You changed something. Check again."}</p>
      <div className="igrid"><div className="irow h"><span>Status</span><span>Date</span><span>Details</span><span>Debit</span><span>Credit</span><span>Ask owner</span><span /></div>
        {rows.map((r, i) => { const s = res.rows[i]; return <div key={i} className={"irow " + (s?.status || "")}><span><SB s={s?.status || "ok"} />{s?.reason && <small>{s.reason}</small>}</span>
          <input type="date" aria-label="Date" value={/^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : ""} onChange={(e) => edit(i, { date: e.target.value })} /><input aria-label="Details" value={r.details} onChange={(e) => edit(i, { details: e.target.value })} />
          <input aria-label="Debit" value={r.debit} inputMode="decimal" onChange={(e) => edit(i, { debit: e.target.value })} /><input aria-label="Credit" value={r.credit} inputMode="decimal" onChange={(e) => edit(i, { credit: e.target.value })} />
          <input type="checkbox" aria-label="Ask the owner to check this row" checked={r.markCheck} onChange={(e) => edit(i, { markCheck: e.target.checked })} /><button className="icon" aria-label="Remove row" onClick={() => { setRows(rows.filter((_, j) => j !== i)); setDirty(true); }}>×</button></div>; })}</div>
      <button className="btn big" style={{ marginTop: 14 }} disabled={busy || dirty || !res.canCommit} onClick={commit}>Import {res.entries} entries</button></>}
    {batches.length > 0 && <><h3 style={{ margin: "26px 0 10px" }}>Ledgers imported so far ({batches.length})</h3><ul className="plist">{batches.map((b) => <li key={b.id}><div className="rowflex"><div><b>{b.party}</b><small>{b.entries} entries{b.flagged ? ` · ${b.flagged} to check` : ""} · {fdate(b.at.slice(0, 10))}</small></div><button className="btn ghost sm" onClick={() => setRm(b)}>Remove</button></div></li>)}</ul></>}
    {rm && <Modal title={`Remove the import of ${rm.party}?`} onClose={() => setRm(null)}><p>Its {rm.entries} entries are deleted so you can load the ledger again. This is only possible before go-live.</p><footer><button className="btn ghost" onClick={() => setRm(null)}>Keep it</button><button className="btn danger" onClick={remove}>Remove import</button></footer></Modal>}
  </>;
}
/* ---------------- 3. owner review ---------------- */
function Review() {
  const toast = useToast(); const [rows, setRows] = useState(null); const load = () => api("/import/review").then(setRows).catch((e) => toast(e.message, "err")); useEffect(() => { load(); }, []);
  const ok = async (id) => { try { await api(`/import/entries/${id}/check`, { method: "POST" }); load(); } catch (x) { toast(x.message, "err"); } };
  if (!rows) return <Loading />;
  return rows.length === 0 ? <Empty title="Nothing to check" text="Imported entries with unclear dates will appear here." /> : <><p className="muted">These imported entries had a date that could not be read with confidence. Look at the date and amount in your Excel sheet. If the entry is right, tap "Looks right". To fix a wrong date, open the account and correct the entry.</p>
    <ul className="plist">{rows.map((r) => <li key={r.id}><div className="rowflex"><div><b><Link to={"/parties/" + r.party.id}>{r.party.name}</Link> · {fdate(r.date)}</b><small>{r.details || "No details"} · {r.debit ? "Debit " + num(r.debit) : "Credit " + num(r.credit)} · {r.reason}</small></div><button className="btn ghost sm" onClick={() => ok(r.id)}>Looks right</button></div></li>)}</ul></>;
}
/* ---------------- 4. go live ---------------- */
function GoLive() {
  const toast = useToast(); const [d, setD] = useState(null); const [pick, setPick] = useState(new Set()); const [dlg, setDlg] = useState(null); const [busy, setBusy] = useState(false);
  const load = () => api("/import/golive").then((x) => { setD(x); setPick(new Set()); }).catch((e) => toast(e.message, "err")); useEffect(() => { load(); }, []);
  if (!d) return <Loading />;
  const confirm = async (list) => { setBusy(true); try { await api("/import/confirm", { method: "POST", body: { items: list.map((r) => ({ party: r.id, net: r.net })) } }); toast(`${list.length} balance${list.length > 1 ? "s" : ""} confirmed`); setDlg(null); load(); } catch (x) { toast(x.message, "err"); load(); } setBusy(false); };
  const live = async () => { setBusy(true); try { await api("/import/go-live", { method: "POST" }); toast("The system is now live"); setDlg(null); load(); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  const todo = d.rows.filter((r) => !r.confirmed), chosen = d.rows.filter((r) => pick.has(r.id));
  return <>
    {d.live ? <div className="alert static" style={{ background: "var(--gain-bg)", color: "var(--gain)" }}>The system has been live since {fdate(d.live)}.</div> : <p className="muted">Before you start using the system, check every balance against your Excel sheet and confirm it. If a balance changes after you confirmed it, it needs confirming again.</p>}
    <section className="duo"><div className={"tally " + (d.unconfirmed ? "owe" : "gain")}><span>Balances to confirm</span><strong>{d.unconfirmed}</strong><small>of {d.rows.length} accounts with a balance</small></div><div className={"tally " + (d.unchecked ? "owe" : "gain")}><span>Imported entries to check</span><strong>{d.unchecked}</strong><small>unclear dates the owner must look at</small></div></section>
    {d.rows.length === 0 ? <Empty title="No balances yet" text="Import your ledgers first." /> : <>
      <div className="actions" style={{ marginBottom: 10 }}><button className="btn" disabled={!chosen.length || busy} onClick={() => confirm(chosen)}>Confirm {chosen.length || ""} selected</button><button className="btn ghost" disabled={!todo.length || busy} onClick={() => setDlg("all")}>Confirm all {todo.length} remaining</button></div>
      <ul className="plist">{d.rows.map((r) => <li key={r.id}><div className="rowflex"><label className="rowic" style={{ flex: 1 }}>{!r.confirmed && <input type="checkbox" checked={pick.has(r.id)} onChange={(e) => { const s = new Set(pick); e.target.checked ? s.add(r.id) : s.delete(r.id); setPick(s); }} aria-label={"Select " + r.name} />}
        <div><b>{r.name}</b><small>{r.text}{r.stale && " · changed since you confirmed"}</small></div></label><div className="rowact"><b className={"amt " + (r.direction === "party_owes_us" ? "gain" : "owe")}>{rs(r.balance)}</b>{r.confirmed ? <span className="badge approved">Confirmed</span> : <button className="btn ghost sm" disabled={busy} onClick={() => confirm([r])}>Confirm</button>}</div></div></li>)}</ul></>}
    {!d.live && <button className="btn big" style={{ marginTop: 18 }} disabled={!d.ready || busy} onClick={() => setDlg("live")}>{d.ready ? "Go live" : "Confirm everything above to go live"}</button>}
    {dlg === "all" && <Modal title="Confirm all remaining balances?" onClose={() => setDlg(null)}><p>You are saying that you have checked all {todo.length} balances against your Excel sheet and they are right.</p><footer><button className="btn ghost" onClick={() => setDlg(null)}>Not yet</button><button className="btn" disabled={busy} onClick={() => confirm(todo)}>I have checked them all</button></footer></Modal>}
    {dlg === "live" && <Modal title="Go live?" onClose={() => setDlg(null)}><p>After this, imported ledgers can no longer be removed. Mistakes are fixed with correction entries. You can still add old customers later.</p><footer><button className="btn ghost" onClick={() => setDlg(null)}>Not yet</button><button className="btn" disabled={busy} onClick={live}>Go live</button></footer></Modal>}
  </>;
}
export default function Import() {
  const [tab, setTab] = useState("accounts"); const T = [["accounts", "1. Accounts"], ["ledgers", "2. Ledgers"], ["review", "3. Dates to check"], ["golive", "4. Go live"]];
  return <><header className="pagehead"><div><h1>Data import</h1><p>Bring in your customers, suppliers, workers and 2026 ledgers from Excel.</p></div></header>
    <div className="seg" role="tablist">{T.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>{tab === "accounts" ? <Accounts /> : tab === "ledgers" ? <Ledgers /> : tab === "review" ? <Review /> : <GoLive />}</>;
}
