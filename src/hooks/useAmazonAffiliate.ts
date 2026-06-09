import { useState, useEffect } from 'react';

interface UseAmazonAffiliateProps {
  originalUrl: string;
  affiliateTag?: string;
}

export function useAmazonAffiliate({ originalUrl, affiliateTag = 'ticotrae1981-20' }: UseAmazonAffiliateProps) {
  const [asin, setAsin] = useState<string | null>(null);
  const [affiliateUrl, setAffiliateUrl] = useState<string>('');

  useEffect(() => {
    // Expresión regular robusta para extraer el ASIN (generalmente 10 caracteres alfanuméricos en mayúsculas tras ciertos patrones)
    const extractASIN = (url: string) => {
      try {
        const match = url.match(/(?:dp|o|gp|-|asin|product)\/((?![0-9]{13})[A-Z0-9]{10})/i);
        return match ? match[1].toUpperCase() : null;
      } catch (error) {
        return null;
      }
    };

    if (originalUrl) {
      const foundAsin = extractASIN(originalUrl);
      setAsin(foundAsin);
      
      if (foundAsin) {
        // Enlace completamente limpio basado en el ASIN
        setAffiliateUrl(`https://www.amazon.com/dp/${foundAsin}?tag=${affiliateTag}`);
      } else {
        // Fallback: tratar de inyectar el tag en la URL si no se detecta el ASIN
        try {
          const urlObj = new URL(originalUrl);
          urlObj.searchParams.set('tag', affiliateTag);
          setAffiliateUrl(urlObj.toString());
        } catch(e) {
          setAffiliateUrl(originalUrl);
        }
      }
    }
  }, [originalUrl, affiliateTag]);

  const shareOnFacebook = () => {
    if (!affiliateUrl) return;
    const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(affiliateUrl)}`;
    window.open(fbShareUrl, '_blank', 'width=600,height=400');
  };

  const shareOnWhatsApp = (defaultText: string = '¡Mira este increíble producto en Amazon!') => {
    if (!affiliateUrl) return;
    const waShareUrl = `https://wa.me/?text=${encodeURIComponent(defaultText + '\n\n' + affiliateUrl)}`;
    window.open(waShareUrl, '_blank');
  };

  const fallbackShare = async (platformName: string, defaultText: string) => {
    if (!affiliateUrl) return;
    try {
      await navigator.clipboard.writeText(`${defaultText}\n\n${affiliateUrl}`);
      alert(`Enlace copiado al portapapeles. Abre la aplicación de ${platformName} para pegarlo en tu publicación o historia.`);
    } catch(e) {
      alert(`Actualmente no se puede compartir directamente a ${platformName} desde aquí. Por favor copia manualmente el enlace.`);
    }
  };

  const shareNative = async (platformName: string, defaultText: string = '¡Mira este increíble producto en Amazon!') => {
    if (!affiliateUrl) return;
    
    // Si estamos en un dispositivo que soporta Web Share API (móviles modernos), abrimos el menú nativo
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Producto Recomendado',
          text: defaultText,
          url: affiliateUrl,
        });
      } catch (error) {
        // Ignoramos si el usuario canceló la acción nativa
        if ((error as Error).name !== 'AbortError') {
          fallbackShare(platformName, defaultText);
        }
      }
    } else {
      // En computadoras de escritorio, copiamos al portapapeles
      fallbackShare(platformName, defaultText);
    }
  };

  return {
    asin,
    affiliateUrl,
    shareOnFacebook,
    shareOnWhatsApp,
    shareNative
  };
}
