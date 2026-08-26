import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Producto } from '../types';
import {  ExternalLink, Heart, ArrowLeft, MessageCircle , Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateStandardAmazonUrl } from '../utils/amazonLinks';

export default function Wishlist() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWishlist = async () => {
      setLoading(true);
      
      let favoriteIds: string[] = [];
      const user = auth.currentUser;
      
      if (user && !user.isAnonymous) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          favoriteIds = docSnap.data().favorites || [];
        }
      } else {
        try {
          const saved = localStorage.getItem('ticotrae_favorites');
          if (saved) favoriteIds = JSON.parse(saved);
        } catch {
          // ignore
        }
      }

      if (favoriteIds.length === 0) {
        setProductos([]);
        setLoading(false);
        return;
      }

      try {
        // limit 'in' queries can only handle up to 10 elements, but we do a workaround or batch requests
        const fetchedProductos: Producto[] = [];
        
        // Split favoriteIds into chunks of 10
        const chunks = [];
        for (let i = 0; i < favoriteIds.length; i += 10) {
          chunks.push(favoriteIds.slice(i, i + 10));
        }

        for (const chunk of chunks) {
          const q = query(collection(db, 'productos'), where('__name__', 'in', chunk));
          const snapshot = await getDocs(q);
          snapshot.forEach(doc => {
            fetchedProductos.push({ id: doc.id, ...doc.data() } as Producto);
          });
        }
        
        setProductos(fetchedProductos);
      } catch (error) {
        console.error("Error fetching wishlist products:", error);
      } finally {
        setLoading(false);
      }
    };

    const unsubAuth = auth.onAuthStateChanged(() => {
      fetchWishlist();
    });

    return () => unsubAuth();
  }, []);

  const removeFavorite = async (productId: string) => {
    const user = auth.currentUser;
    setProductos(prev => prev.filter(p => p.id !== productId));
    
    let newFavorites: string[] = [];
    
    if (user && !user.isAnonymous) {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const currentFavorites = docSnap.data().favorites || [];
        newFavorites = currentFavorites.filter((id: string) => id !== productId);
        try {
          // I will just use fetchWishlist update logic, but since it's already there we'll just update Firestore directly 
          // However for simplicity let's use the Catalog toggleFavorite logic but simplified.
          // Wait I can't import toggleFavorite. I'll just write it here.
          const { updateDoc } = await import('firebase/firestore');
          await updateDoc(docRef, { favorites: newFavorites });
        } catch (error) {
          console.error(error);
        }
      }
    } else {
      try {
        const saved = localStorage.getItem('ticotrae_favorites');
        if (saved) {
          const currentFavorites = JSON.parse(saved);
          newFavorites = currentFavorites.filter((id: string) => id !== productId);
          localStorage.setItem('ticotrae_favorites', JSON.stringify(newFavorites));
        }
      } catch {
        // ignore
      }
    }
    
    toast('Eliminado de lista de deseos', {
      icon: '💔',
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      },
    });
  };



  const handleShareProduct = async (producto: Producto, e: React.MouseEvent) => {
    e.preventDefault();
    const url = `${window.location.origin}/producto/${producto.id}`;
    const title = producto.titulo;
    const text = `¡Mira este producto en TicoTrae! ${title}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
          url: url,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
           navigator.clipboard.writeText(`${text}\n\n${url}`);
           toast.success("Enlace copiado al portapapeles");
        }
      }
    } else {
      navigator.clipboard.writeText(`${text}\n\n${url}`);
      toast.success("Enlace copiado al portapapeles");
    }
  };

            return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 border-b border-gray-200 dark:border-slate-700 pb-4 mb-2">
        <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Heart className="text-rose-500" fill="currentColor" />
          Mi Lista de Deseos
        </h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm h-72 border border-gray-100 dark:border-slate-700 flex flex-col gap-4">
               <div className="bg-gray-200 dark:bg-slate-700 h-40 rounded-xl w-full"></div>
               <div className="bg-gray-200 dark:bg-slate-700 h-4 rounded w-3/4"></div>
               <div className="bg-gray-200 dark:bg-slate-700 h-6 rounded w-1/3 mt-auto"></div>
            </div>
          ))}
        </div>
      ) : productos.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm mt-4">
          <div className="bg-rose-50 dark:bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100 dark:border-slate-600">
            <Heart className="text-rose-400" size={28} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tu lista de deseos está vacía</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
            Aún no has guardado ningún producto. Explora nuestro catálogo y guarda los productos que más te gustan.
          </p>
          <Link 
            to="/"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-violet-700 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-sm"
          >
            Explorar Catálogo
</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {productos.map(producto => {
            const message = `Hola, me interesa encargar este producto mediante pago por SINPE Móvil:\n\n*${producto.titulo}*\n\nPrecio Final: ₡${producto.precio_cr?.toLocaleString('es-CR')}\n\nEnlace: ${window.location.origin}/producto/${producto.id}`;
            const whatsappUrl = `https://wa.me/50664435508?text=${encodeURIComponent(message)}`;

            return (
            <div 
              key={producto.id} 
              className="group flex flex-col bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 dark:border-slate-700 transition-all duration-300 relative"
            >
              <div className="aspect-square bg-white p-4 flex items-center justify-center relative overflow-hidden">
                <Link to={`/producto/${producto.id}`} className="w-full h-full block">
                  <img 
                    src={producto.imagen_url} 
                    alt={producto.titulo} 
                    className="object-contain w-full h-full mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                  />
                </Link>
                {producto.categoria && (
                  <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur text-gray-700 dark:text-gray-300 px-2 py-1 rounded-md text-xs font-semibold shadow-sm border border-gray-100 dark:border-slate-600 pointer-events-none">
                    {producto.categoria}
                  </div>
                )}
                <div className="absolute top-3 right-3 flex flex-col gap-2 transition-opacity z-10 opacity-100">
                   <button 
                     onClick={(e) => {
                       e.preventDefault();
                       removeFavorite(producto.id);
                     }}
                     title="Quitar de la lista"
                     className="bg-white/90 dark:bg-slate-800/90 backdrop-blur p-2 rounded-full shadow-sm border border-gray-100 dark:border-slate-600 transition-colors hover:bg-rose-50 dark:hover:bg-slate-700 flex items-center justify-center"
                   >
                     <Heart 
                       size={18} 
                       className="text-rose-500" 
                       fill="currentColor" 
                     />
                   </button>
                   
                   <button
                     onClick={(e) => handleShareProduct(producto, e)}
                     className="bg-white/90 dark:bg-slate-800/90 backdrop-blur text-gray-700 dark:text-gray-300 p-2 rounded-full shadow-sm border border-gray-100 dark:border-slate-600 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                     title="Compartir"
                   >
                     <Share2 size={18} />
                   </button>
                   <a href={producto.tienda_origen === 'amazon' || (producto.url_original || '').toLowerCase().includes('amazon') ? generateStandardAmazonUrl(producto.url_original || '', producto.asin) : producto.url_original} target="_blank" rel="noopener noreferrer" className="bg-white/90 dark:bg-slate-800/90 backdrop-blur text-gray-700 dark:text-gray-300 p-2 rounded-full shadow-sm border border-gray-100 dark:border-slate-600 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center">
                     <ExternalLink size={18} />
                   </a>
                </div>
              </div>
              <div className="p-5 border-t border-gray-50 dark:border-slate-700 flex flex-col flex-1">
                <Link to={`/producto/${producto.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors pointer-events-auto">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm line-clamp-2 leading-relaxed mb-3">
                    {producto.titulo}
                  </h3>
                </Link>
                <div className="mt-auto flex flex-col gap-4">
                  <div className="flex items-end justify-between w-full">
                     <div className="flex flex-col">
                       <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Precio Final</span>
                       <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                         ₡{producto.precio_cr?.toLocaleString('es-CR')}
                       </span>
                     </div>
                     <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                       Costa Rica
                     </span>
                  </div>
                  <a 
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors text-center flex items-center justify-center gap-2 shadow-sm"
                  >
                    <MessageCircle size={18} />
                    Pedir por WhatsApp
                  </a>
                </div>
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  );
}
