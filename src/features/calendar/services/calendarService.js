import { collection, query, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export const subscribeToEvents = (callback) => {
  const q = query(collection(db, 'events'));
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(events);
  });
};

export const createEventInDb = async (eventData) => {
  await addDoc(collection(db, 'events'), {
    ...eventData,
    createdAt: serverTimestamp()
  });
};

export const updateEventInDb = async (eventId, eventData) => {
  const eventRef = doc(db, 'events', eventId);
  await updateDoc(eventRef, eventData);
};

export const deleteEventInDb = async (eventId) => {
  const eventRef = doc(db, 'events', eventId);
  await deleteDoc(eventRef);
};