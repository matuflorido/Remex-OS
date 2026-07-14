import { collection, query, onSnapshot, doc, setDoc, updateDoc, serverTimestamp, addDoc, deleteDoc } from 'firebase/firestore';
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

export const toggleUserStatus = async (uid, currentStatus) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { isActive: !currentStatus });
};

export const sendResetEmail = async (email) => {
  const auth = getAuth();
  await sendPasswordResetEmail(auth, email);
};

export const updateUserData = async (userId, data, newPassword = null) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, data);
};

export const registerUser = async (email, password, userData) => {
  const auth = getAuth();
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  await createUserProfile(userCredential.user.uid, {
    email,
    ...userData
  });
  
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