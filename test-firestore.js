const firebaseConfig = {
  projectId: "una-aventura-mas-cr",
  databaseId: "ai-studio-9e5d89e4-4d88-4d03-b748-3a8f414b899d",
  apiKey: "AIzaSyDcYfZAQX5VtN8HQKVh1d7_pgTPye2r49U"
};

async function test() {
  try {
    // We already have a doc id from previous test: MVd7Q2k6l7yIIgkmJfba
    const docId = 'MVd7Q2k6l7yIIgkmJfba';
    
    // Sign in again
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`;
    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true })
    });
    const authData = await authRes.json();
    const idToken = authData.idToken;

    // Test Delete instead to check if it works? No, let's update.
    console.log("Updating document: ", docId);

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.databaseId}/documents/productos/${docId}?updateMask.fieldPaths=estado`;
    
    const docData = {
      fields: {
        estado: { stringValue: 'publicado' }
      }
    };
    
    const dbRes = await fetch(firestoreUrl, {
       method: 'PATCH',
       headers: { 
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${idToken}`
       },
       body: JSON.stringify(docData)
    });
    
    const dbText = await dbRes.text();
    console.log("Firestore status:", dbRes.status);
    console.log("Firestore response:", dbText);
  } catch (err) {
    console.error(err);
  }
}

test();
