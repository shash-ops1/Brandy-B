const express = require("express");

const router = express.Router();

const {
  generateSlogan,
  generateBillboard,
  generateReelScript,
} = require("../controllers/aiController");

router.post(
  "/slogan",
  generateSlogan
);
router.post(
  "/billboard",
  generateBillboard
);
router.post(
 "/reel-script",
 generateReelScript
);
module.exports = router;
