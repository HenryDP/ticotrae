import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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

      let title = "Producto sin título";
      let price = 0;
      let imgUrl = "";
      let imagenes = [];

      if (isAmazon) {
        // Extract title
        let titleMatch = html.match(/<span id="productTitle"[^>]*>([^<]+)<\/span>/i);
        if (titleMatch) title = titleMatch[1].trim();

        // Extract price
        let wholeMatch = html.match(/<span class="a-price-whole">([^<]+)<\/span>/i);
        let fracMatch  = html.match(/<span class="a-price-fraction">([^<]+)<\/span>/i);
        
        if (wholeMatch && fracMatch) {
          let w = wholeMatch[1].replace(/[^0-9]/g, '');
          let f = fracMatch[1].replace(/[^0-9]/g, '');
          price = parseFloat(`${w}.${f}`);
        } else {
          let priceMatch = html.match(/<span id="priceblock_ourprice"[^>]*>([^<]+)<\/span>/i) || html.match(/<span class="a-offscreen">\$([^<]+)<\/span>/i);
          if (priceMatch) {
              price = parseFloat(priceMatch[1].replace(/[^0-9.]/g, ''));
          }
        }

        // Extract image
        let imgMatch = html.match(/<img[^>]*id="landingImage"[^>]*src="([^"]+)"/i) || html.match(/<img[^>]*id="imgBlkFront"[^>]*src="([^"]+)"/i) || html.match(/data-old-hires="([^"]+)"/i);
        if (imgMatch) imgUrl = imgMatch[1];

        const colorImagesMatch = html.match(/'colorImages':\s*\{\s*'initial':\s*(\[.+?\])\s*\},/);
        if (colorImagesMatch) {
          try {
            const parsed = JSON.parse(colorImagesMatch[1]);
            imagenes = parsed.map((img: any) => img.hiRes || img.large).filter(Boolean);
          } catch(e) {}
        }
        
        if (imagenes.length === 0) {
          const imgBlkMatch = html.match(/data-a-dynamic-image="([^"]+)"/);
          if (imgBlkMatch) {
            try {
              const parsedStr = imgBlkMatch[1].replace(/&quot;/g, '"');
              const parsed = JSON.parse(parsedStr);
              imagenes = Object.keys(parsed);
            } catch(e) {}
          }
        }
      } else if (isEbay) {
        // eBay scraping logic
        let titleMatch = html.match(/<h1 class="x-item-title__mainTitle">[^<]*<span class="ux-textspans ux-textspans--BOLD">([^<]+)<\/span><\/h1>/i) || html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        if (titleMatch) title = titleMatch[1].trim();

        let priceMatch = html.match(/<div class="x-price-primary" data-testid="x-price-primary">[^<]*<span class="ux-textspans">US \$([^<]+)<\/span><\/div>/i) || html.match(/<span itemprop="price"[^>]*>US \$([^<]+)<\/span>/i) || html.match(/<span class="ux-textspans">US \$([^<]+)<\/span>/i);
        if (priceMatch) {
          price = parseFloat(priceMatch[1].replace(/[^0-9.]/g, ''));
        }

        let imgMatch = html.match(/<img[^>]*data-zoom-src="([^"]+)"/i) || html.match(/<img[^>]*id="icImg"[^>]*src="([^"]+)"/i) || html.match(/<div class="ux-image-carousel-item image-treatment active image"\s*data-zoom-src="([^"]+)"/i) || html.match(/<img[^>]*src="([^"]+s-l1600\.[^"]+)"/i);
        if (imgMatch) imgUrl = imgMatch[1];
        
        // Find gallery images
        const galleryMatches = html.matchAll(/"image":"([^"]+)"/g);
        for (const match of galleryMatches) {
          if (match[1].includes('s-l') || match[1].includes('s-l1600') || match[1].includes('s-l500')) {
             let bigImg = match[1].replace(/\\u002F/g, '/');
             bigImg = bigImg.replace(/s-l[0-9]+/g, 's-l1600');
             if (!imagenes.includes(bigImg)) {
               imagenes.push(bigImg);
             }
          }
        }

        // Sometimes images are in picture elements or data attributes
        const picMatches = html.matchAll(/img src="([^"]+s-l[0-9]+\.jpg)"/g);
        for (const match of picMatches) {
           let bigImg = match[1].replace(/s-l[0-9]+/g, 's-l1600');
           if (!imagenes.includes(bigImg)) {
             imagenes.push(bigImg);
           }
        }
      }

      if (imagenes.length === 0 && imgUrl) {
        imagenes = [imgUrl];
      }

      res.json({
        titulo: title,
        precio_usd: price || 0,
        imagen_url: imgUrl || imagenes[0] || "",
        imagenes: imagenes,
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
