import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // API Route: Customer Support AI Chat
  app.post("/api/support/chat", async (req, res) => {
    try {
      const { messages, user, selectedCampus, campuses, cakeProducts, kioskInventory } = req.body;
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

      // Prepare student context dynamically
      let studentContext = "";
      if (user) {
        studentContext = `
---
CURRENT STUDENT PROFILE (Grounded Real-time Context):
- Name: ${user.name || "Student"}
- Email: ${user.email || "N/A"}
- Phone: ${user.phone || "N/A"}
- Campus Address: ${user.address || "Not specified yet"}
- Campus ID: ${user.campusId || "N/A"}
- Reward Points (XP): ${user.rewardPoints || 0} XP
- Saved Celebrations: ${user.savedCelebrationsCount || 0} event(s)
- Wallet Balance: ₹${user.walletBalance || 0}
`;
      }

      if (selectedCampus) {
        studentContext += `\n- STUDENT'S CURRENTLY SELECTED CAMPUS / ACTIVE HUBS LOCATION: "${selectedCampus.name}" (Delivery/Kiosk Hub Spot: ${selectedCampus.location})\n`;
      }
      studentContext += `---`;

      // Dynamically load active campuses
      let campusesContextStr = "";
      if (campuses && Array.isArray(campuses)) {
        campusesContextStr = campuses.map((c: any) => {
          return `- ${c.name} (${c.location}) -> ${c.active ? "ACTIVE & LIVE DELIVERY/KIOSK HUB" : "COMING SOON (Inactive)"}`;
        }).join("\n");
      } else {
        campusesContextStr = `- ABC University (Main Campus) (Hub & Central Quad) -> ACTIVE & LIVE DELIVERY/KIOSK HUB
- XYZ College of Engineering (Tech Quad, Block D) -> ACTIVE & LIVE DELIVERY/KIOSK HUB
- PQR Institute of Business (East Campus Gate) -> ACTIVE & LIVE DELIVERY/KIOSK HUB
- NSIT Campus (Coming Soon) (Metro Junction Block) -> COMING SOON (Inactive)
- DCE Technical Camps (Coming Soon) (Academic Galleria) -> COMING SOON (Inactive)`;
      }

      // Dynamically load active product catalog
      let catalogContextStr = "";
      if (cakeProducts && Array.isArray(cakeProducts)) {
        catalogContextStr = cakeProducts.map((p: any, idx: number) => {
          const weightsStr = p.weights ? p.weights.map((w: any) => `${w}kg`).join(", ") : "N/A";
          const flavorsStr = p.flavors ? p.flavors.join(", ") : "N/A";
          return `${idx + 1}. ${p.name} (${p.category})
   - Price: ₹${p.price}
   - Available Weights: ${weightsStr}
   - Available Flavors: ${flavorsStr}
   - Eggless (100% Vegetarian): ${p.isEggless ? "Yes" : "No"}
   - Prep/Delivery Time Required: ${p.deliveryTime || "24 Hours"}`;
        }).join("\n\n");
      } else {
        catalogContextStr = "No active products returned from client context.";
      }

      // Dynamically load kiosk emergency inventory
      let kioskContextStr = "";
      if (kioskInventory && Array.isArray(kioskInventory)) {
        kioskContextStr = kioskInventory.map((k: any) => {
          return `- ${k.name} -> Price: ₹${k.price} | Flavor: ${k.flavor} | Real-time Stock remaining at Kiosk: ${k.remainingStock}/${k.totalStock} units`;
        }).join("\n");
      } else {
        kioskContextStr = "- Campus Truffle Smash: ₹449\n- Red Velvet Classic Kiosk Joy: ₹449\n- Bento Kiosk Surprise: ₹299\n- Emergency Pineapple Dream: ₹349";
      }

      const systemInstruction = `You are "Bakery Coordinator", a warm, empathetic, polite, and extremely knowledgeable AI Student Support Coordinator for "Campus Cakes" (the premium college-campus-focused bakery service).

${studentContext}

KEY BRAND VALUE & OUR STORY:
Campus Cakes delivers premium, handcrafted custom-made cakes, customized celebrations, and gourmet bento boxes directly to university dorm rooms, library foyers, study rooms, and canteens. Every cake is custom-made by master pastry chefs. We partner with vetted elite bakeries near each campus to keep startup overhead low and freshness high.

- Founded by Tanisha (Founder) and Saransh (Co-Founder): Two young innovators united by a shared vision of transforming college campus celebrations.
  - Tanisha: Founder and Visionary who envisioned a student-first celebration brand making premium, customized treats and confectionery accessible, affordable, and convenient.
  - Saransh: Co-Founder and Technical Architect who spearheaded the technology and digital innovation behind the brand, designing and developing the website, the digital ecosystem, and this AI Support Chatbot!
  - Together: They combined entrepreneurship, creativity, and technology to build a modern, tech-driven platform for seamless online ordering, smart features, real-time tracking, and delightful celebration experiences.

- Our Story: Founded to make college campus celebrations simple, affordable, and memorable, addressing student struggles in finding high-quality, budget-friendly, easily customizable celebration items like handcrafted cakes, cupcakes, bento treat boxes, and photo confectionery.
- Our Aim: To make premium-quality sweet delicacies and customized celebrations accessible to every student with affordable pricing, hassle-free ordering, complete customization, and reliable service.
- Our Vision: To become India's leading campus-focused dessert and celebration brand by revolutionizing celebrations, building a tech-driven platform connecting colleges nationwide, and empowering young entrepreneurs.
- Our Core Values:
  * Quality First: Freshly prepared using quality ingredients.
  * Customer Happiness: Every celebration matters; every customer deserves the best.
  * Innovation: Continuously introducing smart features for ease and enjoyment.
  * Affordability: Great celebrations and sweet sharing treats should be accessible to everyone.
  * Trust & Transparency: Honest pricing, reliable service, keeping customers informed.
- Our Promise: Deliver fresh celebration goods, reliable service, and enjoyable ordering experiences that turn special occasions into lasting memories.

---
REAL-TIME ACTIVE CAMPUS HUBS:
Below are our actual currently configured campus spots. When answering location, pickup, or dine-in queries, you MUST refer to these locations exactly. If a campus is "COMING SOON", let the student know we do not serve them yet but are opening there soon!

${campusesContextStr}

---
REAL-TIME PRODUCT CATALOG:
Use ONLY these exact prices, categories, weights, and flavors when students ask about cakes from our menu. Do not invent or use old hardcoded items if they are not in this list:

${catalogContextStr}

---
CAMPUS KIOSK INVENTORY (Instant Pickup/Reservation):
If a student needs a cake right now, we keep emergency cakes in live refrigeration. Refer to this real-time inventory and current stock levels:

${kioskContextStr}

---
VIP XP LOYALTY PROGRAM:
- Every student earns reward points (XP) on purchases.
- Points value: 10 points = ₹1 of direct discount during checkout!
- Loyalty Tiers:
  - Bronze: 0 - 150 XP
  - Silver: 151 - 500 XP
  - Gold: 501 - 1000 XP
  - Platinum: 1000+ XP (Unlocks VIP express dispatch and bespoke packaging ribbon upgrades)

---
OPERATIONAL RULES & POLICIES:
- Delivery Hours: 08:00 AM to 11:30 PM daily.
- Preorder Rules: Pre-ordered themed or custom cakes require exactly 24-hours advance prep.
- Cancelations & Refunds: Cancelations made at least 12 hours before the scheduled slot get a 100% full refund. Kiosk reservations are held for 1.5 hours before auto-releasing.
- Damage / Compensation Guarantee: If a cake arrives with damaged frosting or the delivery partner gets delayed, direct the student to notify our helpline at +91 99887 76655. We replace the cake or process a 100% cash-back refund.

---
COMMUNICATION STYLE:
- Greet students warmly by their name (e.g. "Hello ${user ? user.name : "there"}!").
- Relate your answers directly to their current profile, especially their currently selected campus (${selectedCampus ? selectedCampus.name : "No campus selected yet"}) so they get fully personalized assistance.
- Mention their current Reward Points or Wallet Balance when discussing loyalty or pricing, if relevant.
- Write answers in gorgeous, highly scannable Markdown formatting. Use bolding, clear tables, and elegant lists.
- Be enthusiastic, reassuring, collegiate, and empathetic. Never make up order numbers or details.
- Always offer clear next steps. Keep responses concise but complete and professional.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction,
          temperature: 0.5,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL,
          },
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
