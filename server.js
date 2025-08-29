// Minimal Azure Neural TTS relay (MP3) for Bengali bn-BD
// Do NOT expose your Azure key to the browser. Keep it server-side.

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors());

const AZURE_REGION = process.env.AZURE_SPEECH_REGION || "";
const AZURE_KEY = process.env.AZURE_SPEECH_KEY || "";

// Health
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, region: AZURE_REGION ? true : false });
});

// TTS endpoint
app.post("/api/tts", async (req, res) => {
  try {
    const { ssml, format = "audio-24khz-48kbitrate-mono-mp3" } = req.body || {};
    if (!AZURE_REGION || !AZURE_KEY) {
      return res.status(500).send("Azure TTS not configured. Set AZURE_SPEECH_REGION & AZURE_SPEECH_KEY.");
    }
    if (!ssml || typeof ssml !== "string") {
      return res.status(400).send("Missing ssml");
    }

    const url = `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": format,
        "Ocp-Apim-Subscription-Key": AZURE_KEY,
        "User-Agent": "bnBD-tts-relay"
      },
      body: ssml
    });

    if (!r.ok) {
      const msg = await r.text();
      return res.status(r.status).send(msg || "TTS error");
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    // Stream back
    r.body.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).send("Server error");
  }
});

// Static site (public/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 5173;
app.listen(PORT, () => console.log(`TTS server listening on http://localhost:${PORT}`));