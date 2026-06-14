// POST /api/submit
// Body: { first_name, last_name, email, phone, pred_home, pred_away, match,
//         whatsapp_consent, marketing_consent, source }
// Creates a Participant (rejecting duplicate Email OR Mobile) and a Prediction.
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

  const first = (b.first_name || "").trim();
  const last = (b.last_name || "").trim();
  const email = (b.email || "").trim().toLowerCase();
  const mobile = at.normMobile(b.phone || b.mobile || "");

  if (!first || !last || !email || !mobile) {
    return json(400, { error: "missing_fields" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: "bad_email" });
  }

  const now = new Date().toISOString();
  const wa = Boolean(b.whatsapp_consent);
  const mkt = Boolean(b.marketing_consent);

  try {
    // Duplicate check: Email OR Mobile already present.
    const dupes = await at.list("Participants", {
      filterByFormula: `OR(LOWER({Email})='${at.esc(email)}', {Mobile}='${at.esc(mobile)}')`,
      maxRecords: 1,
    });
    if (dupes.length) {
      const f = dupes[0].fields || {};
      const field =
        (f.Email || "").toLowerCase() === email ? "email" : "mobile";
      return json(409, { error: "duplicate", field });
    }

    // Create participant.
    const participant = await at.create("Participants", {
      FirstName: first,
      LastName: last,
      Email: email,
      Mobile: mobile,
      WhatsAppConsent: wa,
      WhatsAppConsentTS: wa ? now : null,
      MarketingConsent: mkt,
      MarketingConsentTS: mkt ? now : null,
      Status: "Active",
      Source: b.source || "direct",
    });

    // Create the first prediction (linked).
    if (b.match && b.pred_home != null && b.pred_away != null) {
      await at.create("Predictions", {
        Participant: [participant.id],
        MatchKey: String(b.match), // text key; link resolution handled in enrich/admin if needed
        PredictedBelgiumGoals: Number(b.pred_home),
        PredictedOpponentGoals: Number(b.pred_away),
      });
    }

    return json(200, { id: participant.id });
  } catch (e) {
    return json(502, { error: "airtable_error", detail: String(e.message || e) });
  }
};
