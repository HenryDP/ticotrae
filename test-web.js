import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";

const config = {
  projectId: "una-aventura-mas-cr",
  databaseId: "ai-studio-9e5d89e4-4d88-4d03-b748-3a8f414b899d",
  apiKey: "AIzaSyDcYfZAQX5VtN8HQKVh1d7_pgTPye2r49U"
};

const app = initializeApp(config);
const db = getFirestore(app, "ai-studio-9e5d89e4-4d88-4d03-b748-3a8f414b899d");

async function test() {
  try {
    const snap = await getDocs(collection(db, "productos"));
    console.log("Read success:", snap.size, "documents");
  } catch(e) {
    console.log("Read error:", e.message);
  }
  process.exit();
}
test();
