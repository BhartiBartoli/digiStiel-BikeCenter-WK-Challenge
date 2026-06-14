// POST /api/enrich
// Body: { id, tiebreak_goals, tiebreak_cards }
// Updates an existing Participant with tie-breaker answers (the optional boost step).
const at = require("./_airtable");

const json = (statusCode, obj) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });
  if (!at.configured()) return json(500, { error: "not_configured" });

  let b;
  try {
    b = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "bad_json" });
  }

  if (!b.id) return json(400, { error: "missing_id" });

  const fields = {};
  if (b.tiebreak_goals != null && b.tiebreak_goals !== "")
    fields.TieBreakerGoals = Number(b.tiebreak_goals);
  if (b.tiebreak_cards != null && b.tiebreak_cards !== "")
    fields.TieBreakerYellowCards = Number(b.tiebreak_cards);

  if (!Object.keys(fields).length) return json(200, { id: b.id, updated: false });

  try {
    const rec = await at.update("Participants", b.id, fields);
    return json(200, { id: rec.id, updated: true });
  } catch (e) {
    return json(502, { error: "airtable_error", detail: String(e.message || e) });
  }
};
