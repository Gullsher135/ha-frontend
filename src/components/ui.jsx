import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { X } from "lucide-react";
const T = createContext(() => {}); export const useToast = () => useContext(T);
export function ToastProvider({ children }) {
  const [t, setT] = useState(null);
  const show = useCallback((msg, kind = "ok") => { setT({ msg, kind, k: Date.now() }); }, []);
  useEffect(() => { if (!t) return; const id = setTimeout(() => setT(null), 3800); return () => clearTimeout(id); }, [t]);
  return <T.Provider value={show}>{children}{t && <div key={t.k} className={"toast " + t.kind} role="status">{t.msg}</div>}</T.Provider>;
}
export function Modal({ title, onClose, children, wide }) {
  useEffect(() => { const f = (e) => e.key === "Escape" && onClose(); document.addEventListener("keydown", f); return () => document.removeEventListener("keydown", f); }, [onClose]);
  return <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className={"sheet" + (wide ? " wide" : "")} role="dialog" aria-modal="true" aria-label={title}>
      <header><h2>{title}</h2><button className="icon" onClick={onClose} aria-label="Close"><X size={20} /></button></header>{children}
    </div></div>;
}
export const Field = ({ label, hint, children }) => <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
export const Empty = ({ title, text, action }) => <div className="empty"><svg width="56" height="56" viewBox="0 0 64 64" aria-hidden><circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeWidth="3"/><circle cx="32" cy="32" r="9" fill="none" stroke="currentColor" strokeWidth="3"/><path d="M32 10a22 22 0 0 1 19 11" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="2 6"/></svg><h3>{title}</h3><p>{text}</p>{action}</div>;
export const Loading = () => <div className="loading"><i /><i /><i /></div>;
