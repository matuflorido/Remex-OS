import React, { useState, useEffect } from 'react';
import { Users, Shield, Plus, Edit2, UserX, UserCheck, Search, Activity, Mail } from 'lucide-react';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import CreateUserModal from './CreateUserModal';
import { useAuthStore } from '../../../store/useAuthStore';

export default function AdminPanel() {
  const { user } = useAuthStore();
  const [usersList, setUsersList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Solo el Super Usuario puede ver esto
  const isSuperUser = user?.roles?.includes('Super_Usuario') || user?.role === 'Super_Usuario';

  useEffect(() => {
    if (!isSuperUser) return;

    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsersList(usersData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isSuperUser]);

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { isActive: !currentStatus });
    } catch (error) {
      console.error("Error cambiando estado del usuario:", error);
    }
  };

  const handleEditClick = (u) => {
    setUserToEdit(u);
    setIsModalOpen(true);
  };

  const handleCreateClick = () => {
    setUserToEdit(null);
    setIsModalOpen(true);
  };

  const filteredUsers = usersList.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.roles && u.roles.join(', ').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isSuperUser) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center bg-zinc-950">
        <div className="text-center bg-red-950/20 border border-red-900/50 p-8 rounded-3xl max-w-md">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">Acceso Denegado</h2>
          <p className="text-zinc-400 text-sm">Esta sección es exclusiva para el Super Usuario.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar bg-zinc-950 flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-orange-500" />
            Centro de Administración
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Gestión de usuarios, roles y accesos al sistema.</p>
        </div>
        <button 
          onClick={handleCreateClick}
          className="bg-orange-600 hover:bg-orange-500 text-black font-black px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition-all hover:scale-105 shadow-[0_0_20px_rgba(249,115,22,0.2)]"
        >
          <Plus className="w-5 h-5"/> NUEVO USUARIO
        </button>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 mb-6 flex items-center gap-3 backdrop-blur-sm">
        <Search className="w-5 h-5 text-zinc-500" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nombre, correo o área..." 
          className="flex-1 bg-transparent border-none text-white text-sm outline-none placeholder-zinc-600 font-mono"
        />
      </div>

      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950/50 border-b border-zinc-800">
                <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Usuario</th>
                <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Correo</th>
                <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Áreas Asignadas</th>
                <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Estado</th>
                <th className="p-4 text-xs font-black text-zinc-500 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-zinc-500 font-bold">Cargando usuarios...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-zinc-500 font-bold">No se encontraron usuarios.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 font-black">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-white text-sm group-hover:text-orange-400 transition-colors">{u.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-zinc-400 text-sm">
                        <Mail className="w-4 h-4 text-zinc-600"/> {u.email}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {u.roles ? u.roles.map(role => (
                          <span key={role} className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md border ${role === 'Super_Usuario' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                            {role}
                          </span>
                        )) : (
                          <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-md border bg-zinc-800 text-zinc-300 border-zinc-700">
                            {u.role || 'Sin área'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`flex items-center gap-1.5 text-xs font-bold w-fit px-2 py-1 rounded-md ${u.isActive !== false ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                        <Activity className="w-3 h-3"/> {u.isActive !== false ? 'ACTIVO' : 'SUSPENDIDO'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditClick(u)}
                          className="p-2 bg-zinc-800 hover:bg-blue-600 text-zinc-400 hover:text-white rounded-lg transition-colors"
                          title="Editar Usuario"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        
                        <button 
                          onClick={() => toggleUserStatus(u.id, u.isActive !== false)}
                          className={`p-2 rounded-lg transition-colors ${u.isActive !== false ? 'bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white' : 'bg-red-950 border border-red-900 text-red-500 hover:bg-emerald-600 hover:text-white'}`}
                          title={u.isActive !== false ? 'Suspender Usuario' : 'Activar Usuario'}
                        >
                          {u.isActive !== false ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <CreateUserModal 
          onClose={() => setIsModalOpen(false)} 
          userToEdit={userToEdit}
        />
      )}
    </div>
  );
}