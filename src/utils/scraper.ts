// Custom robust scratchpad and parser for Amazon & eBay products.
// Designed to be unbreakable by extracting data from JSON-LD schemas, OG Meta tags, comprehensive DOM selectors, and Regex fallback mining.

export function parseHTMLProduct(html: string, url: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  const urlLower = url.toLowerCase();
  const isAmazon = urlLower.includes("amazon.") || urlLower.includes("amzn.to");
  const isEbay = urlLower.includes("ebay.");

  // Helpers to clean and upgrade CDN URLs
  const cleanAmazonUrl = (u: string) => {
    if (!u) return "";
    // Strips Amazon modifiers/dimensions (e.g., ._AC_UL320_. or ._SL1500_.) to fetch the original high-resolution file.
    return u.replace(/\._[A-Za-z0-9_,-]+_\./g, '.');
  };

  const cleanEbayUrl = (u: string) => {
    if (!u) return "";
    // Replaces common eBay thumbnail flags (like s-l64.jpg, s-l225.jpg, s-l500.jpg) with s-l1600.jpg for maximum quality.
    return u.replace(/s-l\d+\./g, 's-l1600.');
  };

  // 1. Initial State Holders
  let extractedTitle = "";
  let extractedPrice = 0;
  let extractedImgUrl = "";
  let extractedImages: string[] = [];
  let extractedDesc = "";
  let extractedBrand = "";
  let extractedTallas = "";

  // 2. PARSE STRUCTURED DATA (JSON-LD) - VERY ROBUST FOR PRODUCT RICH TEXT
  const ldJsonScripts = doc.querySelectorAll('script[type="application/ld+json"]');
  ldJsonScripts.forEach((script) => {
    try {
      const text = script.textContent;
      if (!text) return;
      // Clean HTML comments or weird blocks inside scripts if any
      const cleanedText = text.trim().replace(/^\/\*<!\[CDATA\[\*\//, '').replace(/\*\/\]\]>\*$/, '');
      const data = JSON.parse(cleanedText);

      const findProductNode = (obj: any): any => {
        if (!obj) return null;
        if (Array.isArray(obj)) {
          for (const item of obj) {
            const found = findProductNode(item);
            if (found) return found;
          }
        } else if (typeof obj === 'object') {
          if (obj["@type"] === "Product" || (Array.isArray(obj["@type"]) && obj["@type"].includes("Product"))) {
            return obj;
          }
          if (obj["@graph"] && Array.isArray(obj["@graph"])) {
            return findProductNode(obj["@graph"]);
          }
          // Search sub-properties for nested product representation
          for (const key in obj) {
            if (typeof obj[key] === 'object') {
              const nested = findProductNode(obj[key]);
              if (nested) return nested;
            }
          }
        }
        return null;
      };

      const productNode = findProductNode(data);
      if (productNode) {
        if (productNode.name && !extractedTitle) {
          extractedTitle = productNode.name.toString().trim();
        }
        if (productNode.description && !extractedDesc) {
          extractedDesc = productNode.description.toString().trim();
        }
        
        // Extract Image of product
        if (productNode.image) {
          let rawImg = "";
          if (typeof productNode.image === 'string') {
            rawImg = productNode.image;
          } else if (Array.isArray(productNode.image) && productNode.image.length > 0) {
            rawImg = productNode.image[0];
            // collect alternates
            productNode.image.forEach((img: any) => {
              if (typeof img === 'string') extractedImages.push(img);
            });
          } else if (productNode.image.url) {
            rawImg = productNode.image.url;
          }
          
          if (rawImg && !extractedImgUrl) {
            extractedImgUrl = isAmazon ? cleanAmazonUrl(rawImg) : cleanEbayUrl(rawImg);
          }
        }

        // Extract Brand of product
        if (productNode.brand) {
          if (typeof productNode.brand === 'string') {
            extractedBrand = productNode.brand;
          } else if (productNode.brand.name) {
            extractedBrand = productNode.brand.name;
          }
        }

        // Extract Offers/Price
        if (productNode.offers) {
          const offers = productNode.offers;
          if (Array.isArray(offers) && offers.length > 0) {
            const mainOffer = offers[0];
            if (mainOffer.price) {
              extractedPrice = parseFloat(mainOffer.price.toString().replace(/[^0-9.]/g, ''));
            } else if (mainOffer.lowPrice) {
              extractedPrice = parseFloat(mainOffer.lowPrice.toString().replace(/[^0-9.]/g, ''));
            }
          } else if (typeof offers === 'object') {
            if (offers.price) {
              extractedPrice = parseFloat(offers.price.toString().replace(/[^0-9.]/g, ''));
            } else if (offers.lowPrice) {
              extractedPrice = parseFloat(offers.lowPrice.toString().replace(/[^0-9.]/g, ''));
            }
          }
        }
      }
    } catch (err) {
      // JSON Parsing fail is common, keep searching other scripts
    }
  });

  // 3. PARSE HEAD META TAGS (OpenGraph & Twitter Card previews are extremely static and resilient)
  const metaSelectors = {
    title: [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'meta[name="title"]'
    ],
    image: [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'link[rel="image_src"]'
    ],
    description: [
      'meta[property="og:description"]',
      'meta[name="description"]',
      'meta[name="twitter:description"]'
    ],
    brand: [
      'meta[name="twitter:data2"]', // Sometimes brand label
      'meta[property="product:brand"]'
    ]
  };

  const getMeta = (selectors: string[]): string => {
    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      if (el) {
        const content = el.getAttribute('content') || el.getAttribute('href');
        if (content && content.trim()) return content.trim();
      }
    }
    return "";
  };

  const metaTitle = getMeta(metaSelectors.title);
  if (metaTitle && (!extractedTitle || extractedTitle === "Producto sin título")) {
    extractedTitle = metaTitle;
  }

  const metaImg = getMeta(metaSelectors.image);
  if (metaImg && !extractedImgUrl) {
    extractedImgUrl = isAmazon ? cleanAmazonUrl(metaImg) : cleanEbayUrl(metaImg);
  }

  const metaDesc = getMeta(metaSelectors.description);
  if (metaDesc && !extractedDesc) {
    extractedDesc = metaDesc;
  }

  const metaBrand = getMeta(metaSelectors.brand);
  if (metaBrand && !extractedBrand) {
    extractedBrand = metaBrand;
  }

  // 4. TAILORED SELECTION ALGORITHMS (Selectors fallback)
  if (isAmazon) {
    // ----------------- AMAZON DOM PARSING -----------------
    // Title
    const amzTitleEl = doc.querySelector("#productTitle") || 
                       doc.querySelector("#title") || 
                       doc.querySelector("h1.a-size-large") || 
                       doc.querySelector(".qa-title-text");
    if (amzTitleEl && (!extractedTitle || extractedTitle === "Producto sin título")) {
      extractedTitle = amzTitleEl.textContent?.trim() || extractedTitle;
    }

    // Price
    let parsedPrice = 0;
    const wholeEl = doc.querySelector(".a-price-whole");
    const fracEl = doc.querySelector(".a-price-fraction");
    if (wholeEl) {
      const w = wholeEl.textContent?.replace(/[^0-9]/g, "") || "0";
      const f = fracEl ? (fracEl.textContent?.replace(/[^0-9]/g, "") || "00") : "00";
      parsedPrice = parseFloat(`${w}.${f}`);
    }

    if (parsedPrice === 0) {
      const priceSelectors = [
        "#priceblock_ourprice",
        "#priceblock_dealprice",
        "#priceblock_saleprice",
        ".a-price .a-offscreen",
        "span.a-color-price",
        "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
        "#corePrice_feature_div .a-price .a-offscreen",
        ".apexPriceToPay .a-offscreen",
        "#price_inside_buybox"
      ];
      for (const sel of priceSelectors) {
        const pEl = doc.querySelector(sel);
        if (pEl && pEl.textContent) {
          const num = parseFloat(pEl.textContent.replace(/[^0-9.]/g, ""));
          if (!isNaN(num) && num > 0) {
            parsedPrice = num;
            break;
          }
        }
      }
    }
    if (parsedPrice > 0) {
      extractedPrice = parsedPrice;
    }

    // Image URL
    const amzImgEl = doc.querySelector("#landingImage") || 
                      doc.querySelector("#imgBlkFront") || 
                      doc.querySelector(".a-dynamic-image");
    if (amzImgEl) {
      let rawImg = amzImgEl.getAttribute('data-old-hires') || amzImgEl.getAttribute("src") || "";
      if (rawImg.startsWith("data:image")) {
        const dynImg = amzImgEl.getAttribute('data-a-dynamic-image');
        if (dynImg && dynImg.includes('{')) {
          try {
            const parsed = JSON.parse(dynImg.replace(/&quot;/g, '"'));
            const keys = Object.keys(parsed);
            if (keys.length > 0) {
              rawImg = keys[0];
              // Collect standard dynamic image options
              keys.forEach(k => extractedImages.push(cleanAmazonUrl(k)));
            }
          } catch (e) {}
        }
      }
      if (rawImg && !extractedImgUrl) {
        extractedImgUrl = cleanAmazonUrl(rawImg);
      }
    }

    // Additional Image URLs
    const thumbEls = doc.querySelectorAll('.a-button-thumbnail img, .imageThumbnail img, .imgTagWrapper img');
    thumbEls.forEach((thumb) => {
      const src = thumb.getAttribute('src');
      if (src) extractedImages.push(cleanAmazonUrl(src));
    });

    // Description text
    const amzBullets = doc.querySelector('#feature-bullets') || doc.querySelector('#productDescription');
    if (amzBullets && !extractedDesc) {
      extractedDesc = amzBullets.textContent?.trim() || "";
    }

    // Brands
    const brandEl = doc.querySelector('#bylineInfo') || doc.querySelector('#brand');
    if (brandEl && !extractedBrand) {
      extractedBrand = brandEl.textContent?.replace(/Brand:/i, '').replace(/Visita la tienda de/i, '').trim() || "";
    }

    // Sizes
    const sizeSelect = doc.querySelector('#native_dropdown_selected_size_name');
    if (sizeSelect) {
      const options = Array.from(sizeSelect.querySelectorAll('option'))
        .map(o => o.textContent?.trim() || '')
        .filter(t => t.toLowerCase() !== 'select' && t !== '');
      extractedTallas = options.join(', ');
    } else {
      const twisterSizes = doc.querySelectorAll('#variation_size_name ul li');
      if (twisterSizes.length > 0) {
        const sizeArr: string[] = [];
        twisterSizes.forEach(li => {
          const txt = li.textContent?.trim();
          if (txt) sizeArr.push(txt);
        });
        extractedTallas = sizeArr.join(', ');
      }
    }
  } else if (isEbay) {
    // ----------------- EBAY DOM PARSING -----------------
    // Title
    const ebayTitleEl = doc.querySelector("h1.x-item-title__mainTitle span.ux-textspans") || 
                        doc.querySelector("h1.x-item-title__mainTitle") || 
                        doc.querySelector("#itemTitle");
    if (ebayTitleEl && (!extractedTitle || extractedTitle === "Producto sin título")) {
      extractedTitle = ebayTitleEl.textContent?.replace('Details about', '').trim() || extractedTitle;
    }

    // Price
    let parsedPrice = 0;
    const ebayPriceSelectors = [
      ".x-price-primary span.ux-textspans",
      "#prcIsum",
      "span[itemprop='price']",
      ".notranslate[itemprop='price']",
      ".x-price-primary",
      "[data-test-id='price-value']",
      ".display-price"
    ];
    for (const sel of ebayPriceSelectors) {
      const pEl = doc.querySelector(sel);
      if (pEl && pEl.textContent) {
        const num = parseFloat(pEl.textContent.trim().replace(/[^0-9.]/g, ""));
        if (!isNaN(num) && num > 0) {
          parsedPrice = num;
          break;
        }
      }
    }
    if (parsedPrice > 0) {
      extractedPrice = parsedPrice;
    }

    // Image URL & Additional Images
    const ebayImgEl = doc.querySelector(".ux-image-filmstrip-carousel-item.image img") || 
                      doc.querySelector(".ux-image-carousel-item.active img") || 
                      doc.querySelector("#icImg");
    if (ebayImgEl && !extractedImgUrl) {
      const src = ebayImgEl.getAttribute("src") || ebayImgEl.getAttribute("data-zoom-src") || "";
      if (src) extractedImgUrl = cleanEbayUrl(src);
    }

    // Additional images
    const ebayThumbs = doc.querySelectorAll('.ux-image-filmstrip-carousel-item img, .ux-image-filmstrip-carousel-item-wrapper img, .tdThumbnail img');
    ebayThumbs.forEach((thumb) => {
      const src = thumb.getAttribute("src") || thumb.getAttribute("data-src") || "";
      if (src) extractedImages.push(cleanEbayUrl(src));
    });

    // Description text
    const ebayDesc = doc.querySelector('.x-item-condition-value .ux-textspans') || 
                     doc.querySelector('#desc_wrapper_ctr') || 
                     doc.querySelector('.ux-layout-section--description');
    if (ebayDesc && !extractedDesc) {
      extractedDesc = "Condition: " + (ebayDesc.textContent?.trim() || "");
    }
  }

  // 5. REGEX FALLBACK MINING (AMAZON AND EBAY SPECIFIC CDN MAPPING DIRECTLY FROM INLINE SCRIPTS)
  if (isAmazon) {
    // Dig through HTML scripts for high-res images directly
    const amazonImgRegex = /https:\/\/[a-zA-Z0-9.-]*images-amazon\.com\/images\/I\/[a-zA-Z0-9_\-+%.,]+?\.(?:jpg|png|jpeg)/gi;
    const mediaAmazonRegex = /https:\/\/m\.media-amazon\.com\/images\/I\/[a-zA-Z0-9_\-+%.,]+?\.(?:jpg|png|jpeg)/gi;
    
    let regexMatch;
    const cdnImages: string[] = [];
    
    while ((regexMatch = amazonImgRegex.exec(html)) !== null) {
      cdnImages.push(cleanAmazonUrl(regexMatch[0]));
    }
    while ((regexMatch = mediaAmazonRegex.exec(html)) !== null) {
      cdnImages.push(cleanAmazonUrl(regexMatch[0]));
    }

    const uniqueCdn = [...new Set(cdnImages)].filter(uStr => {
      const u = uStr.toLowerCase();
      return !u.includes("pixel") && !u.includes("sprite") && !u.includes("1x1") && !u.includes("transparent") && !u.includes("logo");
    });

    if (uniqueCdn.length > 0) {
      if (!extractedImgUrl || extractedImgUrl.includes("pixel") || extractedImgUrl.includes("transparent")) {
        extractedImgUrl = uniqueCdn[0];
      }
      uniqueCdn.forEach(img => {
        if (img !== extractedImgUrl) extractedImages.push(img);
      });
    }
  } else if (isEbay) {
    // Dig through HTML for ebayimg urls
    const ebayImgRegex = /https:\/\/i\.ebayimg\.com\/images\/g\/[a-zA-Z0-9_\-+%.,]+?\/s-l\d+\.(?:jpg|png|jpeg|webp)/gi;
    let regexMatch;
    const cdnImages: string[] = [];

    while ((regexMatch = ebayImgRegex.exec(html)) !== null) {
      cdnImages.push(cleanEbayUrl(regexMatch[0]));
    }

    const uniqueCdn = [...new Set(cdnImages)];
    if (uniqueCdn.length > 0) {
      if (!extractedImgUrl) {
        extractedImgUrl = uniqueCdn[0];
      }
      uniqueCdn.forEach(img => {
        if (img !== extractedImgUrl) extractedImages.push(img);
      });
    }
  }

  // 6. SANITY DEFAULTS & GLOBAL FALLBACKS
  // If no title extracted, grab from standard `<title>` tag!
  if (!extractedTitle || extractedTitle === "Producto sin título") {
    const docTitle = doc.querySelector('title')?.textContent;
    if (docTitle) {
      extractedTitle = docTitle
        .replace(/Amazon\.com\s*:\s*/gi, '')
        .replace(/\s*:\s*Amazon\.com/gi, '')
        .replace(/\s*:\s*Deportes y Aire libre/gi, '')
        .replace(/\|\s*eBay/gi, '')
        .trim();
    }
  }

  // If still empty title
  if (!extractedTitle) {
    extractedTitle = "Producto Importado de " + (isAmazon ? "Amazon" : isEbay ? "eBay" : "Tienda");
  }

  // Deduplicate alternate images list & filter out the main image
  let finalImages = [...new Set(extractedImages)].filter(img => img && img !== extractedImgUrl);
  // Cap at max 12 images
  finalImages = finalImages.slice(0, 12);

  // If price is still 0, look for generic price patterns in HTML
  if (extractedPrice === 0) {
    const genericPriceRegex = /(?:USD|\$|US\s*\$)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2}))/i;
    const prStrMatch = html.match(genericPriceRegex);
    if (prStrMatch && prStrMatch[1]) {
      extractedPrice = parseFloat(prStrMatch[1].replace(/,/g, ''));
    }
  }

  // If even then price is 0, let's provide a default placeholder or 10
  if (isNaN(extractedPrice) || extractedPrice <= 0) {
    extractedPrice = 19.99; // Standard placeholder so the math calculations don't drop to 0
  }

  return {
    titulo: extractedTitle,
    precio_usd: extractedPrice,
    imagen_url: extractedImgUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80",
    imagenes: finalImages,
    descripcion: extractedDesc || "No hay una descripción completa disponible para este artículo.",
    tallas: extractedTallas,
    marca: extractedBrand,
    peso_kg: 1.0,
    url_original: url
  };
}

export async function scrapeFallback(url: string) {
  // Let's try multiple proxies for redundancy
  const proxies = [
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
  ];

  let lastError: any = null;

  for (const getProxyUrl of proxies) {
    try {
      const pUrl = getProxyUrl(url);
      const res = await fetch(pUrl);
      if (!res.ok) throw new Error(`Proxy fetch failed with status ${res.status}`);
      const html = await res.text();
      
      if (html.includes("Robot Check") || html.includes("api-services-support@amazon") || html.includes("captcha")) {
        throw new Error("Amazon captcha or bot check detected on proxy");
      }

      return parseHTMLProduct(html, url);
    } catch (e) {
      console.warn(`Proxy failed:`, e);
      lastError = e;
    }
  }

  throw lastError || new Error("No free proxy succeeded in scraping the URL");
}
