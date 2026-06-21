const express = require("express");

const router = express.Router();

const {
  createStartup,
  getAllStartups,
  getStartupById,
} = require("../controllers/startupController");
const upload =
require(
"../middleware/upload"
);
router.post("/", upload.single("logo"), createStartup);

router.get("/", getAllStartups);

router.get("/:id", getStartupById);

module.exports = router;