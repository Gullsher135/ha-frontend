export const num = (n) => Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
export const rs = (n) => "Rs " + num(n);
export const todayPK = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
export const monthStart = () => todayPK().slice(0, 8) + "01";
export const daysAgo = (d) => { const x = new Date(todayPK() + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() - d); return x.toISOString().slice(0, 10); };
export const fdate = (s) => { const [y, m, d] = s.split("-"); return `${d} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1]} ${y.slice(2)}`; };
export const tone = (dir) => (dir === "party_owes_us" ? "gain" : dir === "we_owe_party" ? "owe" : "even");
export const KIND = { opening: "Opening balance", invoice: "Invoice", payment_in: "Payment received", payment_out: "Payment made", purchase: "Purchase", transfer_out: "Transfer out", transfer_in: "Transfer in", reversal: "Correction", adjustment: "Adjustment", installment: "Installment", advance: "Advance / goods on credit", salary_deduction: "Deducted from salary", other: "Entry" };
// Last day of a YYYY-MM month (28, 29, 30 or 31). Never write "-31" by hand: it is not a real date in 30-day months.
export const monthEnd = (m) => { const [y, mo] = m.split("-").map(Number); return `${m}-${String(new Date(Date.UTC(y, mo, 0)).getUTCDate()).padStart(2, "0")}`; };
// Ways money moves. Old records saved as "meezan" are shown as Bank.
export const MODES = { cash: "Cash", bank: "Bank", meezan: "Bank", easypaisa: "Easy Paisa" };
export const PAY_MODES = { cash: "Cash", bank: "Bank", easypaisa: "Easy Paisa" };
