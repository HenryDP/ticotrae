import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Catalog from './pages/Catalog';
import Admin from './pages/Admin';
import ProductDetail from './pages/ProductDetail';
import Profile from './pages/Profile';
import Wishlist from './pages/Wishlist';
import { PackageSearch, User, Heart, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { signInAnonymously, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { GeneralSettings } from './types';
import Logo from './components/Logo';
import Footer from './components/Footer';
import { Toaster } from 'react-hot-toast';

function MainApp() {
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  const [user, setUser] = useState(auth.currentUser);
  const navigate = useNavigate();

  // Dark mode state
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => setUser(u));
    const unsub = onSnapshot(doc(db, 'settings', 'footer'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as GeneralSettings;
        setSettings(data);
        
        // PWA Meta Injection
        if (data.appName) document.title = data.appName;
        
        let themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (!themeColorMeta) {
          themeColorMeta = document.createElement('meta');
          themeColorMeta.setAttribute('name', 'theme-color');
          document.head.appendChild(themeColorMeta);
        }
        if (data.primaryColor) {
           themeColorMeta.setAttribute('content', data.primaryColor);
        }
      }
    });
    return () => {
      unsub();
      unsubAuth();
    };
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-900 font-sans text-gray-900 dark:text-gray-100 flex flex-col">
      <Toaster position="bottom-right" />
      <header 
        className="bg-gradient-to-r from-indigo-600 to-violet-600 sticky top-0 z-50 shadow-lg shadow-indigo-500/20 transition-colors border-b border-indigo-700 cursor-default"
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm border border-gray-100 dark:border-slate-700 p-1.5 overflow-hidden">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain mix-blend-multiply" />
              ) : (
                <Logo />
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">{settings?.appName || "Tico Trae"}</h1>
          </Link>
          
          <nav className="flex items-center gap-2 sm:gap-4 text-sm font-medium" onClick={(e) => e.stopPropagation()}>
            <Link to="/" className="hidden sm:block text-white hover:text-gray-200 transition-colors">
              Catálogo
            </Link>
            <Link to="/wishlist" className="text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border border-transparent hover:border-white/20" title="Lista de Deseos">
              <Heart size={16} />
              <span className="hidden sm:inline">Deseos</span>
            </Link>
            <Link to="/profile" className="text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border border-transparent hover:border-white/20" title={user && !user.isAnonymous ? "Mi Perfil" : "Iniciar Sesión"}>
              <User size={16} />
              <span className="hidden sm:inline">{user && !user.isAnonymous ? "Mi Perfil" : "Iniciar Sesión"}</span>
            </Link>
            <button 
              onClick={() => setIsDark(!isDark)}
              className="text-white hover:bg-white/10 transition-colors flex items-center p-1.5 sm:p-2 rounded-lg border border-transparent hover:border-white/20 ml-1" 
              title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/producto/:id" element={<ProductDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wishlist" element={<Wishlist />} />
        </Routes>
      </main>
      
      <Footer />
    </div>
  );
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        setAuthReady(true);
      } else {
        signInAnonymously(auth).then(() => {
            setAuthReady(true);
        }).catch((err) => {
            console.error(err);
            setAuthError(err.message);
        });
      }
    });
    return () => unsub();
  }, []);

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-red-100 dark:border-red-900 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Configuración Requerida</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-xs font-mono bg-gray-100 dark:bg-slate-700 p-2 rounded">{authError}</p>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            Debes habilitar la autenticación de usuarios anónimos en la Consola de Firebase para continuar:
          </p>
          <ol className="text-sm text-gray-600 dark:text-gray-400 list-decimal text-left mt-4 pl-4 space-y-2">
            <li>Ve a la Consola de Firebase.</li>
            <li>Entra a <strong>Authentication</strong> y ve a la pestaña <strong>Sign-in method</strong>.</li>
            <li>Haz clic en <strong>Add new provider</strong> (o busca en los nativos).</li>
            <li>Habilita el proveedor <strong>Anónimo (Anonymous)</strong>.</li>
            <li>Guarda los cambios y recarga esta página.</li>
          </ol>
        </div>
      </div>
    );
  }

  if (!authReady) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 text-gray-400 dark:text-gray-500">Cargando aplicación...</div>;
  }

  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  );
}
