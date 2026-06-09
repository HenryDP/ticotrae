import fetch from 'node-fetch';

const firebaseConfig = {
  projectId: "ticotrae",
  databaseId: "(default)",
  apiKey: "AIzaSyA2TjAk3r71xmYuRb1dNkCAFhoVKvUdt0g"
};

async function test() {
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`;
    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true })
    });
    const authData = await authRes.json();
    console.log("Token:", authData.idToken ? "OK" : "NO");

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.databaseId}/documents/productos`;
    
    const docData = {
      fields: {
        titulo: { stringValue: "Test title" },
        precio_usd: { doubleValue: 10 },
        estado: { stringValue: 'pendiente' },
        ownerId: { stringValue: authData.localId }
      }
    };
    
    const dbRes = await fetch(firestoreUrl, {
       method: 'POST',
       headers: { 
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${authData.idToken}`
       },
       body: JSON.stringify(docData)
    });
    
    const text = await dbRes.text();
    console.log("Status:", dbRes.status, "Body:", text);
}
test();
