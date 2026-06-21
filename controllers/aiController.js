const axios = require("axios");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const getResponseText = (data) =>
  data?.candidates?.[0]?.content?.parts
    ?.filter((part) => !part.thought)
    .map((part) => part.text)
    .filter(Boolean)
    .join("\n")
    .trim();

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const requestGemini = async (
  prompt,
  apiKey,
  maxOutputTokens,
  extraGenerationConfig = {}
) => {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await axios.post(
        GEMINI_API_URL,
        {
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            maxOutputTokens,
            thinkingConfig: {
              thinkingBudget: 0,
            },
            ...extraGenerationConfig,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          timeout: 60000,
        }
      );
    } catch (error) {
      const status = error.response?.status;
      const isTemporary =
        status === 429 ||
        status === 500 ||
        status === 503 ||
        !error.response;

      if (!isTemporary || attempt === maxAttempts) {
        throw error;
      }

      await wait(750 * attempt);
    }
  }

  throw new Error("Gemini request failed after multiple attempts.");
};

const validateRequest = (body) => {
  const requiredFields = [
    "startupName",
    "industry",
    "description",
    "targetAudience",
  ];

  return requiredFields.filter((field) => !body[field]?.trim());
};

const sendGeminiError = (error, res) => {
  const upstreamStatus = error.response?.status;
  const upstreamMessage =
    error.response?.data?.error?.message || error.message;

  console.error("Gemini REST request failed:", {
    status: upstreamStatus,
    message: upstreamMessage,
    model: GEMINI_MODEL,
  });

  if ([400, 401, 403].includes(upstreamStatus)) {
    return res.status(502).json({
      success: false,
      message:
        "Gemini rejected the server credential. Create a new API key in AI Studio and update GEMINI_API_KEY.",
    });
  }

  if (upstreamStatus === 429) {
    return res.status(429).json({
      success: false,
      message: "Gemini rate limit reached. Please wait briefly and try again.",
    });
  }

  if (upstreamStatus === 503) {
    return res.status(503).json({
      success: false,
      message: "Gemini is temporarily unavailable. Please try again shortly.",
    });
  }

  return res.status(502).json({
    success: false,
    message: "Gemini could not generate content right now.",
  });
};

const generateContent = (buildPrompt) => async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message: "GEMINI_API_KEY is not configured on the server.",
    });
  }

  const missingFields = validateRequest(req.body);

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missingFields.join(", ")}.`,
    });
  }

  try {
    const prompt = buildPrompt(req.body);
    let response = await requestGemini(prompt, apiKey, 2048);
    let finishReason = response.data?.candidates?.[0]?.finishReason;

    if (finishReason === "MAX_TOKENS") {
      response = await requestGemini(
        `${prompt}\n\nKeep the complete response within the available output limit.`,
        apiKey,
        4096
      );
      finishReason = response.data?.candidates?.[0]?.finishReason;
    }

    const content = getResponseText(response.data);

    if (finishReason === "MAX_TOKENS") {
      return res.status(502).json({
        success: false,
        message: "Gemini could not fit the complete response. Please shorten the startup description and try again.",
      });
    }

    if (!content) {
      const blockReason = response.data?.promptFeedback?.blockReason;

      return res.status(502).json({
        success: false,
        message: blockReason
          ? `Gemini blocked the request: ${blockReason}.`
          : "Gemini returned an empty response.",
      });
    }

    return res.json({
      success: true,
      content,
    });
  } catch (error) {
    return sendGeminiError(error, res);
  }
};

const generateSlogan = generateContent(
  ({ startupName, industry, description, targetAudience }) => `
Generate 10 professional, distinctive startup slogans.

Startup name: ${startupName}
Industry: ${industry}
Description: ${description}
Target audience: ${targetAudience}

Return only the slogans, one slogan per line. Do not add an introduction.
Do not use Markdown formatting, bullets, numbering, or bold text.
`.trim()
);

const generateBillboard = generateContent(
  ({ startupName, industry, description, targetAudience }) => `
Create 5 concise billboard advertisement concepts.

Startup name: ${startupName}
Industry: ${industry}
Description: ${description}
Target audience: ${targetAudience}

For each concept provide:
Headline:
Tagline:
Call to action:

Keep every concept clear, professional, and readable at a glance.
Return all 5 complete concepts. Do not add an introduction or use Markdown formatting.
`.trim()
);

const generateReelScript = async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message: "GEMINI_API_KEY is not configured on the server.",
    });
  }

  const missingFields = validateRequest(req.body);

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missingFields.join(", ")}.`,
    });
  }

  const {
    startupName,
    industry,
    description,
    targetAudience,
  } = req.body;

  const prompt = `
Act as a senior brand strategist and performance creative director.
Create a premium 15-second vertical social ad for this startup.

Startup name: ${startupName}
Industry: ${industry}
Product description: ${description}
Target customer: ${targetAudience}

The campaign must:
- Interrupt attention in the first 2 seconds.
- Start from a real customer tension, not a generic industry statement.
- Explain the product value in plain language.
- Include a credible differentiator without inventing statistics, awards, clients, or guarantees.
- End with one direct, specific call to action.
- Use short on-screen copy that can be read quickly on a phone.
- Sound confident, modern, and human. Avoid buzzwords and clichés.

Return JSON only. Create exactly four scenes:
1. Hook: customer tension or provocative question.
2. Problem: make the cost or frustration tangible.
3. Value: explain how the startup changes the situation.
4. Proof/CTA: state the credible reason to care and the next action.
`.trim();

  const responseSchema = {
    type: "OBJECT",
    properties: {
      campaignAngle: { type: "STRING" },
      audienceInsight: { type: "STRING" },
      voiceover: { type: "STRING" },
      caption: { type: "STRING" },
      hashtags: {
        type: "ARRAY",
        items: { type: "STRING" },
      },
      scenes: {
        type: "ARRAY",
        minItems: 4,
        maxItems: 4,
        items: {
          type: "OBJECT",
          properties: {
            purpose: { type: "STRING" },
            headline: { type: "STRING" },
            subheadline: { type: "STRING" },
            visualDirection: { type: "STRING" },
          },
          required: [
            "purpose",
            "headline",
            "subheadline",
            "visualDirection",
          ],
        },
      },
      cta: { type: "STRING" },
    },
    required: [
      "campaignAngle",
      "audienceInsight",
      "voiceover",
      "caption",
      "hashtags",
      "scenes",
      "cta",
    ],
  };

  try {
    const response = await requestGemini(prompt, apiKey, 2048, {
      responseMimeType: "application/json",
      responseSchema,
    });
    const rawContent = getResponseText(response.data);
    const reel = JSON.parse(rawContent);

    return res.json({
      success: true,
      content: reel.voiceover,
      reel,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error("Gemini returned invalid reel JSON:", error.message);
      return res.status(502).json({
        success: false,
        message: "Gemini returned an invalid reel plan. Please generate again.",
      });
    }

    return sendGeminiError(error, res);
  }
};

module.exports = {
  generateSlogan,
  generateBillboard,
  generateReelScript,
};
