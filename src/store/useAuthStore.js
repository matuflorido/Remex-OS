import { create } from 'zustand';
import { auth, db } from '../config/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  init: () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);
          let userData = userDoc.exists() ? userDoc.data() : {};

          // 🔥 GOD MODE: Si tu correo inicia sesión, te fuerza el rol de Super Administrador
          if (firebaseUser.email === 'matuflorido@gmail.com') {
            userData = {
              ...userData,
              email: firebaseUser.email,
              name: userData.name || 'Matías Florido',
              role: 'Super_Usuario',
              isActive: true
            };
            // Guardamos tu poder absoluto en la base de datos
            await setDoc(userRef, userData, { merge: true });
          } 
          // Si es un empleado nuevo que aún no tiene perfil, le crea uno básico
          else if (!userDoc.exists()) {
             userData = {
               email: firebaseUser.email,
               name: 'Usuario Nuevo',
               role: 'Sin_Area',
               isActive: true
             };
             await setDoc(userRef, userData, { merge: true });
          }

          set({
            user: { uid: firebaseUser.uid, ...userData },
            loading: false
          });
        } catch (error) {
          console.error("Error al buscar/crear perfil:", error);
          set({
              user: { uid: firebaseUser.uid, email: firebaseUser.email, role: 'Modo_Offline', name: 'Sin Conexión a BD' },
              loading: false
          });
        }
      } else {
        set({ user: null, loading: false });
      }
    });
  },

  login: async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  },

  logout: async () => {
    await signOut(auth);
  }
}));