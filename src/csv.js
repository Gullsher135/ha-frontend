// Reads text pasted from Excel (tab separated) or a CSV file (comma or semicolon). Handles "quoted, cells".
export function parseTable(text) {
  const t = String(text || "").replace(/^\uFEFF/, ""), first = t.split("\n", 1)[0], d = first.includes("\t") ? "\t" : first.split(";").length > first.split(",").length ? ";" : ",";
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"' && cur === "") q = true; else if (c === d) { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; } else cur += c; }
  row.push(cur); rows.push(row); return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ""));
}
