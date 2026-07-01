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

// NUEVO: Función para eliminar una tarea
export const deleteTaskInDb = async (taskId) => {
  const taskRef = doc(db, 'tasks', taskId);
  await deleteDoc(taskRef);
};

export const loadMockData = async () => {
  const batch = writeBatch(db);
  const INITIAL_TASKS = [
    {
      id: 'TSK-1001',
      title: 'Actualizar Lista de Precios YPF',
      type: 'Diaria',
      creatorArea: 'Super_Usuario',
      assignedArea: 'Administración',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-06-25',
      blocks: [
        { type: 'text', content: 'Descargar el último Excel del portal de YPF y actualizar los precios en el sistema 1.' },
        { type: 'checklist', items: [{ title: 'Descargar Excel', done: true }, { title: 'Impactar en Sistema', done: false }] }
      ],
      dependencies: [],
      history: [],
      requireJointApproval: false,
      approvedBy: []
    }
  ];
  INITIAL_TASKS.forEach(task => {
    const docRef = doc(db, 'tasks', task.id);
    batch.set(docRef, task);
  });
  await batch.commit();
};