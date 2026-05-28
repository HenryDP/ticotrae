import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Producto, CATEGORIAS, GeneralSettings } from '../types';
import { ExternalLink, Tag, Search, Filter, MessageCircle, Heart } from 'lucide-react';

import toast from 'react-hot-toast';

export default function Catalog() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [selectedStore, setSelectedStore] = useState<string>("Todas");
  const [selectedBrand, setSelectedBrand] = useState<string>("Todas");
  const [showDailyDeals, setShowDailyDeals] = useState<boolean>(false);
  const [showNewProducts, setShowNewProducts] = useState<boolean>(false);
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    // When auth state changes, load favorites from profile or local storage
    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (user && !user.isAnonymous) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFavorites(docSnap.data().favorites || []);
        }
      } else {
        try {
          const saved = localStorage.getItem('ticotrae_favorites');
          if (saved) setFavorites(JSON.parse(saved));
        } catch {
          // ignore
        }
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    // Save to local storage for anonymous users
    if (!auth.currentUser || auth.currentUser.isAnonymous) {
      localStorage.setItem('ticotrae_favorites', JSON.stringify(favorites));
    }
  }, [favorites]);

  const toggleFavorite = async (productId: string) => {
    const isAdding = !favorites.includes(productId);
    const newFavorites = isAdding 
      ? [...favorites, productId]
      : favorites.filter(id => id !== productId);
      
    setFavorites(newFavorites);
    
    if (isAdding) {
      toast.success('Añadido a lista de deseos', {
        icon: '❤️',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    } else {
       toast('Eliminado de lista de deseos', {
        icon: '💔',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    }

    const user = auth.currentUser;
    if (user && !user.isAnonymous) {
      const docRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(docRef, { favorites: newFavorites });
      } catch (error: any) {
        if (error.code === 'not-found') {
          await setDoc(docRef, { favorites: newFavorites }, { merge: true });
        }
      }
    }
  };


  useEffect(() => {
    const q = query(collection(db, 'productos'), where('estado', '==', 'publicado'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods: Producto[] = [];
      snapshot.forEach((doc) => {
        prods.push({ id: doc.id, ...doc.data() } as Producto);
      });
      setProductos(prods);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching catalog:", error);
      setLoading(false);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'footer'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as GeneralSettings);
      }
    });

    return () => {
      unsubscribe();
      unsubSettings();
    };
  }, []);

  const availableBrands = useMemo(() => {
    const brands = new Set(productos.map(p => p.marca).filter(Boolean));
    return Array.from(brands) as string[];
  }, [productos]);

  const filteredProductos = useMemo(() => {
    return productos.filter(p => {
      const matchText = searchQuery.toLowerCase();
      const matchesSearch = p.titulo.toLowerCase().includes(matchText) || (p.marca && p.marca.toLowerCase().includes(matchText));
      const matchesCategory = selectedCategory === "Todas" || p.categoria === selectedCategory;
      const matchesBrand = selectedBrand === "Todas" || p.marca === selectedBrand;
      
      const pStore = p.tienda_origen || (p.url_original.toLowerCase().includes('amazon') ? 'amazon' : p.url_original.toLowerCase().includes('ebay') ? 'ebay' : 'otra');
      const matchesStore = selectedStore === "Todas" || pStore === selectedStore;
      
      const matchesDeals = showDailyDeals ? p.isDailyDeal === true : true;
      
      let isNew = false;
      if (p.createdAt && typeof p.createdAt.toDate === 'function') {
        const timeDiff = new Date().getTime() - p.createdAt.toDate().getTime();
        isNew = timeDiff < 7 * 24 * 60 * 60 * 1000;
      }
      const matchesNew = showNewProducts ? isNew : true;
      
      return matchesSearch && matchesCategory && matchesBrand && matchesStore && matchesDeals && matchesNew;
    });
  }, [productos, searchQuery, selectedCategory, selectedStore, selectedBrand, showDailyDeals, showNewProducts]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm h-72 border border-gray-100 dark:border-slate-700 flex flex-col gap-4">
             <div className="bg-gray-200 dark:bg-slate-700 h-40 rounded-xl w-full"></div>
             <div className="bg-gray-200 dark:bg-slate-700 h-4 rounded w-3/4"></div>
             <div className="bg-gray-200 dark:bg-slate-700 h-6 rounded w-1/3 mt-auto"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Section */}
      <div className="bg-white dark:bg-slate-800 border-2 border-cr-blue dark:border-slate-700 rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[200px] mb-2 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-cr-red"></div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-cr-blue dark:text-blue-400 tracking-tight mb-3">
            {settings?.heroTitle || "¡Descubrí lo que traemos para vos!"}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto text-base">
            {settings?.heroSubtitle || "Desde Estados Unidos directo hasta la puerta de tu choza!!!"}
          </p>
        </div>
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-cr-blue/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-cr-red/5 rounded-full blur-3xl"></div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col gap-4">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
            <Search size={20} />
          </div>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Buscar productos en ${settings?.appName || 'Tico Trae'}...`}
            className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
        
        {/* Filtros de Categoría */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1">
            <Link
              to="/wishlist"
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 flex items-center gap-2 bg-rose-50 dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-sm ring-1 ring-rose-200 dark:ring-rose-900/30 hover:bg-rose-100 dark:hover:bg-slate-700`}
            >
              <Heart size={16} fill={favorites.length > 0 ? "currentColor" : "none"} />
              Favoritos {favorites.length > 0 && `(${favorites.length})`}
            </Link>
            <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1"></div>
            <button
              onClick={() => setSelectedCategory("Todas")}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0
                ${selectedCategory === "Todas" 
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700' 
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
            >
              Todas
            </button>
            {CATEGORIAS.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0
                  ${selectedCategory === cat 
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700' 
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Filtros de Marca */}
        {availableBrands.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1">
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 mr-1 flex-shrink-0">Marca:</span>
              <button
                onClick={() => setSelectedBrand("Todas")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0
                  ${selectedBrand === "Todas" 
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700' 
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
              >
                Todas
              </button>
              {availableBrands.map(brand => (
                <button
                  key={brand}
                  onClick={() => setSelectedBrand(brand)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0
                    ${selectedBrand === brand 
                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700' 
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filtros de Tienda y Ofertas y Novedades */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 mr-1 flex-shrink-0">Tienda:</span>
          {["Todas", "amazon", "ebay"].map(store => (
            <button
              key={store}
              onClick={() => setSelectedStore(store)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors flex-shrink-0
                ${selectedStore === store 
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm' 
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
            >
              {store}
            </button>
          ))}
          
          <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1"></div>
          
          <button
            onClick={() => setShowDailyDeals(!showDailyDeals)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0 flex items-center gap-1.5
              ${showDailyDeals 
                ? 'bg-red-600 text-white shadow-sm ring-1 ring-red-700' 
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40'}`}
          >
            <Tag size={14} fill={showDailyDeals ? "currentColor" : "none"} />
            Ofertas 50% OFF
          </button>
          
          <button
            onClick={() => setShowNewProducts(!showNewProducts)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0 flex items-center gap-1.5
              ${showNewProducts 
                ? 'bg-green-600 text-white shadow-sm ring-1 ring-green-700' 
                : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/40'}`}
          >
            Nuevos (Últimos 7 días)
          </button>
        </div>
      </div>

      {filteredProductos.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm mt-4">
          <div className="bg-gray-50 dark:bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-slate-600">
            <Filter className="text-gray-400" size={28} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No se encontraron productos</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            {productos.length === 0 
              ? "Tu catálogo está vacío. Utiliza la extensión para traer productos de Amazon." 
              : "No hay resultados para tu búsqueda actual. Intenta con otros términos o cambia la categoría."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProductos.map(producto => {
            const message = `Hola, me interesa encargar este producto mediante pago por SINPE Móvil:\n\n*${producto.titulo}*\n\nPrecio Final: ₡${producto.precio_cr?.toLocaleString('es-CR')}\n\nEnlace original: ${producto.url_original}`;
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
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
                  {producto.categoria && (
                    <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur text-gray-700 dark:text-gray-300 px-2 py-1 rounded-md text-xs font-semibold shadow-sm border border-gray-100 dark:border-slate-600">
                      {producto.categoria}
                    </div>
                  )}
                  {producto.marca && (
                    <div className="bg-gray-100/90 dark:bg-slate-700/90 backdrop-blur text-gray-800 dark:text-gray-200 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide shadow-sm border border-gray-200 dark:border-slate-600">
                      {producto.marca}
                    </div>
                  )}
                  {((producto.tienda_origen || (producto.url_original.toLowerCase().includes('amazon') ? 'amazon' : producto.url_original.toLowerCase().includes('ebay') ? 'ebay' : 'otra')) === 'amazon') && (
                    <div className="bg-[#FF9900] text-gray-900 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-sm">
                      Amazon
                    </div>
                  )}
                  {((producto.tienda_origen || (producto.url_original.toLowerCase().includes('amazon') ? 'amazon' : producto.url_original.toLowerCase().includes('ebay') ? 'ebay' : 'otra')) === 'ebay') && (
                    <div className="bg-[#E53238] text-white px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-sm">
                      eBay
                    </div>
                  )}
                  {producto.isDailyDeal && (
                    <div className="bg-red-600 text-white px-2 py-1 rounded-md text-xs font-bold shadow-sm flex items-center gap-1">
                      <Tag size={12} />
                      50% OFF
                    </div>
                  )}
                </div>
                <div className={`absolute top-3 right-3 flex flex-col gap-2 transition-opacity z-10 ${favorites.includes(producto.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                   <button 
                     onClick={(e) => {
                       e.preventDefault();
                       toggleFavorite(producto.id);
                     }}
                     className="bg-white/90 dark:bg-slate-800/90 backdrop-blur p-2 rounded-full shadow-sm border border-gray-100 dark:border-slate-600 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-center"
                   >
                     <Heart 
                       size={18} 
                       className={favorites.includes(producto.id) ? "text-rose-500" : "text-gray-400"} 
                       fill={favorites.includes(producto.id) ? "currentColor" : "none"} 
                     />
                   </button>
                   <a href={producto.url_original} target="_blank" rel="noopener noreferrer" className="bg-white/90 dark:bg-slate-800/90 backdrop-blur text-gray-700 dark:text-gray-300 p-2 rounded-full shadow-sm border border-gray-100 dark:border-slate-600 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center">
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
                    Pedir por WhatsApp / SINPE
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
