import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyCgB0r-dp6zA-YfFQr2Qh2SYpycOeKU7YI",
  authDomain: "check-oil-work-os.firebaseapp.com",
  projectId: "check-oil-work-os",
  storageBucket: "check-oil-work-os.firebasestorage.app",
  messagingSenderId: "126269387968",
  appId: "1:126269387968:web:039ff2ac0ae6b3b3d56925"
};

// Inicializamos los servicios
export const app = initializeApp(firebaseConfig); // <-- EXPORTAMOS APP AQUÍ
export const db = getFirestore(app);
export const auth = getAuth(app);