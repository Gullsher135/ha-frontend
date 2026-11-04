const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
let onUnauth = () => {};
export const setUnauthHandler = (f) => (onUnauth = f);
export const getToken = () => localStorage.getItem("ha_token");
export const setToken = (t) => (t ? localStorage.setItem("ha_token", t) : localStorage.removeItem("ha_token"));
export async function api(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(getToken() && { Authorization: "Bearer " + getToken() }) }, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new Error("Cannot reach the server. Check your internet and try again."); }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== "/auth/login") { onUnauth(); }
  if (!res.ok) { const e = new Error(data.error || "Something went wrong"); e.details = data.details; throw e; }
  return data;
}
export async function apiBlob(path) {
  const res = await fetch(BASE + path, { headers: { Authorization: "Bearer " + getToken() } });
  if (!res.ok) throw new Error("Could not create the PDF. Try again."); return res.blob();
}
