import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase'; 

const COLLECTION_NAME = 'calendar_events';

export const subscribeToEvents = (callback) => {
  const q = query(collection(db, COLLECTION_NAME));
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(events);
  });
};

export const createEventInDb = async (eventData) => {
  const newRef = doc(collection(db, COLLECTION_NAME));
  await setDoc(newRef, {
    ...eventData,
    createdAt: serverTimestamp(),
  });
};

export const deleteEventFromDb = async (eventId) => {
  const eventRef = doc(db, COLLECTION_NAME, eventId);
  await deleteDoc(eventRef);
};