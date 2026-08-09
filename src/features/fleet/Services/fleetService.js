import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp, collection, query } from 'firebase/firestore';
import { db } from '../../../config/firebase';

const DEFAULT_TRIP = {
  status: 'en_preparacion',
  departure: { km: 0, fuelLevel: 'Lleno', cashAdvance: 0, merchandiseValue: 0 },
  return: { km: 0 },
  finances: { totalCollected: 0, expenses: [] }
};

const DEFAULT_CATEGORIES = {
  "Viáticos": ["Comida", "Hospedaje", "Varios"],
  "Gastos Operativos": ["Combustible", "Mecánica / Repuestos", "Peajes", "Lavadero"]
};

// AHORA RECIBE LA FECHA PARA ORDENAR EL TABLERO
export const createTripInDb = async (tripId, zoneName, dateStr) => {
  if (!tripId) return;
  const tripRef = doc(db, 'trips', tripId);
  await setDoc(tripRef, {
    zone: zoneName || 'Sin Zona',
    date: dateStr || new Date().toISOString().split('T')[0],
    ...DEFAULT_TRIP,
    createdAt: serverTimestamp()
  });
};

export const ensureTripExists = async (tripId, zoneName, dateStr) => {
  if (!tripId) return;
  const tripRef = doc(db, 'trips', tripId);
  const snap = await getDoc(tripRef);
  
  if (!snap.exists()) {
    await createTripInDb(tripId, zoneName, dateStr);
  }
};

export const subscribeToTrip = (tripId, callback) => {
  if (!tripId) return () => {};
  
  const tripRef = doc(db, 'trips', tripId);
  return onSnapshot(tripRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    } else {
      callback(null);
    }
  });
};

export const updateTripInDb = async (tripId, data) => {
  if (!tripId) return;
  const tripRef = doc(db, 'trips', tripId);
  await updateDoc(tripRef, data);
};

export const subscribeToAllTrips = (callback) => {
  const q = query(collection(db, 'trips'));
  return onSnapshot(q, (snapshot) => {
    const trips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(trips);
  });
};

export const subscribeToExpenseCategories = (callback) => {
  const docRef = doc(db, 'settings', 'fleet_categories');
  return onSnapshot(docRef, async (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().categories);
    } else {
      await setDoc(docRef, { categories: DEFAULT_CATEGORIES });
      callback(DEFAULT_CATEGORIES);
    }
  });
};

export const updateExpenseCategoriesInDb = async (newCategories) => {
  const docRef = doc(db, 'settings', 'fleet_categories');
  await updateDoc(docRef, { categories: newCategories });
};