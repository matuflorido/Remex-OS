import React, { useState, useEffect } from 'react';
import { X, Plus, CalendarDays, Clock, CheckSquare, Trash2, Paperclip, Repeat, Users, ShieldCheck, Edit2, Building2 } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { createTaskInDb, updateTaskInDb, subscribeToTasks } from '../services/taskService';
import { subscribeToUsers } from '../../admin/services/adminService';
import { subscribeToContacts } from '../../crm/services/crmService';

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
  
  const [assignees, setAssignees] = useState([]); // Vacío por defecto, ya no es 'Operaciones'
  const [currentAssigneeInput, setCurrentAssigneeInput] = useState('');
  const [systemUsers, setSystemUsers] = useState([]);
  
  const [crmContacts, setCrmContacts] = useState([]);
  const [associatedContactId, setAssociatedContactId] = useState('');

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
    const unsubUsers = subscribeToUsers(setSystemUsers);
    const unsubContacts = subscribeToContacts(setCrmContacts);
    let unsubTasks = () => {};
    if (isSuperUser) unsubTasks = subscribeToTasks((data) => setOpenTasks(data.filter(t => t.status !== 'closed')));
    return () => { unsubUsers(); unsubContacts(); unsubTasks(); };
  }, [isSuperUser]);

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
      setAssignees(taskToEdit.assignedEmployees || []); // Se lee array de empleados
      setAssociatedContactId(taskToEdit.associatedContactId || '');
      
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
    if (value && !assignees.includes(value)) setAssignees([...assignees, value]);
    setCurrentAssigneeInput('');
  };

  const handleRemoveAssignee = (assigneeToRemove) => setAssignees(assignees.filter(a => a !== assigneeToRemove));

  const handleAddChecklistItem = (e) => {
    e.preventDefault();
    if (newItemText.trim()) {
      setChecklistItems([...checklistItems, { title: newItemText.trim(), done: false }]);
      setNewItemText('');
    }
  };
  const handleRemoveItem = (index) => setChecklistItems(checklistItems.filter((_, i) => i !== index));

  const extractAreasFromEmployees = (employeeNames) => {
    const areas = new Set();
    employeeNames.forEach(name => {
      const emp = systemUsers.find(u => u.name === name);
      if (emp && emp.roles) emp.roles.forEach(r => areas.add(r));
      else if (emp && emp.role) areas.add(emp.role);
    });
    return Array.from(areas).join(', ') || 'Sin_Area';
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
      const relatedContact = crmContacts.find(c => c.id === associatedContactId);

      const taskPayload = {
        title: title,
        type: recurrence !== 'none' ? 'Programada' : 'Operativa',
        assignedEmployees: assignees, // Nuevo campo explícito
        assignedArea: extractAreasFromEmployees(assignees), // Mantenemos retrocompatibilidad para estadisticas
        associatedContactId: relatedContact ? relatedContact.id : null,
        associatedContactName: relatedContact ? relatedContact.name : null,
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

      if (isEditing) {
        await updateTaskInDb(taskToEdit.id, taskPayload);
      } else {
        const randomId = `TSK-${Math.floor(1000 + Math.random() * 9000)}`;
        await createTaskInDb({
          id: randomId,
          creatorArea: user?.name || 'Sistema', 
          approvedBy: [],
          history: [],
          ...taskPayload
        });
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
            {isEditing ? 'Editar Tarea' : 'Nueva Orden de Trabajo'}
          </h2>
          <button onClick={onClose} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 transition-colors"><X className="w-5 h-5"/></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-2 space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">
                  Título <span className="text-red-500">*</span>
                </label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Mantenimiento Preventivo..." className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:border-orange-500 outline-none" required />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest text-blue-500">
                  Asociar Cliente / Proveedor (Opcional)
                </label>
                <div className="relative">
                  <Building2 className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-blue-500/50"/>
                  <select value={associatedContactId} onChange={(e) => setAssociatedContactId(e.target.value)} className="w-full bg-blue-950/10 border border-blue-900/30 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none appearance-none">
                    <option value="">-- Trabajo Interno (Sin Cliente) --</option>
                    {crmContacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">
                  Instrucciones <span className="text-red-500">*</span>
                </label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe qué hay que hacer..." className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:border-orange-500 outline-none min-h-[100px] resize-none custom-scrollbar" required></textarea>
              </div>

              <div className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800">
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-3 tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4"/> Asignar a Empleado/s <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {assignees.map(a => {
                    const userObj = systemUsers.find(u => u.name === a);
                    const userRoles = userObj ? (userObj.roles ? userObj.roles.join(', ') : (userObj.role || 'Sin área')) : '';
                    return (
                      <span key={a} className="bg-orange-900/30 text-orange-400 border border-orange-500/50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                        {a} {userRoles && <span className="text-[10px] text-orange-500/70 font-normal">({userRoles})</span>}
                        <button type="button" onClick={() => handleRemoveAssignee(a)} className="hover:text-white"><X className="w-3 h-3"/></button>
                      </span>
                    );
                  })}
                  {assignees.length === 0 && <span className="text-xs text-red-400 font-bold">Debes asignar al menos a un responsable.</span>}
                </div>
                <select value={currentAssigneeInput} onChange={(e) => handleAddAssignee(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-3 text-sm text-zinc-400 outline-none">
                  <option value="">+ Seleccionar empleado...</option>
                  {systemUsers.filter(u => !assignees.includes(u.name)).map(u => {
                    const userRoles = u.roles ? u.roles.join(', ') : (u.role || 'Sin área');
                    return (
                      <option key={u.id} value={u.name}>
                        {u.name} ({userRoles})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="space-y-6 border-l border-zinc-800/50 pl-0 lg:pl-8">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest flex items-center gap-1"><Repeat className="w-3 h-3"/> Recurrencia</label>
                <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-3.5 text-sm text-white focus:border-orange-500 outline-none">
                  <option value="none">Única vez (No se repite)</option>
                  <option value="daily">Diaria</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Fecha de Inicio</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-3 text-sm text-white outline-none color-scheme-dark" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest text-zinc-600">Vencimiento (Opcional)</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-3 text-sm text-white outline-none color-scheme-dark opacity-70" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 tracking-widest">Prioridad</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-3.5 text-sm text-white outline-none">
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
            </div>
            {showChecklist && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 mb-4 w-full lg:w-1/2">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><CheckSquare className="w-4 h-4 text-orange-500"/> Checklist</h4>
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
        </div>

        <div className="px-8 py-5 flex justify-end gap-4 border-t border-zinc-800 bg-zinc-900 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading || !title.trim() || !description.trim() || assignees.length === 0} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-8 py-2.5 rounded-xl text-sm shadow-[0_0_15px_rgba(249,115,22,0.3)] flex items-center gap-2 disabled:opacity-50">
            {loading ? 'Procesando...' : (isEditing ? <><Edit2 className="w-4 h-4"/> GUARDAR CAMBIOS</> : <><Plus className="w-4 h-4"/> CREAR ORDEN</>)}
          </button>
        </div>
      </div>
    </div>
  );
}