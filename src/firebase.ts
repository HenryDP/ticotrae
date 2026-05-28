import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 1. Reemplaza este bloque completo con el que copiaste de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA2TjAk3r71xmYuRb1dNkCAFhoVKvUdt0g",
  authDomain: "ticotrae.firebaseapp.com",
  projectId: "ticotrae",
  storageBucket: "ticotrae.firebasestorage.app",
  messagingSenderId: "873929001754",
  appId: "1:873929001754:web:71a1c748ba910e601f3aa3",
  measurementId: "G-GSZT72ECH2"
};
// 2. Inicializamos la aplicación
const app = initializeApp(firebaseConfig);

// 3. Exportamos las herramientas para que tu PWA pueda usarlas
export const auth = getAuth(app);
export const db = getFirestore(app);