import { ExternalLink, ShoppingCart } from 'lucide-react';
import { Producto } from '../types';

interface BotonCompraProps {
  producto: Producto;
  onAgregarCarrito: (prod: Producto) => void;
}

export default function BotonCompra({ producto, onAgregarCarrito }: BotonCompraProps) {
  const esAfiliado = producto.metodo_venta === 'Afiliado';

  const manejarClic = () => {
    if (esAfiliado) {
      window.open(
        `${producto.url_original}${producto.url_original.includes('?') ? '&' : '?'}tag=ticotrae1981-20`,
        '_blank',
        'noopener,noreferrer'
      );
    } else {
      onAgregarCarrito(producto);
    }
  };

  return (
    <button
      onClick={manejarClic}
      className={`w-full py-4 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all shadow-sm active:scale-95 mt-4
        ${esAfiliado 
          ? 'bg-gradient-to-b from-[#f5d171] to-[#f0b12b] hover:from-[#f6d988] hover:to-[#f1b944] text-slate-900 border border-[#a88734]' 
          : 'bg-[#25D366] hover:bg-[#20bd5a] text-white'
        }`}
    >
      {esAfiliado ? (
        <>
          <ExternalLink size={20} />
          Ver Oferta en Amazon
        </>
      ) : (
        <>
          <ShoppingCart size={20} />
          Encargar con TicoTrae
        </>
      )}
    </button>
  );
}
