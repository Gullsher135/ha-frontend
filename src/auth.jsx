import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken, setUnauthHandler } from "./api.js";
const Ctx = createContext(null); export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [ready, setReady] = useState(!getToken());
  const logout = () => { setToken(null); setUser(null); };
  useEffect(() => { setUnauthHandler(logout); if (getToken()) api("/auth/me").then((r) => setUser(r.user)).catch(logout).finally(() => setReady(true)); }, []);
  const login = async (username, password) => { const r = await api("/auth/login", { method: "POST", body: { username, password } }); setToken(r.token); setUser(r.user); };
  return <Ctx.Provider value={{ user, ready, login, logout, isOwner: user?.role === "owner" }}>{children}</Ctx.Provider>;
}
