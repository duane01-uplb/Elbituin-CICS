// Rule-based AI assistant responses for FuelBridge
// Keyword matching approach — no ML needed for prototype

const responses = [
  {
    keywords: ["cheap", "cheapest", "save", "cheaper", "low price"],
    reply:
      "💡 Based on current prices, **Seaoil - Los Baños** and **Phoenix - Sta. Rosa** offer the cheapest Gas 91 at ₱53.20 and ₱53.90/L respectively. Switching from a ₱60/L station could save you **₱160–₱320 per 50L fill-up**!",
  },
  {
    keywords: ["ev", "electric", "e-tricycle", "etrike", "convert", "switch"],
    reply:
      "⚡ Great question! An e-tricycle costs around ₱80,000–₱120,000 upfront, but saves roughly **₱3,000–₱5,000/month** in fuel. With cooperative micro-financing at ₱2,500/month, you break even in **2–3 years** and earn more after. Want to know about LTFRB incentives?",
  },
  {
    keywords: ["route", "path", "way", "direction", "road"],
    reply:
      "🗺️ Use the Route Optimizer above! Enter your start point and destination. FuelBridge calculates the most fuel-efficient route — avoiding stop-and-go traffic can reduce fuel use by **10–15%** on typical tricycle routes.",
  },
  {
    keywords: ["wallet", "savings", "money", "cooperative", "coop"],
    reply:
      "💰 Your FuelBridge Wallet pools micro-savings from every smart refuel. With 500 drivers saving an average of ₱1,500/month, the cooperative accumulates **₱750,000/month** — enough to fund shared solar charging stations within 6 months!",
  },
  {
    keywords: ["price", "cost", "petron", "shell", "caltex", "phoenix", "seaoil"],
    reply:
      "⛽ Current fuel prices range from **₱53.20 to ₱60.45/L** for Gas 91 in your area. The DOE updates prices weekly. FuelBridge also aggregates real-time user reports for the most accurate local data. Check the map for the nearest cheapest station!",
  },
  {
    keywords: ["help", "how", "what", "guide", "start"],
    reply:
      "👋 FuelBridge helps you: \n\n1. **Find cheap fuel** — use the map to see nearby stations by price\n2. **Optimize routes** — save 10–15% fuel with smarter paths\n3. **Track savings** — see your monthly fuel wallet grow\n4. **Plan EV transition** — calculate when switching pays off\n\nWhat would you like to explore?",
  },
  {
    keywords: ["carbon", "co2", "environment", "climate", "green"],
    reply:
      "🌱 Every liter of gasoline saved prevents ~2.3 kg of CO₂ emissions. If you save 20L/month through smarter routing, that's **46 kg CO₂ avoided** — or 2 trees planted annually. FuelBridge cooperatives can earn verified carbon credits to sell to corporations with net-zero commitments.",
  },
  {
    keywords: ["tricycle", "jeepney", "driver", "operator"],
    reply:
      "🛺 For tricycle drivers averaging 30L/week: optimizing routes + choosing cheaper stations saves roughly **₱1,200–₱2,000/month**. Over a year, that's ₱14,400–₱24,000 — enough to start an e-tricycle down payment fund through your cooperative!",
  },
  {
    keywords: ["doe", "government", "ltfrb", "subsidy", "incentive"],
    reply:
      "🏛️ The DOE and LTFRB have active programs: **PUV Modernization Program** offers subsidies for e-jeepneys, and the DOST provides grants for cooperative solar installations. FuelBridge can connect you to these programs and help you apply. Ask me for specifics!",
  },
];

// Default fallback response
const defaultResponse =
  "🤖 I'm FuelBridge AI! I can help you find cheap fuel, optimize routes, understand your savings, or plan an EV transition. Try asking: *'Where's the cheapest fuel near me?'* or *'How much can I save switching to EV?'*";

/**
 * Find the best matching response for a user message
 * @param {string} message - User's input message
 * @returns {string} - AI assistant response
 */
function getAIResponse(message) {
  const lower = message.toLowerCase();

  for (const item of responses) {
    if (item.keywords.some((kw) => lower.includes(kw))) {
      return item.reply;
    }
  }

  return defaultResponse;
}

module.exports = { getAIResponse };
