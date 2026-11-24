/**
 * routes/status.js — public site status, read by the customer site on load.
 *
 * GET /api/status → { maintenance: { enabled, message } }
 */

const router = require("express").Router();
const { getMaintenance } = require("../lib/systemSettings.js");

router.get("/", async (req, res) => {
  try {
    const m = await getMaintenance();
    res.set("Cache-Control", "no-store");
    res.json({ maintenance: { enabled: m.enabled, message: m.message } });
  } catch (err) {
    console.error("Site status error:", err);
    // Fail open: a status hiccup should never take the whole site down
    res.json({ maintenance: { enabled: false, message: "" } });
  }
});

module.exports = router;
