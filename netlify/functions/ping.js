// GET /api/ping
// Independently validates that env vars are set and each table is reachable.
const at = require("./_airtable");

const json = (statusCode, obj) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(obj),
});

exports.handler = async () => {
  const out = {
    status: "ok",
    env: {
      AIRTABLE_BASE_ID: Boolean(process.env.AIRTABLE_BASE_ID),
      AIRTABLE_API_KEY: Boolean(process.env.AIRTABLE_API_KEY),
    },
    tables: {},
  };

  if (!at.configured()) {
    out.status = "error";
    return json(500, out);
  }

  for (const t of ["Participants", "Predictions", "Matches", "Events"]) {
    try {
      await at.list(t, { maxRecords: 1 });
      out.tables[t] = "ok";
    } catch (e) {
      out.tables[t] = `error: ${String(e.message || e).slice(0, 120)}`;
      out.status = "error";
    }
  }

  return json(out.status === "ok" ? 200 : 500, out);
};
