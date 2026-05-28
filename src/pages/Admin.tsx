import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Producto, CATEGORIAS, GeneralSettings } from '../types';
import { FileEdit, CheckCircle2, DollarSign, Loader2, LogOut, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProd, setEditingProd] = useState<Producto | null>(null);
  const [activeTab, setActiveTab] = useState<'productos' | 'ajustes' | 'suscriptores'>('productos');
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'productos'), 
      where('estado', '==', 'pendiente'),
      where('ownerId', '==', auth.currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods: Producto[] = [];
      snapshot.forEach((docSnap) => {
        prods.push({ id: docSnap.id, ...docSnap.data() } as Producto);
      });
      setProductos(prods);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching admin catalog:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  if (loading) {
    return <div className="flex justify-center py-20 text-blue-500"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-6">
           <button 
             onClick={() => setActiveTab('productos')}
             className={`pb-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'productos' ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
           >
             Catálogo Pendiente
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
        <button
          onClick={() => navigate('/')}
          className="pb-3 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-2 transition-colors"
        >
          <LogOut size={16} />
          Volver a la Tienda
        </button>
      </div>

      {activeTab === 'productos' ? (
        <div className="flex flex-col-reverse md:flex-row gap-8 items-start">
          
          <div className="w-full md:w-1/3 flex flex-col gap-6">
            
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
                    try {
                      // 👇 AQUÍ ESTÁ LA CORRECCIÓN 👇
                      // Reemplaza esta URL con la ruta de tu servidor una vez que lo subas (ej: Render, Railway)
                      // Si estás programando en local, puedes usar temporalmente: 'http://localhost:3000/api/scrape'
                      const res = await fetch('https://TU-SERVIDOR-EN-RENDER.com/api/scrape', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: importUrl })
                      });
                      // 👆 ---------------------- 👆

                      const data = await res.json();
                      if (res.ok) {
                        setEditingProd({
                          id: `temp_${Date.now()}`,
                          titulo: data.titulo,
                          precio_usd: data.precio_usd,
                          imagen_url: data.imagen_url,
                          imagenes: data.imagenes || [],
                          url_original: data.url_original,
                          estado: 'pendiente',
                          ownerId: auth.currentUser?.uid || ''
                        } as Producto);
                        setImportUrl('');
                      } else {
                        alert("Error: " + (data.error || "No se pudo obtener datos. Comprueba la URL."));
                      }
                    } catch (e: any) {
                      alert("Error al importar: Asegúrate de tener el backend (server.ts) encendido y apuntando a la URL correcta. Detalle: " + e.message);
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
              <h2 className="font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-2">Pendientes de la extensión ({productos.length})</h2>
              {productos.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 text-center shadow-sm">
                No tienes productos pendientes. Usa la extensión de Chrome en Amazon.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {productos.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => setEditingProd(p)}
                    className={`p-3 rounded-xl border cursor-pointer flex gap-3 items-center transition
                      ${editingProd?.id === p.id 
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 ring-1 ring-blue-500 shadow-sm' 
                        : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500'}`}
                  >
                    <img src={p.imagen_url} alt="" className="w-12 h-12 object-contain bg-white rounded aspect-square mix-blend-multiply" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.titulo}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">${p.precio_usd}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>

          <div className="w-full md:w-2/3 sticky top-24">
            {editingProd ? (
              <EditorForm prod={editingProd} onDone={() => setEditingProd(null)} />
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
  const [pesoKg, setPesoKg] = useState(prod.peso_kg || 1);
  const [costoKg, setCostoKg] = useState(prod.costo_por_kg || 8);
  const flete = pesoKg * costoKg;
  const [impuesto, setImpuesto] = useState(1.13);
  const [tc, setTc] = useState(520);
  const [margen, setMargen] = useState(5000);
  const [precioUsd, setPrecioUsd] = useState(prod.precio_usd);

  const precioSugerido = Math.round(((precioUsd + flete) * impuesto * tc) + margen);
  const [precioFinal, setPrecioFinal] = useState<number>(precioSugerido);
  const [imagenUrlEdit, setImagenUrlEdit] = useState<string>(prod.imagen_url);
  const [tituloEdit, setTituloEdit] = useState<string>(prod.titulo);
  const [descripcion, setDescripcion] = useState<string>(prod.descripcion || '');
  const [tallas, setTallas] = useState<string>(prod.tallas || '');
  const [categoria, setCategoria] = useState<string>(prod.categoria || 'Otros');
  const [marca, setMarca] = useState<string>(prod.marca || '');
  const [isDailyDeal, setIsDailyDeal] = useState<boolean>(prod.isDailyDeal || false);
  const [tiendaOrigen, setTiendaOrigen] = useState<'amazon' | 'ebay' | 'otra'>(prod.tienda_origen || (prod.url_original?.toLowerCase().includes('amazon') ? 'amazon' : prod.url_original?.toLowerCase().includes('ebay') ? 'ebay' : 'otra'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setPrecioUsd(prod.precio_usd);
    setPesoKg(prod.peso_kg || 1);
    setCostoKg(prod.costo_por_kg || 8);
    setPrecioFinal(Math.round(((prod.precio_usd + ((prod.peso_kg || 1) * (prod.costo_por_kg || 8))) * impuesto * tc) + margen));
    setImagenUrlEdit(prod.imagen_url);
    setTituloEdit(prod.titulo);
    setDescripcion(prod.descripcion || '');
    setTallas(prod.tallas || '');
    setCategoria(prod.categoria || 'Otros');
    setMarca(prod.marca || '');
    setIsDailyDeal(prod.isDailyDeal || false);
    setTiendaOrigen(prod.tienda_origen || (prod.url_original?.toLowerCase().includes('amazon') ? 'amazon' : prod.url_original?.toLowerCase().includes('ebay') ? 'ebay' : 'otra'));
  }, [prod]);

  useEffect(() => {
    setPrecioFinal(Math.round(((precioUsd + pesoKg * costoKg) * impuesto * tc) + margen));
  }, [precioUsd, pesoKg, costoKg, impuesto, tc, margen]);

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
        peso_kg: pesoKg,
        costo_por_kg: costoKg,
        imagen_url: imagenUrlEdit,
        imagenes: prod.imagenes || [],
        titulo: tituloEdit,
        descripcion: descripcion,
        tallas: tallas,
        categoria: categoria,
        marca: marca,
        sku: sku,
        estado: 'publicado',
        isDailyDeal: isDailyDeal,
        tienda_origen: tiendaOrigen,
        updatedAt: serverTimestamp()
      };

      if (isNew) {
        const newRef = doc(collection(db, 'productos'));
        await setDoc(newRef, {
          ...prodData,
          precio_usd: prod.precio_usd,
          url_original: prod.url_original,
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
        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-50 dark:bg-slate-700 rounded-xl flex-shrink-0 p-2 border border-gray-100 dark:border-slate-600 flex flex-col items-center justify-center overflow-hidden mx-auto sm:mx-0">
          <img src={imagenUrlEdit} alt="" className="object-contain w-full h-full mix-blend-multiply" />
        </div>
        <div className="flex flex-col flex-1 gap-2">
          {prod.imagenes && prod.imagenes.length > 0 && (
            <div className="flex gap-2 overflow-x-auto w-full pb-2 scrollbar-hide">
              {prod.imagenes.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setImagenUrlEdit(img)}
                  className={`w-12 h-12 rounded-lg border-2 transition-all overflow-hidden flex-shrink-0 ${imagenUrlEdit === img ? 'border-blue-600 shadow-md scale-105' : 'border-gray-200 border-opacity-50 hover:border-gray-300'}`}
                >
                  <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
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
            placeholder="URL de la Imagen"
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
          <div className="mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <a href={prod.url_original} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline font-medium inline-block w-max">
              Ver original en Amazon
            </a>
            <div className="flex items-center gap-2 bg-green-50 text-green-800 px-3 py-1.5 rounded-lg border border-green-100">
              <span className="text-sm font-semibold whitespace-nowrap">Costo $</span>
              <input 
                type="number"
                value={precioUsd}
                onChange={(e) => setPrecioUsd(Number(e.target.value))}
                className="w-20 text-sm font-bold bg-white px-2 py-1 rounded border border-green-200 outline-none focus:ring-2 focus:ring-green-400"
              />
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
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm bg-white dark:bg-slate-700 p-4 rounded-xl border border-gray-100 dark:border-slate-600">
           <div className="flex flex-col">
             <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">Peso (kg)</span>
             <input type="number" step="0.1" value={pesoKg} onChange={e => setPesoKg(Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm bg-gray-50 dark:bg-slate-800 dark:border-slate-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
           </div>
           <div className="flex flex-col">
             <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">Costo/kg ($)</span>
             <input type="number" value={costoKg} onChange={e => setCostoKg(Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm bg-gray-50 dark:bg-slate-800 dark:border-slate-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
           </div>
           <div className="flex flex-col">
             <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">Impuesto (Ej: 1.13)</span>
             <input type="number" step="0.01" value={impuesto} onChange={e => setImpuesto(Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm bg-gray-50 dark:bg-slate-800 dark:border-slate-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
           </div>
           <div className="flex flex-col">
             <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">T.C (₡)</span>
             <input type="number" value={tc} onChange={e => setTc(Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm bg-gray-50 dark:bg-slate-800 dark:border-slate-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
           </div>
           <div className="flex flex-col">
             <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">Margen (₡)</span>
             <input type="number" value={margen} onChange={e => setMargen(Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm bg-gray-50 dark:bg-slate-800 dark:border-slate-600 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
           </div>
        </div>

        <label className="block mb-2 font-medium justify-between flex text-gray-700 dark:text-gray-300">
          <div>Precio de venta final (Colones)</div>
          <div className="flex gap-2">
            <span className="text-xs font-normal text-gray-400 dark:text-gray-300 bg-gray-200 dark:bg-gray-800 px-2 rounded-md py-0.5">Costo Total: ₡{Math.round((precioUsd + pesoKg * costoKg) * impuesto * tc).toLocaleString('es-CR')}</span>
            <span className="text-xs font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 rounded-md py-0.5">
              Ganancia Estimada: ₡{(precioFinal - Math.round((precioUsd + pesoKg * costoKg) * impuesto * tc)).toLocaleString('es-CR')}
            </span>
          </div>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 dark:text-gray-400">
            ₡
          </div>
          <input 
            type="number"
            value={precioFinal}
            onChange={(e) => setPrecioFinal(Number(e.target.value))}
            className="w-full pl-10 pr-4 py-4 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl font-bold text-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
          />
        </div>

        <button 
          onClick={handlePublish}
          disabled={isSubmitting || isNaN(precioFinal) || precioFinal <= 0}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:bg-blue-300"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
          Publicar en Tienda
        </button>
      </div>
    </div>
  );
}