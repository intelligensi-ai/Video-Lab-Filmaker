import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  // Initialize server-side Gemini client if API key is provided
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (e) {
      console.warn('Could not initialize GoogleGenAI with provided key:', e);
    }
  }

  // API: Health & Capabilities
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(ai),
      model: 'gemini-3.8-flash',
      version: '1.0.0',
    });
  });

  // API: Assistant Director proposal generation
  app.post('/api/assistant-director/propose', async (req, res) => {
    const { brief, revisionRequest, currentProposal } = req.body;

    if (!ai) {
      return res.status(200).json({
        fallback: true,
        message: 'No live Gemini API key detected. Client will use deterministic Local Assistant Director adapter.',
      });
    }

    try {
      const prompt = `You are an experienced Assistant Director and Script Supervisor in the Intelligensi.ai Video Lab Filmmaker suite.
Generate a structured film proposal based on this Master Story Brief:
Title: "${brief?.title || 'Untitled'}"
Premise: "${brief?.premise || 'A tense confrontation'}"
Target Duration: "${brief?.targetDuration || '60 seconds'}"
Aspect Ratio: "${brief?.aspectRatio || '16:9'}"
Tone: "${brief?.tone || 'Cinematic Thriller'}"
Style Notes: "${brief?.styleNotes || 'High contrast, moody lighting'}"
${revisionRequest ? `\nSPECIFIC REVISION REQUEST: "${revisionRequest}"\nModify the prior proposal accordingly!` : ''}

Respond with strict JSON adhering to this schema:
{
  "synopsis": string,
  "rationale": string,
  "suggestedCharacters": [
    {
      "name": string (uppercase, e.g. "RENA"),
      "description": string,
      "color": string (hex color code e.g. "#5B4FB9"),
      "voiceNotes": string,
      "costumeNotes": string
    }
  ],
  "suggestedLocations": [
    {
      "name": string (uppercase, e.g. "SAFEHOUSE ROOM 404"),
      "type": "Interior" | "Exterior" | "Both",
      "description": string,
      "code": string (e.g. "II" or "IV")
    }
  ],
  "suggestedScenes": [
    {
      "sceneNumber": number,
      "slugline": string (e.g. "INT. SAFEHOUSE - NIGHT"),
      "summary": string,
      "timeOfDay": "NIGHT" | "DAY" | "DUSK" | "DAWN",
      "scriptElements": [
        { "type": "action", "text": string },
        { "type": "dialogue", "speakerName": string, "text": string, "parenthetical": string },
        { "type": "pause", "durationSeconds": number, "notes": string }
      ],
      "shots": [
        {
          "shotType": "overhead" | "wide" | "two-shot" | "close-up" | "reaction" | "custom",
          "action": string,
          "cameraMovement": "static" | "pan" | "tilt" | "dolly" | "tracking" | "handheld",
          "lighting": string,
          "duration": number (seconds, e.g. 3.5),
          "dialogueSnippet": string
        }
      ]
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text?.trim() || '{}';
      const parsed = JSON.parse(responseText);
      return res.json({
        fallback: false,
        proposal: parsed,
      });
    } catch (error: any) {
      console.error('Assistant Director Gemini call failed:', error);
      return res.status(200).json({
        fallback: true,
        error: error.message,
        message: 'Falling back to deterministic Local Assistant Director.',
      });
    }
  });

  // Mount Vite development server middleware
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Intelligensi Video Lab server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
