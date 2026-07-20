import { collection, query, onSnapshot, doc, setDoc, updateDoc, serverTimestamp, addDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, sendPasswordResetEmail, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeApp } from 'firebase/app';

import { db, auth, app, firebaseConfig } from '../../../config/firebase'; 

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

export const toggleUserStatus = async (uid, currentStatus) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { isActive: !currentStatus });
};

export const sendResetEmail = async (email) => {
  const authInstance = getAuth(app);
  await sendPasswordResetEmail(authInstance, email);
};

export const updateUserData = async (userId, data) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, data);
};

export const registerUser = async (email, password, userData) => {
  // 1. Inicializar una app secundaria temporal para no perder tu sesión actual
  const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
  const secondaryAuth = getAuth(secondaryApp);

  // 2. Crear el usuario en la app secundaria
  const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  
  // 3. Guardar el perfil en Firestore de la app principal
  await createUserProfile(userCredential.user.uid, {
    email,
    ...userData
  });

  // 4. Cerrar la sesión de la app secundaria para limpiar
  await signOut(secondaryAuth);
  
  return userCredential.user;
};

// ==========================================
// NUEVAS FUNCIONES: GESTOR DE ÁREAS
// ==========================================

export const subscribeToAreas = (callback) => {
  const q = query(collection(db, 'areas'));
  return onSnapshot(q, (snapshot) => {
    const areas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(areas.sort((a, b) => a.name.localeCompare(b.name)));
  });
};

export const saveAreaInDb = async (areaData) => {
  if (areaData.id) {
    const areaRef = doc(db, 'areas', areaData.id);
    await updateDoc(areaRef, areaData);
  } else {
    await addDoc(collection(db, 'areas'), {
      ...areaData,
      subareas: areaData.subareas || [],
      createdAt: serverTimestamp()
    });
  }
};

export const deleteAreaInDb = async (areaId) => {
  await deleteDoc(doc(db, 'areas', areaId));
};

// ==========================================
// CLOUD FUNCTIONS: GESTIÓN DE SEGURIDAD
// ==========================================

export const forceUserPasswordChange = async (uid, newPassword) => {
  const functions = getFunctions(app);
  const changePasswordFn = httpsCallable(functions, 'adminChangePassword');
  
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("No hay sesión activa para autorizar este cambio.");
    
    // Solicitamos a Firebase que genere un token de seguridad fresco en este momento
    const adminToken = await currentUser.getIdToken(true);
    
    // LOG DE SEGURIDAD: Verifica en la consola del navegador que esto se imprima correctamente
    console.log("Datos enviados al servidor:", { 
      uid: uid, 
      hasPassword: !!newPassword, 
      hasToken: !!adminToken 
    });
    
    // Enviamos los datos a la nube
    const result = await changePasswordFn({ uid, newPassword, adminToken });
    return result.data;
  } catch (error) {
    console.error("Error en Cloud Function:", error);
    // Lanzamos el error original para que el Modal lo muestre tal cual llegó de la nube
    throw new Error(error.message || "No se pudo cambiar la contraseña.");
  }
};