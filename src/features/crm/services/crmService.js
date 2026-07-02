import { collection, query, onSnapshot, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase'; 

const COLLECTION_NAME = 'contacts';

// Escuchar los contactos en tiempo real
export const subscribeToContacts = (callback) => {
  const q = query(collection(db, COLLECTION_NAME));
  return onSnapshot(q, (snapshot) => {
    const contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(contacts);
  });
};

// Crear un nuevo cliente o proveedor
export const createContactInDb = async (contactData) => {
  const newRef = doc(collection(db, COLLECTION_NAME));
  await setDoc(newRef, {
    ...contactData,
    createdAt: serverTimestamp(),
  });
};

// Actualizar un contacto 
export const updateContactInDb = async (contactId, data) => {
  const contactRef = doc(db, COLLECTION_NAME, contactId);
  await updateDoc(contactRef, data);
};