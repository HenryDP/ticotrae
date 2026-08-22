export const generateAmazonCartUrl = (asin: string, affiliateTag: string = 'ticotrae1981-20'): string => {
  return `https://www.amazon.com/gp/aws/cart/add.html?AssociateTag=${affiliateTag}&ASIN.1=${asin}&Quantity.1=1`;
};

export const generateMultiAmazonCartUrl = (items: {asin: string, quantity: number}[], affiliateTag: string = 'ticotrae1981-20'): string => {
  let url = `https://www.amazon.com/gp/aws/cart/add.html?AssociateTag=${affiliateTag}`;
  items.forEach((item, index) => {
    url += `&ASIN.${index + 1}=${item.asin}&Quantity.${index + 1}=${item.quantity}`;
  });
  return url;
};

export const generateStandardAmazonUrl = (originalUrl: string, asin?: string, affiliateTag: string = 'ticotrae1981-20'): string => {
  let cleanUrl = originalUrl;
  if (cleanUrl.toLowerCase().includes('amazon')) {
    if (cleanUrl.includes('tag=')) {
      cleanUrl = cleanUrl.replace(/tag=[^&]+/, `tag=${affiliateTag}`);
    } else {
      cleanUrl = cleanUrl.includes('?') ? `${cleanUrl}&tag=${affiliateTag}` : `${cleanUrl}?tag=${affiliateTag}`;
    }
  }
  
  if (asin && !originalUrl.toLowerCase().includes('amazon')) {
     // If it has an ASIN but the URL isn't Amazon (edge case), just build the Amazon URL
    return `https://www.amazon.com/dp/${asin}?tag=${affiliateTag}`;
  }

  return cleanUrl;
};

export const generateAmazonDeepLink = (originalUrl: string, asin?: string, affiliateTag: string = 'ticotrae1981-20'): string => {
  const standardUrl = generateStandardAmazonUrl(originalUrl, asin, affiliateTag);
  const optimizedWebUrl = asin ? generateAmazonCartUrl(asin, affiliateTag) : standardUrl;
  
  // Si estamos en el lado del servidor/compilación, devolvemos fallback seguro
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return optimizedWebUrl;
  }

  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  if (isAndroid) {
    const urlWithoutProtocol = standardUrl.replace(/^https?:\/\//, '');
    // Intent Android:
    // 1. Intenta abrir 'com.amazon.mShop.android.shopping' con el esquema https:// (standardUrl para mejor soporte in-app).
    // 2. Si falla (no la app instalada), usa el browser_fallback_url con el link optimizado de añadir al carrito.
    return `intent://${urlWithoutProtocol}#Intent;action=android.intent.action.VIEW;scheme=https;package=com.amazon.mShop.android.shopping;S.browser_fallback_url=${encodeURIComponent(optimizedWebUrl)};end;`;
  }

  if (isIOS) {
    return standardUrl;
  }
  
  // Para Desktop, enviamos al carrito para mejorar la conversión.
  return optimizedWebUrl;
};
