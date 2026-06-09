import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { GeneralSettings } from '../types';
import { Facebook, Instagram, MessageCircle, Mail, Phone, Download, X } from 'lucide-react';

const TiktokIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M19.589 6.686A4.856 4.856 0 0 1 22.84 8v3.52c-1.5-.021-2.923-.526-4.103-1.428v6.402a7.487 7.487 0 1 1-7.487-7.485V12.7a3.834 3.834 0 1 0 3.834 3.805V2h3.646a5.534 5.534 0 0 0 4.859 4.686z"/>
  </svg>
);

export default function Footer() {
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('duranhenry1981@gmail.com');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const [policyModal, setPolicyModal] = useState<{title: string, content: string} | null>(null);

  const navigate = useNavigate();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    
    setNewsletterStatus('loading');
    try {
      await addDoc(collection(db, 'newsletter_subscribers'), {
        email: newsletterEmail,
        subscribedAt: serverTimestamp(),
      });
      setNewsletterStatus('success');
      setNewsletterEmail('');
      setTimeout(() => setNewsletterStatus('idle'), 3000);
    } catch (error) {
      console.error("Error subscribing:", error);
      setNewsletterStatus('error');
    }
  };

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'footer'), (docSnap) => {
      if (docSnap.exists()) {
            setSettings(docSnap.data() as GeneralSettings);
      } else {
        // Valores por defecto
        setSettings({
          appName: "Tico Trae",
          heroTitle: "¡Descubrí lo que traemos para vos!",
          heroSubtitle: "Desde Estados Unidos directo hasta la puerta de tu choza!!!",
          aboutText: "Somos Tico Trae. Una empresa costarricense que te facilita tus compras en línea, gestionando envíos rápidos y seguros desde Estados Unidos a toda Costa Rica.",
          emailContact: "hola@ticotrae.com",
          phoneContact: "+506 8000 0000",
          facebookUrl: "",
          instagramUrl: "",
          whatsappUrl: "https://wa.me/50664435508",
          tiktokUrl: "",
          copyrightText: "© 2026 Tico Trae. Todos los derechos reservados."
        });
      }
    });
    return () => unsub();
  }, []);

  const [installModal, setInstallModal] = useState(false);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setInstallModal(true);
    }
  };

  const handleAdminMode = () => {
    if (auth.currentUser && auth.currentUser.email === 'duranhenry1981@gmail.com') {
      navigate('/admin');
      return;
    }
    
    setShowLogin(true);
    setLoginError('');
    setLoginPassword('');
  };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      if (userCredential.user.email === 'duranhenry1981@gmail.com') {
        setShowLogin(false);
        navigate('/admin');
      } else {
        setLoginError('Esta cuenta no tiene permisos de super administrador.');
        auth.signOut();
      }
    } catch (err: any) {
      setLoginError('Credenciales inválidas o error de autenticación.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!settings) return null;

  return (
    <footer className="bg-slate-900 border-t border-slate-800 mt-auto py-12 text-white">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
        <div className="flex flex-col gap-4">
          <h3 className="font-bold text-white text-lg">Sobre {settings.appName || 'Tico Trae'}</h3>
          <p className="text-sm text-gray-400 leading-relaxed pr-2">
            {settings.aboutText}
          </p>
          <button 
            onClick={handleInstallClick}
            className="mt-2 bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition w-max shadow-sm"
          >
            <Download size={16} strokeWidth={2.5} />
            Instalar App
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="font-bold text-white text-lg">Contacto</h3>
          <div className="flex flex-col gap-3 text-sm text-gray-200 font-medium">
             {settings.emailContact && (
               <a href={`mailto:${settings.emailContact}`} className="flex items-center gap-2 hover:text-white transition w-max">
                 <Mail size={16} /> {settings.emailContact}
               </a>
             )}
             {settings.phoneContact && (
               <a href={`tel:${settings.phoneContact}`} className="flex items-center gap-2 hover:text-white transition w-max">
                 <Phone size={16} /> {settings.phoneContact}
               </a>
             )}
             <div className="flex flex-wrap items-center gap-3 mt-4">
                <a href={settings.facebookUrl || "#"} target="_blank" rel="noreferrer" className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 hover:bg-[#1877F2] hover:border-[#1877F2] hover:shadow-lg hover:shadow-[#1877F2]/20 hover:-translate-y-1 transition-all duration-300 text-slate-300 hover:text-white" title="Facebook">
                  <Facebook size={18} />
                </a>
                <a href={settings.instagramUrl || "#"} target="_blank" rel="noreferrer" className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 hover:bg-gradient-to-tr hover:from-[#fd5949] hover:to-[#d6249f] hover:-translate-y-1 transition-all duration-300 text-slate-300 hover:text-white" title="Instagram">
                  <Instagram size={18} />
                </a>
                <a href={settings.tiktokUrl || "#"} target="_blank" rel="noreferrer" className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 hover:bg-black hover:border-black hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20 transition-all duration-300 text-slate-300 hover:text-white" title="TikTok">
                  <TiktokIcon size={18} />
                </a>
                <a href={settings.whatsappUrl || "https://wa.me/50664435508"} target="_blank" rel="noreferrer" className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 hover:bg-[#25D366] hover:border-[#25D366] hover:-translate-y-1 hover:shadow-lg hover:shadow-[#25D366]/20 transition-all duration-300 text-slate-300 hover:text-white" title="WhatsApp">
                  <MessageCircle size={18} />
                </a>
             </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
           <h3 className="font-bold text-white text-lg">Legales</h3>
           <div className="flex flex-col gap-3 text-sm text-gray-200 font-medium">
             <button 
               onClick={() => setPolicyModal({ title: "Términos y Condiciones", content: settings.termsConditions || "Aún no se ha especificado la política." })} 
               className="hover:text-white hover:underline transition w-max text-left"
             >
               Términos y Condiciones
             </button>
             <button 
               onClick={() => setPolicyModal({ title: "Política de Privacidad", content: settings.privacyPolicy || "Aún no se ha especificado la política." })} 
               className="hover:text-white hover:underline transition w-max text-left"
             >
               Política de Privacidad
             </button>
             <button 
               onClick={() => setPolicyModal({ title: "Políticas de Envío", content: settings.shippingPolicy || "Aún no se ha especificado la política." })} 
               className="hover:text-white hover:underline transition w-max text-left"
             >
               Políticas de Envío
             </button>
           </div>
        </div>

        <div className="flex flex-col gap-4">
           <h3 className="font-bold text-white text-lg">Ofertas del Día</h3>
           <p className="text-sm text-gray-400">Suscribite para recibir actualizaciones y ofertas increíbles directo a tu correo todos los días.</p>
           <form onSubmit={handleSubscribe} className="mt-2 flex flex-col gap-2">
             <input type="email" required placeholder="tu@correo.com" value={newsletterEmail} onChange={(e) => setNewsletterEmail(e.target.value)} className="bg-slate-800 border border-slate-700 text-white placeholder:text-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full" disabled={newsletterStatus === 'loading' || newsletterStatus === 'success'} />
             <button type="submit" disabled={newsletterStatus === 'loading' || newsletterStatus === 'success'} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${newsletterStatus === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' : newsletterStatus === 'loading' ? 'bg-indigo-600/50 text-white cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                {newsletterStatus === 'loading' ? 'Suscribiendo...' : newsletterStatus === 'success' ? '¡Suscrito!' : 'Suscribirme'}
             </button>
             {newsletterStatus === 'error' && <p className="text-red-400 text-xs mt-1">Ocurrió un error. Intenta de nuevo.</p>}
           </form>
        </div>
      </div>
      <div 
        className="max-w-5xl mx-auto px-4 mt-12 pt-6 border-t border-white/20 text-center text-sm font-medium text-gray-300 select-none cursor-pointer"
        onDoubleClick={handleAdminMode}
        title="Doble clic para acceder como administrador"
      >
        {settings.copyrightText}
      </div>

      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setShowLogin(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Acceso Administrativo</h2>
            <form onSubmit={submitLogin} className="flex flex-col gap-4 text-left">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Correo Electrónico</label>
                <input 
                  type="email" 
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Contraseña</label>
                <input 
                  type="password" 
                  autoFocus
                  required
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium" 
                />
              </div>
              
              {loginError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                  {loginError}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoggingIn}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 mt-2 rounded-xl transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? 'Iniciando sesión...' : 'Ingresar como Super Admin'}
              </button>
            </form>
          </div>
        </div>
      )}

      {policyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-2xl max-h-[85vh] shadow-2xl relative flex flex-col">
            <button 
              onClick={() => setPolicyModal(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 pr-8">{policyModal.title}</h2>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">
                {policyModal.content}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-end">
              <button 
                onClick={() => setPolicyModal(null)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors shadow-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {installModal && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-end sm:justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative translate-y-0 animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:fade-in-100">
            <button 
              onClick={() => setInstallModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center shrink-0">
                <Download size={28} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Instalar App</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Agrega TicoTrae a tu pantalla de inicio</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-600">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">🍎 En iPhone / iPad (Safari)</h3>
                <ol className="text-sm text-gray-600 dark:text-gray-300 space-y-2 list-decimal pl-5">
                  <li className="pl-1">Toca el botón <strong>Compartir</strong> (el cuadrado con <span className="inline-flex py-0.5 px-1.5 bg-white dark:bg-slate-600 border border-gray-200 dark:border-slate-500 rounded text-xs mx-0.5">↑</span>) en la barra inferior.</li>
                  <li className="pl-1">Desliza hacia abajo y selecciona <strong>"Agregar a inicio"</strong> (con ícono <span className="inline-flex py-0.5 px-1.5 bg-white dark:bg-slate-600 border border-gray-200 dark:border-slate-500 rounded text-xs mx-0.5">+</span>).</li>
                  <li className="pl-1">Toca en <strong>Agregar</strong> en la esquina superior derecha.</li>
                </ol>
              </div>

              <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-600">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">🤖 En Android (Chrome)</h3>
                <ol className="text-sm text-gray-600 dark:text-gray-300 space-y-2 list-decimal pl-5">
                  <li className="pl-1">Toca el botón de menú <span className="inline-flex py-[1px] px-1 bg-white dark:bg-slate-600 border border-gray-200 dark:border-slate-500 rounded font-bold tracking-widest text-[#555] dark:text-[#ccc] text-[8px] mx-0.5 -translate-y-px leading-none">⋮</span> en la esquina superior derecha.</li>
                  <li className="pl-1">Selecciona <strong>"Agregar a la pantalla principal"</strong> o "Instalar aplicación".</li>
                  <li className="pl-1">Confirma seleccionando <strong>Agregar</strong>.</li>
                </ol>
              </div>
            </div>

            <button 
              onClick={() => setInstallModal(false)}
              className="mt-6 w-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </footer>
  );
}
