// api/state.js: stores the trip tracker's ticks and added activities in Upstash Redis.
// Vercel fills in these settings when you connect the database to the project.
const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = "sea-roadtrip-state";

async function redis(command) {
  const r = await fetch(REST_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command)
  });
  if (!r.ok) throw new Error("Redis responded " + r.status);
  return (await r.json()).result;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const pass = process.env.TRIP_PASSCODE;
  if (!pass || req.headers["x-trip-passcode"] !== pass) return res.status(401).json({ error: "Wrong passcode" });
  if (!REST_URL || !REST_TOKEN) return res.status(500).json({ error: "Database not connected" });
  try {
    if (req.method === "GET") return res.status(200).json({ value: await redis(["GET", KEY]) });
    if (req.method === "PUT") {
      const value = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      if (!value || value.length > 1000000) return res.status(400).json({ error: "Nothing to save" });
      await redis(["SET", KEY, value]);
      return res.status(200).json({ ok: true });
    }
    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "Use GET or PUT" });
  } catch (e) {
    return res.status(502).json({ error: "Database unavailable" });
  }
};