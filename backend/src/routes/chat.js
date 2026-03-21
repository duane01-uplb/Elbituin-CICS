const express = require("express");
const router = express.Router();
const { getAIResponse } = require("../data/aiResponses");

// POST /api/chat
// Body: { message: string }
router.post("/", (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string" || message.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Message is required",
    });
  }

  // Simulate slight delay (in real app, this would be async AI call)
  const reply = getAIResponse(message.trim());

  res.json({
    success: true,
    message: reply,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
