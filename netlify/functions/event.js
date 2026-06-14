// POST /api/event
// Body: { event_type, source, returning, ...metadata }
// Lightweight analytics logging. Never blocks the UI; failures are swallowed.
const at = require("./_airtable");

const json = (statusCode, obj) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(obj),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });
  if (!at.configured()) return json(200, { ok: false, reason: "not_configured" });

  let b;
  try {
    b = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "bad_json" });
  }

  const type = b.event_type || b.type;
  if (!type) return json(400, { error: "missing_event_type" });

  // Everything except the known columns goes into Metadata as JSON.
  const { event_type, type: _t, source, ...rest } = b;

  try {
    await at.create("Events", {
      EventType: type,
      Source: source || "direct",
      Metadata: JSON.stringify(rest),
    });
    return json(200, { ok: true });
  } catch (e) {
    // Analytics must never break the experience.
    return json(200, { ok: false, detail: String(e.message || e) });
  }
};
