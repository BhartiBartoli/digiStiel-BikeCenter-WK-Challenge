// GET /api/leaderboard?limit=10
// Returns the top N active participants by TotalPoints. No PII: only a display
// name (first name + last initial) and points are returned to the client.
const at = require("./_airtable");

const json = (statusCode, obj) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "method_not_allowed" });
  if (!at.configured()) return json(200, { rows: [] });

  const limit = Math.min(Number((event.queryStringParameters || {}).limit) || 10, 50);

  try {
    const recs = await at.list("Participants", {
      filterByFormula: `{Status}='Active'`,
      sort: [{ field: "TotalPoints", direction: "desc" }],
      maxRecords: limit,
      fields: ["FirstName", "LastName", "TotalPoints"],
    });
    const rows = recs.map((r, i) => {
      const f = r.fields || {};
      const last = (f.LastName || "").trim();
      const initial = last ? ` ${last[0].toUpperCase()}.` : "";
      return {
        rank: i + 1,
        name: `${(f.FirstName || "").trim()}${initial}`,
        points: f.TotalPoints || 0,
      };
    });
    return json(200, { rows });
  } catch (e) {
    return json(200, { rows: [], detail: String(e.message || e) });
  }
};
