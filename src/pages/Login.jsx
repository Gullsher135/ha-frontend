import { useState } from "react"; import { useAuth } from "../auth.jsx";
export default function Login() {
  const { login } = useAuth(); const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const go = async (e) => { e.preventDefault(); setBusy(true); setErr(""); try { await login(u, p); } catch (x) { setErr(x.message); } setBusy(false); };
  return <div className="login">
    <section className="hero" aria-hidden>
      <svg viewBox="0 0 400 400" className="roll"><g fill="none" stroke="#F4F7F5" strokeOpacity=".16"><circle cx="200" cy="200" r="180" strokeWidth="2"/><circle cx="200" cy="200" r="150" strokeWidth="2"/><circle cx="200" cy="200" r="120" strokeWidth="2"/><circle cx="200" cy="200" r="90" strokeWidth="2"/></g><circle cx="200" cy="200" r="58" fill="#0A2421"/><path d="M200 20a180 180 0 0 1 160 100" stroke="#3FB5A3" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray="3 16"/></svg>
      <h1>Every khata,<br />one clear page.</h1><p>Customers, suppliers, invoices and profit. All balanced, all in one place.</p>
    </section>
    <form className="loginbox" onSubmit={go}>
      <h2>Welcome back</h2><p className="sub">Sign in to HA Enterprises</p>
      <label className="field"><span>Username</span><input value={u} onChange={(e) => setU(e.target.value)} autoCapitalize="none" autoComplete="username" required autoFocus /></label>
      <label className="field"><span>Password</span><input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required /></label>
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn big" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form></div>;
}
