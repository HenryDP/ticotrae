import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { UserProfile } from '../types';
import { Save, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

const PROVINCIAS = [
  "San José", "Alajuela", "Cartago", "Heredia", "Guanacaste", "Puntarenas", "Limón"
];

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(auth.currentUser);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser && !currentUser.isAnonymous) {
        setLoading(true);
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          setProfile({
            email: currentUser.email || '',
            displayName: currentUser.displayName || '',
          });
        }
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

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

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validaciones
    const newErrors: Record<string, string> = {};
    
    if (profile.phoneNumber) {
      const justDigits = profile.phoneNumber.replace(/\D/g, '');
      const localPhone = justDigits.startsWith('506') ? justDigits.slice(3) : justDigits;
      if (localPhone.length !== 8 || !/^[24678]/.test(localPhone)) {
        newErrors.phoneNumber = 'Número inválido. Debe tener 8 dígitos (ej: 81234567).';
      }
    }

    if (profile.postalCode) {
      if (!/^\d{5}$/.test(profile.postalCode)) {
        newErrors.postalCode = 'El código postal debe tener exactamente 5 dígitos.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setMessage('');
      return;
    }

    setErrors({});
    setSaving(true);
    setMessage('');
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, {
        ...profile,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setMessage('Perfil guardado exitosamente.');
      toast.success('Perfil guardado exitosamente.', {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
      
      const searchParams = new URLSearchParams(location.search);
      const redirectPath = searchParams.get('redirect');
      if (redirectPath) {
        setTimeout(() => navigate(redirectPath + '?autoBuy=true'), 1000);
      }
    } catch (error) {
      setMessage('Error al guardar el perfil.');
      toast.error('Error al guardar el perfil.', {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.isAnonymous) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold text-cr-blue dark:text-blue-400 mb-4">Inicia Sesión</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md text-center">
          Para realizar envíos a Costa Rica, necesitamos que crees una cuenta y nos brindes tu dirección.
        </p>
        <button
          onClick={handleLogin}
          className="bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-cr-blue dark:hover:border-blue-400 text-gray-700 dark:text-gray-300 font-bold py-3 px-6 rounded-xl flex items-center gap-3 transition-colors shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Continuar con Google
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="py-20 text-center dark:text-gray-400">Cargando perfil...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 md:p-8">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tu Perfil</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Información de envío para Costa Rica</p>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="https://www.amazon.com/your-orders/orders"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 items-center gap-2 text-sm font-semibold transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              Rastrear mis Pedidos en Amazon
            </a>
            <button 
              onClick={handleLogout}
              className="text-gray-500 dark:text-gray-400 hover:text-cr-red flex items-center gap-2 text-sm font-medium transition"
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
        </div>

        <a 
          href="https://www.amazon.com/your-orders/orders"
          target="_blank"
          rel="noopener noreferrer"
          className="sm:hidden mb-8 w-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 p-4 rounded-xl flex items-center justify-center gap-3 font-semibold transition border border-blue-100 dark:border-blue-800"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 16-4 4-4-4"/><path d="M17 2v18"/><path d="m3 8 4-4 4 4"/><path d="M7 22V4"/></svg>
          Rastrear mis paquetes en Amazon
        </a>

        {message && (
          <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-4 rounded-xl text-sm font-medium mb-6">
            {message}
          </div>
        )}

        <form onSubmit={saveProfile} className="flex flex-col gap-8">
          
          {/* Seccion 1 & 2: Cuenta y Contacto */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">Información de Cuenta y Contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  value={profile.displayName || ''}
                  onChange={e => setProfile({...profile, displayName: e.target.value})}
                  className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-cr-blue focus:border-transparent transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Correo Electrónico</label>
                <input 
                  type="email" 
                  readOnly
                  value={profile.email || user.email || ''}
                  className="w-full border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 rounded-xl px-4 py-2.5 outline-none cursor-not-allowed" 
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Teléfono Principal / WhatsApp</label>
                <input 
                  type="tel" 
                  required
                  value={profile.phoneNumber || ''}
                  onChange={e => {
                    setProfile({...profile, phoneNumber: e.target.value});
                    if (errors.phoneNumber) setErrors({...errors, phoneNumber: ''});
                  }}
                  className={`w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:border-transparent transition-all ${
                    errors.phoneNumber 
                      ? 'border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/10' 
                      : 'border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-cr-blue'
                  }`}
                />
                {errors.phoneNumber && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.phoneNumber}</p>
                )}
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Teléfono Secundario (Opcional)</label>
                <input 
                  type="tel" 
                  value={profile.secondPhoneNumber || ''}
                  onChange={e => {
                    setProfile({...profile, secondPhoneNumber: e.target.value});
                  }}
                  className={`w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-cr-blue focus:border-transparent transition-all`}
                />
              </div>
            </div>
          </section>

          {/* Seccion 3: Dirección de Envío */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">Dirección Exacta de Envío</h3>
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Provincia / Región</label>
                  <select
                    required
                    value={profile.province || ''}
                    onChange={e => setProfile({...profile, province: e.target.value})}
                    className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-cr-blue focus:border-transparent transition-all"
                  >
                    <option value="">Selecciona...</option>
                    {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Cantón / Municipio</label>
                  <input 
                    type="text" 
                    required
                    value={profile.canton || ''}
                    onChange={e => setProfile({...profile, canton: e.target.value})}
                    className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-cr-blue focus:border-transparent transition-all" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Distrito / Barrio / Localidad</label>
                  <input 
                    type="text" 
                    required
                    value={profile.district || ''}
                    onChange={e => setProfile({...profile, district: e.target.value})}
                    className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-cr-blue focus:border-transparent transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Código Postal (Opcional)</label>
                  <input 
                    type="text" 
                    value={profile.postalCode || ''}
                    onChange={e => {
                      setProfile({...profile, postalCode: e.target.value});
                      if (errors.postalCode) setErrors({...errors, postalCode: ''});
                    }}
                    className={`w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:border-transparent transition-all ${
                      errors.postalCode 
                        ? 'border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/10' 
                        : 'border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-cr-blue'
                    }`}
                  />
                  {errors.postalCode && (
                    <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.postalCode}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Apartado Postal (Opcional)</label>
                  <input 
                    type="text" 
                    value={profile.apartadoPostal || ''}
                    onChange={e => {
                      setProfile({...profile, apartadoPostal: e.target.value});
                    }}
                    className={`w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-cr-blue focus:border-transparent transition-all`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Dirección Detallada</label>
                <textarea 
                  rows={3}
                  required
                  placeholder='Ej: "De la iglesia católica 200 metros norte, casa color blanca portón negro"'
                  value={profile.exactAddress || ''}
                  onChange={e => setProfile({...profile, exactAddress: e.target.value})}
                  className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-cr-blue focus:border-transparent transition-all resize-none" 
                />
              </div>
            </div>
          </section>

          {/* Seccion 4: Facturación */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">Datos de Facturación <span className="text-sm font-normal text-gray-500">(Obligatorio)</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tipo de Identificación</label>
                <select
                  required
                  value={profile.tipoIdentificacion || ''}
                  onChange={e => setProfile({...profile, tipoIdentificacion: e.target.value as any})}
                  className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-cr-blue focus:border-transparent transition-all"
                >
                  <option value="">Selecciona...</option>
                  <option value="Física">Cédula Física</option>
                  <option value="Jurídica">Cédula Jurídica</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Número de Identificación</label>
                <input 
                  type="text" 
                  required
                  value={profile.numeroIdentificacion || ''}
                  onChange={e => setProfile({...profile, numeroIdentificacion: e.target.value})}
                  className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-cr-blue focus:border-transparent transition-all" 
                />
              </div>
              {profile.tipoIdentificacion === "Jurídica" && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Razón Social</label>
                  <input 
                    type="text" 
                    required
                    value={profile.razonSocial || ''}
                    onChange={e => setProfile({...profile, razonSocial: e.target.value})}
                    className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-cr-blue focus:border-transparent transition-all" 
                  />
                </div>
              )}
            </div>
          </section>

          <button
            type="submit"
            disabled={saving}
            className="mt-4 bg-indigo-600 hover:bg-violet-700 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70 shadow-sm"
          >
            <Save size={20} />
            {saving 
              ? 'Guardando...' 
              : new URLSearchParams(location.search).get('redirect') 
                ? 'Completar Registro y Continuar Compra' 
                : 'Guardar Información de Envío y Facturación'}
          </button>
        </form>
      </div>
    </div>
  );
}
