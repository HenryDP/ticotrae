// content.js
function extractAmazonProductData() {
  try {
    const titleElement = document.querySelector('#productTitle') || document.querySelector('.qa-title-text');
    const titulo = titleElement ? titleElement.innerText.trim() : '';

    const cleanAmazonUrl = (u) => {
      if (!u) return "";
      return u.replace(/\._[A-Za-z0-9_,-]+_\./g, '.');
    };

    const imageElement = document.querySelector('#landingImage') || document.querySelector('#imgBlkFront') || document.querySelector('.a-dynamic-image');
    let imagen_url = imageElement ? imageElement.src : '';
    
    if (imagen_url && imagen_url.includes('data:image')) {
       // if base64 placeholder, try to get actual from attribute
       let dyn = imageElement.getAttribute('data-old-hires') || imageElement.getAttribute('data-a-dynamic-image');
       if (dyn && dyn.includes('{')) {
          try {
             const parsed = JSON.parse(dyn.replace(/&quot;/g, '"'));
             imagen_url = Object.keys(parsed)[0] || imagen_url;
          } catch(e) {}
       } else if (dyn) {
         imagen_url = dyn;
       }
    }
    imagen_url = cleanAmazonUrl(imagen_url);

    // Buscar otras imágenes
    let imagenes = [];
    
    // Attempt to extract from data-a-dynamic-image if available
    const dynImgs = document.querySelector('.a-dynamic-image')?.getAttribute('data-a-dynamic-image');
    if (dynImgs && dynImgs.includes('{')) {
      try {
        const parsed = JSON.parse(dynImgs.replace(/&quot;/g, '"'));
        Object.keys(parsed).forEach(k => {
          const u = cleanAmazonUrl(k);
          if (u && u !== imagen_url) imagenes.push(u);
        });
      } catch(e) {}
    }

    if (imagenes.length === 0) {
      document.querySelectorAll('.a-button-thumbnail img, .imageThumbnail img, .imgTagWrapper img').forEach(img => {
         const u = cleanAmazonUrl(img.src);
         if(u && u !== imagen_url) imagenes.push(u);
      });
    }
    imagenes = [...new Set(imagenes)].slice(0, 8); // Max 8 unique images

    // Buscar descripción
    let descripcion = '';
    const descElement = document.querySelector('#feature-bullets') || document.querySelector('#productDescription');
    if (descElement) {
        descripcion = descElement.innerText.trim();
    }

    // Tallas o variantes
    let tallas = '';
    const sizeSelect = document.querySelector('#native_dropdown_selected_size_name');
    if (sizeSelect) {
        const options = Array.from(sizeSelect.querySelectorAll('option')).map(o => o.innerText.trim()).filter(text => text.toLowerCase() !== 'select' && text !== '');
        tallas = options.join(', ');
    } else {
        const twisterSizes = document.querySelectorAll('#variation_size_name ul li');
        if (twisterSizes.length > 0) {
            const arr = [];
            twisterSizes.forEach(li => arr.push(li.innerText.trim()));
            tallas = arr.join(', ');
        }
    }

    // Intentar buscar el precio entero y decimal
    let precio_usd = 0;
    const priceWhole = document.querySelector('.a-price-whole');
    const priceFraction = document.querySelector('.a-price-fraction');
    if (priceWhole) {
      precio_usd = parseFloat(`${priceWhole.innerText.replace(/,/g, '')}${priceFraction ? priceFraction.innerText : '00'}`);
    } else {
      // Intenta otros selectores si este falla
      const simplePriceObj = document.querySelector('#priceblock_ourprice') || document.querySelector('#priceblock_dealprice') || document.querySelector('.a-price .a-offscreen') || document.querySelector('#corePriceDisplay_desktop_feature_div .a-price .a-offscreen');
      if (simplePriceObj) {
        precio_usd = parseFloat(simplePriceObj.innerText.replace(/[^0-9.]/g, ''));
      }
    }

    const url_original = window.location.href.split('?')[0]; // Limpiar la URL un poco

    return {
      titulo,
      url_original,
      imagen_url,
      imagenes,
      descripcion,
      tallas,
      precio_usd,
      estado: "pendiente"
    };
  } catch (error) {
    console.error("Error scrapeando producto de Amazon:", error);
    return null;
  }
}

function extractEbayProductData() {
  try {
    const titleElement = document.querySelector('h1.x-item-title__mainTitle') || document.querySelector('#itemTitle');
    let titulo = titleElement ? titleElement.innerText.trim() : '';
    if (titulo.startsWith('Details about')) titulo = titulo.replace('Details about', '').trim();

    const imageElement = document.querySelector('.ux-image-filmstrip-carousel-item.image img') || document.querySelector('#icImg');
    const imagen_url = imageElement ? imageElement.src : '';

    const imagenes = [];
    document.querySelectorAll('.ux-image-filmstrip-carousel-item img').forEach(img => {
       const src = img.src.replace('s-l64', 's-l1600').replace('s-l500', 's-l1600');
       if (src && !imagenes.includes(src) && src !== imagen_url) {
         imagenes.push(src);
       }
    });

    let precio_usd = 0;
    const priceElement = document.querySelector('.x-price-primary span.ux-textspans');
    if (priceElement) {
        const pText = priceElement.innerText.replace(/[^0-9.]/g, '');
        precio_usd = parseFloat(pText);
    }
    
    let descripcion = '';
    const condElement = document.querySelector('.x-item-condition-value .ux-textspans');
    if (condElement) {
        descripcion = "Condition: " + condElement.innerText.trim();
    }

    const url_original = window.location.href.split('?')[0];

    return {
      titulo,
      url_original,
      imagen_url,
      imagenes,
      descripcion,
      tallas: '',
      precio_usd,
      estado: "pendiente"
    };
  } catch (error) {
    console.error("Error scrapeando producto de eBay:", error);
    return null;
  }
}

// Escuchar mensajes del popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extract_data") {
    let data = null;
    const isEbay = window.location.hostname.includes('ebay.com');
    if (isEbay) {
      data = extractEbayProductData();
    } else {
      data = extractAmazonProductData();
    }
    sendResponse({ data });
  }
});
