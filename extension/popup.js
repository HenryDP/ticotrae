// TODO: Replace with your actual Firebase config from firebase-applet-config.json
const firebaseConfig = {
  projectId: "ticotrae",
  databaseId: "(default)",
  apiKey: "AIzaSyA2TjAk3r71xmYuRb1dNkCAFhoVKvUdt0g"
};

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
    // 1. SignIn Anonymously via REST API to get ID token
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`;
    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true })
    });
    
    if (!authRes.ok) {
      throw new Error("No se pudo iniciar sesión de forma anónima. Asegúrate de habilitar 'Inicio de sesión Anónimo' en Firebase Auth.");
    }
    const authData = await authRes.json();
    const idToken = authData.idToken;
    const uid = authData.localId;
    
    // Preparar el enlace de afiliado (Añade tu código de afiliado a la URL)
    let originalUrl = currentProductData.url_original || '';
    let tiendaOrigen = 'otra';
    let metodoVenta = 'Intermediario';

    if (originalUrl.includes('amazon.')) {
      tiendaOrigen = 'amazon';
      metodoVenta = 'Afiliado';
      const affiliateTag = 'ticotrae1981-20';
      if (!originalUrl.includes('tag=')) {
        originalUrl = originalUrl.includes('?') ? `${originalUrl}&tag=${affiliateTag}` : `${originalUrl}?tag=${affiliateTag}`;
      }
    } else if (originalUrl.includes('ebay.')) {
      tiendaOrigen = 'ebay';
    }

    // 2. Add document to Firestore via REST API
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.databaseId}/documents/productos`;
    
    // Construct Firestore Document format
    const docData = {
      fields: {
        titulo: { stringValue: currentProductData.titulo || 'Sin título' },
        url_original: { stringValue: originalUrl },
        imagen_url: { stringValue: currentProductData.imagen_url || '' },
        imagenes: { 
          arrayValue: {
            values: (currentProductData.imagenes || []).map(img => ({ stringValue: img }))
          }
        },
        descripcion: { stringValue: currentProductData.descripcion || '' },
        tallas: { stringValue: currentProductData.tallas || '' },
        precio_usd: { doubleValue: Number(currentProductData.precio_usd) || 0 },
        estado: { stringValue: 'pendiente' },
        tienda_origen: { stringValue: tiendaOrigen },
        metodo_venta: { stringValue: metodoVenta },
        ownerId: { stringValue: uid },
        createdAt: { timestampValue: new Date().toISOString() },
        updatedAt: { timestampValue: new Date().toISOString() }
      }
    };
    
    const dbRes = await fetch(firestoreUrl, {
       method: 'POST',
       headers: { 
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${idToken}`
       },
       body: JSON.stringify(docData)
    });
    
    if (!dbRes.ok) {
      const errorText = await dbRes.text();
      console.error("Firestore Error:", errorText);
      throw new Error(`Error Firestore: ${dbRes.status}. Revisa las reglas o logs.`);
    }
    
    statusDiv.innerHTML = '<span class="success">¡Producto enviado a la PWA con éxito!</span>';
    btn.innerText = 'Enviado';
  } catch (error) {
    btn.disabled = false;
    btn.innerText = 'Enviar a mi PWA';
    statusDiv.innerHTML = `<span class="error">Error: ${error.message}</span>`;
    console.error("Firebase Error:", error);
  }
});

document.getElementById('scan-btn').addEventListener('click', requestData);

// Automatically request data initially in case they open it on a product page
requestData();
