import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getAi() {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not set.");
    }
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/recommend", async (req, res) => {
    try {
      const { current_product, user_history } = req.body;
      
      const promptText = `
Eres el motor predictivo de comportamiento de la PWA "TicoTrae". Tu función exclusiva es analizar el producto que un usuario está visualizando en este momento y generar el set de datos para el módulo visual: "Los clientes que vieron este producto también vieron:".

Debes actuar como un microservicio que analiza patrones de co-visualización y venta cruzada (cross-merchandising), asociando productos de tecnología, outdoor, fotografía y accesorios según la lógica de consumo en Costa Rica.

REGLAS DE OPERACIÓN ESTRICTAS:
1. Tu respuesta debe ser ÚNICAMENTE un arreglo JSON válido.
2. NO utilices bloques de código Markdown (evita \`\`\`json y \`\`\`). No agregues introducciones, saludos ni explicaciones fuera del JSON.
3. Debes generar exactamente 3 productos recomendados que no sean iguales al producto consultado.
4. Incluye siempre una razón psicológica o comercial breve en el campo "coincidence_reason" (ej: "El 88% de los compradores añade este accesorio en la misma sesión").

ESTRUCTURA DEL JSON REQUERIDA:
[
  {
    "id": "string_id_sugerido",
    "name": "Nombre del producto sugerido",
    "category": "Categoría",
    "price_crc": 0,
    "coincidence_reason": "Breve razón de comportamiento del cliente (máx. 12 palabras)"
  }
]

ENTRADA:
${JSON.stringify({ current_product, user_history }, null, 2)}
`;

      const aiClient = getAi();
      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptText,
      });

      let responseText = response.text || "";
      if (responseText.startsWith("```json")) {
        responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      } else if (responseText.startsWith("```")) {
        responseText = responseText.replace(/```/g, "").trim();
      }

      res.json(JSON.parse(responseText));
    } catch (error: any) {
      console.error("Error in recommendation:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to scrape Amazon and eBay
  app.post("/api/scrape", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL inválida." });
      }

      const isAmazon = url.includes("amazon.");
      const isEbay = url.includes("ebay.");

      if (!isAmazon && !isEbay) {
        return res.status(400).json({ error: "URL debe ser de Amazon o eBay." });
      }

      // We use node-fetch or native fetch (Node 18+ has global fetch)
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,es;q=0.8"
        }
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Error HTTP al acceder: ${response.status} ${response.statusText}.` });
      }

      const html = await response.text();

      const aiClient = getAi();
      const promptText = `
Eres un bot experto en data scraping. Analiza el siguiente HTML de ${isAmazon ? 'Amazon' : 'eBay'} y extrae la información del producto.
Responde ÚNICAMENTE con un objeto JSON válido, sin bloques de código Markdown ni texto adicional.

ESTRUCTURA DEL JSON:
{
  "titulo": "Título completo del producto",
  "precio_usd": 0.00,
  "descripcion": "Descripción detallada del producto o las características principales",
  "tallas": "Tallas o tamaños disponibles (si aplica)",
  "marca": "Marca del producto",
  "peso_kg": 1.0,
  "imagen_url": "URL de la imagen principal en alta resolución",
  "imagenes": ["url_alta_res_1", "url_alta_res_2"]
}

(Notas: 
- precio_usd debe ser un número flotante, extrae el precio actual. 
- Para imagenes, extrae las URLs en la mejor resolución posible y descarta avatares o thumbnails. En Amazon las URL de imágenes grandes no suelen tener algo como ._AC_US40_.jpg sino que terminan directo en .jpg.
- Si no encuentras algún dato, usa un valor lógico por defecto (ej. peso_kg: 1.0) o string vacío.
- HTML LIMITADO a primeros caracteres. Busca bien dentro.
)

HTML:
${html.substring(0, 150000)}
`;

      const aiResponse = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptText,
      });

      let responseText = aiResponse.text || "";
      if (responseText.startsWith("```json")) {
        responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      } else if (responseText.startsWith("```")) {
        responseText = responseText.replace(/```/g, "").trim();
      }

      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (e) {
        throw new Error("No se pudo extraer la información correctamente de la página.");
      }

      res.json({
        ...parsedData,
        url_original: url
      });
      
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Error procesando URL: " + error.message });
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
