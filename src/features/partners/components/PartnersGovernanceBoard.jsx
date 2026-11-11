import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  ShieldCheck,
  Lock,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Send,
  Sparkles,
  FileText,
  Edit2,
  Trash2,
  Search,
  Filter,
  Check,
  X,
  AlertTriangle,
  Award,
  Users,
  RefreshCw,
  Download,
  ArrowLeft
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import useUIStore from '../../../store/useUIStore';
import {
  PARTNERS_LIST,
  PROPOSAL_CATEGORIES,
  PROPOSAL_SCOPES,
  canAccessPartnersSection,
  detectPartnerFromUser,
  evaluateProposalConsensus,
  subscribeToPartnerProposals,
  createPartnerProposal,
  castPartnerVote,
  addPartnerProposalComment,
  updatePartnerProposalContent,
  deletePartnerProposalInDb
} from '../services/partnerGovernanceService';

export default function PartnersGovernanceBoard() {
  const { user } = useAuthStore();
  const { setCurrentView } = useUIStore();

  const hasAccess = useMemo(() => canAccessPartnersSection(user), [user]);
  const detectedPartner = useMemo(() => detectPartnerFromUser(user), [user]);

  // Socio activo con el que opera en la sesión (se detecta automático por usuario o se recuerda en localStorage)
  const [activePartnerId, setActivePartnerId] = useState(() => {
    const saved = localStorage.getItem('remex_active_partner_id');
    if (saved && PARTNERS_LIST.some((p) => p.id === saved)) return saved;
    return 'martin';
  });

  useEffect(() => {
    if (detectedPartner?.id) {
      setActivePartnerId(detectedPartner.id);
      localStorage.setItem('remex_active_partner_id', detectedPartner.id);
    }
  }, [detectedPartner]);

  const handleSelectActivePartner = (partnerId) => {
    setActivePartnerId(partnerId);
    localStorage.setItem('remex_active_partner_id', partnerId);
  };

  const activePartner = useMemo(
    () => PARTNERS_LIST.find((p) => p.id === activePartnerId) || PARTNERS_LIST[0],
    [activePartnerId]
  );

  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'firme' | 'en_votacion' | 'my_pending' | 'rechazada'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de Nueva / Editar Propuesta
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('norma_operativa');
  const [formScope, setFormScope] = useState(PROPOSAL_SCOPES[0]);
  const [formAutoApprove, setFormAutoApprove] = useState(true);
  const [formResetVotes, setFormResetVotes] = useState(true);
  const [isSavingProposal, setIsSavingProposal] = useState(false);

  // Estado para votar con nota/motivo en una propuesta específica
  const [voteDraft, setVoteDraft] = useState(null); // { proposalId, partnerId, voteStatus, note }
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);

  // Comentarios por propuesta
  const [commentInputs, setCommentInputs] = useState({});
  const [sendingCommentId, setSendingCommentId] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    if (!hasAccess) return;
    const unsub = subscribeToPartnerProposals((data) => {
      setProposals(data);
      setIsLoading(false);
    });
    return () => unsub();
  }, [hasAccess]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4500);
  };

  // Enriquecer cada propuesta con su cálculo de consenso 3/3 y número de regla firme
  const enrichedProposals = useMemo(() => {
    // Numerar cronológicamente las reglas firmes (#REG-001, #REG-002...)
    const firmSortedOldestFirst = [...proposals]
      .filter((p) => evaluateProposalConsensus(p.votes).isUnanimousRule)
      .sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));

    const ruleNumberMap = {};
    firmSortedOldestFirst.forEach((p, idx) => {
      ruleNumberMap[p.id] = `REG-${String(idx + 1).padStart(3, '0')}`;
    });

    return proposals.map((p) => {
      const consensus = evaluateProposalConsensus(p.votes);
      return {
        ...p,
        consensus,
        ruleCode: ruleNumberMap[p.id] || null
      };
    });
  }, [proposals]);

  const stats = useMemo(() => {
    const total = enrichedProposals.length;
    const firmRules = enrichedProposals.filter((p) => p.consensus.overallStatus === 'firme').length;
    const inVoting = enrichedProposals.filter((p) => p.consensus.overallStatus === 'en_votacion').length;
    const rejected = enrichedProposals.filter((p) => p.consensus.overallStatus === 'rechazada').length;
    const pendingMyVote = enrichedProposals.filter(
      (p) => (p.votes?.[activePartner.id]?.status || 'pending') === 'pending'
    ).length;
    return { total, firmRules, inVoting, rejected, pendingMyVote };
  }, [enrichedProposals, activePartner.id]);

  const filteredProposals = useMemo(() => {
    return enrichedProposals.filter((p) => {
      if (activeTab === 'firme' && p.consensus.overallStatus !== 'firme') return false;
      if (activeTab === 'en_votacion' && p.consensus.overallStatus !== 'en_votacion') return false;
      if (activeTab === 'rechazada' && p.consensus.overallStatus !== 'rechazada') return false;
      if (
        activeTab === 'my_pending' &&
        (p.votes?.[activePartner.id]?.status || 'pending') !== 'pending'
      ) {
        return false;
      }
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${p.title || ''} ${p.description || ''} ${p.authorPartnerName || ''} ${p.scope || ''} ${p.ruleCode || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [enrichedProposals, activeTab, categoryFilter, searchQuery, activePartner.id]);

  const handleOpenNewModal = () => {
    setEditingProposal(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory('norma_operativa');
    setFormScope(PROPOSAL_SCOPES[0]);
    setFormAutoApprove(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (proposal) => {
    setEditingProposal(proposal);
    setFormTitle(proposal.title || '');
    setFormDescription(proposal.description || '');
    setFormCategory(proposal.category || 'norma_operativa');
    setFormScope(proposal.scope || PROPOSAL_SCOPES[0]);
    setFormResetVotes(proposal.consensus?.overallStatus === 'rechazada');
    setIsModalOpen(true);
  };

  const handleSaveProposal = async (e) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) return;
    setIsSavingProposal(true);
    try {
      if (editingProposal) {
        await updatePartnerProposalContent({
          proposal: editingProposal,
          title: formTitle,
          description: formDescription,
          category: formCategory,
          scope: formScope,
          editorPartnerId: activePartner.id,
          editorPartnerName: activePartner.name,
          resetVotesOnEdit: formResetVotes
        });
        showToast(`✅ Propuesta actualizada por ${activePartner.name}`);
      } else {
        await createPartnerProposal({
          title: formTitle,
          description: formDescription,
          category: formCategory,
          scope: formScope,
          authorPartnerId: activePartner.id,
          authorPartnerName: activePartner.name,
          autoApproveByAuthor: formAutoApprove
        });
        showToast(`⚖️ Nueva propuesta publicada por ${activePartner.name}. Esperando unanimidad (3/3).`);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error guardando propuesta:', err);
    } finally {
      setIsSavingProposal(false);
    }
  };

  const handleQuickApprove = async (proposal, partnerObj) => {
    setIsSubmittingVote(true);
    try {
      await castPartnerVote({
        proposal,
        partnerId: partnerObj.id,
        partnerName: partnerObj.name,
        voteStatus: 'approved',
        note: voteDraft?.proposalId === proposal.id ? voteDraft.note : ''
      });
      setVoteDraft(null);
      showToast(`✅ Voto de APROBACIÓN registrado por ${partnerObj.name}`);
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const handleConfirmVoteDraft = async (e) => {
    e.preventDefault();
    if (!voteDraft) return;
    const proposal = proposals.find((p) => p.id === voteDraft.proposalId);
    const partnerObj = PARTNERS_LIST.find((p) => p.id === voteDraft.partnerId) || activePartner;
    if (!proposal) return;

    setIsSubmittingVote(true);
    try {
      await castPartnerVote({
        proposal,
        partnerId: partnerObj.id,
        partnerName: partnerObj.name,
        voteStatus: voteDraft.voteStatus,
        note: voteDraft.note || ''
      });
      setVoteDraft(null);
      showToast(
        voteDraft.voteStatus === 'approved'
          ? `✅ Aprobación registrada por ${partnerObj.name}`
          : `⛔ Rechazo / Observación registrada por ${partnerObj.name}`
      );
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const handleSendComment = async (proposal) => {
    const text = (commentInputs[proposal.id] || '').trim();
    if (!text) return;
    setSendingCommentId(proposal.id);
    try {
      await addPartnerProposalComment({
        proposal,
        partnerId: activePartner.id,
        partnerName: activePartner.name,
        text
      });
      setCommentInputs((prev) => ({ ...prev, [proposal.id]: '' }));
      showToast(`💬 Comentario de ${activePartner.name} agregado`);
    } finally {
      setSendingCommentId(null);
    }
  };

  const handleDeleteProposal = async (proposal) => {
    if (
      window.confirm(
        `¿Seguro que deseas eliminar la propuesta "${proposal.title}"? Esta acción no se puede deshacer.`
      )
    ) {
      await deletePartnerProposalInDb(proposal.id);
      showToast('🗑️ Propuesta eliminada');
    }
  };

  const handleExportFirmRules = () => {
    const firmRules = enrichedProposals.filter((p) => p.consensus.overallStatus === 'firme');
    const lines = [
      '====================================================================',
      'ESTATUTO DE REGLAS Y NORMAS FIRMES — DIRECTORIO DE SOCIOS REMEX OS',
      'Aprobadas por Unanimidad (3/3): Martín • Alejandro • Juan Pablo',
      `Fecha de emisión: ${new Date().toLocaleDateString('es-AR')}`,
      '====================================================================',
      ''
    ];
    if (firmRules.length === 0) {
      lines.push('Aún no hay reglas firmes aprobadas por los 3 socios.');
    } else {
      firmRules.forEach((r) => {
        lines.push(`[${r.ruleCode || r.id}] ${r.title.toUpperCase()}`);
        lines.push(`Categoría: ${PROPOSAL_CATEGORIES.find((c) => c.id === r.category)?.label || r.category}`);
        lines.push(`Alcance: ${r.scope || 'General'} | Propuesta por: ${r.authorPartnerName}`);
        lines.push(`Fecha de Vigencia Firme (3/3): ${r.approvedRuleAtLabel || r.updatedAtLabel}`);
        lines.push(`Norma / Regla:\n${r.description}`);
        lines.push(
          `Firmas Conformes: Martín (${r.votes?.martin?.updatedAt || 'OK'}) | Alejandro (${r.votes?.alejandro?.updatedAt || 'OK'}) | Juan Pablo (${r.votes?.juan_pablo?.updatedAt || 'OK'})`
        );
        lines.push('--------------------------------------------------------------------');
        lines.push('');
      });
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reglas_Firmes_Socios_RemexOS_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!hasAccess) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center bg-zinc-950">
        <div className="text-center bg-red-950/20 border border-red-900/50 p-8 rounded-3xl max-w-md space-y-4">
          <Lock className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-2xl font-black text-white">Sala Exclusiva de Socios</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Esta sección es de acceso estrictamente confidencial y exclusivo para los 3 socios directores (<b>Martín, Alejandro y Juan Pablo</b>).
          </p>
          <button
            onClick={() => setCurrentView('tasks')}
            className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 text-orange-500" />
            Volver al Motor de Tareas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar bg-zinc-950 flex flex-col h-full">
      {/* NOTIFICACIÓN FLOTANTE */}
      {toastMsg && (
        <div className="mb-4 p-3.5 px-5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-black flex items-center justify-between shadow-lg shrink-0">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg('')} className="underline ml-4">
            Cerrar
          </button>
        </div>
      )}

      {/* CABECERA EJECUTIVA DEL DIRECTORIO DE SOCIOS */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-amber-950/30 border border-amber-500/40 rounded-3xl p-4 lg:p-5 mb-5 shrink-0 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCurrentView('tasks')}
                className="px-3 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-black flex items-center gap-1.5 transition-colors whitespace-nowrap"
                title="Volver al tablero sin salir del sistema"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-orange-500" />
                Volver
              </button>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-black uppercase tracking-widest text-amber-300 whitespace-nowrap"
                title="Espacio privado exclusivo de Martín, Alejandro y Juan Pablo"
              >
                <Lock className="w-3 h-3" /> SOCIOS • UNANIMIDAD 3/3
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-orange-300 border border-orange-500/30 cursor-help whitespace-nowrap"
                title="Espacio privado de Martín, Alejandro y Juan Pablo para exponer ideas o nuevas normas operativas. Para que una propuesta quede efectiva como Regla Firme debe contar con la aprobación unánime de los 3 socios (3/3). Todos pueden acordar, rechazar/observar y debatir con comentarios."
              >
                ⓘ Cómo funciona el voto 3/3
              </span>
            </div>

            <h2 className="text-lg lg:text-2xl font-black text-white flex items-center gap-2.5 pt-0.5">
              <Scale className="w-6 h-6 text-amber-400 shrink-0" />
              <span className="truncate">Directorio de Socios: Ideas, Normas y Reglas Firmes</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Selector de Identidad del Socio Activo (Martín / Alejandro / Juan Pablo) */}
            <div
              className="bg-black/60 border border-zinc-800 rounded-2xl p-2 flex flex-wrap items-center gap-1.5"
              title="Selecciona con cuál de los 3 socios estás operando y firmando tus votos o comentarios"
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 px-1.5 whitespace-nowrap">
                Socio:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PARTNERS_LIST.map((p) => {
                  const isSelected = activePartner.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectActivePartner(p.id)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all border whitespace-nowrap ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${
                          isSelected ? 'bg-black text-amber-400' : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {p.name.charAt(0)}
                      </span>
                      <span>{p.name}</span>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportFirmRules}
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
              title="Descargar documento con todas las Reglas Firmes aprobadas por unanimidad 3/3"
            >
              <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Estatuto</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewModal}
              className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all whitespace-nowrap"
              title="Exponer una nueva idea, norma operativa o regla para someter a votación de los 3 socios"
            >
              <Plus className="w-4 h-4 stroke-[3] shrink-0" />
              <span>Nueva Idea / Regla ({activePartner.name})</span>
            </button>
          </div>
        </div>

        {/* TARJETAS KPI DEL DIRECTORIO */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5 border-t border-zinc-800/80">
          <div
            onClick={() => setActiveTab('firme')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              activeTab === 'firme'
                ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                : 'bg-black/40 border-zinc-800 hover:border-emerald-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                🏛️ Reglas Firmes (3/3)
              </span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">{stats.firmRules}</div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Aprobadas por Martín, Alejandro y Juan Pablo
            </p>
          </div>

          <div
            onClick={() => setActiveTab('en_votacion')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              activeTab === 'en_votacion'
                ? 'bg-amber-950/40 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                : 'bg-black/40 border-zinc-800 hover:border-amber-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                ⏳ En Votación Activa
              </span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">{stats.inVoting}</div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Aguardando completar las 3 firmas
            </p>
          </div>

          <div
            onClick={() => setActiveTab('my_pending')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              activeTab === 'my_pending'
                ? 'bg-orange-950/40 border-orange-500/60 shadow-[0_0_20px_rgba(249,115,22,0.15)]'
                : 'bg-black/40 border-zinc-800 hover:border-orange-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">
                ✋ Tu Voto Pendiente ({activePartner.name})
              </span>
              <Scale className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">{stats.pendingMyVote}</div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Propuestas que requieren tu definición
            </p>
          </div>

          <div
            onClick={() => setActiveTab('rechazada')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              activeTab === 'rechazada'
                ? 'bg-rose-950/40 border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                : 'bg-black/40 border-zinc-800 hover:border-rose-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                ⛔ Observadas / Rechazadas
              </span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">{stats.rejected}</div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Con objeciones para revisar o debatir
            </p>
          </div>
        </div>
      </div>

      {/* BARRA DE PESTAÑAS Y BUSCADOR */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-6 bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-2xl shrink-0">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: `Todas (${stats.total})` },
            { id: 'firme', label: `🏛️ Reglas Firmes Vigentes (${stats.firmRules})` },
            { id: 'en_votacion', label: `⏳ En Votación (${stats.inVoting})` },
            { id: 'my_pending', label: `✋ Falta Voto de ${activePartner.name} (${stats.pendingMyVote})` },
            { id: 'rechazada', label: `⛔ Observadas / Rechazadas (${stats.rejected})` }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === t.id
                  ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-zinc-200 outline-none focus:border-amber-500"
          >
            <option value="all">Todas las categorías</option>
            {PROPOSAL_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar regla, idea o socio..."
              className="w-full bg-black border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* LISTADO DE PROPUESTAS Y REGLAS FIRMES */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-zinc-500">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-400 mb-3" />
          <p className="text-sm font-bold">Sincronizando Libro de Socios en tiempo real...</p>
        </div>
      ) : filteredProposals.length === 0 ? (
        <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-auto">
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mb-4">
            <Scale className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-black text-white">
            {activeTab === 'firme'
              ? 'Aún no hay Reglas Firmes aprobadas por los 3 socios'
              : 'No hay propuestas o normas en esta vista'}
          </h3>
          <p className="text-xs text-zinc-400 mt-2 max-w-md leading-relaxed">
            Cualquiera de los 3 socios (<b>Martín, Alejandro o Juan Pablo</b>) puede exponer aquí una nueva idea, pauta comercial o norma operativa. Al recibir los 3 votos a favor, queda firme automáticamente como regla.
          </p>
          <button
            type="button"
            onClick={handleOpenNewModal}
            className="mt-5 bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black px-5 py-3 rounded-xl text-xs flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Exponer Primera Idea o Norma ({activePartner.name})
          </button>
        </div>
      ) : (
        <div className="space-y-6 pb-10">
          {filteredProposals.map((prop) => {
            const catObj =
              PROPOSAL_CATEGORIES.find((c) => c.id === prop.category) || PROPOSAL_CATEGORIES[0];
            const { consensus } = prop;
            const myCurrentVote = prop.votes?.[activePartner.id]?.status || 'pending';

            return (
              <div
                key={prop.id}
                className={`rounded-3xl border transition-all overflow-hidden shadow-xl ${
                  consensus.overallStatus === 'firme'
                    ? 'bg-gradient-to-br from-emerald-950/25 via-zinc-900 to-zinc-950 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)]'
                    : consensus.overallStatus === 'rechazada'
                    ? 'bg-gradient-to-br from-rose-950/20 via-zinc-900 to-zinc-950 border-rose-500/40'
                    : 'bg-zinc-900/95 border-zinc-800 hover:border-amber-500/40'
                }`}
              >
                {/* FRANJA SUPERIOR DE ESTADO (FIRME 3/3 vs EN VOTACIÓN vs OBSERVADA) */}
                <div
                  className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-2 text-xs font-black ${
                    consensus.overallStatus === 'firme'
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                      : consensus.overallStatus === 'rechazada'
                      ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {consensus.overallStatus === 'firme' ? (
                      <>
                        <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          🏛️ REGLA FIRME Y VIGENTE ({prop.ruleCode || prop.id}) — APROBADA POR UNANIMIDAD (3/3 SOCIOS)
                        </span>
                      </>
                    ) : consensus.overallStatus === 'rechazada' ? (
                      <>
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>
                          ⛔ PROPUESTA OBSERVADA / RECHAZADA POR: {consensus.rejectedByNames.join(', ').toUpperCase()} ({consensus.approvedCount}/3 Aprobaciones)
                        </span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          ⏳ EN VOTACIÓN ({consensus.approvedCount}/3 APROBACIONES) • FALTA FIRMA DE:{' '}
                          {consensus.pendingNames.join(' y ').toUpperCase()}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-400">
                    <span>ID: {prop.ruleCode || prop.id}</span>
                    <span>•</span>
                    <span>Creada: {prop.createdAtLabel}</span>
                    {prop.approvedRuleAtLabel && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-300 font-black">
                          Firme desde: {prop.approvedRuleAtLabel}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* CABECERA Y CUERPO DE LA PROPUESTA / REGLA */}
                  <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                    <div className="space-y-2.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black border ${catObj.badge}`}>
                          {catObj.label}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                          📍 Alcance: {prop.scope || 'General'}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-950 text-amber-300 border border-zinc-800">
                          👤 Expuesta por: <b>{prop.authorPartnerName}</b>
                        </span>
                      </div>

                      <h3 className="text-xl font-black text-white leading-snug">{prop.title}</h3>

                      <div className="bg-black/50 border border-zinc-800/90 rounded-2xl p-4 text-sm text-zinc-200 whitespace-pre-line leading-relaxed">
                        {prop.description}
                      </div>
                    </div>

                    {/* Botones de Edición / Borrado */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(prop)}
                        className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-zinc-700 transition-colors"
                        title="Editar o reformular propuesta"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                        Reformular / Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProposal(prop)}
                        className="p-2 rounded-xl bg-zinc-900 hover:bg-red-950/60 text-zinc-500 hover:text-red-400 border border-zinc-800 transition-colors"
                        title="Eliminar propuesta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* TABLERO DE LAS 3 FIRMAS NOMINALES (MARTÍN • ALEJANDRO • JUAN PABLO) */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        Estado de Votación Nominal (Requiere 3 de 3 para Regla Firme)
                      </h4>

                      {/* Botones de Acción Rápida para el Socio Activo */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-zinc-400 font-bold mr-1">
                          Votar como <strong className="text-amber-300">{activePartner.name}</strong>:
                        </span>
                        <button
                          type="button"
                          disabled={isSubmittingVote}
                          onClick={() => handleQuickApprove(prop, activePartner)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all border ${
                            myCurrentVote === 'approved'
                              ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                              : 'bg-emerald-950/50 hover:bg-emerald-500 hover:text-black text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {myCurrentVote === 'approved' ? 'Ya Aprobaste (Acordado)' : 'Acordar / Aprobar'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setVoteDraft({
                              proposalId: prop.id,
                              partnerId: activePartner.id,
                              voteStatus: 'rejected',
                              note: prop.votes?.[activePartner.id]?.note || ''
                            })
                          }
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all border ${
                            myCurrentVote === 'rejected'
                              ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                              : 'bg-rose-950/40 hover:bg-rose-600 hover:text-white text-rose-300 border-rose-500/40'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          {myCurrentVote === 'rejected' ? 'Rechazada (Editar motivo)' : 'Rechazar / Observar'}
                        </button>
                      </div>
                    </div>

                    {/* Cuadro emergente para dejar motivo al Rechazar / Observar (o nota de voto) */}
                    {voteDraft && voteDraft.proposalId === prop.id && (
                      <form
                        onSubmit={handleConfirmVoteDraft}
                        className="p-4 rounded-2xl bg-zinc-950 border border-amber-500/50 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-white">
                            {voteDraft.voteStatus === 'rejected'
                              ? `⛔ Dejar motivo de rechazo u observación (${PARTNERS_LIST.find((p) => p.id === voteDraft.partnerId)?.name}):`
                              : `✅ Confirmar voto de aprobación con nota (${PARTNERS_LIST.find((p) => p.id === voteDraft.partnerId)?.name}):`}
                          </span>
                          <button
                            type="button"
                            onClick={() => setVoteDraft(null)}
                            className="text-xs text-zinc-400 hover:text-white"
                          >
                            Cancelar
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          required={voteDraft.voteStatus === 'rejected'}
                          value={voteDraft.note}
                          onChange={(e) => setVoteDraft({ ...voteDraft, note: e.target.value })}
                          placeholder={
                            voteDraft.voteStatus === 'rejected'
                              ? 'Explica qué punto no estás de acuerdo o qué cambio propones para poder aprobarla...'
                              : 'Comentario opcional al aprobar...'
                          }
                          className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setVoteDraft(null)}
                            className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmittingVote}
                            className={`px-5 py-2 rounded-xl text-xs font-black ${
                              voteDraft.voteStatus === 'rejected'
                                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                            }`}
                          >
                            {isSubmittingVote ? 'Guardando...' : 'Confirmar Decisión'}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* LAS 3 CASILLAS DE SOCIOS: MARTÍN | ALEJANDRO | JUAN PABLO */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {PARTNERS_LIST.map((partner) => {
                        const v = prop.votes?.[partner.id] || { status: 'pending' };
                        const isApproved = v.status === 'approved';
                        const isRejected = v.status === 'rejected';
                        const isCurrentActivePartner = activePartner.id === partner.id;

                        return (
                          <div
                            key={partner.id}
                            className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                              isApproved
                                ? 'bg-emerald-950/25 border-emerald-500/40'
                                : isRejected
                                ? 'bg-rose-950/25 border-rose-500/40'
                                : 'bg-black/40 border-zinc-800'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center ${partner.avatarBg}`}
                                  >
                                    {partner.name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="text-sm font-black text-white flex items-center gap-1.5">
                                      {partner.name}
                                      {isCurrentActivePartner && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase">
                                          Tú
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 font-bold uppercase">
                                      Socio Director
                                    </div>
                                  </div>
                                </div>

                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
                                    isApproved
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : isRejected
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                  }`}
                                >
                                  {isApproved ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Aprobado
                                    </>
                                  ) : isRejected ? (
                                    <>
                                      <XCircle className="w-3 h-3 text-rose-400" /> Rechazado
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-3 h-3 text-amber-400" /> Pendiente
                                    </>
                                  )}
                                </span>
                              </div>

                              {v.note && (
                                <p className="text-xs text-zinc-300 bg-black/40 p-2.5 rounded-xl border border-zinc-800/80 italic">
                                  "{v.note}"
                                </p>
                              )}
                            </div>

                            <div className="pt-2 border-t border-zinc-800/70 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
                              <span>{v.updatedAt ? `Firmado: ${v.updatedAt}` : 'Sin votar aún'}</span>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleQuickApprove(prop, partner)}
                                  title={`Registrar acuerdo de ${partner.name}`}
                                  className={`px-2 py-1 rounded-lg font-black transition-colors ${
                                    isApproved
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'bg-zinc-800 hover:bg-emerald-500 hover:text-black text-zinc-300'
                                  }`}
                                >
                                  ✓ Acordar
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVoteDraft({
                                      proposalId: prop.id,
                                      partnerId: partner.id,
                                      voteStatus: 'rejected',
                                      note: v.note || ''
                                    })
                                  }
                                  title={`Registrar rechazo u observación de ${partner.name}`}
                                  className={`px-2 py-1 rounded-lg font-black transition-colors ${
                                    isRejected
                                      ? 'bg-rose-500/20 text-rose-300'
                                      : 'bg-zinc-800 hover:bg-rose-600 hover:text-white text-zinc-300'
                                  }`}
                                >
                                  ✕ Observar
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* HILO DE DEBATE Y COMENTARIOS DE LOS SOCIOS */}
                  <div className="bg-black/40 border border-zinc-800/90 rounded-2xl p-4 space-y-3">
                    <div className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-amber-400" />
                      Debate, Observaciones y Registro de Firmas ({(prop.comments || []).length})
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                      {(prop.comments || []).map((c) => {
                        const pInfo = PARTNERS_LIST.find((p) => p.id === c.partnerId);
                        return (
                          <div
                            key={c.id}
                            className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                              c.type === 'vote_approve'
                                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                                : c.type === 'vote_reject'
                                ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                                : 'bg-zinc-900/90 border-zinc-800 text-zinc-200'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 border ${
                                  pInfo?.badgeClass || 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                }`}
                              >
                                {c.partnerName || 'Socio'}
                              </span>
                              <span className="leading-relaxed">{c.text}</span>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-bold shrink-0">
                              {c.dateLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Input para agregar nuevo comentario */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <input
                        type="text"
                        value={commentInputs[prop.id] || ''}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({ ...prev, [prop.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSendComment(prop);
                          }
                        }}
                        placeholder={`Dejar comentario o contrapropuesta como ${activePartner.name}...`}
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        disabled={sendingCommentId === prop.id || !(commentInputs[prop.id] || '').trim()}
                        onClick={() => handleSendComment(prop)}
                        className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-black px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shrink-0 transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Comentar ({activePartner.name})
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PARA EXPONER NUEVA IDEA / NORMA O EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-amber-500/40 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {editingProposal
                      ? 'Reformular Propuesta o Norma de Socios'
                      : 'Exponer Nueva Idea, Norma o Regla'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Presentada por <strong className="text-amber-400">{activePartner.name}</strong> • Requiere aprobación 3/3 (Martín, Alejandro y Juan Pablo)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProposal} className="p-6 overflow-y-auto custom-scrollbar space-y-4">
              {!editingProposal && (
                <div>
                  <label className="block text-xs font-black uppercase text-zinc-400 mb-1.5">
                    Socio que expone la propuesta
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PARTNERS_LIST.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectActivePartner(p.id)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-black border flex items-center justify-center gap-2 transition-all ${
                          activePartner.id === p.id
                            ? 'bg-amber-400 text-black border-amber-300'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                      >
                        <span>{p.name}</span>
                        {activePartner.id === p.id && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-zinc-400 mb-1.5">
                    Tipo de Exposición
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-3.5 py-3 text-xs font-bold text-white outline-none focus:border-amber-500"
                  >
                    {PROPOSAL_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-zinc-400 mb-1.5">
                    Área o Alcance de Aplicación
                  </label>
                  <select
                    value={formScope}
                    onChange={(e) => setFormScope(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-3.5 py-3 text-xs font-bold text-white outline-none focus:border-amber-500"
                  >
                    {PROPOSAL_SCOPES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-zinc-400 mb-1.5">
                  Título de la Norma, Regla o Idea
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ej: Regla de Descuento Máximo en Efectivo / Política de Stock en Sucursales..."
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-zinc-400 mb-1.5">
                  Exposición Detallada / Redacción de la Regla
                </label>
                <textarea
                  rows={5}
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe claramente la idea o la norma propuesta, cómo debe aplicarse y por qué la propones..."
                  className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm text-white outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              {!editingProposal ? (
                <label className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAutoApprove}
                    onChange={(e) => setFormAutoApprove(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500"
                  />
                  <span className="text-xs font-bold text-emerald-200">
                    Dejar firmado automáticamente mi voto a favor ({activePartner.name} — 1/3 aprobado) al publicar
                  </span>
                </label>
              ) : (
                <label className="flex items-center gap-2.5 p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formResetVotes}
                    onChange={(e) => setFormResetVotes(e.target.checked)}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <span className="text-xs font-bold text-amber-200">
                    Reabrir votación 3/3 para que los otros socios vuelvan a votar sobre este nuevo texto
                  </span>
                </label>
              )}

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingProposal}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black text-xs font-black shadow-lg"
                >
                  {isSavingProposal
                    ? 'Publicando...'
                    : editingProposal
                    ? 'Guardar Cambios'
                    : `Publicar Propuesta de ${activePartner.name}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
