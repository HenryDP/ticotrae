export async function scrapeFallback(url: string) {
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error("Fallback fetch failed");
    const html = await res.text();
    
    // We parse basic amazon tags
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    const isAmazon = url.includes("amazon");
    const isEbay = url.includes("ebay");

    let title = "Producto sin título";
    let price = 0;
    let imgUrl = "";
    let imagenes: string[] = [];

    if (isAmazon) {
      const titleEl = doc.querySelector("#productTitle");
      if (titleEl) title = titleEl.textContent?.trim() || title;

      const wholeEl = doc.querySelector(".a-price-whole");
      const fracEl = doc.querySelector(".a-price-fraction");
      if (wholeEl && fracEl) {
        const w = wholeEl.textContent?.replace(/[^0-9]/g, "") || "0";
        const f = fracEl.textContent?.replace(/[^0-9]/g, "") || "00";
        price = parseFloat(`${w}.${f}`);
      } else {
         const priceEl = doc.querySelector("#priceblock_ourprice") || doc.querySelector(".a-price .a-offscreen");
         if (priceEl) price = parseFloat(priceEl.textContent?.replace(/[^0-9.]/g, "") || "0");
      }

      const imgEl = doc.querySelector("#landingImage") || doc.querySelector("#imgBlkFront");
      if (imgEl && imgEl.hasAttribute('data-old-hires')) {
         imgUrl = imgEl.getAttribute('data-old-hires') || "";
      } else if (imgEl) {
         imgUrl = imgEl.getAttribute("src") || "";
      }

      const dynImgStr = imgEl?.getAttribute("data-a-dynamic-image");
      if (dynImgStr) {
         try {
           const parsed = JSON.parse(dynImgStr.replace(/&quot;/g, '"'));
           imagenes = Object.keys(parsed);
         } catch(e) {}
      }
      if (!imgUrl && imagenes.length > 0) imgUrl = imagenes[0];
    } else if (isEbay) {
       const titleEl = doc.querySelector("h1.x-item-title__mainTitle span.ux-textspans") || doc.querySelector("h1.x-item-title__mainTitle");
       if (titleEl) title = titleEl.textContent?.trim() || title;
       
       const priceEl = doc.querySelector(".x-price-primary span.ux-textspans");
       if (priceEl) price = parseFloat(priceEl.textContent?.replace(/[^0-9.]/g, "") || "0");
       
       const imgEl = doc.querySelector(".ux-image-carousel-item.active img") || doc.querySelector("#icImg");
       if (imgEl) imgUrl = imgEl.getAttribute("src") || "";
    }

    return {
      titulo: title,
      precio_usd: price,
      imagen_url: imgUrl,
      imagenes,
      descripcion: "",
      tallas: "",
      marca: "",
      peso_kg: 1.0,
      url_original: url
    };
  } catch (e) {
    throw e;
  }
}
