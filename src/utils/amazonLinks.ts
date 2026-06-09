export const generateAmazonCartUrl = (asin: string, affiliateTag: string = 'ticotrae1981-20'): string => {
  return `https://www.amazon.com/gp/aws/cart/add.html?AssociateTag=${affiliateTag}&ASIN.1=${asin}&Quantity.1=1`;
};

export const generateStandardAmazonUrl = (originalUrl: string, asin?: string, affiliateTag: string = 'ticotrae1981-20'): string => {
  if (asin) {
    return `https://www.amazon.com/dp/${asin}?tag=${affiliateTag}`;
  }
  return originalUrl.includes('?') ? `${originalUrl}&tag=${affiliateTag}` : `${originalUrl}?tag=${affiliateTag}`;
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
