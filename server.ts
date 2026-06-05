import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // API Route: Customer Support AI Chat
  app.post("/api/support/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid messages array." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not defined on the server." });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Prepare conversation history
      const contents = messages.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }));

      const systemInstruction = `You are a warm, helpful, polite AI Student Support Coordinator for "Campus Cakes" (the elite college-campus-focused bakery service).

Key Services of Campus Cakes:
1. Pre-Order Catalog (Guaranteed next-day delivery): We deliver premium custom photo and themed celebration cakes directly to dorm coordinates and student clubs under our "Delivery Hub" program. Needs 24-hours advance prep.
2. VIP XP Loyalty Program: Awarded for student purchases (recently initialized for live deployment) where student builders earn higher tiers and elite discounts.

Policies for Student Queries:
- Delivery Hours: 08:00 AM to 11:30 PM.
- Preparation Period: Custom cakes require 24 hours prep.
- Damage / Compensation: If a cake arrives damaged, immediately direct the student to notify the coordinator via +91 99887 76655. We replace cakes fully or process a 100% cash-back refund.
- Language/Vibe: Enthusiastic, empathetic, brief, collegiate, extremely reassuring. Never fabricate order numbers. Refer issues to Campus Cakes staff if too complex.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error("Error in AI support chat:", err);
      res.status(500).json({ error: err.message || "An error occurred in server-side AI generation." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running securely on port ${PORT}`);
  });
}

startServer();
