import { collection, query, onSnapshot, doc, updateDoc, writeBatch, setDoc, serverTimestamp, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export const subscribeToTasks = (callback) => {
  const q = query(collection(db, 'tasks'));
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(tasks);
  });
};

export const updateTaskStatusInDb = async (taskId, newStatus) => {
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, { status: newStatus });
};

export const updateTaskInDb = async (taskId, updates) => {
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, updates);
};

export const addTaskCommentInDb = async (taskId, commentData) => {
  const taskRef = doc(db, 'tasks', taskId);
  await updateDoc(taskRef, { history: arrayUnion(commentData) });
};

export const createTaskInDb = async (taskData) => {
  const taskRef = doc(db, 'tasks', taskData.id);
  await setDoc(taskRef, {
    ...taskData,
    createdAt: serverTimestamp()
  });
};

// ==========================================
// ELIMINACIÓN CON REGISTRO DE AUDITORÍA
// ==========================================
export const deleteTaskWithLogInDb = async (task, userName) => {
  const batch = writeBatch(db);

  // 1. Guardar un registro exacto en la colección oculta de auditoría
  const auditRef = doc(collection(db, 'deleted_tasks'));
  batch.set(auditRef, {
    ...task,
    deletedAt: serverTimestamp(),
    deletedBy: userName,
    originalId: task.id
  });

  // 2. Eliminar la tarea del tablero principal
  const taskRef = doc(db, 'tasks', task.id);
  batch.delete(taskRef);

  // Ejecutar ambas acciones al mismo tiempo
  await batch.commit();
};