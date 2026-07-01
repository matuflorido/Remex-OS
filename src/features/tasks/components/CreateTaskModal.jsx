import React, { useState, useEffect } from 'react';
import { X, Plus, CalendarDays, Clock, CheckSquare, Trash2, Paperclip, Repeat, Users, ShieldCheck, Edit2 } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { createTaskInDb, updateTaskInDb, subscribeToTasks } from '../services/taskService';

// NUEVO: Agregado prop taskToEdit
export default function CreateTaskModal({ onClose, taskToEdit = null }) {
  const { user } = useAuthStore();
  const isEditing = !!taskToEdit;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [recurrence, setRecurrence] = useState('none');

  const [assignees, setAssignees] = useState(['Operaciones']);
  const [currentAssigneeInput, setCurrentAssigneeInput] = useState('');
  const availableAssignees = ['Operaciones', 'Ventas', 'Administración', 'Marketing', 'Gerencia'];

  const [showChecklist, setShowChecklist] = useState(false);
  const [checklistItems, setChecklistItems] = useState([]);
  const [newItemText, setNewItemText] = useState('');
  const [hasAttachment, setHasAttachment] = useState(false);
  const [loading, setLoading] = useState(false);

  const [isBlocked, setIsBlocked] = useState(false);
  const [selectedDependency, setSelectedDependency] = useState('');
  const [requireJointApproval, setRequireJointApproval] = useState(false);
  const [openTasks, setOpenTasks] = useState([]);

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const isSuperUser = userRoles.includes('Super_Usuario');

  useEffect(() => {
    if (isSuperUser) {
      const unsubscribe = subscribeToTasks((data) => {
        setOpenTasks(data.filter(t => t.status !== 'closed'));
      });
      return () => unsubscribe();
    }
  }, [isSuperUser]);

  // NUEVO: Cargar los datos si estamos editando
  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      
      const textBlock = taskToEdit.blocks?.find(b => b.type === 'text');
      setDescription(textBlock ? textBlock.content : '');
      
      setPriority(taskToEdit.priority || 'normal');
      setStartDate(taskToEdit.startDate || new Date().toISOString().split('T')[0]);
      setDueDate(taskToEdit.dueDate || '');
      setEstimatedTime(taskToEdit.estimatedTime || '');
      setRecurrence(taskToEdit.recurrence || 'none');
      
      setAssignees(taskToEdit.assignedArea ? taskToEdit.assignedArea.split(',').map(a => a.trim()) : []);
      
      const checklistBlock = taskToEdit.blocks?.find(b => b.type === 'checklist');
      if (checklistBlock) {
        setShowChecklist(true);
        setChecklistItems(checklistBlock.items || []);
      }
      
      setRequireJointApproval(taskToEdit.requireJointApproval || false);
      if (taskToEdit.dependencies && taskToEdit.dependencies.length > 0) {
        setIsBlocked(true);
        setSelectedDependency(taskToEdit.dependencies[0]);
      }
    }
  }, [taskToEdit]);

  const handleAddAssignee = (value) => {
    if (value && !assignees.includes(value)) {
      setAssignees([...assignees, value]);
    }
    setCurrentAssigneeInput('');
  };

  const handleRemoveAssignee = (assigneeToRemove) => {
    setAssignees(assignees.filter(a => a !== assigneeToRemove));
  };

  const handleAddChecklistItem = (e) => {
    e.preventDefault();
    if (newItemText.trim()) {
      setChecklistItems([...checklistItems, { title: newItemText.trim(), done: false }]);
      setNewItemText('');
    }
  };

  const handleRemoveItem = (index) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || assignees.length === 0) return;
    setLoading(true);

    try {
      const taskBlocks = [{ type: 'text', content: description }];
      
      if (checklistItems.length > 0) taskBlocks.push({ type: 'checklist', items: checklistItems });
      if (hasAttachment) taskBlocks.push({ type: 'attachment', name: 'archivo_adjunto.pdf', size: '1.2 MB', format: 'PDF' });
      
      const finalStatus = (isBlocked && selectedDependency) ? 'blocked' : (taskToEdit ? taskToEdit.status : 'open');
      const finalDependencies = (isBlocked && selectedDependency) ? [selectedDependency] : [];

      if (isEditing) {
        // Enviar actualización
        const updatedTask = {
          title: title,
          type: recurrence !== 'none' ? 'Programada' : 'Operativa',
          assignedArea: assignees.join(', '),
          status: finalStatus,
          priority: priority,
          startDate: startDate,
          dueDate: dueDate || null,
          estimatedTime: estimatedTime,
          recurrence: recurrence,
          blocks: taskBlocks,
          dependencies: finalDependencies,
          requireJointApproval: isSuperUser ? requireJointApproval : false,
        };
        await updateTaskInDb(taskToEdit.id, updatedTask);
      } else {
        // Crear nueva tarea
        const randomId = `TSK-${Math.floor(1000 + Math.random() * 9000)}`;
        const newTask = {
          id: randomId,
          title: title,
          type: recurrence !== 'none' ? 'Programada' : 'Operativa',
          creatorArea: userRoles.join(', ') || 'Sin_Area', 
          assignedArea: assignees.join(', '),
          status: finalStatus,
          priority: priority,
          startDate: startDate,
          dueDate: dueDate || null,
          estimatedTime: estimatedTime,
          recurrence: recurrence,
          blocks: taskBlocks,
          dependencies: finalDependencies,
          requireJointApproval: isSuperUser ? requireJointApproval : false,
          approvedBy: [],
          history: []
        };
        await createTaskInDb(newTask);
      }
      
      onClose();
    } catch (error) {
      console.error("Error al guardar la tarea:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex justify-center items-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 shrink-0">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            {isEditing ? <Edit2 className="w-5 h-5 text-orange-500"/> : <Plus className="w-5 h-5 text-orange-500"/>} 
            {isEditing ? 'Editar Tarea' : 'Nueva Tarea o Rutina'}
          </h2>
          <button onClick={onClose} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-2 space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">
                  Título <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Revisión de stock mensual..."
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:border-orange-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">
                  Detalles <span className="text-red-500">*</span>
                </label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe qué hay que hacer..."
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:border-orange-500 outline-none min-h-[120px] resize-none custom-scrollbar"
                  required
                ></textarea>
              </div>

              <div className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800">
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-3 tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4"/> Derivar a (Áreas o Personas) <span className="text-red-500">*</span>
                </label>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {assignees.map(a => (
                    <span key={a} className="bg-orange-900/30 text-orange-400 border border-orange-500/50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                      {a} <button type="button" onClick={() => handleRemoveAssignee(a)} className="hover:text-white"><X className="w-3 h-3"/></button>
                    </span>
                  ))}
                  {assignees.length === 0 && <span className="text-xs text-red-400 font-bold">Debes asignar al menos uno.</span>}
                </div>

                <div className="flex gap-2">
                  <select 
                    value={currentAssigneeInput}
                    onChange={(e) => handleAddAssignee(e.target.value)}
                    className="flex-1 bg-black border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-400 outline-none"
                  >
                    <option value="">+ Seleccionar área o persona...</option>
                    {availableAssignees.filter(a => !assignees.includes(a)).map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            <div className="space-y-6 border-l border-zinc-800/50 pl-0 lg:pl-8">
              
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest flex items-center gap-1">
                  <Repeat className="w-3 h-3"/> Recurrencia
                </label>
                <select 
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-3.5 text-sm text-white focus:border-orange-500 outline-none"
                >
                  <option value="none">Única vez (No se repite)</option>
                  <option value="daily">Diaria</option>
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quincenal</option>
                  <option value="monthly">Mensual</option>
                  <option value="bimonthly">Bimestral</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="biannually">Semestral</option>
                  <option value="annually">Anual</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">
                  Fecha de Inicio <span className="text-red-500">*</span>
                </label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-3 text-sm text-white outline-none color-scheme-dark"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest text-zinc-600">
                  Vencimiento Límite (Opcional)
                </label>
                <input 
                  type="date" 
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-3 text-sm text-white outline-none color-scheme-dark opacity-70"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Prioridad</label>
                <select 
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-3.5 text-sm text-white outline-none"
                >
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="critical">Crítica</option>
                </select>
              </div>

            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-zinc-800">
            <div className="flex gap-4 mb-4">
              <button type="button" onClick={() => setShowChecklist(!showChecklist)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${showChecklist ? 'bg-orange-900/20 text-orange-400 border-orange-500/50' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'}`}>
                <CheckSquare className="w-4 h-4"/> Añadir Sub-tareas
              </button>
              <button type="button" onClick={() => setHasAttachment(!hasAttachment)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${hasAttachment ? 'bg-teal-900/20 text-teal-400 border-teal-500/50' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'}`}>
                <Paperclip className="w-4 h-4"/> {hasAttachment ? 'Adjunto Simulado ON' : 'Simular Adjunto'}
              </button>
            </div>

            {showChecklist && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 mb-4 w-full lg:w-1/2">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-orange-500"/> Checklist
                </h4>
                <div className="space-y-2 mb-4">
                  {checklistItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 bg-black border border-zinc-800 px-4 py-2.5 rounded-xl group">
                      <div className="w-4 h-4 rounded border border-zinc-700 shrink-0"></div>
                      <span className="text-sm text-zinc-300 flex-1">{item.title}</span>
                      <button type="button" onClick={() => handleRemoveItem(index)} className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newItemText} onChange={(e) => setNewItemText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem(e)} placeholder="Nueva sub-tarea..." className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none"/>
                  <button type="button" onClick={handleAddChecklistItem} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 rounded-xl font-bold">Añadir</button>
                </div>
              </div>
            )}
          </div>

          {isSuperUser && (
            <div className="pt-6 mt-6 border-t border-zinc-800">
               <div className="bg-red-950/10 border border-red-900/50 p-5 rounded-2xl">
                 <h4 className="text-red-500 font-black flex items-center gap-2 mb-4 text-sm uppercase tracking-wide">
                   <ShieldCheck className="w-5 h-5"/> Privilegios de Super Administrador
                 </h4>
                 
                 <div className="space-y-5">
                   <div>
                     <label className="flex items-center gap-3 cursor-pointer group mb-2 w-fit">
                       <input 
                         type="checkbox" 
                         checked={isBlocked} 
                         onChange={(e) => setIsBlocked(e.target.checked)} 
                         className="w-5 h-5 accent-red-500 bg-zinc-900 border-zinc-700 rounded"
                       />
                       <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">
                         Crear como TAREA BLOQUEADA (Requiere que se cierre otra tarea antes)
                       </span>
                     </label>
                     
                     {isBlocked && (
                       <div className="pl-8 mt-2">
                         <select 
                           value={selectedDependency}
                           onChange={(e) => setSelectedDependency(e.target.value)}
                           className="w-full bg-black border border-red-900/50 rounded-xl px-4 py-3 text-sm text-white focus:border-red-500 outline-none"
                         >
                           <option value="">-- Seleccionar tarea bloqueante --</option>
                           {openTasks.map(t => (
                             <option key={t.id} value={t.id}>{t.id} - {t.title}</option>
                           ))}
                         </select>
                       </div>
                     )}
                   </div>

                   <div className="pt-4 border-t border-red-900/30">
                     <label className="flex items-center gap-3 cursor-pointer group w-fit">
                       <input 
                         type="checkbox" 
                         checked={requireJointApproval} 
                         onChange={(e) => setRequireJointApproval(e.target.checked)} 
                         className="w-5 h-5 accent-orange-500 bg-zinc-900 border-zinc-700 rounded"
                       />
                       <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">
                         Requerir FIRMA CONJUNTA (Todas las áreas asignadas deben dar el OK para cerrar)
                       </span>
                     </label>
                   </div>
                 </div>
               </div>
            </div>
          )}

        </div>

        <div className="px-8 py-5 flex justify-end gap-4 border-t border-zinc-800 bg-zinc-900 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading || !title.trim() || !description.trim() || assignees.length === 0 || (isBlocked && !selectedDependency)} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-8 py-2.5 rounded-xl text-sm shadow-[0_0_15px_rgba(249,115,22,0.3)] flex items-center gap-2 disabled:opacity-50">
            {loading ? 'Procesando...' : (isEditing ? <><Edit2 className="w-4 h-4"/> GUARDAR CAMBIOS</> : <><Plus className="w-4 h-4"/> CREAR TAREA</>)}
          </button>
        </div>

      </div>
    </div>
  );
}