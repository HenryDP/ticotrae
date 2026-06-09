import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Trash2, MessageCircle, ExternalLink, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Cart() {
  const { cart, removeFromCart, clearCart } = useCart();
  const [envioDestino, setEnvioDestino] = useState<'ticotrae' | 'personal'>('ticotrae');
  const [direccionPersonal, setDireccionPersonal] = useState('');
  const globalWhatsappUrl = "https://wa.me/50664435508";

  const totalUSD = cart.reduce((sum, item) => sum + (item.producto.precio_usd * item.cantidad), 0);
  const totalCR = cart.reduce((sum, item) => sum + ((item.producto.precio_cr || 0) * item.cantidad), 0);

  const handleCheckoutWhatsApp = () => {
    if (cart.length === 0) return;

    let messageInfo = `Hola TicoTrae, quiero hacer un pedido con los siguientes artículos:\n\n`;
    
    cart.forEach(item => {
      messageInfo += `- ${item.cantidad}x ${item.producto.titulo} ${item.producto.asin ? `(ASIN: ${item.producto.asin})` : ''} - Talla: ${item.talla}\n  Link: ${window.location.origin}/producto/${item.producto.id}\n`;
    });

    const destinoStr = envioDestino === 'ticotrae' ? 'Casillero TicoTrae' : `Mi Casillero Personal (${direccionPersonal || 'No especificada'})`;
    messageInfo += `\nEl método de envío seleccionado es: ${destinoStr}.`;

    const baseWaUrl2 = globalWhatsappUrl.includes('?') ? `${globalWhatsappUrl}&` : `${globalWhatsappUrl}?`;
    const finalWaUrl = `${baseWaUrl2}text=${encodeURIComponent(messageInfo)}`;

    window.open(finalWaUrl, '_blank');
  };

  const handleCheckoutAmazon = () => {
    if (cart.length === 0) return;
    
    // For Amazon checkout, we can only really redirect to one of the products affiliate links,
    // or tell the user to checkout individually. Let's redirect to the first item for now.
    const firstItem = cart[0].producto;
    const urlAfiliado = firstItem.asin 
      ? `https://www.amazon.com/dp/${firstItem.asin}?tag=ticotrae1981-20`
      : firstItem.url_original 
        ? firstItem.url_original + (firstItem.url_original.includes('?') ? '&' : '?') + 'tag=ticotrae1981-20'
        : '#';
    
    window.open(urlAfiliado, '_blank');
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Tu carrito está vacío</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">No has agregado ningún producto a tu carrito todavía.</p>
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl transition"
        >
          Volver al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Tu Carrito de Compras</h2>
      
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {cart.map((item) => (
                <div key={item.producto.id} className="p-4 flex gap-4">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={item.producto.imagen_url || item.producto.imagenes?.[0] || 'https://via.placeholder.com/150'} 
                      alt={item.producto.titulo} 
                      className="w-full h-full object-cover mix-blend-multiply dark:mix-blend-normal"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/producto/${item.producto.id}`} className="font-semibold text-gray-900 dark:text-white line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition">
                      {item.producto.titulo}
                    </Link>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Talla: {item.talla} | Cantidad: {item.cantidad}
                    </div>
                    <div className="text-blue-600 dark:text-blue-400 font-bold mt-1">
                      ${item.producto.precio_usd} {item.producto.precio_cr ? `(₡${item.producto.precio_cr.toLocaleString('es-CR')})` : ''} c/u
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.producto.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition"
                    title="Eliminar"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[340px]">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 sticky top-24">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Resumen de tu pedido</h3>
            
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600 dark:text-gray-400 text-sm">Total Productos:</span>
              <span className="font-medium text-gray-900 dark:text-white">{cart.reduce((s, i) => s + i.cantidad, 0)}</span>
            </div>
            
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600 dark:text-gray-400 text-sm">Subtotal (USD):</span>
              <span className="font-medium text-gray-900 dark:text-white">${totalUSD.toFixed(2)}</span>
            </div>

            {totalCR > 0 && (
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100 dark:border-slate-700">
                <span className="text-gray-600 dark:text-gray-400 text-sm">Subtotal (CRC):</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">₡{totalCR.toLocaleString('es-CR')}</span>
              </div>
            )}

            <div className="flex flex-col gap-3 pb-4 mb-4 border-b border-gray-100 dark:border-slate-700">
              <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                ¿Dónde quieres recibir esto?
              </label>
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setEnvioDestino('ticotrae')}
                  className={`w-full py-2 text-sm font-semibold rounded-lg transition-all ${envioDestino === 'ticotrae' ? 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border border-transparent'}`}
                >
                  Casillero TicoTrae
                </button>
                <button
                  onClick={() => setEnvioDestino('personal')}
                  className={`w-full py-2 text-sm font-semibold rounded-lg transition-all ${envioDestino === 'personal' ? 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border border-transparent'}`}
                >
                  Mi propio casillero
                </button>
              </div>

              {envioDestino === 'personal' && (
                <div className="mt-1">
                  <input
                    type="text"
                    value={direccionPersonal}
                    onChange={(e) => setDireccionPersonal(e.target.value)}
                    placeholder="Ej. 1234 NW 89TH CT, Miami"
                    className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleCheckoutWhatsApp}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <MessageCircle size={18} />
                Pedir juntos por WhatsApp
              </button>
              
              <button 
                onClick={handleCheckoutAmazon}
                className="w-full bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold py-3.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 border border-gray-200 dark:border-slate-700 shadow-sm"
              >
                <ExternalLink size={18} />
                Comprar en Amazon
              </button>
            </div>
            
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
              *TicoTrae procesará y gestionará el envío a la dirección seleccionada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
