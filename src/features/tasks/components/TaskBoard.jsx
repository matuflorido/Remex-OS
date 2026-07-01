import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, AlertTriangle, UserCircle, ShieldCheck, 
  Plus, Link as LinkIcon, FileText, 
  CheckSquare, History, ArrowRight, CalendarDays, Clock, Database,
  ChevronLeft, ChevronRight, Paperclip, Repeat, GripVertical, Eye, PenTool, Send, Edit2, Trash2
} from 'lucide-react';
import { X } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import useUIStore from '../../../store/useUIStore';
import { subscribeToTasks, updateTaskStatusInDb, addTaskCommentInDb, updateTaskInDb, deleteTaskInDb } from '../services/taskService';
import CreateTaskModal from './CreateTaskModal';

export default function TaskBoard() {
  const { user } = useAuthStore();
  const { searchQuery } = useUIStore(); 
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // NUEVO: Estado para saber qué tarea estamos editando
  const [taskToEdit, setTaskToEdit] = useState(null);
  
  const [newTaskComment, setNewTaskComment] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [collapsedColumns, setCollapsedColumns] = useState({});
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [draggedColId, setDraggedColId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [adminView, setAdminView] = useState('Todas');

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isSuperUser = userRoles.includes('Super_Usuario');

  const [kanbanColumns, setKanbanColumns] = useState([
    { id: 'open', title: 'NUEVAS', color: 'bg-zinc-500' },
    { id: 'blocked', title: 'BLOQUEADAS', color: 'bg-red-500' },
    { id: 'in_progress', title: 'EN PROCESO', color: 'bg-blue-500' },
    { id: 'pending_validation', title: 'PENDIENTE VALIDACIÓN', color: 'bg-yellow-500' },
    { id: 'closed', title: 'CERRADAS', color: 'bg-emerald-500' }
  ]);

  useEffect(() => {
    const unsubscribe = subscribeToTasks((data) => {
      setTasks(data);
      setIsLoading(false);
      if (selectedTask) {
        const updatedSelected = data.find(t => t.id === selectedTask.id);
        if (updatedSelected) {
          setSelectedTask(updatedSelected);
        } else {
          // Si la tarea fue borrada, la cerramos
          setSelectedTask(null);
        }
      }
    });
    return () => unsubscribe();
  }, [selectedTask]);

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

  const updateTaskStatus = async (taskId, newStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if ((newStatus === 'in_progress' || newStatus === 'closed') && task && !checkDependencies(task)) return; 
    await updateTaskStatusInDb(taskId, newStatus);
    if(newStatus === 'closed') setTimeout(() => setSelectedTask(null), 300);
  };

  // NUEVO: Función para eliminar
  const handleDeleteTask = async (taskId) => {
    if(window.confirm("¿Estás seguro de eliminar esta tarea permanentemente?")) {
      await deleteTaskInDb(taskId);
      setSelectedTask(null);
    }
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

  const handleTaskDragStart = (e, taskId) => {
    e.stopPropagation();
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTaskDrop = async (e, columnId) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTaskId) {
      const task = tasks.find(t => t.id === draggedTaskId);
      if (task && task.status !== columnId) {
        if ((columnId === 'in_progress' || columnId === 'pending_validation' || columnId === 'closed') && !checkDependencies(task)) {
          setDraggedTaskId(null);
          return;
        }
        setTasks(prev => prev.map(t => t.id === draggedTaskId ? { ...t, status: columnId } : t));
        await updateTaskStatusInDb(draggedTaskId, columnId);
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
      const lowerQuery = searchQuery.toLowerCase();
      const matchesSearch = task.title.toLowerCase().includes(lowerQuery) || task.id.toLowerCase().includes(lowerQuery) || task.assignedArea.toLowerCase().includes(lowerQuery);
      if (!matchesSearch) return false;
    }
    
    if (isSuperUser) {
      if (adminView === 'Todas') return true;
      return task.creatorArea?.includes(adminView) || task.assignedArea?.includes(adminView);
    } else {
      const myName = user?.name || '';
      return userRoles.some(role => task.creatorArea?.includes(role) || task.assignedArea?.includes(role)) ||
             task.creatorArea?.includes(myName) || task.assignedArea?.includes(myName);
    }
  });

  const getPriorityColor = (p) => {
    if(p==='critical') return 'text-red-500 bg-red-500/10 border-red-500/20';
    if(p==='high') return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  };

  const renderKanbanCard = (task) => (
    <div 
      key={task.id}
      draggable 
      onDragStart={(e) => handleTaskDragStart(e, task.id)}
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
          <span className="truncate max-w-[120px]">{task.assignedArea}</span>
        </div>
        {task.status === 'pending_validation' && (
          <span className="animate-pulse flex items-center gap-1 text-yellow-500 font-bold text-[10px]">
            <CheckCircle2 className="w-3 h-3"/> Validar
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 p-6 overflow-hidden flex flex-col h-full bg-zinc-950">
      
      {actionError && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] bg-red-950/90 backdrop-blur border-2 border-red-900 text-red-500 px-6 py-4 rounded-2xl shadow-[0_10px_40px_rgba(220,38,38,0.3)] flex items-center gap-4 transition-all">
           <AlertTriangle className="w-6 h-6 shrink-0"/>
           <p className="font-bold text-sm tracking-wide">{actionError}</p>
           <button onClick={() => setActionError(null)} className="ml-2 p-1.5 hover:bg-red-900 rounded-xl text-red-400 hover:text-white transition-colors"><X className="w-4 h-4"/></button>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            Tablero de Operaciones
            {isSuperUser && (
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg ml-2 shadow-inner">
                <Eye className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-zinc-500 font-bold uppercase hidden sm:inline">Ver como:</span>
                <select value={adminView} onChange={(e) => setAdminView(e.target.value)} className="bg-transparent text-orange-400 font-bold text-sm outline-none cursor-pointer">
                  <option value="Todas" className="bg-zinc-900">Todas las áreas</option>
                  <option value="Ventas" className="bg-zinc-900">Ventas</option>
                  <option value="Operaciones" className="bg-zinc-900">Operaciones</option>
                  <option value="Administración" className="bg-zinc-900">Administración</option>
                </select>
              </div>
            )}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Vista del Área: <span className="text-orange-400 font-bold">{isSuperUser ? adminView : userRoles.join(', ')}</span>
          </p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => { setTaskToEdit(null); setIsCreateModalOpen(true); }} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 hover:-translate-y-0.5">
            <Plus className="w-4 h-4"/> NUEVA TAREA
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto custom-scrollbar flex gap-6 pb-4">
        {kanbanColumns.map(col => {
          const columnTasks = filteredTasks.filter(t => t.status === col.id);
          const isCollapsed = collapsedColumns[col.id];

          return (
            <div 
              key={col.id} 
              draggable 
              onDragStart={(e) => handleColDragStart(e, col.id)}
              onDragOver={handleColDragOver}
              onDrop={(e) => {
                if(draggedColId) handleColDrop(e, col.id);
                else handleTaskDrop(e, col.id);
              }}
              className={`flex-shrink-0 flex flex-col bg-zinc-950/50 rounded-2xl border ${draggedTaskId ? 'border-zinc-700/80 bg-zinc-900/50' : 'border-zinc-800/50'} transition-all duration-300 ${isCollapsed ? 'w-[72px]' : 'w-[320px]'} ${draggedColId === col.id ? 'opacity-30' : ''}`}
            >
              <div className={`p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-950/90 backdrop-blur z-10 rounded-t-2xl cursor-grab active:cursor-grabbing ${isCollapsed ? 'flex-col gap-4 py-5' : ''}`}>
                {!isCollapsed && (
                  <div className="flex items-center gap-2 pointer-events-none">
                    <GripVertical className="w-4 h-4 text-zinc-600"/>
                    <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                    <h3 className="font-black text-white text-sm">{col.title}</h3>
                  </div>
                )}
                <div className={`flex items-center ${isCollapsed ? 'flex-col gap-4' : 'gap-2'}`}>
                  {!isCollapsed && <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-md font-bold">{columnTasks.length}</span>}
                  <button onClick={() => toggleColumn(col.id)} className="text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-800 p-1 rounded-md">
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
                  {!isLoading && columnTasks.map(task => renderKanbanCard(task))}
                  {!isLoading && columnTasks.length === 0 && (
                    <div className={`border-2 border-dashed rounded-xl h-24 flex items-center justify-center text-xs font-bold uppercase ${draggedTaskId ? 'border-orange-500/30 text-orange-500/50 bg-orange-500/5' : 'border-zinc-800 text-zinc-600'}`}>
                      {draggedTaskId ? 'Soltar aquí' : 'Vacío'}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

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
              
              {/* BOTONES DE EDICIÓN Y ELIMINACIÓN */}
              <div className="flex items-center gap-3">
                {isSuperUser && selectedTask.status !== 'closed' && (
                  <div className="flex gap-2 mr-2 border-r border-zinc-800 pr-4">
                    <button 
                      onClick={() => { setTaskToEdit(selectedTask); setIsCreateModalOpen(true); setSelectedTask(null); }} 
                      className="p-2 bg-zinc-800 hover:bg-blue-600 rounded-xl text-zinc-400 hover:text-white transition-colors" 
                      title="Editar Tarea"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteTask(selectedTask.id)} 
                      className="p-2 bg-zinc-800 hover:bg-red-600 rounded-xl text-zinc-400 hover:text-white transition-colors" 
                      title="Eliminar Tarea"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <button onClick={() => setSelectedTask(null)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white">
                  <X className="w-5 h-5"/>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex flex-col gap-8 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl md:col-span-2">
                  <span className="text-xs text-zinc-500 font-bold uppercase block mb-1">Equipos / Personas Asignadas</span>
                  <span className="text-white font-bold text-sm">{selectedTask.assignedArea}</span>
                </div>
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

      {isCreateModalOpen && <CreateTaskModal onClose={() => { setIsCreateModalOpen(false); setTaskToEdit(null); }} taskToEdit={taskToEdit} />}
    </div>
  );
}