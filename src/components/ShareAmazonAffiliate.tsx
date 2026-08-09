import React, { useState, useEffect } from 'react';
import { Facebook, MessageCircle, Copy, Check, Instagram } from 'lucide-react';

const TikTokIcon = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
  </svg>
);

interface ShareAmazonAffiliateProps {
  url: string; // Not used directly for the shared link anymore, but kept for compatibility
  affiliateTag?: string;
  productName?: string;
}

export default function ShareAmazonAffiliate({ productName = 'este producto' }: ShareAmazonAffiliateProps) {
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const handleCopy = () => {
    if (!currentUrl) return;
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnFacebook = () => {
    if (!currentUrl) return;
    const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
    window.open(fbShareUrl, '_blank', 'width=600,height=400');
  };

  const shareOnWhatsApp = (defaultText: string = `¡Mira este increíble producto en TicoTrae!`) => {
    if (!currentUrl) return;
    const waShareUrl = `https://wa.me/?text=${encodeURIComponent(defaultText + '\n\n' + currentUrl)}`;
    window.open(waShareUrl, '_blank');
  };

  const fallbackShare = async (platformName: string, defaultText: string) => {
    if (!currentUrl) return;
    try {
      await navigator.clipboard.writeText(`${defaultText}\n\n${currentUrl}`);
      alert(`Enlace copiado al portapapeles. Abre la aplicación de ${platformName} para pegarlo en tu publicación o historia.`);
    } catch(e) {
      alert(`Actualmente no se puede compartir directamente a ${platformName} desde aquí. Por favor copia manualmente el enlace.`);
    }
  };

  const shareNative = async (platformName: string, defaultText: string = `¡Mira este increíble producto en TicoTrae!`) => {
    if (!currentUrl) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Producto Recomendado',
          text: defaultText,
          url: currentUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          fallbackShare(platformName, defaultText);
        }
      }
    } else {
      fallbackShare(platformName, defaultText);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm mt-4">
      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
        Compartir Producto
      </h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Comparte este producto con tus amigos
      </p>
      
      <div className="flex items-center gap-2 mb-4">
        <input 
          type="text" 
          value={currentUrl || 'Cargando enlace...'}
          readOnly 
          className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-lg py-2 px-3 text-xs text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        <button 
          onClick={handleCopy}
          className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors flex items-center justify-center shrink-0"
          title="Copiar enlace"
        >
          {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={shareOnFacebook}
          className="bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
        >
          <Facebook size={18} />
          <span className="hidden sm:inline">Facebook</span>
        </button>
        
        <button 
          onClick={() => shareOnWhatsApp(`¡Te recomiendo darle un vistazo a ${productName} en TicoTrae!`)}
          className="bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
        >
          <MessageCircle size={18} />
          <span className="hidden sm:inline">WhatsApp</span>
        </button>

        <button 
          onClick={() => shareNative('Instagram', `¡Te recomiendo darle un vistazo a ${productName} en TicoTrae!`)}
          className="bg-gradient-to-r from-[#833AB4]/10 via-[#FD1D1D]/10 to-[#F56040]/10 hover:from-[#833AB4]/20 hover:via-[#FD1D1D]/20 hover:to-[#F56040]/20 text-[#E1306C] font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
        >
          <Instagram size={18} />
          <span className="hidden sm:inline">Instagram</span>
        </button>

        <button 
          onClick={() => shareNative('TikTok', `¡Te recomiendo darle un vistazo a ${productName} en TicoTrae!`)}
          className="bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-black dark:text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
        >
          <TikTokIcon size={18} />
          <span className="hidden sm:inline">TikTok</span>
        </button>
      </div>
    </div>
  );
}
