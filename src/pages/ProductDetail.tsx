import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Producto, Comentario } from '../types';
import { ArrowLeft, ExternalLink, MessageCircle, Star, Loader2, Send, Facebook, Twitter, Share2, ChevronLeft, ChevronRight, ShoppingCart, Truck, ShieldCheck, ChevronDown, CheckCircle2, Tag, Calculator, DollarSign, Percent, Sparkles, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import BotonCompra from '../components/BotonCompra';
import ShareAmazonAffiliate from '../components/ShareAmazonAffiliate';
import AmazonAffiliateButton from '../components/AmazonAffiliateButton';

function getAffiliateUrl(url: string | null | undefined): string {
  if (!url) return '#';
  let cleanUrl = url;
  if (url.toLowerCase().includes('amazon')) {
    if (!url.includes('tag=')) {
      const sep = url.includes('?') ? '&' : '?';
      cleanUrl = `${url}${sep}tag=ticotrae1981-20`;
    } else {
      cleanUrl = url.replace(/tag=[^&]+/, 'tag=ticotrae1981-20');
    }
  }
  return cleanUrl;
}

interface AiRecommendation {
  id: string;
  name: string;
  category: string;
  price_crc: number;
  coincidence_reason: string;
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [nombreAutor, setNombreAutor] = useState("");
  const [rating, setRating] = useState(5);
  const [enviando, setEnviando] = useState(false);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [recomendaciones, setRecomendaciones] = useState<Producto[]>([]);
  const [aiRecomendaciones, setAiRecomendaciones] = useState<AiRecommendation[]>([]);
  const [openPolicy, setOpenPolicy] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [talla, setTalla] = useState("Estándar");
  const [envioDestino, setEnvioDestino] = useState<'ticotrae' | 'personal'>('ticotrae');
  const [direccionPersonal, setDireccionPersonal] = useState('');
  const [globalWhatsappUrl, setGlobalWhatsappUrl] = useState("https://wa.me/50664435508");

  const isAdmin = auth.currentUser?.email?.toLowerCase() === 'duranhenry1981@gmail.com';

  // Calculator State
  const [pesoKg, setPesoKg] = useState<number>(1);
  const [envioUsa, setEnvioUsa] = useState<number>(0);
  const [ganancia, setGanancia] = useState<number>(15);
  const [tipoCambio, setTipoCambio] = useState<number>(515);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'footer')).then((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.whatsappUrl) {
          setGlobalWhatsappUrl(data.whatsappUrl);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (producto) {
      if (producto.tallas) {
        const parsed = producto.tallas.split(',').map(t => t.trim()).filter(t => t);
        if (parsed.length > 0) {
          setTalla(parsed[0]);
        }
      } else {
        const catLower = producto.categoria?.toLowerCase() || '';
        const tituloLower = producto.titulo?.toLowerCase() || '';
        const isShoes = catLower.includes('zapat') || catLower.includes('tenis') || catLower.includes('calzad') || tituloLower.includes('zapat') || tituloLower.includes('tenis');
        const isClothes = catLower.includes('ropa') || catLower.includes('camis') || catLower.includes('pantal') || tituloLower.includes('camis') || catLower.includes('vestid') || tituloLower.includes('ropa');
        
        if (isShoes) {
          setTalla('US 8');
        } else if (isClothes) {
          setTalla('M');
        } else {
          setTalla('Estándar');
        }
      }
    }

    const searchParams = new URLSearchParams(window.location.search);
    if (producto && searchParams.get('autoBuy') === 'true') {
      const sku = producto.sku || (producto.categoria 
        ? `PROD-${producto.categoria.substring(0,3).toUpperCase()}-${producto.id.substring(0,4).toUpperCase()}`
        : `PROD-GEN-${producto.id.substring(0,4).toUpperCase()}`);
      
      const destinoStr = envioDestino === 'ticotrae' ? 'Casillero TicoTrae' : `Mi Casillero Personal (${direccionPersonal || 'No especificada'})`;
      const message = `Hola TicoTrae, quiero pedir el artículo ${producto.titulo}${producto.asin ? ` (ASIN: ${producto.asin})` : ''}. El método de envío seleccionado es: ${destinoStr}. Talla: ${talla}. Cantidad: ${cantidad}. Link: ${window.location.href.split('?')[0]}`;
      const baseWaUrl = globalWhatsappUrl.includes('?') ? `${globalWhatsappUrl}&` : `${globalWhatsappUrl}?`;
      const whatsappUrl = `${baseWaUrl}text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      // Remove query string to avoid re-triggering
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [producto]);

  useEffect(() => {
    if (!id) return;
    
    // Fetch product
    getDoc(doc(db, 'productos', id)).then(docSnap => {
      if (docSnap.exists()) {
        const prodData = { id: docSnap.id, ...docSnap.data() } as Producto;
        setProducto(prodData);
        if (prodData.peso_kg) {
          setPesoKg(prodData.peso_kg);
        }
        
        // Fetch recomendaciones
        if (prodData.categoria) {
           const getRecs = async () => {
             // Fallback logic for recommendations
             try {
               const qRecs = query(
                 collection(db, 'productos'),
                 where('categoria', '==', prodData.categoria),
                 limit(5)
               );
               const recsSnap = await getDocs(qRecs);
               const recs: Producto[] = [];
               recsSnap.forEach(d => {
                 if (d.id !== prodData.id) {
                   recs.push({ id: d.id, ...d.data() } as Producto);
                 }
               });
               setRecomendaciones(recs.slice(0, 4));
             } catch (e) {
               console.error("Error cargando recomendaciones:", e);
             }
           };
           getRecs();
        }
      }
      setLoading(false);
    });

    // Sub to comments
    const q = query(
      collection(db, 'comentarios'),
      where('productoId', '==', id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const comms: Comentario[] = [];
      snapshot.forEach((doc) => {
        comms.push({ id: doc.id, ...doc.data() } as Comentario);
      });
      setComentarios(comms);
    });

    return () => unsubscribe();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoComentario.trim() || !id || !auth.currentUser) return;
    
    setEnviando(true);
    try {
      await addDoc(collection(db, 'comentarios'), {
        productoId: id,
        texto: nuevoComentario.trim(),
        autor: nombreAutor.trim() || 'Usuario Anónimo',
        autorId: auth.currentUser.uid,
        rating,
        createdAt: serverTimestamp()
      });
      setNuevoComentario("");
      setNombreAutor("");
      setRating(5);
    } catch (err: any) {
      alert("Error al enviar comentario: " + err.message);
    } finally {
      setEnviando(false);
    }
  };

  const priceHistoryData = React.useMemo(() => {
    if (!producto) return [];
    const currentPrice = producto.precio_cr || 0;
    // Generate some fake variation over the last 6 months for the chart
    return [
      { name: 'Ene', precio: Math.round(currentPrice * 1.05) },
      { name: 'Feb', precio: Math.round(currentPrice * 1.08) },
      { name: 'Mar', precio: Math.round(currentPrice * 0.98) },
      { name: 'Abr', precio: Math.round(currentPrice * 1.02) },
      { name: 'May', precio: Math.round(currentPrice * 1.05) },
      { name: 'Jun', precio: Math.round(currentPrice) },
    ];
  }, [producto]);

  if (loading) {
    return <div className="text-center py-20 text-gray-500"><Loader2 className="animate-spin mx-auto" size={32} /></div>;
  }

  if (!producto) {
    return <div className="text-center py-20 text-gray-500">Producto no encontrado.</div>;
  }

  // Fallback SKU generation
  const sku = producto.sku || (producto.categoria 
    ? `PROD-${producto.categoria.substring(0,3).toUpperCase()}-${producto.id.substring(0,4).toUpperCase()}`
    : `PROD-GEN-${producto.id.substring(0,4).toUpperCase()}`);

  // Whatsapp logic with quantity and variant
  const message = `Hola TicoTrae, me interesa el producto ${producto.titulo}`;
  const baseWaUrl2 = globalWhatsappUrl.includes('?') ? `${globalWhatsappUrl}&` : `${globalWhatsappUrl}?`;
  const whatsappUrl = `${baseWaUrl2}text=${encodeURIComponent(message)}`;

  const rawImages = [producto.imagen_url, ...(producto.imagenes || [])].filter(Boolean);
  
  const cleanImageUrl = (u: string) => {
    if (!u) return "";
    if (u.includes("amazon.com") || u.includes("images-amazon.com") || /m\.media-amazon\.com/.test(u)) {
      return u.replace(/\._[A-Za-z0-9_,-]+_\./g, '.');
    }
    if (u.includes("ebayimg.com")) {
      return u.replace(/s-l[0-9]+\./g, 's-l1600.');
    }
    return u;
  };

  const images = Array.from(
    new Set(rawImages.filter(Boolean).map(cleanImageUrl))
  );

  const nextImage = () => setCurrentImageIdx(p => (p + 1) % images.length);
  const prevImage = () => setCurrentImageIdx(p => (p - 1 + images.length) % images.length);

  const togglePolicy = (policy: string) => {
    setOpenPolicy(p => p === policy ? null : policy);
  };

  const handleBuy = async () => {
    if (!auth.currentUser || auth.currentUser.isAnonymous) {
      alert('Por favor, regístrate o inicia sesión para continuar con tu compra.');
      navigate(`/profile?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists() || !docSnap.data().phoneNumber) {
        alert('Por favor completa tu perfil de cliente (teléfono) para poder comprar.');
        navigate(`/profile?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
    } catch (e) {
      console.error(e);
    }

    const destinoStr = envioDestino === 'ticotrae' ? 'Casillero TicoTrae' : `Mi Casillero Personal (${direccionPersonal || 'No especificada'})`;
    const messageInfo = `Hola TicoTrae, quiero pedir el artículo ${producto.titulo}${producto.asin ? ` (ASIN: ${producto.asin})` : ''}. El método de envío seleccionado es: ${destinoStr}. Talla: ${talla}. Cantidad: ${cantidad}. Link: ${window.location.href}`;
    const baseWaUrl2 = globalWhatsappUrl.includes('?') ? `${globalWhatsappUrl}&` : `${globalWhatsappUrl}?`;
    const finalWaUrl = `${baseWaUrl2}text=${encodeURIComponent(messageInfo)}`;

    window.open(finalWaUrl, '_blank');
  };

  // Parse tallas if available
  const tallasArray = producto.tallas 
    ? producto.tallas.split(',').map(t => t.trim()).filter(t => t) 
    : [];

  const catLower = producto.categoria?.toLowerCase() || '';
  const tituloLower = producto.titulo?.toLowerCase() || '';
  const isShoes = catLower.includes('zapat') || catLower.includes('tenis') || catLower.includes('calzad') || tituloLower.includes('zapat') || tituloLower.includes('tenis');
  const isClothes = catLower.includes('ropa') || catLower.includes('camis') || catLower.includes('pantal') || tituloLower.includes('camis') || catLower.includes('vestid') || tituloLower.includes('ropa');

  const defaultTallasGen = isShoes ? (
    ['US 5', 'US 5.5', 'US 6', 'US 6.5', 'US 7', 'US 7.5', 'US 8', 'US 8.5', 'US 9', 'US 9.5', 'US 10', 'US 10.5', 'US 11', 'US 11.5', 'US 12', 'US 12.5', 'US 13']
  ) : isClothes ? (
    ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  ) : ['Estándar'];

  // Calculations
  const calcPrecioUsd = producto?.precio_usd || 0;
  const calcCostoBase = calcPrecioUsd + envioUsa;
  const calcCuotaGarantia = calcCostoBase * 0.020815;
  const calcEnvioMiamiCR = pesoKg * 8;
  const calcEnvioLocalCR = envioDestino === 'ticotrae' ? (pesoKg * 9) : 0;
  
  const calcTotalUSD = calcCostoBase + calcCuotaGarantia + calcEnvioMiamiCR + calcEnvioLocalCR + ganancia;
  const calcTotalCRC = calcTotalUSD * tipoCambio;

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto pb-10">
      <Link to="/" className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors w-max">
        <ArrowLeft size={18} />
        Volver al Catálogo
      </Link>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col md:flex-row gap-0">
        <div className="w-full md:w-[60%] p-8 flex flex-col items-center bg-white dark:bg-slate-50 gap-4">
          <div className="relative w-full h-80 sm:h-96 flex items-center justify-center">
            {images.length > 1 && (
              <button onClick={prevImage} className="absolute left-0 bg-white/80 backdrop-blur p-2 rounded-full shadow-md border border-gray-100 text-gray-600 hover:text-blue-600 transition-colors z-10">
                <ChevronLeft size={20} />
              </button>
            )}
            <img 
              src={images[currentImageIdx]} 
              alt={producto.titulo} 
              className="w-full h-full object-contain max-h-full mix-blend-multiply"
            />
            {images.length > 1 && (
              <button onClick={nextImage} className="absolute right-0 bg-white/80 backdrop-blur p-2 rounded-full shadow-md border border-gray-100 text-gray-600 hover:text-blue-600 transition-colors z-10">
                <ChevronRight size={20} />
              </button>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto w-full pb-2 scrollbar-hide justify-center">
              {images.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setCurrentImageIdx(idx)}
                  className={`w-14 h-14 rounded-lg border-2 p-1 bg-white shrink-0 transition-colors ${idx === currentImageIdx ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <img src={img} className="w-full h-full object-contain mix-blend-multiply" alt="" />
                </button>
              ))}
            </div>
          )}
          
          <div className="w-full mt-8 text-left border-t border-gray-100 pt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Descripción Detallada</h3>
            <p className="text-gray-600 leading-relaxed mb-8">
              Este artículo exclusivo está diseñado para cumplir con los más altos estándares de calidad y durabilidad. Perfecto para tus necesidades diarias o uso especializado, su diseño ergonómico y acabados premium garantizan una excelente experiencia. Diseñado pensando en tu comodidad y eficiencia.
            </p>

            <h4 className="text-lg font-bold text-gray-900 mb-4">Características Técnicas</h4>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <CheckCircle2 size={20} className="text-blue-500 shrink-0 mt-0.5" />
                <span className="text-gray-700"><strong>Materiales:</strong> Fabricación premium resistente, asegurando larga vida útil. Algodón/Poliéster/Plástico ABS (varía por artículo).</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 size={20} className="text-blue-500 shrink-0 mt-0.5" />
                <span className="text-gray-700"><strong>Dimensiones:</strong> Consulta la guía de medidas en el enlace original para detalles exactos.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 size={20} className="text-blue-500 shrink-0 mt-0.5" />
                <span className="text-gray-700"><strong>Disponibilidad:</strong> Múltiples variaciones según stock en tienda.</span>
              </li>
            </ul>

            <h4 className="text-lg font-bold text-gray-900 mb-4">Logística y Tiempos de Entrega</h4>
            <div className="bg-blue-50 p-4 rounded-xl flex gap-4 items-start border border-blue-100">
               <Truck className="text-blue-600 shrink-0" size={24} />
               <p className="text-sm text-blue-900 leading-relaxed">
                 Recibe este artículo en la puerta de tu casa en un plazo de <strong>24 a 48 horas hábiles</strong> dentro del Gran Área Metropolitana, y de <strong>3 a 5 días</strong> para el resto del país una vez ingrese a nuestras bodegas en Costa Rica.
               </p>
            </div>

            <div className="mt-8 flex flex-col gap-3">
               <div className="border border-gray-200 rounded-xl overflow-hidden">
                 <button onClick={() => togglePolicy('entrega')} className="w-full bg-gray-50 px-5 py-4 flex items-center justify-between font-semibold text-gray-800 hover:bg-gray-100 transition-colors">
                   <div className="flex items-center gap-3"><Truck size={18} className="text-gray-500"/> Políticas de Entrega</div>
                   <ChevronDown size={18} className={`text-gray-500 transition-transform ${openPolicy === 'entrega' ? 'rotate-180' : ''}`} />
                 </button>
                 {openPolicy === 'entrega' && (
                   <div className="p-5 bg-white text-sm text-gray-600 border-t border-gray-200">
                     Hacemos envíos mediante Correos de Costa Rica y mensajería privada en la GAM. Todos nuestros paquetes requieren firma de recibido. Se enviará una notificación vía WhatsApp con tu número de rastreo tan pronto el paquete salga a ruta.
                   </div>
                 )}
               </div>

               <div className="border border-gray-200 rounded-xl overflow-hidden">
                 <button onClick={() => togglePolicy('devolucion')} className="w-full bg-gray-50 px-5 py-4 flex items-center justify-between font-semibold text-gray-800 hover:bg-gray-100 transition-colors">
                   <div className="flex items-center gap-3"><ShieldCheck size={18} className="text-gray-500"/> Políticas de Devolución y Cambio</div>
                   <ChevronDown size={18} className={`text-gray-500 transition-transform ${openPolicy === 'devolucion' ? 'rotate-180' : ''}`} />
                 </button>
                 {openPolicy === 'devolucion' && (
                   <div className="p-5 bg-white text-sm text-gray-600 border-t border-gray-200">
                     Cuentas con <strong>30 días</strong> para realizar cambios por talla o defectos de fábrica, siempre y cuando el artículo conserve sus etiquetas originales, empaque y no muestre signos de uso o desgaste. No aplica para ropa interior o artículos cosméticos.
                   </div>
                 )}
               </div>
            </div>

          </div>
        </div>
        <div className="w-full md:w-[40%] p-8 bg-gray-50/50 dark:bg-slate-800 flex flex-col border-l border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3 text-xs font-semibold tracking-wider">
            <div className="flex items-center gap-2">
              {producto.categoria && (
                <span className="text-blue-600 uppercase">{producto.categoria}</span>
              )}
              {producto.marca && (
                <div className="bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest shadow-sm">
                  {producto.marca}
                </div>
              )}
              {((producto.tienda_origen || (producto.url_original?.toLowerCase().includes('amazon') ? 'amazon' : producto.url_original?.toLowerCase().includes('ebay') ? 'ebay' : 'otra')) === 'amazon') && (
                <div className="bg-[#FF9900] text-gray-900 px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest shadow-sm">
                  Amazon
                </div>
              )}
              {((producto.tienda_origen || (producto.url_original?.toLowerCase().includes('amazon') ? 'amazon' : producto.url_original?.toLowerCase().includes('ebay') ? 'ebay' : 'otra')) === 'ebay') && (
                <div className="bg-[#E53238] text-white px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest shadow-sm">
                  eBay
                </div>
              )}
            </div>
            <span className="text-gray-400 font-mono">SKU: {sku}</span>
          </div>
          {producto.isDailyDeal && (
            <div className="mb-3 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm inline-flex items-center gap-1.5 w-fit">
              <Tag size={14} />
              Oferta del Día (50% OFF)
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight mb-2">
            {producto.titulo}
          </h1>

          {producto.descripcion && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed bg-white dark:bg-slate-700 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-600">
              {producto.descripcion}
            </p>
          )}
          
          <div className="mt-auto flex flex-col gap-6">
            <div className="flex flex-col gap-1 mb-6">
              <span className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Precio Final</span>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  ₡{Math.round(calcTotalCRC).toLocaleString('es-CR')}
                </span>
                {producto.isDailyDeal && (
                  <span className="text-lg text-gray-400 line-through dark:text-gray-500 mb-1">
                    ₡{(Math.round(calcTotalCRC) * 2).toLocaleString('es-CR')}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Puesto en Costa Rica (Todo incluido)</span>
            </div>

            {/* Price Analysis Section */}
            {isAdmin ? (
              <div className="bg-white dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-100 dark:border-slate-600">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Análisis de Precio (Admin)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-slate-800">
                        <tr>
                          <th className="px-3 py-2 rounded-tl-lg">Concepto</th>
                          <th className="px-3 py-2 text-right">USD</th>
                          <th className="px-3 py-2 rounded-tr-lg text-right">CRC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-600/50">
                        <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                          <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-200">
                            Precio Original {producto.tienda_origen ? `(${producto.tienda_origen.charAt(0).toUpperCase() + producto.tienda_origen.slice(1)})` : ''}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                            ${calcPrecioUsd.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                            ₡{(calcPrecioUsd * tipoCambio).toLocaleString('es-CR')}
                          </td>
                        </tr>
                        
                        <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                          <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-200 flex items-center gap-2">
                            <Truck size={14} className="text-gray-400" />
                            Envío USA a Miami
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-gray-500">$</span>
                              <input type="number" min="0" value={envioUsa} onChange={e => setEnvioUsa(Number(e.target.value) || 0)} className="w-16 text-right border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 px-1 py-0.5 text-gray-700 dark:text-white" />
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                            ₡{(envioUsa * tipoCambio).toLocaleString('es-CR')}
                          </td>
                        </tr>

                        <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400 flex items-center gap-2">
                            <Percent size={14} className="text-gray-400" />
                            Garantía T/C (2.0815%)
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                            ${calcCuotaGarantia.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                            ₡{(calcCuotaGarantia * tipoCambio).toLocaleString('es-CR')}
                          </td>
                        </tr>
                        
                        <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400 flex items-center gap-2">
                            <Truck size={14} className="text-gray-400" />
                            Envío a CR ({pesoKg}kg x $8)
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                            ${calcEnvioMiamiCR.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                            ₡{(calcEnvioMiamiCR * tipoCambio).toLocaleString('es-CR')}
                          </td>
                        </tr>
                        
                        {envioDestino === 'ticotrae' && (
                          <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400 flex items-center gap-2">
                              <Truck size={14} className="text-gray-400" />
                              Correos CR ({pesoKg}kg x $9)
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                              ${calcEnvioLocalCR.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">
                              ₡{(calcEnvioLocalCR * tipoCambio).toLocaleString('es-CR')}
                            </td>
                          </tr>
                        )}
                        
                        <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/50 bg-blue-50/20 dark:bg-slate-800/20">
                          <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-200">
                             <div className="flex items-center gap-2">
                               <Calculator size={14} className="text-blue-500 dark:text-blue-400" />
                               Ganancia TicoTrae
                             </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-blue-500 font-bold">$</span>
                              <input type="number" min="0" value={ganancia} onChange={e => setGanancia(Number(e.target.value) || 0)} className="w-16 text-right border-blue-200 dark:border-blue-800 border rounded bg-white dark:bg-slate-800 px-1 py-0.5 text-blue-600 dark:text-blue-400 font-bold" />
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">
                             ₡{(ganancia * tipoCambio).toLocaleString('es-CR')}
                          </td>
                        </tr>
                        
                        <tr className="bg-blue-50 dark:bg-slate-800 font-black">
                           <td className="px-3 py-3 text-gray-900 dark:text-white flex flex-col gap-1">
                             <span>Precio Final Total</span>
                             <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-2 mt-0.5">
                               <div className="flex items-center gap-1">
                                 <span>T/C:</span>
                                 <input type="number" value={tipoCambio} onChange={e => setTipoCambio(Number(e.target.value) || 515)} className="w-14 text-center border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 py-0.5 text-gray-700 dark:text-white" />
                               </div>
                               <div className="flex items-center gap-1">
                                 <span>Peso (kg):</span>
                                 <input type="number" step="0.1" min="0" value={pesoKg} onChange={e => setPesoKg(Number(e.target.value) || 1)} className="w-12 text-center border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 py-0.5 text-gray-700 dark:text-white" />
                               </div>
                             </div>
                           </td>
                          <td className="px-3 py-3 text-right text-blue-700 dark:text-blue-400 text-lg">
                            ${calcTotalUSD.toFixed(2)}
                          </td>
                          <td className="px-3 py-3 text-right text-blue-700 dark:text-blue-400 text-xl whitespace-nowrap">
                            ₡{Math.round(calcTotalCRC).toLocaleString('es-CR')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tendencia Histórica</span>
                  </div>
                  <div className="h-[120px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={priceHistoryData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:opacity-10" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} dy={5} />
                        <YAxis hide={true} domain={['dataMin - 1000', 'dataMax + 1000']} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                          formatter={(value: any) => [`₡${Number(value).toLocaleString('es-CR')}`, 'Precio']}
                          labelStyle={{ color: '#6b7280', marginBottom: '4px' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="precio" 
                          stroke="#2563eb" 
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 5, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600 shadow-sm overflow-hidden p-5 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-600 pb-2">Desglose del Precio Final</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-3">
                  <li className="flex justify-between items-center">
                    <span>Costo del Producto</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-200">₡{Math.round(calcPrecioUsd * tipoCambio).toLocaleString('es-CR')}</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>Gastos de importación, flete y gestión</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-200">₡{Math.round((calcTotalCRC) - (calcPrecioUsd * tipoCambio)).toLocaleString('es-CR')}</span>
                  </li>
                </ul>
                <div className="mt-1 pt-3 border-t border-gray-100 dark:border-slate-600 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg">
                  <ShieldCheck size={18} className="shrink-0" />
                  <span className="leading-relaxed">Tu compra está 100% protegida. Este monto incluye todos los costos hasta llegar a tus manos o a tu propio casillero.</span>
                </div>
              </div>
            )}

            {/* Componente de Conversión / Call to Action */}
            <div className="bg-white dark:bg-slate-700 p-6 rounded-2xl border border-gray-200 dark:border-slate-600 shadow-sm mb-6 flex flex-col gap-4">
              
              <div className="flex flex-col gap-3 pb-3 border-b border-gray-100 dark:border-slate-600">
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  ¿Dónde quieres recibir esto?
                </label>
                
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setEnvioDestino('ticotrae')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${envioDestino === 'ticotrae' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    Casillero TicoTrae
                  </button>
                  <button
                    onClick={() => setEnvioDestino('personal')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${envioDestino === 'personal' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    Mi propio casillero
                  </button>
                </div>

                {envioDestino === 'ticotrae' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/50 mt-1">
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                      TicoTrae se encarga de la importación y te lo entrega en la puerta de tu casa. Tarifa estimada basada en peso.
                    </p>
                  </div>
                )}

                {envioDestino === 'personal' && (
                  <div className="mt-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                      Ingresa la dirección de tu casillero (Miami)
                    </label>
                    <input
                      type="text"
                      value={direccionPersonal}
                      onChange={(e) => setDireccionPersonal(e.target.value)}
                      placeholder="Ej. 1234 NW 89TH CT, Miami, FL"
                      className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-4 mb-2">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Talla</label>
                  <select 
                    value={talla}
                    onChange={(e) => setTalla(e.target.value)}
                    className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {tallasArray.length > 0 ? (
                      tallasArray.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))
                    ) : (
                      defaultTallasGen.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cantidad</label>
                  <div className="flex items-center">
                    <button 
                      onClick={() => setCantidad(c => Math.max(1, c - 1))}
                      className="w-10 h-[42px] border border-gray-300 dark:border-slate-600 rounded-l-lg bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      value={cantidad}
                      onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full h-[42px] border-y border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white text-center text-sm font-medium focus:outline-none"
                    />
                    <button 
                      onClick={() => setCantidad(c => c + 1)}
                      className="w-10 h-[42px] border border-gray-300 dark:border-slate-600 rounded-r-lg bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-2">
                <button 
                  onClick={handleBuy}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <MessageCircle size={18} />
                  Pedir por WhatsApp (Gestión TicoTrae)
                </button>
                
                <AmazonAffiliateButton 
                  asin={producto.asin}
                  originalUrl={producto.url_original || '#'}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <ShareAmazonAffiliate 
                url={producto.url_original || ''} 
                productName={producto.titulo}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Motor de Recomendaciones de IA (Cross-Selling) */}
      {aiRecomendaciones.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-indigo-900/30 rounded-3xl border border-indigo-100 dark:border-indigo-800/50 shadow-sm overflow-hidden p-6 sm:p-8 mt-4">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Los clientes que vieron este producto también vieron:</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {aiRecomendaciones.map(aiRec => (
               <div key={aiRec.id} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-5 border border-white/40 dark:border-slate-600/50 shadow-sm flex flex-col">
                 <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">{aiRec.category}</span>
                 <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3 flex-grow">{aiRec.name}</h3>
                 <div className="flex items-center gap-2 mb-3 bg-indigo-50/50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-indigo-100/50 dark:border-slate-700/50">
                    <TrendingUp className="w-4 h-4 text-indigo-500 shrink-0" />
                    <p className="text-xs text-gray-600 dark:text-gray-300 italic">
                      "{aiRec.coincidence_reason}"
                    </p>
                 </div>
                 <div className="flex justify-between items-center mt-auto">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {aiRec.price_crc ? `~₡${aiRec.price_crc.toLocaleString('es-CR')}` : 'Precio Variable'}
                    </span>
                 </div>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* Motor de Recomendaciones General (Cross-Selling) */}
      {recomendaciones.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden p-6 sm:p-8 mt-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">También te podría interesar</h2>
          <div className="flex overflow-x-auto gap-6 pb-4 scrollbar-hide">
             {recomendaciones.map(rec => (
               <Link 
                 key={rec.id} 
                 to={`/producto/${rec.id}`}
                 className="min-w-[200px] w-[200px] sm:min-w-[220px] sm:w-[220px] group flex flex-col bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all shrink-0"
               >
                  <div className="aspect-square bg-white p-4 flex items-center justify-center relative">
                    <img 
                      src={rec.imagen_url} 
                      alt={rec.titulo} 
                      className="object-contain w-full h-full mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4 border-t border-gray-50 dark:border-slate-700 flex flex-col flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 text-xs line-clamp-2 leading-relaxed mb-2 flex-grow">
                      {rec.titulo}
                    </h3>
                    <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                      ₡{rec.precio_cr?.toLocaleString('es-CR')}
                    </span>
                  </div>
               </Link>
             ))}
          </div>
        </div>
      )}

      {/* Sección de Reseñas */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden p-6 sm:p-8 mt-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
          <Star className="text-yellow-400" fill="currentColor" />
          Reseñas y Comentarios ({comentarios.length})
        </h2>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="mb-10 bg-gray-50 dark:bg-slate-700 p-5 rounded-2xl border border-gray-100 dark:border-slate-600 flex flex-col gap-4">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Deja tu opinión</h3>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/3">
              <input 
                type="text" 
                placeholder="Tu nombre (opcional)"
                value={nombreAutor}
                onChange={e => setNombreAutor(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">Estrellas:</span>
              {[1,2,3,4,5].map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  className="focus:outline-none"
                >
                  <Star size={18} className={i <= rating ? "text-yellow-400" : "text-gray-300"} fill={i <= rating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
          </div>
          
          <div className="relative">
            <textarea 
              rows={3}
              placeholder="¿Qué te pareció este producto?"
              value={nuevoComentario}
              onChange={e => setNuevoComentario(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
            <button 
              type="submit"
              disabled={enviando || !nuevoComentario.trim()}
              className="absolute bottom-3 right-3 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {enviando ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            </button>
          </div>
        </form>

        {/* Lista de comentarios */}
        <div className="flex flex-col gap-4">
          {comentarios.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Aún no hay reseñas. ¡Sé el primero en opinar!</p>
          ) : (
            comentarios.map(comentario => (
              <div key={comentario.id} className="p-4 border-b border-gray-100 dark:border-slate-700 last:border-0 hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors rounded-xl">
                <div className="flex items-start justify-between mb-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center flex-shrink-0 font-bold uppercase">
                      {comentario.autor.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
                        {comentario.autor}
                        {comentario.autorId === auth.currentUser?.uid && (
                           <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Tú</span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} size={12} className={i <= (comentario.rating || 5) ? "text-yellow-400" : "text-gray-300"} fill={i <= (comentario.rating || 5) ? "currentColor" : "none"} />
                        ))}
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                          {comentario.createdAt?.toDate().toLocaleDateString('es-CR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mt-3 pl-13">
                  {comentario.texto}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
