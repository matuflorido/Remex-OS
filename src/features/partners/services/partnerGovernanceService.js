import {
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { createNotification } from '../../notifications/services/notificationService';

export const PARTNERS_LIST = [
  {
    id: 'martin',
    name: 'Martín',
    shortRole: 'Socio Director',
    color: 'from-orange-500 to-amber-500',
    badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
    avatarBg: 'bg-orange-500 text-black',
    aliases: ['martin', 'martín']
  },
  {
    id: 'alejandro',
    name: 'Alejandro',
    shortRole: 'Socio Director',
    color: 'from-cyan-500 to-blue-500',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
    avatarBg: 'bg-cyan-500 text-black',
    aliases: ['alejandro', 'ale']
  },
  {
    id: 'juan_pablo',
    name: 'Juan Pablo',
    shortRole: 'Socio Director',
    color: 'from-emerald-500 to-teal-500',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    avatarBg: 'bg-emerald-500 text-black',
    aliases: ['juan pablo', 'juanpablo', 'juan', 'jp']
  }
];

export const PROPOSAL_CATEGORIES = [
  { id: 'norma_operativa', label: '📜 Norma / Regla Operativa', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { id: 'politica_comercial', label: '💰 Política Comercial y Precios', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  { id: 'idea_estrategica', label: '💡 Idea / Proyecto Estratégico', badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  { id: 'sucursales_personal', label: '🏢 Sucursales, Reparto y Equipo', badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30' }
];

export const PROPOSAL_SCOPES = [
  'Todas las Sucursales y Áreas',
  'Check-Oil Lubricentros',
  'Reparto y Mayorista (Remex)',
  'Finanzas, Caja y Cobranzas',
  'Bot WhatsApp y Atención al Cliente',
  'Directorio de Socios'
];

const LOCAL_CACHE_KEY = 'remex_partners_governance_v1';

function normalizeText(str = '') {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Detecta si el usuario logueado corresponde a Martín, Alejandro o Juan Pablo.
 */
export function detectPartnerFromUser(user) {
  if (!user) return null;
  if (user.partnerId && PARTNERS_LIST.some((p) => p.id === user.partnerId)) {
    return PARTNERS_LIST.find((p) => p.id === user.partnerId);
  }

  const normName = normalizeText(user.name);
  const normEmail = normalizeText(user.email);
  const emailPrefix = normEmail.split('@')[0] || '';

  // Primero buscar coincidencia exacta de Juan Pablo antes que "juan"
  for (const partner of [PARTNERS_LIST[2], PARTNERS_LIST[0], PARTNERS_LIST[1]]) {
    for (const alias of partner.aliases) {
      const normAlias = normalizeText(alias);
      if (
        normName === normAlias ||
        normName.includes(normAlias) ||
        emailPrefix === normAlias ||
        emailPrefix.includes(normAlias.replace(/\s+/g, ''))
      ) {
        return partner;
      }
    }
  }
  return null;
}

/**
 * Determina si el usuario tiene acceso a la Sala Exclusiva de Socios.
 * Accesible para Martín, Alejandro, Juan Pablo, usuarios con área/rol "Socios" o "Super_Usuario".
 */
export function canAccessPartnersSection(user) {
  if (!user) return false;
  if (detectPartnerFromUser(user)) return true;

  const roles = Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : [];
  const normRoles = roles.map((r) => normalizeText(r));
  if (
    normRoles.some(
      (r) =>
        r === 'super_usuario' ||
        r.includes('socio') ||
        r.includes('directorio')
    )
  ) {
    return true;
  }
  if (normalizeText(user.email) === 'matuflorido@gmail.com') {
    return true;
  }
  return false;
}

/**
 * Evalúa el estado de una propuesta según los 3 votos nominales (Martín, Alejandro, Juan Pablo).
 * Regla de oro: Para quedar efectiva/firme como regla, DEBE estar aprobada por los 3 (3/3).
 */
export function evaluateProposalConsensus(votes = {}) {
  const partnerStates = PARTNERS_LIST.map((p) => {
    const v = votes?.[p.id] || { status: 'pending' };
    return {
      partnerId: p.id,
      partnerName: p.name,
      status: v.status || 'pending', // 'approved' | 'rejected' | 'pending'
      updatedAt: v.updatedAt || null,
      note: v.note || ''
    };
  });

  const approvedCount = partnerStates.filter((s) => s.status === 'approved').length;
  const rejectedList = partnerStates.filter((s) => s.status === 'rejected');
  const pendingList = partnerStates.filter((s) => s.status === 'pending');

  let overallStatus = 'en_votacion'; // 'firme' | 'rechazada' | 'en_votacion'
  if (approvedCount === 3) {
    overallStatus = 'firme';
  } else if (rejectedList.length > 0) {
    overallStatus = 'rechazada';
  }

  return {
    overallStatus,
    approvedCount,
    rejectedCount: rejectedList.length,
    pendingCount: pendingList.length,
    rejectedByNames: rejectedList.map((r) => r.partnerName),
    pendingNames: pendingList.map((p) => p.partnerName),
    partnerStates,
    isUnanimousRule: approvedCount === 3
  };
}

function formatNowAR() {
  const now = new Date();
  const date = now.toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const time = now.toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return `${date} ${time} hs`;
}

export function subscribeToPartnerProposals(callback) {
  const q = query(collection(db, 'partner_proposals'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));
      items.sort((a, b) => {
        const tA = a.createdAtMs || 0;
        const tB = b.createdAtMs || 0;
        return tB - tA;
      });
      try {
        localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(items));
      } catch {
        // ignore storage quota
      }
      callback(items);
    },
    (error) => {
      console.error('Error escuchando propuestas de socios:', error);
      try {
        const cached = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '[]');
        callback(cached);
      } catch {
        callback([]);
      }
    }
  );
}

export async function createPartnerProposal({
  title,
  description,
  category = 'norma_operativa',
  scope = 'Todas las Sucursales y Áreas',
  authorPartnerId,
  authorPartnerName,
  autoApproveByAuthor = true
}) {
  const nowMs = Date.now();
  const nowLabel = formatNowAR();
  const proposalId = `PROP-${nowMs.toString().slice(-6)}`;

  const initialVotes = {
    martin: { status: 'pending', updatedAt: null, note: '' },
    alejandro: { status: 'pending', updatedAt: null, note: '' },
    juan_pablo: { status: 'pending', updatedAt: null, note: '' }
  };

  if (autoApproveByAuthor && authorPartnerId && initialVotes[authorPartnerId]) {
    initialVotes[authorPartnerId] = {
      status: 'approved',
      updatedAt: nowLabel,
      note: 'Propuesta presentada y aprobada por el socio autor.'
    };
  }

  const consensus = evaluateProposalConsensus(initialVotes);

  const payload = {
    id: proposalId,
    title: title.trim(),
    description: description.trim(),
    category,
    scope,
    authorPartnerId,
    authorPartnerName,
    createdAtMs: nowMs,
    createdAtLabel: nowLabel,
    updatedAtLabel: nowLabel,
    status: consensus.overallStatus,
    votes: initialVotes,
    comments: [
      {
        id: `c-${nowMs}`,
        partnerId: authorPartnerId,
        partnerName: authorPartnerName,
        type: 'creation',
        text: `Presentó la propuesta "${title.trim()}" para votación unánime de los 3 socios.`,
        dateLabel: nowLabel,
        createdAtMs: nowMs
      }
    ],
    approvedRuleAtLabel: consensus.isUnanimousRule ? nowLabel : null,
    updatedAtServer: serverTimestamp()
  };

  await setDoc(doc(db, 'partner_proposals', proposalId), payload);

  // Notificar a los otros socios
  for (const partner of PARTNERS_LIST) {
    if (partner.id !== authorPartnerId) {
      try {
        await createNotification(
          'Socios',
          `⚖️ Nueva Propuesta de Socio (${authorPartnerName})`,
          `${authorPartnerName} expuso: "${title.trim()}". Requiere el voto de los 3 socios para quedar firme como regla.`,
          partner.name
        );
      } catch {
        // ignore notification errors
      }
    }
  }

  return payload;
}

export async function castPartnerVote({
  proposal,
  partnerId,
  partnerName,
  voteStatus, // 'approved' | 'rejected' | 'pending'
  note = ''
}) {
  if (!proposal?.id || !partnerId) return;
  const nowMs = Date.now();
  const nowLabel = formatNowAR();

  const nextVotes = {
    ...(proposal.votes || {
      martin: { status: 'pending', updatedAt: null, note: '' },
      alejandro: { status: 'pending', updatedAt: null, note: '' },
      juan_pablo: { status: 'pending', updatedAt: null, note: '' }
    }),
    [partnerId]: {
      status: voteStatus,
      updatedAt: nowLabel,
      note: note.trim()
    }
  };

  const consensus = evaluateProposalConsensus(nextVotes);

  const voteActionLabel =
    voteStatus === 'approved'
      ? '✅ ACORDÓ / APROBÓ la propuesta'
      : voteStatus === 'rejected'
      ? '❌ RECHAZÓ / OBSERVÓ la propuesta'
      : '⏳ Puso su voto en revisión';

  const newComment = {
    id: `v-${nowMs}`,
    partnerId,
    partnerName,
    type: voteStatus === 'approved' ? 'vote_approve' : voteStatus === 'rejected' ? 'vote_reject' : 'comment',
    text: note.trim()
      ? `${voteActionLabel}: "${note.trim()}"`
      : `${voteActionLabel}.${consensus.isUnanimousRule ? ' ¡Aprobación unánime 3/3 alcanzada! La norma queda FIRME y vigente.' : ''}`,
    dateLabel: nowLabel,
    createdAtMs: nowMs
  };

  const nextComments = [...(proposal.comments || []), newComment];

  const updates = {
    votes: nextVotes,
    status: consensus.overallStatus,
    updatedAtLabel: nowLabel,
    comments: nextComments,
    approvedRuleAtLabel: consensus.isUnanimousRule
      ? proposal.approvedRuleAtLabel || nowLabel
      : null,
    updatedAtServer: serverTimestamp()
  };

  await updateDoc(doc(db, 'partner_proposals', proposal.id), updates);

  // Si alcanzó unanimidad 3/3, notificar a los 3 socios que la regla quedó firme
  if (consensus.isUnanimousRule && proposal.status !== 'firme') {
    for (const p of PARTNERS_LIST) {
      try {
        await createNotification(
          'Socios',
          `🏛️ ¡NUEVA REGLA FIRME APROBADA (3/3)!`,
          `Martín, Alejandro y Juan Pablo aprobaron por unanimidad: "${proposal.title}". Ya rige como regla firme.`,
          p.name
        );
      } catch {
        // ignore
      }
    }
  } else if (voteStatus === 'rejected') {
    for (const p of PARTNERS_LIST) {
      if (p.id !== partnerId) {
        try {
          await createNotification(
            'Socios',
            `⛔ Propuesta Observada por ${partnerName}`,
            `${partnerName} rechazó/observó "${proposal.title}"${note.trim() ? `: "${note.trim()}"` : ''}.`,
            p.name
          );
        } catch {
          // ignore
        }
      }
    }
  }

  return updates;
}

export async function addPartnerProposalComment({
  proposal,
  partnerId,
  partnerName,
  text
}) {
  if (!proposal?.id || !text?.trim()) return;
  const nowMs = Date.now();
  const nowLabel = formatNowAR();

  const newComment = {
    id: `c-${nowMs}`,
    partnerId,
    partnerName,
    type: 'comment',
    text: text.trim(),
    dateLabel: nowLabel,
    createdAtMs: nowMs
  };

  const nextComments = [...(proposal.comments || []), newComment];

  await updateDoc(doc(db, 'partner_proposals', proposal.id), {
    comments: nextComments,
    updatedAtLabel: nowLabel,
    updatedAtServer: serverTimestamp()
  });

  for (const p of PARTNERS_LIST) {
    if (p.id !== partnerId) {
      try {
        await createNotification(
          'Socios',
          `💬 Comentario de ${partnerName} en Directorio`,
          `En "${proposal.title}": "${text.trim()}"`,
          p.name
        );
      } catch {
        // ignore
      }
    }
  }
}

export async function updatePartnerProposalContent({
  proposal,
  title,
  description,
  category,
  scope,
  editorPartnerId,
  editorPartnerName,
  resetVotesOnEdit = false
}) {
  if (!proposal?.id) return;
  const nowMs = Date.now();
  const nowLabel = formatNowAR();

  let nextVotes = proposal.votes || {};
  if (resetVotesOnEdit) {
    nextVotes = {
      martin: { status: 'pending', updatedAt: null, note: '' },
      alejandro: { status: 'pending', updatedAt: null, note: '' },
      juan_pablo: { status: 'pending', updatedAt: null, note: '' }
    };
    if (editorPartnerId && nextVotes[editorPartnerId]) {
      nextVotes[editorPartnerId] = {
        status: 'approved',
        updatedAt: nowLabel,
        note: 'Propuesta reformulada y aprobada por el autor.'
      };
    }
  }

  const consensus = evaluateProposalConsensus(nextVotes);

  const editComment = {
    id: `edit-${nowMs}`,
    partnerId: editorPartnerId,
    partnerName: editorPartnerName,
    type: 'edit',
    text: `Actualizó la redacción de la propuesta${resetVotesOnEdit ? ' y reabrió la votación 3/3' : ''}.`,
    dateLabel: nowLabel,
    createdAtMs: nowMs
  };

  await updateDoc(doc(db, 'partner_proposals', proposal.id), {
    title: title.trim(),
    description: description.trim(),
    category,
    scope,
    votes: nextVotes,
    status: consensus.overallStatus,
    updatedAtLabel: nowLabel,
    comments: [...(proposal.comments || []), editComment],
    updatedAtServer: serverTimestamp()
  });
}

export async function deletePartnerProposalInDb(proposalId) {
  if (!proposalId) return;
  await deleteDoc(doc(db, 'partner_proposals', proposalId));
}
