import { NavLink, Outlet } from "react-router-dom"; import { LayoutDashboard, Users, Package, ScrollText, LogOut, Wallet, Truck, Tag, MoreHorizontal, FileText, Settings as Cog, Landmark, HardHat, Receipt, Banknote, Scale, TrendingUp, Boxes, Upload, HardDrive } from "lucide-react";
import { useAuth } from "../auth.jsx";
export const Mark = ({ size = 36 }) => <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden><rect width="64" height="64" rx="16" fill="#164A43"/><circle cx="32" cy="32" r="19" fill="#F4F7F5"/><circle cx="32" cy="32" r="8" fill="#164A43"/><path d="M32 13a19 19 0 0 1 17 11" stroke="#1B7F72" strokeWidth="3" fill="none" strokeLinecap="round"/></svg>;
export default function Layout() {
  const { user, logout, isOwner } = useAuth();
  // [path, label, icon, exact, showInPhoneTabs]
  const groups = [
    ["Daily work", [["/", "Home", LayoutDashboard, true, 1], ["/invoices", "Invoices", FileText, false, 1], ["/payments", "Payments", Wallet, false, 1], ["/expenses", "Expenses", Receipt, false, 1], ["/purchases", "Purchases", Truck]]],
    ["Accounts", [["/parties", "Parties", Users, false, 1], ["/special", "Special accounts", Landmark], ["/workers", "Workers", HardHat], ["/rates", "Rates", Tag], ["/items", "Items", Package]]],
    ["Reports", [["/reports/suppliers", "Supplier balances", Scale], ["/stock", "Stock count", Boxes], ...(isOwner ? [["/pl", "Profit & Loss", TrendingUp]] : [])]],
    ...(isOwner ? [["Owner", [["/withdrawals", "Owner withdrawals", Banknote], ["/import", "Data import", Upload], ["/backups", "Backups", HardDrive], ["/audit", "Activity", ScrollText], ["/settings", "Settings", Cog]]]] : []),
  ];
  const tabs = [...groups.flatMap((g) => g[1]).filter((l) => l[4]).sort((a, b) => ["/", "/invoices", "/parties", "/payments", "/expenses"].indexOf(a[0]) - ["/", "/invoices", "/parties", "/payments", "/expenses"].indexOf(b[0])), ["/more", "More", MoreHorizontal]];
  return <div className="shell">
    <aside className="rail"><div className="brand"><Mark /><div><b>HA Enterprises</b><small>Management system</small></div></div>
      <nav aria-label="Sections">{groups.map(([title, links]) => <div key={title} className="grp"><h4>{title}</h4>{links.map(([to, label, I, end]) => <NavLink key={to} to={to} end={end}><I size={18} /><span>{label}</span></NavLink>)}</div>)}</nav>
      <div className="me"><div><b>{user.name}</b><small>{user.role === "owner" ? "Owner" : "Manager"}</small></div><button className="icon" onClick={logout} aria-label="Log out" title="Log out"><LogOut size={18} /></button></div></aside>
    <div className="topbar"><div className="brand"><Mark size={30} /><b>HA Enterprises</b></div><button className="icon" onClick={logout} aria-label="Log out"><LogOut size={19} /></button></div>
    <main className="content"><Outlet /></main>
    <nav className="tabs" aria-label="Main">{tabs.map(([to, label, I, end]) => <NavLink key={to} to={to} end={end}><I size={21} /><span>{label}</span></NavLink>)}</nav>
  </div>;
}
