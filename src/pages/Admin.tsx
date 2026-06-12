import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { signOut, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from '../firebase';
import { Producto, CATEGORIAS, GeneralSettings } from '../types';
import { FileEdit, CheckCircle2, DollarSign, Loader2, LogOut, Mail, Trash2, Upload, ImagePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { scrapeFallback } from '../utils/scraper';

export default function Admin() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProd, setEditingProd] = useState<Producto | null>(null);
  const [activeTab, setActiveTab] = useState<'productos' | 'ajustes' | 'suscriptores'>('productos');
  const [filterEstado, setFilterEstado] = useState<'pendiente' | 'publicado'>('pendiente');
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const navigate = useNavigate();

  const isAdmin = user?.email === 'duranhenry1981@gmail.com';

  const handleDeleteProd = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
      try {
        await deleteDoc(doc(db, 'productos', id));
        if (editingProd?.id === id) setEditingProd(null);
      } catch (e: any) {
        alert("Error al eliminar: " + e.message);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        alert('Error al iniciar sesión: ' + err.message);
      }
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser || currentUser.email !== 'duranhenry1981@gmail.com') {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    setLoading(true);
    // Fetch all products
    const q = query(collection(db, 'productos'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods: Producto[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let createdAtMillis = 0;
        if (data.createdAt) {
          if (typeof data.createdAt.toMillis === 'function') {
            createdAtMillis = data.createdAt.toMillis();
          } else if (data.createdAt.seconds) {
            createdAtMillis = data.createdAt.seconds * 1000;
          } else if (typeof data.createdAt === 'string') {
            createdAtMillis = new Date(data.createdAt).getTime();
          }
        }
        prods.push({ 
          id: docSnap.id, 
          ...data,
          _createdAtMillis: createdAtMillis
        } as any);
      });
      prods.sort((a: any, b: any) => b._createdAtMillis - a._createdAtMillis);
      setProductos(prods);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching admin catalog:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  if (loading) {
    return <div className="flex justify-center py-20 text-blue-500"><Loader2 className="animate-spin" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Acceso Restringido</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">Para acceder al panel de administración debes iniciar sesión con la cuenta de super administrador.</p>
        {!user || user.isAnonymous ? (
          <button 
            onClick={handleLogin}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-sm hover:bg-blue-700 transition"
          >
            Iniciar Sesión
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4">
             <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sesión actual: {user.email}</p>
             <button 
              onClick={handleSignOut}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium shadow-sm hover:bg-red-700 transition"
             >
               Cerrar Sesión e Iniciar con otra cuenta
             </button>
          </div>
        )}
      </div>
    );
  }

  const handleManualProductAdd = () => {
    setEditingProd({
      id: `temp_${Date.now()}`,
      titulo: 'Nuevo Producto',
      precio_usd: 0,
      imagen_url: '',
      imagenes: [],
      descripcion: '',
      tallas: '',
      marca: '',
      url_original: '',
      estado: 'pendiente'
    } as any);
  };

  const productosPendientes = productos.filter(p => p.estado === 'pendiente');
  const productosPublicados = productos.filter(p => p.estado === 'publicado');
  const displayList = filterEstado === 'pendiente' ? productosPendientes : productosPublicados;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-6">
           <button 
             onClick={() => setActiveTab('productos')}
             className={`pb-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'productos' ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
           >
             Inventario
           </button>
           {auth.currentUser?.email === 'duranhenry1981@gmail.com' && (
             <button 
               onClick={() => setActiveTab('ajustes')}
               className={`pb-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'ajustes' ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
             >
               Ajustes de PWA
             </button>
           )}
           {auth.currentUser?.email === 'duranhenry1981@gmail.com' && (
             <button 
               onClick={() => setActiveTab('suscriptores')}
               className={`pb-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'suscriptores' ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
             >
               Suscriptores (Newsletter)
             </button>
           )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="pb-3 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            Volver a la Tienda
          </button>
          <button
            onClick={handleSignOut}
            className="pb-3 text-sm font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-2 transition-colors"
          >
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>
      </div>

      {activeTab === 'productos' ? (
        <div className="flex flex-col-reverse md:flex-row gap-8 items-start">
          {/* Lista de pendientes */}
          <div className="w-full md:w-1/3 flex flex-col gap-6">
            
            {/* Importador por URL */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm flex items-center gap-2">
                 Importar por URL
              </h3>
              <div className="flex flex-col gap-3">
                <input 
                  type="text"
                  value={importUrl}
                  onChange={e => setImportUrl(e.target.value)}
                  placeholder="https://amazon... o https://ebay..."
                  className="w-full text-sm border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button 
                  onClick={async () => {
                    if (!importUrl) return;
                    setImporting(true);
                    
                    // =========================================================
                    // URL de Render actualizada con la imagen que enviaste
                    // =========================================================
                    const RENDER_URL = import.meta.env.VITE_BACKEND_URL || "https://ticotrae.onrender.com";
                    try {
                      const res = await fetch(`${RENDER_URL}/api/scrape`, {
                        method: 'POST',
                        mode: 'cors',
                        headers: { 
                          'Content-Type': 'application/json',
                          'Accept': 'application/json'
                        },
                        body: JSON.stringify({ url: importUrl })
                      });
                      
                      const textResponse = await res.text();
                      let data;
                      
                      try {
                        data = JSON.parse(textResponse);
                      } catch (parseError) {
                        throw new Error(`Respuesta inválida del servidor (${res.status}). Esto suele pasar cuando el servidor de Render está iniciando (reiniciándose) y devuelve una página HTML en lugar de los datos. Espera unos 30-50 segundos y vuelve a presionar el botón "Extraer y Guardar".`);
                      }

                      if (!res.ok) {
                        throw new Error(data.error || "Error desconocido");
                      }
                      
                      let finalUrl = data.url_original || '';
                      if (finalUrl.includes('amazon.')) {
                        const tag = 'ticotrae1981-20';
                        if (!finalUrl.includes('tag=')) {
                          finalUrl = finalUrl.includes('?') ? `${finalUrl}&tag=${tag}` : `${finalUrl}?tag=${tag}`;
                        }
                      }

                      setEditingProd({
                        id: `temp_${Date.now()}`,
                        titulo: data.titulo,
                        precio_usd: data.precio_usd,
                        imagen_url: data.imagen_url,
                        imagenes: data.imagenes || [],
                        descripcion: data.descripcion || '',
                        tallas: data.tallas || '',
                        marca: data.marca || '',
                        url_original: finalUrl,
                        estado: 'pendiente',
                        peso_kg: data.peso_kg || 1,
                        costo_por_kg: data.costo_por_kg,
                        envio_usa_miami: data.envio_usa_miami,
                        porcentaje_garantia: data.porcentaje_garantia,
                        tarifa_envio_cr: data.tarifa_envio_cr,
                        tarifa_correos_cr: data.tarifa_correos_cr,
                        ganancia: data.ganancia,
                        tipo_cambio: data.tipo_cambio,
                        ownerId: auth.currentUser?.uid || ''
                      } as Producto);
                      setImportUrl('');
                    } catch (e: any) {
                      console.warn("Backend scrape falló, intentando scrape local...", e);
                      try {
                        const data = await scrapeFallback(importUrl);
                        let finalUrl = data.url_original || '';
                        if (finalUrl.includes('amazon.')) {
                          const tag = 'ticotrae1981-20';
                          if (!finalUrl.includes('tag=')) {
                            finalUrl = finalUrl.includes('?') ? `${finalUrl}&tag=${tag}` : `${finalUrl}?tag=${tag}`;
                          }
                        }
                        setEditingProd({
                          id: `temp_${Date.now()}`,
                          titulo: data.titulo,
                          precio_usd: data.precio_usd,
                          imagen_url: data.imagen_url,
                          imagenes: data.imagenes || [],
                          descripcion: data.descripcion || '',
                          tallas: data.tallas || '',
                          marca: data.marca || '',
                          url_original: finalUrl,
                          estado: 'pendiente',
                          peso_kg: data.peso_kg || 1,
                          ownerId: auth.currentUser?.uid || ''
                        } as Producto);
                        setImportUrl('');
                      } catch (fallbackError: any) {
                        if (e.message === "Failed to fetch") {
                          alert("Error al conectar: 'Failed to fetch'.\n\nComo usamos la versión gratuita de Render, es probable que el servidor estuviera 'dormido' y la recolección local también falló.");
                        } else {
                          alert("Error al importar: " + e.message + " y " + fallbackError.message);
                        }
                      }
                    } finally {
                      setImporting(false);
                    }
                  }}
                  disabled={importing || !importUrl}
                  className="w-full bg-gray-900 hover:bg-black text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  {importing ? <Loader2 className="animate-spin" size={16} /> : null}
                  Cargar Producto
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex gap-4 border-b border-gray-200 dark:border-slate-700 pb-2">
                 <button 
                   onClick={() => setFilterEstado('pendiente')} 
                   className={`pb-1 text-sm font-semibold transition-colors ${filterEstado === 'pendiente' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                   Pendientes ({productosPendientes.length})
                 </button>
                 <button 
                   onClick={() => setFilterEstado('publicado')} 
                   className={`pb-1 text-sm font-semibold transition-colors ${filterEstado === 'publicado' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                   Publicados ({productosPublicados.length})
                 </button>
              </div>

              {displayList.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 text-center shadow-sm">
                No hay productos en esta lista.
              </p>
            ) : (
              <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-2">
                {displayList.map(p => (
                  <div 
                    key={p.id} 
                    className={`p-3 rounded-xl border flex gap-3 items-center transition group
                      ${editingProd?.id === p.id 
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 ring-1 ring-blue-500 shadow-sm' 
                        : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500'}`}
                  >
                    <img src={p.imagen_url} alt="" onClick={() => setEditingProd(p)} className="w-12 h-12 object-contain bg-white rounded aspect-square mix-blend-multiply cursor-pointer" />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setEditingProd(p)}>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.titulo}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">${p.precio_usd} {p.precio_cr ? `| ₡${p.precio_cr.toLocaleString('es-CR')}` : ''}</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteProd(p.id); }}
                      className="text-gray-300 hover:text-red-600 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                      title="Eliminar producto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>

          {/* Editor */}
          <div className="w-full md:w-2/3 sticky top-24">
            {editingProd ? (
              <EditorForm key={editingProd.id} prod={editingProd} onDone={() => setEditingProd(null)} />
            ) : (
               <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 border-dashed rounded-3xl p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                 <FileEdit size={32} className="mb-3 text-gray-300 dark:text-gray-600" />
                 Selecciona un producto pendiente para publicarlo en la tienda
               </div>
            )}
          </div>
        </div>
      ) : activeTab === 'ajustes' ? (
        <SettingsPanel />
      ) : (
        <SubscribersPanel />
      )}
    </div>
  );
}

function SettingsPanel() {
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getDoc(doc(db, 'settings', 'footer')).then((docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as GeneralSettings);
      } else {
        setSettings({
          appName: "TicoTrae",
          logoUrl: "",
          primaryColor: "#001489",
          heroTitle: "¡Descubrí lo que traemos para vos!",
          heroSubtitle: "Desde Estados Unidos directo hasta la puerta de tu choza!!!",
          aboutText: "Traemos tus compras de Amazon a Costa Rica sin enredos ni dolores de jupa.",
          emailContact: "hola@ticotrae.com",
          phoneContact: "+506 8000 0000",
          facebookUrl: "",
          instagramUrl: "",
          whatsappUrl: "https://wa.me/50664435508",
          copyrightText: "© 2026 TicoTrae. Todos los derechos reservados."
        });
      }
    });
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    setMessage('');
    try {
      await setDoc(doc(db, 'settings', 'footer'), settings);
      setMessage('¡Ajustes guardados correctamente!');
    } catch (e: any) {
      setMessage('Error al guardar: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) return <div className="py-10 text-center text-gray-500 dark:text-gray-400"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden w-full max-w-2xl mx-auto p-6 sm:p-8">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Ajustes Generales de la PWA</h2>
      
      <div className="flex flex-col gap-5">
        <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nombre de la App</label>
           <input 
              type="text"
              value={settings.appName || ''}
              onChange={e => setSettings({...settings, appName: e.target.value})}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
           />
        </div>
        <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">URL del Logo (Opcional)</label>
           <input 
              type="text"
              value={settings.logoUrl || ''}
              onChange={e => setSettings({...settings, logoUrl: e.target.value})}
              placeholder="https://..."
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
           />
        </div>
        <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Color Principal (Hex)</label>
           <input 
              type="color"
              value={settings.primaryColor || '#2563eb'}
              onChange={e => setSettings({...settings, primaryColor: e.target.value})}
              className="w-16 h-10 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg p-1 cursor-pointer"
           />
        </div>
        <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Título Principal (Hero)</label>
           <input 
              type="text"
              value={settings.heroTitle || ''}
              onChange={e => setSettings({...settings, heroTitle: e.target.value})}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
           />
        </div>
        <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Subtítulo (Hero)</label>
           <textarea 
              rows={2}
              value={settings.heroSubtitle || ''}
              onChange={e => setSettings({...settings, heroSubtitle: e.target.value})}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
           />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Texto 'Sobre TicoTrae' (Cofre)</label>
          <textarea 
            rows={3}
            value={settings.aboutText}
            onChange={e => setSettings({...settings, aboutText: e.target.value})}
            className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tipo de Cambio (₡)</label>
             <input 
                type="number"
                value={settings.globalTc || 520}
                onChange={e => setSettings({...settings, globalTc: Number(e.target.value)})}
                className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
             />
          </div>
          <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Margen de Ganancia Global (₡)</label>
             <input 
                type="number"
                value={settings.globalMargen || 5000}
                onChange={e => setSettings({...settings, globalMargen: Number(e.target.value)})}
                className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
             />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email de Contacto</label>
            <input 
              type="email"
              value={settings.emailContact}
              onChange={e => setSettings({...settings, emailContact: e.target.value})}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Teléfono</label>
            <input 
              type="text"
              value={settings.phoneContact}
              onChange={e => setSettings({...settings, phoneContact: e.target.value})}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">URL Facebook</label>
            <input 
              type="text"
              value={settings.facebookUrl}
              onChange={e => setSettings({...settings, facebookUrl: e.target.value})}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-gray-400"
              placeholder="https://facebook.com/..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">URL Instagram</label>
            <input 
              type="text"
              value={settings.instagramUrl}
              onChange={e => setSettings({...settings, instagramUrl: e.target.value})}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-gray-400"
              placeholder="https://instagram.com/..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">URL WhatsApp</label>
            <input 
              type="text"
              value={settings.whatsappUrl}
              onChange={e => setSettings({...settings, whatsappUrl: e.target.value})}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-gray-400"
              placeholder="https://wa.me/506..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">URL TikTok</label>
            <input 
              type="text"
              value={settings.tiktokUrl || ''}
              onChange={e => setSettings({...settings, tiktokUrl: e.target.value})}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-gray-400"
              placeholder="https://tiktok.com/@..."
            />
          </div>
        </div>

        <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Términos y Condiciones</label>
           <textarea 
              rows={4}
              value={settings.termsConditions || ''}
              onChange={e => setSettings({...settings, termsConditions: e.target.value})}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y"
              placeholder="Escriba los términos y condiciones aquí..."
           />
        </div>
        <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Política de Privacidad</label>
           <textarea 
              rows={4}
              value={settings.privacyPolicy || ''}
              onChange={e => setSettings({...settings, privacyPolicy: e.target.value})}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y"
              placeholder="Escriba la política de privacidad aquí..."
           />
        </div>
        <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Políticas de Envío</label>
           <textarea 
              rows={4}
              value={settings.shippingPolicy || ''}
              onChange={e => setSettings({...settings, shippingPolicy: e.target.value})}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y"
              placeholder="Escriba las políticas de envío aquí..."
           />
        </div>

        <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Texto Copyright</label>
           <input 
              type="text"
              value={settings.copyrightText}
              onChange={e => setSettings({...settings, copyrightText: e.target.value})}
              className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
           />
        </div>

        {message && (
          <div className={`text-sm font-bold px-4 py-3 rounded-xl border ${message.includes('Error') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
            {message}
          </div>
        )}

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 w-full sm:w-auto self-end disabled:bg-blue-300"
        >
          {isSaving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
          Guardar Ajustes
        </button>
      </div>
    </div>
  );
}

function SubscribersPanel() {
  const [subscribers, setSubscribers] = useState<{id: string, email: string, subscribedAt: any}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'newsletter_subscribers'), (snapshot) => {
      const subs = snapshot.docs.map(doc => ({
        id: doc.id,
        email: doc.data().email,
        subscribedAt: doc.data().subscribedAt
      }));
      setSubscribers(subs.sort((a, b) => {
        if (!a.subscribedAt || !b.subscribedAt) return 0;
        return b.subscribedAt.toMillis() - a.subscribedAt.toMillis();
      }));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCopyEmails = () => {
    const emails = subscribers.map(s => s.email).join(', ');
    navigator.clipboard.writeText(emails);
    alert('¡Correos copiados al portapapeles!');
  };

  const handleSendDailyDeals = () => {
    const bcc = subscribers.map(s => s.email).join(',');
    const subject = encodeURIComponent(`📢 Ofertas Increíbles de Hoy en Tico Trae`);
    const body = encodeURIComponent(`¡Hola!\n\nTe compartimos las ofertas y novedades que recién publicamos en nuestro catálogo. ¡Aprovechá para solicitar tu encargo!\n\nSaludos,\nEl equipo de Tico Trae\nhttps://ticotrae.com`);
    window.location.href = `mailto:?bcc=${bcc}&subject=${subject}&body=${body}`;
  };

  if (loading) return <div className="py-10 text-center text-gray-500 dark:text-gray-400"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden w-full max-w-4xl mx-auto p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-gray-100 dark:border-slate-700">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Suscriptores al Newsletter</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Total: {subscribers.length} {subscribers.length === 1 ? 'suscriptor' : 'suscriptores'}
          </p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          <button 
            onClick={handleCopyEmails}
            className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            Copiar Correos
          </button>
          <button 
            onClick={handleSendDailyDeals}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-sm shadow-indigo-600/20"
          >
            <Mail size={16} />
            Redactar Ofertas (BCC)
          </button>
        </div>
      </div>
      
      {subscribers.length === 0 ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
          Aún no hay suscriptores en la lista.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-700">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700/50">
                <th className="px-5 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Correo Electrónico</th>
                <th className="px-5 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Fecha de Suscripción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {subscribers.map(sub => (
                <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">{sub.email}</td>
                  <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {sub.subscribedAt ? new Date(sub.subscribedAt.toMillis()).toLocaleString('es-CR') : 'Reciente'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EditorForm({ prod, onDone }: { prod: Producto, onDone: () => void }) {
  const [precioUsd, setPrecioUsd] = useState(prod.precio_usd || 0);
  const [envioUsaMiami, setEnvioUsaMiami] = useState(prod.envio_usa_miami || 0);
  const [porcentajeGarantia, setPorcentajeGarantia] = useState(prod.porcentaje_garantia || 10);
  const [pesoKg, setPesoKg] = useState(prod.peso_kg || 1);
  const [tarifaEnvioCR, setTarifaEnvioCR] = useState(prod.tarifa_envio_cr || 8);
  const [tarifaCorreosCR, setTarifaCorreosCR] = useState(prod.tarifa_correos_cr || 0);
  const [ganancia, setGanancia] = useState(prod.ganancia || 10);
  const [tipoCambio, setTipoCambio] = useState(prod.tipo_cambio || 520);
  
  const [precioFinal, setPrecioFinal] = useState<number>(prod.precio_cr || 0);

  // Dynamic calculations
  const subtotalMiami = precioUsd + envioUsaMiami;
  const garantiaUsd = subtotalMiami * (porcentajeGarantia / 100);
  const envioCrUsd = pesoKg * tarifaEnvioCR;
  const correosCrUsd = pesoKg * tarifaCorreosCR;
  const totalUsdSinGanancia = subtotalMiami + garantiaUsd + envioCrUsd + correosCrUsd;
  const totalUsd = totalUsdSinGanancia + ganancia;
  const cssInput = "w-full border rounded-lg px-3 py-2 text-sm bg-slate-800 border-slate-600 text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono";

  useEffect(() => {
    setPrecioFinal(Math.round(totalUsd * tipoCambio));
  }, [totalUsd, tipoCambio]);
  const [imagenUrlEdit, setImagenUrlEdit] = useState<string>(prod.imagen_url);
  const [imagenesEdit, setImagenesEdit] = useState<string[]>(prod.imagenes || []);
  const [nuevaImagenUrl, setNuevaImagenUrl] = useState('');
  const [tituloEdit, setTituloEdit] = useState<string>(prod.titulo);
  const [urlOriginalEdit, setUrlOriginalEdit] = useState<string>(prod.url_original || '');
  const [descripcion, setDescripcion] = useState<string>(prod.descripcion || '');
  const [tallas, setTallas] = useState<string>(prod.tallas || '');
  const [categoria, setCategoria] = useState<string>(prod.categoria || 'Otros');
  const [marca, setMarca] = useState<string>(prod.marca || '');
  const [isDailyDeal, setIsDailyDeal] = useState<boolean>(prod.isDailyDeal || false);
  const [tiendaOrigen, setTiendaOrigen] = useState<'amazon' | 'ebay' | 'otra'>(prod.tienda_origen || (prod.url_original?.toLowerCase().includes('amazon') ? 'amazon' : prod.url_original?.toLowerCase().includes('ebay') ? 'ebay' : 'otra'));
  const defaultMetodo = tiendaOrigen === 'amazon' ? 'Afiliado' : 'Intermediario';
  const [metodoVenta, setMetodoVenta] = useState<'Afiliado' | 'Intermediario'>(prod.metodo_venta || defaultMetodo);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'footer')).then((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as GeneralSettings;
        if (data.globalTc) setTipoCambio(data.globalTc);
      }
    });
  }, [prod.id]);

  // Update input text when prod changes
  useEffect(() => {
    setPrecioUsd(prod.precio_usd || 0);
    setEnvioUsaMiami(prod.envio_usa_miami || 0);
    setPorcentajeGarantia(prod.porcentaje_garantia ?? 10);
    setPesoKg(prod.peso_kg || 1);
    setTarifaEnvioCR(prod.tarifa_envio_cr || 8);
    setTarifaCorreosCR(prod.tarifa_correos_cr || 0);
    setGanancia(prod.ganancia || 10);
    if (prod.tipo_cambio) setTipoCambio(prod.tipo_cambio);
    
    setImagenUrlEdit(prod.imagen_url);
    setImagenesEdit(prod.imagenes || []);
    setTituloEdit(prod.titulo);
    setUrlOriginalEdit(prod.url_original || '');
    setDescripcion(prod.descripcion || '');
    setTallas(prod.tallas || '');
    setCategoria(prod.categoria || 'Otros');
    setMarca(prod.marca || '');
    setIsDailyDeal(prod.isDailyDeal || false);
    const newTienda = prod.tienda_origen || (prod.url_original?.toLowerCase().includes('amazon') ? 'amazon' : prod.url_original?.toLowerCase().includes('ebay') ? 'ebay' : 'otra');
    setTiendaOrigen(newTienda);
    setMetodoVenta(prod.metodo_venta || (newTienda === 'amazon' ? 'Afiliado' : 'Intermediario'));
  }, [prod]);

  // handleRecalculate removed as useEffect automatically handles it

  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Quality 0.8 to compress
        const base64Str = canvas.toDataURL('image/jpeg', 0.8);
        setImagenUrlEdit(base64Str);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleLocalImageUploadExtra = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const base64Str = canvas.toDataURL('image/jpeg', 0.8);
        setImagenesEdit(prev => [...prev, base64Str]);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleGuardarCambios = async () => {
    setIsSubmitting(true);
    try {
      if (prod.id.startsWith('temp_')) {
        alert("Guarda primero el producto globalmente para poder actualizar parcialmente.");
        setIsSubmitting(false);
        return;
      }
      
      const prodData = {
        precio_cr: precioFinal,
        precio_usd: precioUsd,
        envio_usa_miami: envioUsaMiami,
        porcentaje_garantia: porcentajeGarantia,
        peso_kg: pesoKg,
        tarifa_envio_cr: tarifaEnvioCR,
        tarifa_correos_cr: tarifaCorreosCR,
        ganancia: ganancia,
        tipo_cambio: tipoCambio,
        updatedAt: serverTimestamp()
      };

      const ref = doc(db, 'productos', prod.id);
      await updateDoc(ref, prodData);
      
      alert("Información de precios guardada correctamente.");
    } catch (e: any) {
      console.error(e);
      alert("Error al guardar: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    setIsSubmitting(true);
    try {
      const isNew = prod.id.startsWith('temp_');
      let sku = prod.sku;
      if (!sku) {
        const catCode = categoria ? categoria.substring(0, 3).toUpperCase() : 'GEN';
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        sku = `PROD-${catCode}-${randomDigits}`;
      }
      
      const prodData = {
        precio_cr: precioFinal,
        precio_usd: precioUsd,
        envio_usa_miami: envioUsaMiami,
        porcentaje_garantia: porcentajeGarantia,
        peso_kg: pesoKg,
        tarifa_envio_cr: tarifaEnvioCR,
        tarifa_correos_cr: tarifaCorreosCR,
        ganancia: ganancia,
        tipo_cambio: tipoCambio,
        imagen_url: imagenUrlEdit,
        imagenes: imagenesEdit,
        titulo: tituloEdit,
        url_original: urlOriginalEdit,
        descripcion: descripcion,
        tallas: tallas,
        categoria: categoria,
        marca: marca,
        sku: sku,
        estado: 'publicado', // Always set to 'publicado' when saving via the admin UI
        isDailyDeal: isDailyDeal,
        tienda_origen: tiendaOrigen,
        metodo_venta: metodoVenta,
        updatedAt: serverTimestamp()
      };

      if (isNew) {
        const newRef = doc(collection(db, 'productos'));
        await setDoc(newRef, {
          ...prodData,
          ownerId: auth.currentUser?.uid,
          createdAt: serverTimestamp()
        });
      } else {
        const ref = doc(db, 'productos', prod.id);
        await updateDoc(ref, prodData);
      }
      onDone();
    } catch (e: any) {
      console.error(e);
      alert("Error al publicar: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col w-full">
      <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4 sm:gap-6 shrink-0">
        <div className="flex flex-col gap-2">
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-50 dark:bg-slate-700 rounded-xl flex-shrink-0 p-2 border border-gray-100 dark:border-slate-600 flex flex-col items-center justify-center overflow-hidden mx-auto sm:mx-0">
            {imagenUrlEdit ? (
              <img src={imagenUrlEdit} alt="" className="object-contain w-full h-full mix-blend-multiply" />
            ) : (
              <ImagePlus size={32} className="text-gray-400" />
            )}
          </div>
          <label className="text-xs text-center font-medium text-blue-600 cursor-pointer hover:underline border border-blue-200 bg-blue-50 px-2 py-1 rounded">
            Subir Imagen
            <input type="file" accept="image/*" onChange={handleLocalImageUpload} className="hidden" />
          </label>
        </div>
        <div className="flex flex-col flex-1 gap-2">
          {imagenesEdit && imagenesEdit.length > 0 && (
            <div className="flex gap-2 overflow-x-auto w-full pb-2 scrollbar-hide">
              {imagenesEdit.map((img, idx) => (
                <div key={idx} className="relative group flex-shrink-0">
                  <button 
                    onClick={() => setImagenUrlEdit(img)}
                    className={`w-12 h-12 rounded-lg border-2 transition-all overflow-hidden ${imagenUrlEdit === img ? 'border-blue-600 shadow-md scale-105' : 'border-gray-200 border-opacity-50 hover:border-gray-300'}`}
                  >
                    <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                  </button>
                  <button
                    onClick={() => setImagenesEdit(p => p.filter((_, i) => i !== idx))}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar imagen"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 mb-2">
            <input 
              type="text" 
              value={nuevaImagenUrl} 
              onChange={(e) => setNuevaImagenUrl(e.target.value)}
              className="text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none flex-1"
              placeholder="Añadir URL de imagen extra"
            />
            <button 
              onClick={() => {
                if (nuevaImagenUrl.trim()) {
                  setImagenesEdit(prev => [...prev, nuevaImagenUrl.trim()]);
                  setNuevaImagenUrl('');
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
            >
              Añadir
            </button>
            <label className="bg-gray-100 hover:bg-gray-200 dark:bg-slate-600 dark:hover:bg-slate-500 text-gray-700 dark:text-gray-100 text-xs px-3 py-1.5 rounded-lg flex-shrink-0 cursor-pointer flex items-center justify-center">
              Subir Imagen
              <input type="file" accept="image/*" onChange={handleLocalImageUploadExtra} className="hidden" />
            </label>
          </div>
          <input 
            type="text" 
            value={tituloEdit} 
            onChange={(e) => setTituloEdit(e.target.value)}
            className="text-lg font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none w-full"
            placeholder="Título del producto"
          />
          <input 
            type="text" 
            value={imagenUrlEdit} 
            onChange={(e) => setImagenUrlEdit(e.target.value)}
            className="text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none w-full mb-2"
            placeholder="O ingresa URL de la Imagen"
          />
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Categoría:</span>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="text-sm font-medium border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
            >
              {CATEGORIAS.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="mt-1 flex flex-col gap-2">
            <input 
              type="text" 
              value={urlOriginalEdit} 
              onChange={(e) => setUrlOriginalEdit(e.target.value)}
              className="text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-600 dark:bg-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none w-full"
              placeholder="URL Original de Amazon o eBay"
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              {urlOriginalEdit && (
                <a href={urlOriginalEdit} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline font-medium inline-block w-max">
                  Ver original en la tienda
                </a>
              )}
              <div className="flex items-center gap-2 bg-green-50 text-green-800 px-3 py-1.5 rounded-lg border border-green-100 sm:ml-auto">
                <span className="text-sm font-semibold whitespace-nowrap">Costo $</span>
                <input 
                  type="number"
                  value={precioUsd}
                  onChange={(e) => {
                    setPrecioUsd(Number(e.target.value));
                  }}
                  className="w-20 text-sm font-bold bg-white px-2 py-1 rounded border border-green-200 outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción del Producto</label>
          <textarea
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Añade una descripción, incluye materiales o características especiales..."
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tallas o Variantes Proporcionadas</label>
            <input
              type="text"
              value={tallas}
              onChange={(e) => setTallas(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: S, M, L, XL - o separar colores"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marca</label>
            <input
              type="text"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              className="w-full text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Nike, Apple..."
            />
          </div>
        </div>
      </div>

      <div className="p-6 bg-gray-50 dark:bg-slate-800">
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tienda de Origen</label>
            <select
              value={tiendaOrigen}
              onChange={(e) => setTiendaOrigen(e.target.value as any)}
              className="w-full text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="amazon">Amazon</option>
              <option value="ebay">eBay</option>
              <option value="otra">Otra</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método de Venta</label>
            <select
              value={metodoVenta}
              onChange={(e) => setMetodoVenta(e.target.value as any)}
              className="w-full text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Intermediario">Intermediario (Logística por TicoTrae)</option>
              <option value="Afiliado">Afiliado (Comprador va directo a Amazon)</option>
            </select>
          </div>
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer mt-4 sm:mt-6">
              <input
                type="checkbox"
                checked={isDailyDeal}
                onChange={(e) => setIsDailyDeal(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 dark:border-slate-600 dark:bg-slate-700"
              />
              <span className="text-sm font-bold text-red-600 dark:text-red-400">Oferta del Día (50% OFF)</span>
            </label>
          </div>
        </div>

        <div className="mb-6 bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 bg-slate-800/40">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <DollarSign size={18} className="text-blue-400" />
              Análisis de Precio (Admin)
            </h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-800">
            <div className="bg-slate-900 p-4 flex flex-col gap-1.5 focus-within:ring-2 focus-within:ring-blue-500/30 transition-shadow">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Precio Original (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input type="number" step="0.01" value={precioUsd} onChange={e => setPrecioUsd(Number(e.target.value))} className="w-full pl-7 pr-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm outline-none focus:border-blue-500 transition-colors font-mono" />
              </div>
            </div>
            
            <div className="bg-slate-900 p-4 flex flex-col gap-1.5 focus-within:ring-2 focus-within:ring-blue-500/30 transition-shadow">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Envío a Miami (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input type="number" step="0.01" value={envioUsaMiami} onChange={e => setEnvioUsaMiami(Number(e.target.value))} className="w-full pl-7 pr-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm outline-none focus:border-blue-500 transition-colors font-mono" />
              </div>
            </div>
            
            <div className="bg-slate-900 p-4 flex flex-col gap-1.5 focus-within:ring-2 focus-within:ring-blue-500/30 transition-shadow">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Garantía (%)</label>
              <div className="relative">
                <input type="number" step="0.1" value={porcentajeGarantia} onChange={e => setPorcentajeGarantia(Number(e.target.value))} className="w-full pl-3 pr-7 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm outline-none focus:border-blue-500 transition-colors font-mono" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
              </div>
            </div>

            <div className="bg-slate-900 p-4 flex flex-col gap-1.5 focus-within:ring-2 focus-within:ring-blue-500/30 transition-shadow">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Peso (kg)</label>
              <div className="relative">
                <input type="number" step="0.1" value={pesoKg} onChange={e => setPesoKg(Number(e.target.value))} className="w-full pl-3 pr-7 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm outline-none focus:border-blue-500 transition-colors font-mono" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">kg</span>
              </div>
            </div>
            
            <div className="bg-slate-900 p-4 flex flex-col gap-1.5 focus-within:ring-2 focus-within:ring-blue-500/30 transition-shadow">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Envío a CR ($/kg)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input type="number" step="0.1" value={tarifaEnvioCR} onChange={e => setTarifaEnvioCR(Number(e.target.value))} className="w-full pl-7 pr-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm outline-none focus:border-blue-500 transition-colors font-mono" />
              </div>
            </div>
            
            <div className="bg-slate-900 p-4 flex flex-col gap-1.5 focus-within:ring-2 focus-within:ring-blue-500/30 transition-shadow">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Correos CR ($/kg)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input type="number" step="0.1" value={tarifaCorreosCR} onChange={e => setTarifaCorreosCR(Number(e.target.value))} className="w-full pl-7 pr-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm outline-none focus:border-blue-500 transition-colors font-mono" />
              </div>
            </div>
            
            <div className="bg-slate-900 p-4 flex flex-col gap-1.5 focus-within:ring-2 focus-within:ring-blue-500/30 transition-shadow">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-widest text-emerald-400">Ganancia (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500/50">$</span>
                <input type="number" step="0.01" value={ganancia} onChange={e => setGanancia(Number(e.target.value))} className="w-full pl-7 pr-3 py-2 bg-emerald-950/20 border border-emerald-900 text-emerald-400 rounded-lg text-sm outline-none focus:border-emerald-500 transition-colors font-mono" />
              </div>
            </div>
            
            <div className="bg-slate-900 p-4 flex flex-col gap-1.5 focus-within:ring-2 focus-within:ring-blue-500/30 transition-shadow">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-widest whitespace-nowrap">Tipo Cambio (CRC)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₡</span>
                <input type="number" step="1" value={tipoCambio} onChange={e => setTipoCambio(Number(e.target.value))} className="w-full pl-7 pr-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm outline-none focus:border-blue-500 transition-colors font-mono" />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-950/60 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-t border-slate-800 font-mono">
             <div className="flex flex-col gap-1">
               <span className="text-sm font-medium text-slate-400 uppercase tracking-widest">Precio Final Total</span>
               <div className="flex items-baseline gap-3 relative z-10 group">
                 <input 
                   type="number"
                   value={precioFinal}
                   onChange={e => setPrecioFinal(Number(e.target.value))}
                   className="w-40 bg-transparent text-3xl font-bold text-white border-b-2 border-transparent hover:border-slate-700 focus:border-blue-500 outline-none transition-colors"
                 />
                 <span className="text-emerald-400 font-semibold font-sans text-sm bg-emerald-900/30 border border-emerald-800 px-2 py-0.5 rounded-md">
                   USD ${(precioFinal / Math.max(tipoCambio, 1)).toFixed(2)}
                 </span>
               </div>
             </div>
             
             <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onDone}
                  className="px-5 py-2.5 rounded-lg border border-slate-700 text-slate-300 font-sans font-medium text-sm hover:bg-slate-800 transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  type="button"
                  onClick={handleGuardarCambios}
                  disabled={isSubmitting || isNaN(precioFinal) || precioFinal <= 0}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-sans font-medium text-sm px-5 py-2.5 rounded-lg shadow-sm shadow-blue-900/50 disabled:bg-blue-900/50 disabled:text-blue-200 transition-colors"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  GUARDAR CAMBIOS
                </button>
             </div>
          </div>
        </div>

        <button 
          onClick={handlePublish}
          disabled={isSubmitting || isNaN(precioFinal) || precioFinal <= 0}
          className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Upload size={20} />}
          {prod.estado === 'pendiente' || prod.id.startsWith('temp_') ? 'Publicar en Tienda (Irreversible)' : 'Forzar Publicación Global'}
        </button>
      </div>
    </div>
  );
}