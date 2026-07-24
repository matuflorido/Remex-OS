import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, AlertTriangle, UserCircle, ShieldCheck, 
  Plus, Link as LinkIcon, FileText, Settings2, 
  CheckSquare, History, ArrowRight, CalendarDays, Clock, Database, 
  ChevronLeft, ChevronRight, Paperclip, Repeat, GripVertical, Eye, PenTool, Send, RefreshCw, User, Building2, EyeOff, Edit2, Lock, Trash2,
  MessageCircle, Reply, Check, CheckCheck
} from 'lucide-react';
import { X } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import useUIStore from '../../../store/useUIStore';
import { subscribeToTasks, updateTaskStatusInDb, addTaskCommentInDb, updateTaskInDb, createTaskInDb, deleteTaskWithLogInDb } from '../services/taskService';
import { subscribeToUsers, subscribeToAreas } from '../../admin/services/adminService';
import { createNotification } from '../../notifications/services/notificationService';
import CreateTaskModal from './CreateTaskModal';
import HelpTooltip from '../../../components/ui/HelpTooltip';

const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

const defaultCols = [
  { id: 'open', title: 'NUEVAS', color: 'bg-zinc-500', visible: true },
  { id: 'blocked', title: 'BLOQUEADAS', color: 'bg-red-500', visible: true },
  { id: 'in_progress', title: 'EN PROCESO', color: 'bg-blue-500', visible: true },
  { id: 'pending_validation', title: 'VALIDACIÓN', color: 'bg-yellow-500', visible: true },
  { id: 'closed', title: 'CERRADAS', color: 'bg-emerald-500', visible: true }
];

export default function TaskBoard() {
  const { user } = useAuthStore();
  
  // AQUÍ IMPORTAMOS EL NUEVO activeTaskId
  const { searchQuery, activeTaskId, setActiveTaskId } = useUIStore();
  
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [newTaskComment, setNewTaskComment] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [collapsedColumns, setCollapsedColumns] = useState({});
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [draggedOverColId, setDraggedOverColId] = useState(null);
  const [draggedColId, setDraggedColId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const [messageTarget, setMessageTarget] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);

  const [adminArea, setAdminArea] = useState('Todas');
  const [adminEmployee, setAdminEmployee] = useState('Todos');
  const [systemUsers, setSystemUsers] = useState([]);
  const [systemAreas, setSystemAreas] = useState([]);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [kanbanColumns, setKanbanColumns] = useState(() => {
    const saved = localStorage.getItem('remex_board_cols');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const validParsed = parsed.filter(p => defaultCols.some(dc => dc.id === p.id)).map(p => {
          const dc = defaultCols.find(d => d.id === p.id);
          return { ...dc, ...p, visible: p.visible !== false };
        });
        const missing = defaultCols.filter(dc => !parsed.some(p => p.id === dc.id));
        return [...validParsed, ...missing];
      } catch(e) {}
    }
    return defaultCols;
  });

  useEffect(() => localStorage.setItem('remex_board_cols', JSON.stringify(kanbanColumns)), [kanbanColumns]);

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isSuperUser = userRoles.includes('Super_Usuario');

  // NUEVO: Este Effect detecta si venimos del Inbox, abre la tarea y borra la memoria.
  useEffect(() => {
    if (activeTaskId && tasks.length > 0) {
      const targetTask = tasks.find(t => t.id === activeTaskId);
      if (targetTask) {
        setSelectedTask(targetTask);
        setActiveTaskId(null); // Limpiamos la orden para que no se abra de nuevo sola
      }
    }
  }, [activeTaskId, tasks, setActiveTaskId]);

  useEffect(() => {
    const unsubscribeTasks = subscribeToTasks((data) => {
      setTasks(data);
      setIsLoading(false);
      
      setSelectedTask(prevSelected => {
        if (!prevSelected) return null;
        const updated = data.find(t => t.id === prevSelected.id);
        return updated ? updated : prevSelected;
      });
    });

    let unsubscribeUsers = () => {};
    let unsubscribeAreas = () => {};

    if (isSuperUser) {
      unsubscribeUsers = subscribeToUsers((usersData) => {
        setSystemUsers(usersData);
      });
      unsubscribeAreas = subscribeToAreas((areasData) => {
        setSystemAreas(areasData);
      });
    }

    return () => {
      unsubscribeTasks();
      unsubscribeUsers();
      unsubscribeAreas();
    };
  }, [isSuperUser]);

  useEffect(() => {
    if (!selectedTask || !selectedTask.history) return;

    const unreadCount = selectedTask.history.filter(h => h.isMessage && h.targetUser === user?.name && h.status === 'sent').length;
    
    if (unreadCount > 0) {
      const updatedHistory = selectedTask.history.map(h => {
        if (h.isMessage && h.targetUser === user?.name && h.status === 'sent') {
          return { ...h, status: 'read' };
        }
        return h;
      });
      
      updateTaskInDb(selectedTask.id, { history: updatedHistory });
      setSelectedTask(prev => ({ ...prev, history: updatedHistory }));
    }
  }, [selectedTask, user?.name]);

  const handleCheckUpdate = () => {
    if (ipcRenderer) {
      setIsCheckingUpdate(true);
      ipcRenderer.send('check-for-updates-manual');
      setTimeout(() => setIsCheckingUpdate(false), 4000);
    } else {
      showError("El actualizador solo funciona en la aplicación de escritorio instalada.");
    }
  };

  const checkDependencies = (taskToStart) => {
    if (!taskToStart.dependencies || taskToStart.dependencies.length === 0) return true;
    const blockingTasks = tasks.filter(t => taskToStart.dependencies.includes(t.id) && t.status !== 'closed');
    if (blockingTasks.length > 0) {
      showError(`Acción Denegada: Debes completar primero ${blockingTasks.map(t => t.id).join(', ')}`);
      return false;
    }
    return true;
  };

  const showError = (msg) => {
    setActionError(msg);
    setTimeout(() => setActionError(null), 4500); 
  };

  const handleRecurringClone = async (taskToClone) => {
    if (!taskToClone.recurrence || taskToClone.recurrence === 'none') return;

    const nextDate = new Date();
    if (taskToClone.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1);
    else if (taskToClone.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
    else if (taskToClone.recurrence === 'biweekly') nextDate.setDate(nextDate.getDate() + 14);
    else if (taskToClone.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
    else if (taskToClone.recurrence === 'bimonthly') nextDate.setMonth(nextDate.getMonth() + 2);
    else if (taskToClone.recurrence === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
    else if (taskToClone.recurrence === 'biannually') nextDate.setMonth(nextDate.getMonth() + 6);
    else if (taskToClone.recurrence === 'annually') nextDate.setFullYear(nextDate.getFullYear() + 1);

    const randomId = `TSK-${Math.floor(1000 + Math.random() * 9000)}`;
    const resetBlocks = taskToClone.blocks?.map(block => {
      if (block.type === 'checklist') {
        return { ...block, items: block.items.map(item => ({ ...item, done: false })) };
      }
      return block;
    }) || [];

    const clonedTask = {
      ...taskToClone,
      id: randomId,
      status: 'open',
      startDate: nextDate.toISOString().split('T')[0],
      dueDate: null,
      approvedBy: [],
      blocks: resetBlocks,
      history: [{
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        user: 'Sistema Automático',
        comment: `Rutina generada automáticamente a partir del cierre de la tarea ${taskToClone.id}.`
      }]
    };

    await createTaskInDb(clonedTask);
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if ((newStatus === 'in_progress' || newStatus === 'closed') && task && !checkDependencies(task)) return;
    
    if (newStatus === 'closed' && task) {
      await handleRecurringClone(task);
    }

    await updateTaskStatusInDb(taskId, newStatus);
    if(newStatus === 'closed') setTimeout(() => setSelectedTask(null), 300);
  };

  const handleJointApprove = async () => {
    if (!selectedTask) return;
    const currentApprovals = selectedTask.approvedBy || [];
    const requiredAreas = selectedTask.assignedArea.split(',').map(a => a.trim());
    
    const myRelevantRoles = userRoles.filter(role => requiredAreas.includes(role));
    if (!isSuperUser && myRelevantRoles.length > 0 && myRelevantRoles.every(r => currentApprovals.includes(r))) {
      return; 
    }
    
    const newApprovals = [...new Set([...currentApprovals, ...myRelevantRoles])];
    
    const finalApprovals = isSuperUser ? requiredAreas : newApprovals;
    const isFullyApproved = requiredAreas.every(area => finalApprovals.includes(area));

    if (isFullyApproved) {
      await handleRecurringClone(selectedTask);
      await updateTaskInDb(selectedTask.id, { approvedBy: finalApprovals, status: 'closed' });
      setTimeout(() => setSelectedTask(null), 300);
    } else {
      await updateTaskInDb(selectedTask.id, { approvedBy: finalApprovals });
    }
  };

  const handleAddComment = async () => {
    if (!newTaskComment.trim() || !selectedTask) return;
    const now = new Date();
    
    const newHistoryEntry = { 
      date: now.toISOString().split('T')[0], 
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      user: user.name, 
      comment: newTaskComment.trim(),
      isMessage: !!messageTarget,
      targetUser: messageTarget || null,
      status: messageTarget ? 'sent' : null,
      replyTo: replyingTo ? { user: replyingTo.user, comment: replyingTo.comment } : null
    };

    setSelectedTask(prev => ({
      ...prev,
      history: [...(prev.history || []), newHistoryEntry]
    }));
    
    const currentMessageTarget = messageTarget; 

    setNewTaskComment("");
    setReplyingTo(null);
    setMessageTarget("");

    await addTaskCommentInDb(selectedTask.id, newHistoryEntry);

    if (currentMessageTarget) {
      await createNotification(
        'Personal', 
        `Mensaje en Tarea ${selectedTask.id}`, 
        `${user.name}: "${newHistoryEntry.comment.substring(0, 30)}..."`, 
        currentMessageTarget 
      );
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    setIsLoading(true);
    try {
      await deleteTaskWithLogInDb(selectedTask, user.name);
      setDeleteConfirmOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error("Error al eliminar la tarea:", error);
      showError("Hubo un error al intentar eliminar la tarea.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskDragStart = (e, taskId) => {
    e.stopPropagation();
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTaskDrop = async (e, colId) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverColId(null);
    
    if (draggedTaskId) {
      const task = tasks.find(t => t.id === draggedTaskId);
      if (task && task.status !== colId) {
        if ((colId === 'in_progress' || colId === 'pending_validation' || colId === 'closed') && !checkDependencies(task)) {
          setDraggedTaskId(null); return;
        }
        setTasks(prev => prev.map(t => t.id === draggedTaskId ? { ...t, status: colId } : t));
        await updateTaskStatusInDb(draggedTaskId, colId);
      }
      setDraggedTaskId(null);
    }
  };

  const handleColDragStart = (e, colId) => {
    setDraggedColId(colId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColDragOver = (e) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
  };

  const handleColDrop = (e, targetColId) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedColId && draggedColId !== targetColId) {
      const oldIndex = kanbanColumns.findIndex(c => c.id === draggedColId);
      const newIndex = kanbanColumns.findIndex(c => c.id === targetColId);
      const newCols = [...kanbanColumns];
      const [movedCol] = newCols.splice(oldIndex, 1);
      newCols.splice(newIndex, 0, movedCol);
      setKanbanColumns(newCols);
    }
    setDraggedColId(null);
  };

  const toggleColumn = (colId) => {
    setCollapsedColumns(prev => ({ ...prev, [colId]: !prev[colId] }));
  };

  const filteredTasks = tasks.filter(task => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!task.title.toLowerCase().includes(q) && !task.id.toLowerCase().includes(q) && !(task.associatedContactName || '').toLowerCase().includes(q)) return false;
    }
    
    const myName = user?.name || '';
    
    if (task.isPrivate && !isSuperUser) {
      const isCreator = task.creatorArea?.includes(myName);
      const isAssignee = (task.assignedEmployees && task.assignedEmployees.includes(myName)) || task.assignedArea?.includes(myName);
      
      if (!isCreator && !isAssignee) {
        return false;
      }
    }

    if (isSuperUser) {
      let matchArea = true;
      let matchEmployee = true;

      const taskPeopleOrAreas = [];
      if (task.assignedArea) taskPeopleOrAreas.push(...task.assignedArea.split(',').map(a => a.trim()));
      if (task.assignedEmployees) taskPeopleOrAreas.push(...task.assignedEmployees);
      if (task.creatorArea) taskPeopleOrAreas.push(task.creatorArea);

      if (adminArea !== 'Todas') {
        const employeesInArea = systemUsers.filter(u => 
            (u.roles || []).some(r => r.startsWith(adminArea)) || u.role?.startsWith(adminArea)
        ).map(u => u.name);

        matchArea = taskPeopleOrAreas.some(item => 
            item.startsWith(adminArea) || employeesInArea.includes(item)
        );
      }

      if (adminEmployee !== 'Todos') {
         matchEmployee = taskPeopleOrAreas.includes(adminEmployee);
      }

      return matchArea && matchEmployee;
    } else {
      const isAssignee = (task.assignedEmployees && task.assignedEmployees.includes(myName)) || task.assignedArea?.includes(myName);
      const isCreator = task.creatorArea?.includes(myName);
      
      if (task.isPrivate) {
         return isAssignee || isCreator;
      } else {
         const isMyArea = userRoles.some(r => task.assignedArea?.includes(r));
         return isAssignee || isCreator || isMyArea;
      }
    }
  });

  const getPriorityColor = (p) => {
    if(p==='critical') return 'text-red-500 bg-red-500/10 border-red-500/20';
    if(p==='high') return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  };

  const visibleColumns = kanbanColumns.filter(c => c.visible);

  return (
    <div className="flex-1 p-6 overflow-hidden flex flex-col h-full bg-zinc-950">
      
      {actionError && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] bg-red-950/90 backdrop-blur border-2 border-red-900 text-red-500 px-6 py-4 rounded-2xl shadow-[0_10px_40px_rgba(220,38,38,0.3)] flex items-center gap-4 transition-all">
           <AlertTriangle className="w-6 h-6 shrink-0"/>
           <p className="font-bold text-sm tracking-wide">{actionError}</p>
           <button onClick={() => setActionError(null)} className="ml-2 p-1.5 hover:bg-red-900 rounded-xl text-red-400 hover:text-white transition-colors"><X className="w-4 h-4"/></button>
        </div>
      )}

      {/* HEADER MEJORADO Y REORGANIZADO */}
      <div className="flex flex-col gap-4 mb-6 shrink-0">
        
        {/* Fila 1: Título y Botones */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              Tablero de Operaciones
              <HelpTooltip text="Arrastra tarjetas entre columnas. Tareas privadas y Firmas Conjuntas disponibles al crear tareas. Los borrados dejan auditoría. (Manual, Cap 2)" />
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Vista actual: <span className="text-orange-400 font-bold">{isSuperUser ? (adminEmployee !== 'Todos' ? adminEmployee : adminArea) : user?.name}</span>
            </p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={() => setIsColumnSettingsOpen(true)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors border border-zinc-700">
              <Settings2 className="w-4 h-4"/> <span className="hidden sm:inline">Columnas</span>
            </button>
            <button 
              onClick={handleCheckUpdate} 
              disabled={isCheckingUpdate}
              className="hidden sm:flex bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-2.5 rounded-xl text-sm items-center gap-2 transition-colors disabled:opacity-50 border border-zinc-700"
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingUpdate ? 'animate-spin text-orange-500' : ''}`}/> 
              <span className="hidden lg:inline">{isCheckingUpdate ? 'Buscando...' : 'Actualizar'}</span>
            </button>
            <button onClick={() => setIsCreateModalOpen(true)} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-6 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 flex-1 md:flex-none hover:-translate-y-0.5 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
              <Plus className="w-4 h-4"/> NUEVA TAREA
            </button>
          </div>
        </div>

        {/* Fila 2: BARRA DE FILTROS PARA SUPER USUARIO */}
        {isSuperUser && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-zinc-900/80 border border-zinc-800 p-3 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-orange-500 shrink-0" />
              <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest shrink-0">Filtro Global:</span>
            </div>
            
            <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
              <select 
                value={adminArea} 
                onChange={(e) => { setAdminArea(e.target.value); setAdminEmployee('Todos'); }} 
                className="flex-1 bg-black text-orange-400 border border-zinc-800 rounded-xl px-4 py-2 font-bold text-sm outline-none cursor-pointer focus:border-orange-500 transition-colors"
              >
                <option value="Todas">Todas las Áreas</option>
                {systemAreas.map(a => (
                  <optgroup key={a.id} label={a.name}>
                    <option value={a.name}>{a.name} (Completa)</option>
                    {a.subareas && a.subareas.map(sub => (
                      <option key={`${a.name} > ${sub}`} value={`${a.name} > ${sub}`}>
                         -- {sub}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <select 
                value={adminEmployee} 
                onChange={(e) => setAdminEmployee(e.target.value)} 
                className="flex-1 bg-black text-emerald-400 border border-zinc-800 rounded-xl px-4 py-2 font-bold text-sm outline-none cursor-pointer focus:border-emerald-500 transition-colors"
              >
                <option value="Todos">Todos los empleados</option>
                {systemUsers
                  .filter(u => adminArea === 'Todas' || (u.roles || []).some(r => r.startsWith(adminArea)) || u.role?.startsWith(adminArea))
                  .map(u => (
                  <option key={u.id} value={u.name}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-x-auto custom-scrollbar flex gap-6 pb-4">
        {visibleColumns.map(col => {
          const columnTasks = filteredTasks.filter(t => t.status === col.id);
          const isCollapsed = collapsedColumns[col.id];
          const isOver = draggedOverColId === col.id && draggedTaskId;

          return (
            <div 
              key={col.id} 
              draggable 
              onDragStart={(e) => handleColDragStart(e, col.id)}
              onDragOver={(e) => {
                if (draggedColId) handleColDragOver(e);
                else if (draggedTaskId) { e.preventDefault(); setDraggedOverColId(col.id); }
              }}
              onDragLeave={() => setDraggedOverColId(null)}
              onDrop={(e) => {
                if (draggedColId) handleColDrop(e, col.id);
                else if (draggedTaskId) handleTaskDrop(e, col.id);
              }}
              className={`flex-shrink-0 flex flex-col rounded-2xl border transition-all duration-300 
                ${isCollapsed ? 'w-[72px]' : 'w-[320px]'}
                ${isOver ? 'bg-orange-950/10 border-orange-500/50 ring-2 ring-orange-500/20' : 'bg-zinc-950/50 border-zinc-800/50'}
                ${draggedColId === col.id ? 'opacity-30' : 'opacity-100'}
              `}
            >
              <div className={`p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-950/90 backdrop-blur z-10 rounded-t-2xl ${isCollapsed ? 'flex-col gap-4 py-5' : ''}`}>
                {!isCollapsed && (
                  <div className="flex items-center gap-2 pointer-events-none">
                    <GripVertical className="w-4 h-4 text-zinc-600"/>
                    <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                    <h3 className="font-black text-white text-sm">{col.title}</h3>
                  </div>
                )}
                <div className={`flex items-center ${isCollapsed ? 'flex-col gap-4' : 'gap-2'}`}>
                  {!isCollapsed && <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-md font-bold">{columnTasks.length}</span>}
                  <button onClick={() => toggleColumn(col.id)} className="text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-800 p-1.5 rounded-md transition-colors">
                    {isCollapsed ? <ChevronRight className="w-4 h-4"/> : <ChevronLeft className="w-4 h-4"/>}
                  </button>
                </div>
                {isCollapsed && (
                  <div className="flex-1 flex flex-col items-center gap-4 mt-2">
                    <GripVertical className="w-4 h-4 text-zinc-600 mb-2"/>
                    <div className={`w-3 h-3 rounded-full ${col.color}`}></div>
                    <span className="bg-zinc-800 text-zinc-400 text-[10px] px-2 py-1 rounded-md font-bold">{columnTasks.length}</span>
                    <div className="text-zinc-500 font-black text-xs tracking-[0.2em] uppercase mt-4 whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      {col.title}
                    </div>
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3">
                  {!isLoading && columnTasks.map(task => (
                    <div 
                      key={task.id} 
                      draggable 
                      onDragStart={(e) => handleTaskDragStart(e, task.id)}
                      onClick={() => setSelectedTask(task)}
                      className={`bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 p-4 rounded-xl cursor-grab active:cursor-grabbing transition-all shadow-lg hover:shadow-[0_0_15px_rgba(249,115,22,0.15)] flex flex-col gap-3 group ${draggedTaskId === task.id ? 'opacity-40 scale-95 border-orange-500 border-dashed' : 'opacity-100'}`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black tracking-widest text-zinc-500 flex items-center gap-1">
                          {task.id} {task.isPrivate && <Lock className="w-3 h-3 text-red-500" title="Tarea Privada" />}
                        </span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      
                      <h4 className="font-bold text-white text-sm leading-snug group-hover:text-orange-400 transition-colors">
                        {task.title}
                      </h4>

                      {task.associatedContactName && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 w-fit">
                          <Building2 className="w-3 h-3"/> {task.associatedContactName}
                        </div>
                      )}

                      {task.requireJointApproval && (
                        <div className="flex items-center gap-1 text-[10px] text-orange-400 font-bold bg-orange-950/30 w-fit px-2 py-0.5 rounded border border-orange-500/30 uppercase">
                          <PenTool className="w-3 h-3"/> Firma Conjunta
                        </div>
                      )}

                      {task.dependencies && task.dependencies.length > 0 && task.status === 'blocked' && (
                        <div className="flex items-center gap-1 text-[10px] text-red-400 font-bold bg-red-950/30 w-fit px-2 py-0.5 rounded border border-red-500/30">
                          <LinkIcon className="w-3 h-3"/> Bloqueada
                        </div>
                      )}

                      <div className="mt-2 pt-3 border-t border-zinc-800 flex justify-between items-center text-xs pointer-events-none">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <UserCircle className="w-4 h-4"/>
                          <span className="truncate max-w-[120px]">{task.assignedEmployees?.join(', ') || task.assignedArea || 'Sin Asignar'}</span>
                        </div>
                        {task.status === 'pending_validation' && (
                          <span className="animate-pulse flex items-center gap-1 text-yellow-500 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3"/> Validar
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {isOver && draggedTaskId && <div className="border-2 border-dashed border-orange-500/50 rounded-xl h-24 bg-orange-500/5 transition-all"></div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isColumnSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex justify-center items-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
              <h2 className="font-black text-white flex items-center gap-2"><Settings2 className="w-5 h-5 text-orange-500"/> Personalizar Columnas</h2>
              <button onClick={() => setIsColumnSettingsOpen(false)} className="p-2 text-zinc-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {kanbanColumns.map((col, idx) => (
                <div key={col.id} className="flex items-center gap-3 bg-black border border-zinc-800 p-3 rounded-xl">
                  <button onClick={() => { const newCols = [...kanbanColumns]; newCols[idx].visible = !newCols[idx].visible; setKanbanColumns(newCols); }} className={`p-2 rounded-lg transition-colors ${col.visible ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-800 text-zinc-500'}`}>
                    {col.visible ? <Eye className="w-4 h-4"/> : <EyeOff className="w-4 h-4"/>}
                  </button>
                  <input type="text" value={col.title} onChange={(e) => { const newCols = [...kanbanColumns]; newCols[idx].title = e.target.value; setKanbanColumns(newCols); }} className="flex-1 bg-transparent border-none text-white text-sm font-bold outline-none focus:border-b focus:border-orange-500 uppercase" />
                </div>
              ))}
            </div>
            <div className="p-5 bg-zinc-900 border-t border-zinc-800 flex justify-end">
              <button onClick={() => setIsColumnSettingsOpen(false)} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-6 py-2.5 rounded-xl text-sm">LISTO</button>
            </div>
          </div>
        </div>
      )}

      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
            
            <div className="px-8 py-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-start shrink-0">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-orange-500 font-black tracking-widest text-sm">{selectedTask.id}</span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getPriorityColor(selectedTask.priority)}`}>
                    Prioridad: {selectedTask.priority}
                  </span>
                  {selectedTask.isPrivate && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border text-red-400 bg-red-500/10 border-red-500/20 flex items-center gap-1">
                      <Lock className="w-3 h-3"/> Privada
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-white leading-tight">{selectedTask.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                 
                {isSuperUser && (
                  <button 
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="p-2 bg-red-950/40 hover:bg-red-600 border border-red-900/50 rounded-xl text-red-500 hover:text-white transition-colors"
                    title="Eliminar Tarea Permanentemente"
                  >
                    <Trash2 className="w-5 h-5"/>
                  </button>
                )}

                <button 
                  onClick={() => { setTaskToEdit(selectedTask); setIsCreateModalOpen(true); setSelectedTask(null); }} 
                  className="p-2 bg-zinc-800 hover:bg-orange-600 rounded-xl text-zinc-400 hover:text-white transition-colors"
                  title="Editar Tarea"
                >
                  <Edit2 className="w-5 h-5"/>
                </button>
                <button onClick={() => { setSelectedTask(null); setReplyingTo(null); setMessageTarget(""); }} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white">
                  <X className="w-5 h-5"/>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex flex-col gap-8 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl md:col-span-2">
                  <span className="text-xs text-zinc-500 font-bold uppercase block mb-1">Equipos / Personas Asignadas</span>
                  <span className="text-white font-bold text-sm">{selectedTask.assignedEmployees?.join(', ') || selectedTask.assignedArea || 'Sin Asignar'}</span>
                </div>
                
                {selectedTask.associatedContactName && (
                  <div className="bg-blue-900/10 border border-blue-900/30 p-4 rounded-2xl md:col-span-2">
                    <span className="text-xs text-blue-500 font-bold uppercase block mb-1">Asociado a Cliente</span>
                    <span className="text-blue-400 font-bold text-sm flex items-center gap-2">
                      <Building2 className="w-4 h-4"/> {selectedTask.associatedContactName}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-black text-white mb-4 border-b border-zinc-800 pb-2">Contenido de la Tarea</h3>
                <div className="space-y-4">
                  {selectedTask.blocks && selectedTask.blocks.map((block, i) => {
                    if (block.type === 'text') return <div key={i} className="bg-black/50 border border-zinc-800 p-5 rounded-2xl text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap"><FileText className="w-4 h-4 text-zinc-500 inline mr-2 -mt-1"/>{block.content}</div>;
                    return null;
                  })}
                </div>
              </div>

              <div className="mt-2 flex flex-col flex-1">
                <h3 className="text-lg font-black text-white mb-4 border-b border-zinc-800 pb-2 flex items-center gap-2">
                  <History className="w-5 h-5 text-orange-500" /> Notas y Chat
                </h3>
                
                <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 flex-1">
                  {(!selectedTask.history || selectedTask.history.length === 0) && (
                    <p className="text-zinc-600 text-sm italic text-center mt-10">No hay interacciones registradas en esta tarea.</p>
                  )}
                  {selectedTask.history && selectedTask.history.map((h, i) => {
                    const isSystem = h.user === 'Sistema Automático';
                    const isMine = h.user === user?.name;
                    const isMessage = h.isMessage;

                    if (isMessage) {
                      return (
                        <div key={i} className={`flex flex-col mb-4 ${isMine ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-2xl ${isMine ? 'bg-orange-600 text-black rounded-tr-sm' : 'bg-zinc-800 text-white rounded-tl-sm'}`}>
                            {h.replyTo && (
                              <div className="bg-black/20 p-2 rounded-lg mb-2 text-xs border-l-2 border-black/50">
                                <b>{h.replyTo.user}</b><br/>{h.replyTo.comment}
                              </div>
                            )}
                            <p className={`text-sm font-medium ${isMine ? 'text-black' : 'text-zinc-200'}`}>{h.comment}</p>
                            
                            <div className="flex justify-between items-center mt-1.5 gap-4">
                              <span className={`text-[10px] font-bold ${isMine ? 'text-black/60' : 'text-zinc-500'}`}>{h.time}</span>
                              <div className="flex items-center gap-2">
                                {!isMine && (
                                  <button onClick={() => setReplyingTo(h)} className="text-zinc-400 hover:text-white" title="Responder">
                                    <Reply className="w-3.5 h-3.5"/>
                                  </button>
                                )}
                                {isMine && h.status === 'read' && <CheckCheck className="w-4 h-4 text-blue-900" title="Visto"/>}
                                {isMine && h.status === 'sent' && <Check className="w-3.5 h-3.5 text-black/40" title="Enviado"/>}
                              </div>
                            </div>
                          </div>
                          {!isMine && <span className="text-[10px] text-zinc-500 mt-1 ml-1">{h.user}</span>}
                        </div>
                      )
                    }

                    // Renderizado de notas generales o del sistema
                    return (
                      <div key={i} className={`p-4 rounded-r-xl rounded-l-sm border-l-4 transition-all ${isSystem ? 'bg-zinc-900/50 border-zinc-700' : 'bg-orange-900/10 border-orange-500 shadow-sm'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className={`font-bold text-sm ${isSystem ? 'text-zinc-500' : 'text-orange-400'}`}>{h.user}</span>
                          <span className="text-xs text-zinc-500 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3"/> {h.date} - {h.time || '00:00'}
                          </span>
                        </div>
                        <p className={`text-sm whitespace-pre-wrap ${isSystem ? 'text-zinc-500 italic' : 'text-zinc-200 font-medium leading-relaxed'}`}>{h.comment}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-auto">
                  {replyingTo && (
                    <div className="bg-zinc-800 p-3 rounded-t-xl text-xs flex justify-between items-center text-zinc-400 border-l-4 border-orange-500">
                      <span>Respondiendo a <b>{replyingTo.user}</b>: "{replyingTo.comment.substring(0, 50)}..."</span>
                      <button onClick={() => setReplyingTo(null)} className="p-1 hover:text-white hover:bg-zinc-700 rounded"><X className="w-3 h-3"/></button>
                    </div>
                  )}
                  
                  <div className="flex gap-3 items-center mb-2">
                    <MessageCircle className="w-4 h-4 text-zinc-500"/>
                    
                    {(() => {
                      const targets = new Set();
                      
                      if (selectedTask.creatorArea) targets.add(selectedTask.creatorArea);
                      if (selectedTask.assignedArea) {
                        selectedTask.assignedArea.split(',').forEach(a => {
                          if (a.trim()) targets.add(a.trim());
                        });
                      }
                      if (selectedTask.assignedEmployees) {
                        selectedTask.assignedEmployees.forEach(e => {
                          if (e) targets.add(e);
                        });
                      }

                      targets.delete(user?.name);
                      const uniqueTargets = Array.from(targets);

                      return (
                        <select 
                          value={messageTarget} 
                          onChange={e => setMessageTarget(e.target.value)}
                          className="bg-black border border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-bold text-zinc-400 outline-none focus:border-orange-500 focus:text-white"
                        >
                          <option value="">Cargar como Nota General</option>
                          {uniqueTargets.map(target => (
                             <option key={target} value={target}>Enviar Aviso a {target}</option>
                          ))}
                        </select>
                      );
                    })()}

                  </div>

                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      value={newTaskComment} 
                      onChange={(e) => setNewTaskComment(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                      placeholder={messageTarget ? `Escribir mensaje a ${messageTarget}...` : "Escribir una actualización general..."} 
                      className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-orange-500 outline-none transition-colors"
                    />
                    <button 
                      onClick={handleAddComment} 
                      disabled={!newTaskComment.trim()}
                      className="bg-zinc-800 hover:bg-orange-600 text-zinc-400 hover:text-white px-5 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 font-bold text-sm"
                    >
                      <Send className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              </div>

            </div>

            <div className="px-8 py-5 border-t border-zinc-800 bg-zinc-900 shrink-0 flex items-center justify-between">
              <div className="text-xs text-zinc-500 font-bold uppercase">Estado Actual: <span className="text-white ml-1">{selectedTask.status.replace('_', ' ')}</span></div>
              
              <div className="flex gap-3 items-center">
                 {selectedTask.status === 'in_progress' && (
                   <button onClick={() => updateTaskStatus(selectedTask.id, 'pending_validation')} className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm border border-zinc-700">MARCAR TERMINADO</button>
                )}
                
                {selectedTask.status === 'pending_validation' && (
                  selectedTask.requireJointApproval ? (
                    <div className="flex items-center gap-4 bg-orange-950/20 border border-orange-900/30 p-2 rounded-xl">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Áreas Requeridas:</span>
                        <div className="flex gap-2">
                          {(selectedTask.assignedArea ? selectedTask.assignedArea.split(',') : []).map(areaStr => {
                            const a = areaStr.trim();
                            if(!a) return null;
                            const hasSigned = (selectedTask.approvedBy || []).includes(a);
                            return <span key={a} className={`px-2 py-1 text-[10px] rounded font-bold ${hasSigned ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>{a} {hasSigned && '✓'}</span>
                          })}
                        </div>
                      </div>
                      
                      {(() => {
                        const requiredAreas = selectedTask.assignedArea ? selectedTask.assignedArea.split(',').map(a=>a.trim()) : [];
                        const myRelevantRoles = userRoles.filter(role => requiredAreas.includes(role));
                        
                        const hasMissingSignatures = myRelevantRoles.some(role => !(selectedTask.approvedBy || []).includes(role));
                        const canSign = isSuperUser || hasMissingSignatures;

                        return canSign && (
                          <button 
                            onClick={handleJointApprove} 
                            className="bg-orange-600 hover:bg-orange-500 text-black font-black px-6 py-2 rounded-xl text-sm shadow-[0_0_15px_rgba(249,115,22,0.3)] ml-4"
                          >
                            <PenTool className="w-4 h-4 inline mr-2"/> FIRMAR APROBACIÓN
                          </button>
                        );
                      })()}
                    </div>
                  ) : (
                    <>
                      <button onClick={() => updateTaskStatus(selectedTask.id, 'in_progress')} className="bg-red-950/30 hover:bg-red-900 text-red-500 hover:text-white border border-red-900 font-bold px-6 py-2.5 rounded-xl text-sm">RECHAZAR TRABAJO</button>
                      <button onClick={() => updateTaskStatus(selectedTask.id, 'closed')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-2.5 rounded-xl text-sm flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> APROBAR Y CERRAR</button>
                    </>
                  )
                )}

                {selectedTask.status === 'open' && (
                  <button onClick={() => updateTaskStatus(selectedTask.id, 'in_progress')} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-8 py-2.5 rounded-xl text-sm">COMENZAR TAREA</button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex justify-center items-center p-4">
          <div className="bg-zinc-950 border border-red-900/50 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(220,38,38,0.3)] overflow-hidden flex flex-col p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-black text-white mb-2">¿Eliminar Tarea?</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Esta acción quitará la tarea del tablero permanentemente. Quedará un registro de auditoría indicando que <b>{user?.name}</b> la eliminó.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmOpen(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors">
                CANCELAR
              </button>
              <button onClick={handleDeleteTask} className="flex-1 px-4 py-3 rounded-xl font-black text-sm text-white bg-red-600 hover:bg-red-500 transition-colors">
                SÍ, ELIMINAR
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <CreateTaskModal 
          onClose={() => { setIsCreateModalOpen(false); setTaskToEdit(null); }} 
          taskToEdit={taskToEdit}
        />
      )}
    </div>
  );
}