import React, { useState } from 'react';
import { ExternalLink, X, ShoppingBag, ShoppingCart, UserPlus } from 'lucide-react';
import { generateAmazonDeepLink, generateAmazonCartUrl, generateStandardAmazonUrl } from '../utils/amazonLinks';

interface AmazonAffiliateButtonProps {
  asin?: string;
  originalUrl: string;
  affiliateTag?: string;
}

export default function AmazonAffiliateButton({ 
  asin, 
  originalUrl, 
  affiliateTag = 'ticotrae1981-20' 
}: AmazonAffiliateButtonProps) {
  const [showModal, setShowModal] = useState(false);

  const handleInitialClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowModal(true);
  };

  const handleProceedToAmazon = () => {
    const deepLink = generateAmazonDeepLink(originalUrl, asin, affiliateTag);
    
    // Cerramos el modal
    setShowModal(false);
    
    // Redirigimos
    if (deepLink.startsWith('intent://') || /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.location.href = deepLink;
    } else {
      window.open(deepLink, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      <button 
        onClick={handleInitialClick}
        className="w-full bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold py-3.5 px-6 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 border border-gray-200 dark:border-slate-700 shadow-sm"
      >
        <ExternalLink size={18} />
        Comprar yo mismo en Amazon
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-end sm:justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:fade-in-100">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/40 rounded-2xl flex items-center justify-center shrink-0">
                <ShoppingBag size={28} className="text-orange-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Redirigiendo a Amazon</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Te llevaremos de forma segura.</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                <div className="flex items-start gap-3">
                  <UserPlus className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" size={18} />
                  <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                    <strong>¿No tienes cuenta de Amazon?</strong> No hay problema, puedes crearla fácil y gratis en el siguiente paso.
                  </p>
                </div>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-800/30">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 text-orange-600 dark:text-orange-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <div className="text-sm text-orange-900 dark:text-orange-200">
                    <p className="font-bold mb-2">Ingresa esta dirección de envío si no tienes casillero:</p>
                    <div className="bg-white/80 dark:bg-black/20 p-3 rounded-lg text-xs font-mono select-all">
                      <p><strong>Dirección:</strong> 2610 NW 89TH</p>
                      <p><strong>Dirección 2:</strong> RB / OB-897</p>
                      <p><strong>Estado:</strong> FLORIDA</p>
                      <p><strong>Ciudad:</strong> Doral</p>
                      <p><strong>Código Postal:</strong> 33172-1615</p>
                      <p><strong>Teléfono:</strong> +1 305-848-1127</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleProceedToAmazon}
              className="w-full bg-[#FF9900] hover:bg-[#FF9900]/90 text-black font-bold py-3.5 px-6 rounded-xl text-md transition-colors flex items-center justify-center shadow-md shadow-orange-500/20"
            >
              Continuar a Amazon
            </button>
            
            <button 
              onClick={() => setShowModal(false)}
              className="mt-3 w-full bg-transparent hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 font-medium py-3 px-6 rounded-xl text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
