// Shared Airtable helper. API key is read from env (server-side only).
const BASE = process.env.AIRTABLE_BASE_ID;
const KEY = process.env.AIRTABLE_API_KEY;
const API = "https://api.airtable.com/v0";

function headers() {
  return {
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
  };
}

// List records, optionally with a filterByFormula. Returns array of {id, fields}.
async function list(table, { filterByFormula, sort, maxRecords, fields } = {}) {
  const params = new URLSearchParams();
  if (filterByFormula) params.set("filterByFormula", filterByFormula);
  if (maxRecords) params.set("maxRecords", String(maxRecords));
  if (Array.isArray(sort)) {
    sort.forEach((s, i) => {
      params.set(`sort[${i}][field]`, s.field);
      params.set(`sort[${i}][direction]`, s.direction || "asc");
    });
  }
  if (Array.isArray(fields)) fields.forEach((f) => params.append("fields[]", f));
  const url = `${API}/${BASE}/${encodeURIComponent(table)}?${params.toString()}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Airtable list ${table} ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.records || [];
}

// Create one record. Returns {id, fields}.
async function create(table, fields) {
  const url = `${API}/${BASE}/${encodeURIComponent(table)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ fields, typecast: true }),
  });
  if (!res.ok) throw new Error(`Airtable create ${table} ${res.status}: ${await res.text()}`);
  return res.json();
}

// Update one record by id. Returns {id, fields}.
async function update(table, id, fields) {
  const url = `${API}/${BASE}/${encodeURIComponent(table)}/${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ fields, typecast: true }),
  });
  if (!res.ok) throw new Error(`Airtable update ${table} ${res.status}: ${await res.text()}`);
  return res.json();
}

// Escape a value for safe use inside a filterByFormula string literal.
function esc(v) {
  return String(v).replace(/'/g, "\\'");
}

// Normalize a Belgian/intl mobile to E.164-ish digits for dedupe comparison.
function normMobile(v) {
  let s = String(v).replace(/[\s\-.\(\)]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (s.startsWith("0")) s = "+32" + s.slice(1); // assume BE if local
  if (!s.startsWith("+")) s = "+" + s;
  return s;
}

function configured() {
  return Boolean(BASE && KEY);
}

module.exports = { list, create, update, esc, normMobile, configured };
