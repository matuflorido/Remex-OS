import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, AlertTriangle, UserCircle, ShieldCheck, 
  Plus, Link as LinkIcon, FileText, Settings2,
  CheckSquare, History, ArrowRight, CalendarDays, Clock, Database,
  ChevronLeft, ChevronRight, Paperclip, Repeat, GripVertical, Eye, PenTool, Send, RefreshCw, User, Building2, EyeOff, Edit2
} from 'lucide-react';
import { X } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import useUIStore from '../../../store/useUIStore';
import { subscribeToTasks, updateTaskStatusInDb, addTaskCommentInDb, updateTaskInDb, createTaskInDb } from '../services/taskService';
import { subscribeToUsers } from '../../admin/services/adminService';
import CreateTaskModal from './CreateTaskModal';
import HelpTooltip from '../../../components/ui/HelpTooltip';

// Puente de comunicación seguro con Electron
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
  const { searchQuery } = useUIStore(); 
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [newTaskComment, setNewTaskComment] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [draggedOverColId, setDraggedOverColId] = useState(null); // Más fluido en HTML5
  const [actionError, setActionError] = useState(null);
  
  const [adminEmployee, setAdminEmployee] = useState('Todos');
  const [systemUsers, setSystemUsers] = useState([]);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [kanbanColumns, setKanbanColumns] = useState(() => {
    const saved = localStorage.getItem('remex_board_cols');
    if (saved) {
      const parsed = JSON.parse(saved);
      return defaultCols.map(dc => {
        const found = parsed.find(p => p.id === dc.id);
        return found ? { ...dc, title: found.title, visible: found.visible !== false } : dc;
      });
    }
    return defaultCols;
  });

  useEffect(() => localStorage.setItem('remex_board_cols', JSON.stringify(kanbanColumns)), [kanbanColumns]);

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isSuperUser = userRoles.includes('Super_Usuario');

  useEffect(() => {
    const unsubscribeTasks = subscribeToTasks((data) => {
      setTasks(data);
      setIsLoading(false);
      if (selectedTask) {
        const updatedSelected = data.find(t => t.id === selectedTask.id);
        if (updatedSelected) setSelectedTask(updatedSelected);
      }
    });

    let unsubscribeUsers = () => {};
    if (isSuperUser) {
      unsubscribeUsers = subscribeToUsers((usersData) => {
        setSystemUsers(usersData);
      });
    }

    return () => {
      unsubscribeTasks();
      unsubscribeUsers();
    };
  }, [selectedTask, isSuperUser]);

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
    const isFullyApproved = isSuperUser || requiredAreas.every(area => newApprovals.includes(area));

    if (isFullyApproved) {
      await handleRecurringClone(selectedTask);
      
      await updateTaskInDb(selectedTask.id, { 
        approvedBy: isSuperUser ? requiredAreas : newApprovals, 
        status: 'closed' 
      });
      setTimeout(() => setSelectedTask(null), 300);
    } else {
      await updateTaskInDb(selectedTask.id, { approvedBy: newApprovals });
    }
  };

  const handleAddComment = async () => {
    if (!newTaskComment.trim() || !selectedTask) return;
    
    const now = new Date();
    const newHistoryEntry = { 
      date: now.toISOString().split('T')[0], 
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      user: user.name, 
      comment: newTaskComment.trim()
    };
    
    await addTaskCommentInDb(selectedTask.id, newHistoryEntry);
    setNewTaskComment("");
  };

  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e, colId) => {
    e.preventDefault();
    if (draggedOverColId !== colId) setDraggedOverColId(colId);
  };
  
  const handleDragLeave = () => setDraggedOverColId(null);
  
  const handleDrop = async (e, colId) => {
    e.preventDefault();
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

  const filteredTasks = tasks.filter(task => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!task.title.toLowerCase().includes(q) && !task.id.toLowerCase().includes(q) && !(task.associatedContactName || '').toLowerCase().includes(q)) return false;
    }
    
    if (isSuperUser && adminEmployee !== 'Todos') {
      return task.assignedEmployees?.includes(adminEmployee);
    }
    if (!isSuperUser) {
      return task.assignedEmployees?.includes(user?.name) || task.creatorArea?.includes(user?.name);
    }
    return true;
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

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            Tablero de Operaciones
            <HelpTooltip text="Arrastra y suelta las tareas entre las columnas para avanzar. En 'Columnas' puedes cambiarles el nombre u ocultarlas." />

            {isSuperUser && (
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg ml-2 shadow-inner">
                <Eye className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-zinc-500 font-bold uppercase hidden sm:inline">Ver Empleado:</span>
                
                <select 
                  value={adminEmployee} 
                  onChange={(e) => setAdminEmployee(e.target.value)} 
                  className="bg-transparent text-emerald-400 font-bold text-sm outline-none cursor-pointer pl-2"
                >
                  <option value="Todos" className="bg-zinc-900">Todos</option>
                  {systemUsers.map(u => <option key={u.id} value={u.name} className="bg-zinc-900">{u.name}</option>)}
                </select>
              </div>
            )}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Vista actual: <span className="text-orange-400 font-bold">{isSuperUser ? adminEmployee : user?.name}</span>
          </p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <button onClick={() => setIsColumnSettingsOpen(true)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors border border-zinc-700">
            <Settings2 className="w-4 h-4"/> <span className="hidden sm:inline">Columnas</span>
          </button>
          <button 
            onClick={handleCheckUpdate} 
            disabled={isCheckingUpdate}
            className="hidden sm:flex bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-2.5 rounded-xl text-sm items-center gap-2 transition-colors disabled:opacity-50 border border-zinc-700"
          >
            <RefreshCw className={`w-4 h-4 ${isCheckingUpdate ? 'animate-spin text-orange-500' : ''}`}/> 
            <span>{isCheckingUpdate ? 'Buscando...' : 'Actualizar'}</span>
          </button>

          <button onClick={() => setIsCreateModalOpen(true)} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-6 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 flex-1 md:flex-none hover:-translate-y-0.5">
            <Plus className="w-4 h-4"/> NUEVA TAREA
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto custom-scrollbar flex gap-6 pb-4">
        {visibleColumns.map(col => {
          const columnTasks = filteredTasks.filter(t => t.status === col.id);
          const isOver = draggedOverColId === col.id;

          return (
            <div 
              key={col.id} 
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex-shrink-0 flex flex-col rounded-2xl border transition-all duration-200 w-[320px] 
                ${isOver ? 'bg-orange-950/10 border-orange-500/50 ring-2 ring-orange-500/20' : 'bg-zinc-950/50 border-zinc-800/50'}
              `}
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-950/90 backdrop-blur z-10 rounded-t-2xl">
                <div className="flex items-center gap-2 pointer-events-none">
                  <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                  <h3 className="font-black text-white text-sm">{col.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-md font-bold">{columnTasks.length}</span>
                </div>
              </div>

              <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3">
                {!isLoading && columnTasks.map(task => (
                  <div 
                    key={task.id} 
                    draggable 
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => setSelectedTask(task)}
                    className={`bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 p-4 rounded-xl cursor-grab active:cursor-grabbing transition-all shadow-lg hover:shadow-[0_0_15px_rgba(249,115,22,0.15)] flex flex-col gap-3 group ${draggedTaskId === task.id ? 'opacity-40 scale-95 border-orange-500 border-dashed' : 'opacity-100'}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black tracking-widest text-zinc-500">{task.id}</span>
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
                        <span className="truncate max-w-[120px]">{task.assignedEmployees?.join(', ') || 'Sin Asignar'}</span>
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
            </div>
          );
        })}
      </div>

      {isColumnSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex justify-center items-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
              <h2 className="font-black text-white flex items-center gap-2"><Settings2 className="w-5 h-5 text-orange-500"/> Visibilidad de Columnas</h2>
              <button onClick={() => setIsColumnSettingsOpen(false)} className="p-2 text-zinc-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 space-y-3">
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
                </div>
                <h2 className="text-2xl font-black text-white leading-tight">{selectedTask.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { setTaskToEdit(selectedTask); setIsCreateModalOpen(true); setSelectedTask(null); }} 
                  className="p-2 bg-zinc-800 hover:bg-orange-600 rounded-xl text-zinc-400 hover:text-white transition-colors"
                  title="Editar Tarea"
                >
                  <Edit2 className="w-5 h-5"/>
                </button>
                <button onClick={() => setSelectedTask(null)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white">
                  <X className="w-5 h-5"/>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex flex-col gap-8 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl md:col-span-2">
                  <span className="text-xs text-zinc-500 font-bold uppercase block mb-1">Equipos / Personas Asignadas</span>
                  <span className="text-white font-bold text-sm">{selectedTask.assignedEmployees?.join(', ') || 'Sin Asignar'}</span>
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

              <div className="mt-2">
                <h3 className="text-lg font-black text-white mb-4 border-b border-zinc-800 pb-2 flex items-center gap-2">
                  <History className="w-5 h-5 text-orange-500" /> Notas y Actividad
                </h3>
                
                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                  {(!selectedTask.history || selectedTask.history.length === 0) && (
                    <p className="text-zinc-600 text-sm italic">No hay notas registradas en esta tarea.</p>
                  )}
                  {selectedTask.history && selectedTask.history.map((h, i) => (
                    <div key={i} className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-sm text-orange-400">{h.user}</span>
                        <span className="text-xs text-zinc-500 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3"/> {h.date} - {h.time || '00:00'}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{h.comment}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={newTaskComment} 
                    onChange={(e) => setNewTaskComment(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="Escribir una actualización o comentario..." 
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
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Firmas Requeridas:</span>
                        <div className="flex gap-2">
                          {selectedTask.assignedArea.split(',').map(area => {
                            const a = area.trim();
                            const hasSigned = (selectedTask.approvedBy || []).includes(a);
                            return <span key={a} className={`px-2 py-1 text-[10px] rounded font-bold ${hasSigned ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>{a} {hasSigned && '✓'}</span>
                          })}
                        </div>
                      </div>
                      
                      {(() => {
                        const requiredAreas = selectedTask.assignedArea.split(',').map(a => a.trim());
                        const myRelevantRoles = userRoles.filter(r => requiredAreas.includes(r));
                        const hasSignedAllMyRoles = myRelevantRoles.length > 0 && myRelevantRoles.every(r => (selectedTask.approvedBy || []).includes(r));
                        const canSign = isSuperUser || (!hasSignedAllMyRoles && myRelevantRoles.length > 0);
                        
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

      {isCreateModalOpen && (
        <CreateTaskModal 
          onClose={() => { setIsCreateModalOpen(false); setTaskToEdit(null); }} 
          taskToEdit={taskToEdit} 
        />
      )}
    </div>
  );
}