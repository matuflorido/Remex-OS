import { collection, query, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch, where, getDocs, arrayUnion } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export const subscribeToContacts = (callback) => {
  const q = query(collection(db, 'contacts'));
  return onSnapshot(q, (snapshot) => {
    const contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(contacts);
  });
};

export const createContactInDb = async (contactData) => {
  await addDoc(collection(db, 'contacts'), {
    ...contactData,
    history: [], // Inicializamos el historial vacío
    createdAt: serverTimestamp()
  });
};

export const updateContactInDb = async (contactId, contactData) => {
  const contactRef = doc(db, 'contacts', contactId);
  await updateDoc(contactRef, contactData);
};

export const deleteContactInDb = async (contactId) => {
  const contactRef = doc(db, 'contacts', contactId);
  await deleteDoc(contactRef);
};

// Agregar una nota al historial de un cliente
export const addContactNoteInDb = async (contactId, note) => {
  const contactRef = doc(db, 'contacts', contactId);
  await updateDoc(contactRef, {
    history: arrayUnion(note)
  });
};

// ==========================================
// GESTOR INDEPENDIENTE DE ZONAS
// ==========================================

export const subscribeToZones = (callback) => {
  const q = query(collection(db, 'zones'));
  return onSnapshot(q, (snapshot) => {
    const zones = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Ordenamos alfabéticamente para que los desplegables se vean prolijos
    callback(zones.sort((a, b) => a.name.localeCompare(b.name)));
  });
};

// NUEVO: Agregamos el color al crear (por defecto naranja si no eligen)
export const createZoneInDb = async (zoneName, color = '#f97316') => {
  await addDoc(collection(db, 'zones'), {
    name: zoneName,
    color: color,
    createdAt: serverTimestamp()
  });
};

// NUEVO: Agregamos el newColor al actualizar
export const updateZoneAndContacts = async (zoneId, oldName, newName, newColor) => {
  const batch = writeBatch(db);
  
  // 1. Actualizar la zona maestra
  batch.update(doc(db, 'zones', zoneId), { name: newName, color: newColor });
  
  // 2. Buscar a todos los clientes vinculados y actualizarles el nombre
  const q = query(collection(db, 'contacts'), where('zone', '==', oldName));
  const snapshot = await getDocs(q);
  snapshot.forEach(docSnap => {
    batch.update(docSnap.ref, { zone: newName });
  });
  
  await batch.commit();
};

// Borrar zona y desvincular a los clientes (dejarlos en blanco)
export const deleteZoneAndUnlinkContacts = async (zoneId, zoneName) => {
  const batch = writeBatch(db);
  
  batch.delete(doc(db, 'zones', zoneId));
  
  const q = query(collection(db, 'contacts'), where('zone', '==', zoneName));
  const snapshot = await getDocs(q);
  snapshot.forEach(docSnap => {
    batch.update(docSnap.ref, { zone: '' });
  });
  
  await batch.commit();
};