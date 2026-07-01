import { collection, query, onSnapshot, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, sendPasswordResetEmail, createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from '../../../config/firebase';

export const subscribeToUsers = (callback) => {
  const q = query(collection(db, 'users'));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(users);
  });
};

export const createUserProfile = async (uid, userData) => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    ...userData,
    createdAt: serverTimestamp()
  });
};

// NUEVO: Activar / Desactivar Usuario (Soft Delete)
export const toggleUserStatus = async (uid, currentStatus) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { isActive: !currentStatus });
};

// NUEVO: Enviar email de reseteo de contraseña
export const sendResetEmail = async (email) => {
  const auth = getAuth();
  await sendPasswordResetEmail(auth, email);
};

// --- FUNCIONES AÑADIDAS PARA EL MODAL DE USUARIOS ---

// Actualizar datos del usuario en Firestore (Roles, Nombre, etc.)
export const updateUserData = async (userId, data, newPassword = null) => {
  const userRef = doc(db, 'users', userId);
  
  // Por reglas de seguridad de Firebase, no se puede cambiar la contraseña de otro usuario
  // directamente desde el cliente (requiere Firebase Admin o Cloud Functions).
  // Por ahora, actualizamos únicamente su perfil y roles en Firestore.
  // Si necesitan cambiar clave, lo ideal es usar la función sendResetEmail de arriba.
  await updateDoc(userRef, data);
};

// Crear un nuevo usuario en Firebase Auth y guardar su perfil en Firestore
export const registerUser = async (email, password, userData) => {
  const auth = getAuth();
  
  // Crea el usuario en Firebase Authentication
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Guarda el resto de los datos (roles, nombre) en la base de datos Firestore
  await createUserProfile(userCredential.user.uid, {
    email,
    ...userData
  });
  
  return userCredential.user;
};