import { useEffect, useState } from "react"; import { Link, useParams } from "react-router-dom"; import { ChevronLeft, Download, Share2 } from "lucide-react";
import { api, apiBlob } from "../api.js"; import { num, rs, fdate } from "../format.js"; import { useAuth } from "../auth.jsx"; import { Modal, Field, Loading, useToast } from "../components/ui.jsx"; import { Badge } from "./Invoices.jsx";
const qtyText = (l) => (l.unit === "carton" ? `${num(l.qty)} carton${l.qty === 1 ? "" : "s"}${l.pcs ? ` (${num(l.qty * l.pcs)} pcs)` : ""}` : l.unit === "kg" ? `${num(l.qty)} kg` : `${num(l.qty)} pcs`);
export default function InvoiceView() {
  const { id } = useParams(); const { isOwner } = useAuth(); const toast = useToast(); const [v, setV] = useState(null); const [st, setSt] = useState(null); const [busy, setBusy] = useState(false);
  const [rates, setRates] = useState({}); const [save, setSave] = useState(true); const [cx, setCx] = useState(false); const [why, setWhy] = useState("");
  const load = () => api("/invoices/" + id).then(setV).catch((e) => toast(e.message, "err")); useEffect(() => { load(); api("/settings").then(setSt).catch(() => {}); }, [id]);
  if (!v || !st) return <Loading />;
  const file = async () => { const blob = await apiBlob(`/invoices/${id}/pdf`); return new File([blob], `Invoice-${v.number}.pdf`, { type: "application/pdf" }); };
  const download = async () => { try { const f = await file(), a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); } catch (x) { toast(x.message, "err"); } };
  const share = async () => { setBusy(true);
    try { const f = await file(), text = `${st.name}\nInvoice #${v.number} (${fdate(v.date)})${v.total != null ? `\nTotal: Rs ${num(v.total)}\nBalance: Rs ${num(Math.abs(v.balance))}${v.balance < 0 ? " Cr" : ""}` : ""}`;
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], text });
      else { const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); const d = (v.customer.phone || "").replace(/\D/g, ""); window.open(`https://wa.me/${d}?text=${encodeURIComponent(text)}`, "_blank"); toast("PDF downloaded. Attach it in WhatsApp."); } }
    catch (x) { if (x.name !== "AbortError") toast(x.message, "err"); } setBusy(false); };
  const approve = async () => { setBusy(true);
    try { await api(`/invoices/${id}/approve`, { method: "POST", body: { saveAsCustomerRate: save, rates: v.lines.map((l, i) => (l.rate == null ? { index: i, rate: Number(rates[i]) } : null)).filter(Boolean) } }); toast("Invoice approved and added to the ledger"); load(); }
    catch (x) { toast(x.message, "err"); } setBusy(false); };
  const cancel = async () => { try { await api(`/invoices/${id}/cancel`, { method: "POST", body: { reason: why } }); toast("Invoice cancelled"); setCx(false); setWhy(""); load(); } catch (x) { toast(x.message, "err"); } };
  const bal = (x) => `${num(Math.abs(x))}${x < 0 ? " Cr" : ""}`;
  return <>
    <Link to="/invoices" className="back"><ChevronLeft size={18} /> Invoices</Link>
    <header className="pagehead"><div><h1>Invoice #{v.number}</h1><p><Badge s={v.status} /></p></div>
      <div className="actions"><button className="btn ghost" onClick={download}><Download size={17} /> PDF</button><button className="btn" onClick={share} disabled={busy}><Share2 size={17} /> WhatsApp</button></div></header>
    {v.status === "pending" && <div className="alert static">Some rates are missing. Nothing is in the ledger yet.{!isOwner && " The owner needs to approve this invoice."}</div>}
    {v.status === "cancelled" && <div className="alert static bad">Cancelled: {v.cancelReason}</div>}
    <article className="paper">
      <div className="ph">{st.logo && <img src={st.logo} alt="" />}<div className="pn"><b>{st.name}</b>{st.address && <span>{st.address}</span>}{st.phone && <span>Phone: {st.phone}</span>}</div><div className="pno"><b>INVOICE</b><span>No. {v.number}</span><span>{fdate(v.date)}</span></div></div>
      <div className="bill"><small>Bill to</small><b>{v.customer.name}</b>{v.customer.phone && <span>{v.customer.phone}</span>}</div>
      <div className="pt"><div className="pr h"><span>Item</span><span>Quantity</span><span className="a">Rate</span><span className="a">Amount</span></div>
        {v.lines.map((l, i) => <div key={i} className="pr"><span>{l.name}</span><span>{qtyText(l)}</span><span className="a">{l.rate == null ? "—" : num(l.rate)}</span><span className="a">{l.amount == null ? <i className="warn">Pending</i> : num(l.amount)}</span></div>)}</div>
      <div className="ptot">{v.status !== "pending" && v.goods != null && <div><span>Goods</span><b>{num(v.goods)}</b></div>}{v.transport > 0 && <div><span>Transport</span><b>{num(v.transport)}</b></div>}
        {v.total != null && <><div className="big"><span>Invoice total</span><b>{num(v.total)}</b></div><div><span>Old balance</span><b>{bal(v.oldBalance)}</b></div></>}<div><span>Received{v.received > 0 && ` (${v.receivedMode === "easypaisa" ? "Easy Paisa" : v.receivedMode})`}</span><b>{num(v.received)}</b></div>
        {v.total != null && <div className="big due"><span>{v.balance < 0 ? "Credit balance" : "Balance due"}</span><b>{rs(Math.abs(v.balance))}</b></div>}</div>
      {v.note && <p className="muted">Note: {v.note}</p>}{st.footer && <p className="pfoot">{st.footer}</p>}
    </article>
    {isOwner && v.status === "pending" && <section className="card2"><h3>Approve this invoice</h3><p className="muted">Enter the rate for each missing item (Rs per unit sold).</p>
      {v.lines.map((l, i) => l.rate == null && <Field key={i} label={`${l.name} · ${qtyText(l)}`}><input type="number" step="0.01" min="0.01" inputMode="decimal" value={rates[i] || ""} onChange={(e) => setRates({ ...rates, [i]: e.target.value })} /></Field>)}
      <label className="checks"><span><input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} /> Also save these as the customer's confirmed rates</span></label>
      <button className="btn" disabled={busy || v.lines.some((l, i) => l.rate == null && !(Number(rates[i]) > 0))} onClick={approve}>Approve and post to ledger</button></section>}
    {isOwner && v.status !== "cancelled" && <button className="btn ghost wide" onClick={() => setCx(true)}>Cancel this invoice</button>}
    {cx && <Modal title={`Cancel invoice #${v.number}?`} onClose={() => setCx(false)}><p>{v.status === "approved" ? "The ledger goes back as if this invoice and its received amount never happened." : "This pending invoice will be closed."} The number #{v.number} stays in the list as cancelled and is never reused.</p>
      <Field label="Reason"><input value={why} onChange={(e) => setWhy(e.target.value)} autoFocus /></Field><footer><button className="btn ghost" onClick={() => setCx(false)}>Keep it</button><button className="btn danger" onClick={cancel}>Cancel invoice</button></footer></Modal>}
  </>;
}
