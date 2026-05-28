// content.js
function extractAmazonProductData() {
  try {
    const titleElement = document.querySelector('#productTitle');
    const titulo = titleElement ? titleElement.innerText.trim() : '';

    const imageElement = document.querySelector('#landingImage') || document.querySelector('#imgBlkFront');
    const imagen_url = imageElement ? imageElement.src : '';

    // Intentar buscar el precio entero y decimal
    let precio_usd = 0;
    const priceWhole = document.querySelector('.a-price-whole');
    const priceFraction = document.querySelector('.a-price-fraction');
    if (priceWhole && priceFraction) {
      precio_usd = parseFloat(`${priceWhole.innerText.replace(/,/g, '')}${priceFraction.innerText}`);
    } else {
      // Intenta otros selectores si este falla
      const simplePriceObj = document.querySelector('#priceblock_ourprice') || document.querySelector('#priceblock_dealprice') || document.querySelector('.a-price .a-offscreen');
      if (simplePriceObj) {
        precio_usd = parseFloat(simplePriceObj.innerText.replace(/[^0-9.]/g, ''));
      }
    }

    const url_original = window.location.href.split('?')[0]; // Limpiar la URL un poco

    return {
      titulo,
      url_original,
      imagen_url,
      precio_usd,
      estado: "pendiente"
    };
  } catch (error) {
    console.error("Error scrapeando producto de Amazon:", error);
    return null;
  }
}

// Escuchar mensajes del popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extract_data") {
    const data = extractAmazonProductData();
    sendResponse({ data });
  }
});
