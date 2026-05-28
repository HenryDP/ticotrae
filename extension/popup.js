import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

// TODO: Replace with your actual Firebase config from firebase-applet-config.json
const firebaseConfig = {
  projectId: "una-aventura-mas-cr",
  appId: "1:82072938954:web:b19abdedc9d0a2618f0733",
  apiKey: "AIzaSyDcYfZAQX5VtN8HQKVh1d7_pgTPye2r49U",
  authDomain: "una-aventura-mas-cr.firebaseapp.com",
  storageBucket: "una-aventura-mas-cr.firebasestorage.app",
  messagingSenderId: "82072938954"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-9e5d89e4-4d88-4d03-b748-3a8f414b899d");
const auth = getAuth(app);

let currentProductData = null;

async function requestData() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: "extract_data"}, function(response) {
      if (chrome.runtime.lastError) {
        document.getElementById('content').innerHTML = '<p class="error">Abre una página de producto en Amazon y recarga la extensión.</p>';
        return;
      }
      
      if (response && response.data) {
        currentProductData = response.data;
        renderData(currentProductData);
        document.getElementById('send-btn').disabled = false;
      } else {
        document.getElementById('content').innerHTML = '<p class="error">No se pudo extraer la información del producto. Asegúrate de estar en una página de Amazon válida.</p>';
      }
    });
  });
}

function renderData(data) {
  document.getElementById('content').innerHTML = `
    <div class="data-row">
      <span class="label">Título</span>
      <span class="value">${data.titulo || 'N/A'}</span>
    </div>
    <div class="data-row">
      <span class="label">Precio (USD)</span>
      <span class="value">$${data.precio_usd || '0.00'}</span>
    </div>
    ${data.imagen_url ? `<img id="product-image" src="${data.imagen_url}" />` : ''}
  `;
}

document.getElementById('send-btn').addEventListener('click', async () => {
  if (!currentProductData) return;
  
  const statusDiv = document.getElementById('status');
  const btn = document.getElementById('send-btn');
  btn.disabled = true;
  btn.innerText = 'Enviando...';
  
  try {
    // Iniciar sesión anónima o manejar autenticación adecuada si exiges roles de Auth en rules!
    // Para simplificar, la regla actual exige isSignedIn pero puedes modificarla.
    // Asumiremos que el capturador ya inició sesión anonima.
    const userCredential = await signInAnonymously(auth);
    const uid = userCredential.user.uid;
    
    // Add document to Firestore
    await addDoc(collection(db, "productos"), {
        titulo: currentProductData.titulo || '',
        url_original: currentProductData.url_original || '',
        imagen_url: currentProductData.imagen_url || '',
        precio_usd: currentProductData.precio_usd || 0,
        estado: "pendiente",
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    
    statusDiv.innerHTML = '<span class="success">¡Producto enviado a la PWA con éxito!</span>';
    btn.innerText = 'Enviado';
  } catch (error) {
    btn.disabled = false;
    btn.innerText = 'Enviar a mi PWA';
    statusDiv.innerHTML = `<span class="error">Error: ${error.message}</span>`;
    console.error("Firebase Error:", error);
  }
});

// Run when popup opens
requestData();
