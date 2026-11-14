import { useEffect, useState } from "react"; import { api } from "../api.js"; import { Field, Loading, useToast } from "../components/ui.jsx";
// Shrinks the chosen logo so it stays small (max 240px wide) and keeps transparency.
const shrink = (file) => new Promise((ok, no) => { const img = new Image(); img.onload = () => { const k = Math.min(1, 240 / img.width), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL("image/png")); }; img.onerror = () => no(new Error("Could not read that image")); img.src = URL.createObjectURL(file); });
export default function Settings() {
  const toast = useToast(); const [f, setF] = useState(null); const [busy, setBusy] = useState(false); useEffect(() => { api("/settings").then(setF).catch((e) => toast(e.message, "err")); }, []);
  if (!f) return <Loading />; const set = (k, v) => setF({ ...f, [k]: v });
  const pick = async (e) => { const file = e.target.files?.[0]; if (!file) return; try { set("logo", await shrink(file)); } catch (x) { toast(x.message, "err"); } };
  const save = async (e) => { e.preventDefault(); setBusy(true); try { await api("/settings", { method: "PUT", body: { name: f.name, phone: f.phone, address: f.address, footer: f.footer, logo: f.logo } }); toast("Saved. New PDFs will use these details."); } catch (x) { toast(x.message, "err"); } setBusy(false); };
  return <><header className="pagehead"><div><h1>Company & invoice details</h1><p>Shown at the top of every invoice PDF.</p></div></header>
    <form className="card2" onSubmit={save} style={{ maxWidth: 560 }}>
      <div className="logoPick">{f.logo ? <img src={f.logo} alt="Logo" /> : <div className="nologo">No logo</div>}<div><input type="file" accept="image/png,image/jpeg" onChange={pick} aria-label="Choose logo" />{f.logo && <button type="button" className="link" onClick={() => set("logo", "")}>Remove logo</button>}</div></div>
      <Field label="Business name"><input value={f.name} onChange={(e) => set("name", e.target.value)} required /></Field><Field label="Phone number"><input value={f.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" /></Field>
      <Field label="Address"><input value={f.address} onChange={(e) => set("address", e.target.value)} /></Field><Field label="Footer line"><input value={f.footer} onChange={(e) => set("footer", e.target.value)} /></Field>
      <button className="btn" disabled={busy}>Save details</button></form></>;
}
