const express = require("express");
const { renderReel, RENDER_VERSION } = require("../controllers/videoController");

const router = express.Router();

router.post("/render", renderReel);

router.get("/version", (req, res) => {
  res.json({
    success: true,
    version: RENDER_VERSION,
  });
});

module.exports = router;
