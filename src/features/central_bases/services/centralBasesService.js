import { detectPartnerFromUser } from '../../partners/services/partnerGovernanceService';

export const CENTRAL_SQL_API_URL = 'https://franquicias.check-oil.com/api/index.php';

const LOCAL_INDEX_CACHE_KEY = 'remex_central_bases_index_v1';
const getBranchCacheKey = (branchId) => `remex_central_base_snap_v1_${branchId}`;

function normalizeText(str = '') {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Permiso estricto: SOLO los 3 Socios (Martín, Alejandro, Juan Pablo) y SuperAdmin (Super_Usuario).
 * Queda oculto y bloqueado para cualquier otro rol o área.
 */
export function canAccessCentralBasesSection(user) {
  if (!user) return false;
  if (detectPartnerFromUser(user)) return true;

  const roles = Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : [];
  const normRoles = roles.map((r) => normalizeText(r));
  if (
    normRoles.some(
      (r) =>
        r === 'super_usuario' ||
        r === 'superadmin' ||
        r === 'super_admin' ||
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
 * Obtiene el índice vivo de bases sincronizadas en MySQL (00 Casa Central, 00-bsas y red).
 */
export async function fetchCentralBasesIndex() {
  try {
    const res = await fetch(`${CENTRAL_SQL_API_URL}?action=branches&t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data?.ok && Array.isArray(data.branches)) {
      try {
        localStorage.setItem(LOCAL_INDEX_CACHE_KEY, JSON.stringify(data));
      } catch {}
      return data;
    }
    throw new Error('Respuesta inválida del servidor Central DBF');
  } catch (err) {
    try {
      const cached = localStorage.getItem(LOCAL_INDEX_CACHE_KEY);
      if (cached) return { ...JSON.parse(cached), fromCache: true };
    } catch {}
    throw err;
  }
}

/**
 * Descarga la radiografía completa de una sede (por defecto '00' = Casa Central REMEX Bariloche).
 */
export async function fetchCentralBranchSnapshot(branchId = '00') {
  try {
    const res = await fetch(
      `${CENTRAL_SQL_API_URL}?action=branch&id=${encodeURIComponent(branchId)}&t=${Date.now()}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.branch) {
      try {
        // Guardamos resumen ligero en caché local por si se corta internet
        const lightCopy = {
          branch: data.branch,
          kpis: data.kpis,
          weeklyCollectionsData: data.weeklyCollectionsData,
          financialAnalytics: data.financialAnalytics,
          syncedAt: new Date().toISOString()
        };
        localStorage.setItem(getBranchCacheKey(branchId), JSON.stringify(lightCopy));
      } catch {}
      return data;
    }
    throw new Error(`No se encontró información para la sede ${branchId}`);
  } catch (err) {
    try {
      const cached = localStorage.getItem(getBranchCacheKey(branchId));
      if (cached) return { ...JSON.parse(cached), fromCache: true };
    } catch {}
    throw err;
  }
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function shiftIsoDays(isoDate, deltaDays) {
  const dt = new Date(`${String(isoDate).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(dt.getTime())) return isoDate;
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

function daysBetween(fromIso, toIso) {
  const a = new Date(`${String(fromIso).slice(0, 10)}T12:00:00Z`).getTime();
  const b = new Date(`${String(toIso).slice(0, 10)}T12:00:00Z`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86400000);
}

function fmtShortRange(startIso, endIso) {
  if (!startIso || !endIso) return '';
  return `${startIso.slice(8, 10)}/${startIso.slice(5, 7)} al ${endIso.slice(8, 10)}/${endIso.slice(5, 7)}`;
}

/**
 * Motor de Proyección de Recaudación Semanal (Semanas +1 a +4 y horizonte Sem. 5–8)
 * Basado en comprobantes reales abiertos en factura1.DBF, comportamiento histórico de RECIBOS.DBF
 * y cartera activa de CHEQUES.DBF, excluyendo mora congelada >90 días.
 */
export function buildWeeklyCollectionsForecast({
  weeklyCollectionsData,
  clients = [],
  refDate
}) {
  const effectiveRef = refDate || weeklyCollectionsData?.refDate || new Date().toISOString().slice(0, 10);
  const weeklyHistory = weeklyCollectionsData?.weeklyHistory || [];
  const benchmarks = weeklyCollectionsData?.benchmarks || {
    semanasAnalizadas: 0,
    promedioFacturadoSemanal: 0,
    promedioContadoSemanal: 0,
    promedioCtaCteFacturadoSemanal: 0,
    promedioCtaCteCortoPlazoSemanal: 0,
    promedioRecibosSemanal: 0,
    promedioCobradoTotalSemanal: 0,
    tendenciaCobranzaPct: null,
    tasaRecuperoCtaCtePct: null,
    medianaDiasCobroSucursal: 30,
    muestrasCobroCount: 0
  };
  const openReceivables = weeklyCollectionsData?.openReceivables || [];
  const activePortfolioChecks = weeklyCollectionsData?.activePortfolioChecks || [];

  const rawDebtByClient = new Map();
  for (const inv of openReceivables) {
    const k = String(inv.clienteCod || '');
    rawDebtByClient.set(k, (rawDebtByClient.get(k) || 0) + (Number(inv.saldo) || 0));
  }

  const clientLiveMap = new Map();
  for (const c of clients) {
    const k = String(c.codigo || '');
    const rawSum = rawDebtByClient.get(k) || 0;
    const liveSaldo = Math.max(0, Number(c.saldoPendiente) || 0);
    const scale = rawSum > 1 ? Math.min(1, liveSaldo / rawSum) : 1;
    clientLiveMap.set(k, {
      esIncobrable: Boolean(c.esIncobrable),
      scale,
      nombre: c.nombre || ''
    });
  }

  const createWeekBucket = (idx, startOffset, endOffset, title) => {
    const sDate = shiftIsoDays(effectiveRef, startOffset);
    const eDate = shiftIsoDays(effectiveRef, endOffset);
    return {
      id: `W${idx}`,
      weekNumber: idx,
      title,
      shortLabel: `Sem. +${idx}`,
      startDate: sDate,
      endDate: eDate,
      rangeLabel: fmtShortRange(sDate, eDate),
      ctaCteEnTermino: 0,
      ctaCteRecuperoAtraso: 0,
      chequesPorAcreditar: 0,
      rotacionNuevasVentasCtaCte: 0,
      cobranzaCtaCteEstimada: 0,
      ventasContadoEstimadas: round2(benchmarks.promedioContadoSemanal || 0),
      ingresoTotalEstimado: 0,
      agendaMap: new Map(),
      chequesList: []
    };
  };

  const weeks = [
    createWeekBucket(1, 1, 7, 'Semana 1 (Próximos 7 días)'),
    createWeekBucket(2, 8, 14, 'Semana 2 (Días 8 al 14)'),
    createWeekBucket(3, 15, 21, 'Semana 3 (Días 15 al 21)'),
    createWeekBucket(4, 22, 28, 'Semana 4 (Días 22 al 28)')
  ];
  const horizon5to8 = createWeekBucket(5, 29, 56, 'Semanas 5 a 8 (Mes siguiente)');
  horizon5to8.shortLabel = 'Sem. 5–8';

  const addClientToWeekAgenda = (bucket, inv, amount, reason, isOverdueRecovery = false) => {
    if (amount <= 0.5) return;
    if (isOverdueRecovery) {
      bucket.ctaCteRecuperoAtraso = round2(bucket.ctaCteRecuperoAtraso + amount);
    } else {
      bucket.ctaCteEnTermino = round2(bucket.ctaCteEnTermino + amount);
    }
    const cKey = String(inv.clienteCod || inv.clienteNombre || 'S/C');
    const cur = bucket.agendaMap.get(cKey) || {
      clienteCod: inv.clienteCod,
      clienteNombre: inv.clienteNombre,
      montoEstimado: 0,
      facturasCount: 0,
      ejemploComprobante: inv.numero,
      motivo: reason,
      tipo: isOverdueRecovery ? 'RECUPERO_MORA_RECIENTE' : 'VENCIMIENTO_NORMAL'
    };
    cur.montoEstimado = round2(cur.montoEstimado + amount);
    cur.facturasCount += 1;
    bucket.agendaMap.set(cKey, cur);
  };

  let totalCtaCteActiva = 0;
  let moraAntiguaExcluida = 0;
  let moraAntiguaFacturasCount = 0;
  let incobrableSeparadaTotal = 0;
  let incobrableSeparadaCount = 0;

  const branchMedianDays = Math.max(
    10,
    Math.min(60, Number(benchmarks.medianaDiasCobroSucursal) || 30)
  );

  for (const inv of openReceivables) {
    const cKey = String(inv.clienteCod || '');
    const liveInfo = clientLiveMap.get(cKey);
    const rawSaldo = Number(inv.saldo) || 0;
    if (rawSaldo <= 1) continue;

    if (liveInfo?.esIncobrable) {
      incobrableSeparadaTotal = round2(incobrableSeparadaTotal + rawSaldo);
      incobrableSeparadaCount += 1;
      continue;
    }

    const effectiveSaldo = round2(rawSaldo * (liveInfo ? liveInfo.scale : 1));
    if (effectiveSaldo <= 1) continue;

    totalCtaCteActiva = round2(totalCtaCteActiva + effectiveSaldo);

    const edadDias = Math.max(0, daysBetween(inv.fecha, effectiveRef));
    const plazoBase = Number(inv.plazoPactadoDias) || 30;
    const cicloEsperado = inv.diasPagoCliente
      ? Math.max(7, Math.min(90, Math.round(inv.diasPagoCliente * 0.7 + plazoBase * 0.3)))
      : Math.max(plazoBase, branchMedianDays);

    const diasFaltantes = cicloEsperado - edadDias;

    if (diasFaltantes >= 1) {
      const reason = inv.diasPagoCliente
        ? `Paga habitualmente a ~${inv.diasPagoCliente} días (${inv.condicion})`
        : `En plazo normal (${inv.condicion} · emitida hace ${edadDias}d)`;
      if (diasFaltantes <= 7) addClientToWeekAgenda(weeks[0], inv, effectiveSaldo, reason, false);
      else if (diasFaltantes <= 14) addClientToWeekAgenda(weeks[1], inv, effectiveSaldo, reason, false);
      else if (diasFaltantes <= 21) addClientToWeekAgenda(weeks[2], inv, effectiveSaldo, reason, false);
      else if (diasFaltantes <= 28) addClientToWeekAgenda(weeks[3], inv, effectiveSaldo, reason, false);
      else addClientToWeekAgenda(horizon5to8, inv, effectiveSaldo, reason, false);
      continue;
    }

    const atrasoSobreCiclo = Math.abs(diasFaltantes);
    const pagadorActivo = (Number(inv.cobradoCliente180d) || 0) > 0;

    if (edadDias <= 60 || (pagadorActivo && edadDias <= 75 && atrasoSobreCiclo <= 25)) {
      if (atrasoSobreCiclo <= 10) {
        const reason = `En fecha de cobro (${edadDias}d desde emisión)`;
        addClientToWeekAgenda(weeks[0], inv, round2(effectiveSaldo * 0.6), reason, true);
        addClientToWeekAgenda(weeks[1], inv, round2(effectiveSaldo * 0.4), reason, true);
      } else {
        const reason = `Atraso reciente (${edadDias}d) · recupero escalonado`;
        addClientToWeekAgenda(weeks[0], inv, round2(effectiveSaldo * 0.35), reason, true);
        addClientToWeekAgenda(weeks[1], inv, round2(effectiveSaldo * 0.35), reason, true);
        addClientToWeekAgenda(weeks[2], inv, round2(effectiveSaldo * 0.3), reason, true);
      }
      continue;
    }

    if (edadDias <= 90) {
      const reason = `Mora intermedia (${edadDias}d) · cobro parcial estimado (60%)`;
      addClientToWeekAgenda(weeks[1], inv, round2(effectiveSaldo * 0.2), reason, true);
      addClientToWeekAgenda(weeks[2], inv, round2(effectiveSaldo * 0.2), reason, true);
      addClientToWeekAgenda(weeks[3], inv, round2(effectiveSaldo * 0.2), reason, true);
      moraAntiguaExcluida = round2(moraAntiguaExcluida + effectiveSaldo * 0.4);
      moraAntiguaFacturasCount += 1;
      continue;
    }

    moraAntiguaExcluida = round2(moraAntiguaExcluida + effectiveSaldo);
    moraAntiguaFacturasCount += 1;
  }

  let totalChequesProyectados = 0;
  for (const ch of activePortfolioChecks) {
    const imp = Number(ch.importe) || 0;
    if (imp <= 1) continue;
    totalChequesProyectados = round2(totalChequesProyectados + imp);
    const diasVto = daysBetween(effectiveRef, ch.fechaVto);
    const target =
      diasVto <= 7
        ? weeks[0]
        : diasVto <= 14
        ? weeks[1]
        : diasVto <= 21
        ? weeks[2]
        : diasVto <= 28
        ? weeks[3]
        : horizon5to8;
    target.chequesPorAcreditar = round2(target.chequesPorAcreditar + imp);
    target.chequesList.push(ch);
  }

  const shortCycleWeekly = Number(benchmarks.promedioCtaCteCortoPlazoSemanal) || 0;
  if (shortCycleWeekly > 1000) {
    const recoveryFactor =
      benchmarks.tasaRecuperoCtaCtePct !== null
        ? Math.min(0.95, Math.max(0.5, benchmarks.tasaRecuperoCtaCtePct / 100))
        : 0.85;
    const rotEst = round2(shortCycleWeekly * recoveryFactor);
    weeks[2].rotacionNuevasVentasCtaCte = rotEst;
    weeks[3].rotacionNuevasVentasCtaCte = rotEst;
  }

  const finalizeBucket = (b) => {
    const cobranzaCtaCteEstimada = round2(
      b.ctaCteEnTermino +
        b.ctaCteRecuperoAtraso +
        b.chequesPorAcreditar +
        b.rotacionNuevasVentasCtaCte
    );
    const ingresoTotalEstimado = round2(
      cobranzaCtaCteEstimada + b.ventasContadoEstimadas
    );
    const clientesEsperados = [...b.agendaMap.values()].sort(
      (a, z) => z.montoEstimado - a.montoEstimado
    );
    return {
      id: b.id,
      weekNumber: b.weekNumber,
      title: b.title,
      shortLabel: b.shortLabel,
      startDate: b.startDate,
      endDate: b.endDate,
      rangeLabel: b.rangeLabel,
      ctaCteYaFacturada: round2(b.ctaCteEnTermino + b.ctaCteRecuperoAtraso),
      ctaCteEnTermino: b.ctaCteEnTermino,
      ctaCteRecuperoAtraso: b.ctaCteRecuperoAtraso,
      chequesPorAcreditar: b.chequesPorAcreditar,
      rotacionNuevasVentasCtaCte: b.rotacionNuevasVentasCtaCte,
      cobranzaCtaCteEstimada,
      ventasContadoEstimadas: b.ventasContadoEstimadas,
      ingresoTotalEstimado,
      clientesEsperados,
      chequesList: b.chequesList
    };
  };

  const projectedWeeks = weeks.map(finalizeBucket);
  const projectedWeeks5to8 = finalizeBucket(horizon5to8);

  const totalCtaCte4Semanas = round2(
    projectedWeeks.reduce((s, w) => s + w.cobranzaCtaCteEstimada, 0)
  );
  const totalIngreso4Semanas = round2(
    projectedWeeks.reduce((s, w) => s + w.ingresoTotalEstimado, 0)
  );

  return {
    hasData: weeklyHistory.length > 0 || openReceivables.length > 0,
    refDate: effectiveRef,
    weeklyHistory: weeklyHistory.slice(-8),
    benchmarks,
    projectedWeeks,
    projectedWeeks5to8,
    totals: {
      totalCtaCteActiva,
      totalChequesProyectados,
      totalCtaCte4Semanas,
      promedioCtaCteProyectadoSemanal: round2(totalCtaCte4Semanas / 4),
      totalIngreso4Semanas,
      promedioIngresoProyectadoSemanal: round2(totalIngreso4Semanas / 4),
      proximaSemanaCtaCte: projectedWeeks[0]?.cobranzaCtaCteEstimada || 0,
      proximaSemanaTotal: projectedWeeks[0]?.ingresoTotalEstimado || 0,
      moraAntiguaExcluida,
      moraAntiguaFacturasCount,
      incobrableSeparadaTotal,
      incobrableSeparadaCount
    }
  };
}

/**
 * Lector Binario Directo de Archivos .DBF locales (dBase III / Visual FoxPro, Windows-1252)
 * Permite a Socios o SuperAdmin abrir cualquier archivo .DBF de la PC sin bloquear el sistema origen.
 */
export function parseLocalDbfArrayBuffer(arrayBuffer, maxRows = 2500) {
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes.length < 32) {
    throw new Error('El archivo seleccionado es demasiado pequeño o no es un .DBF válido.');
  }

  const view = new DataView(arrayBuffer);
  const version = `0x${bytes[0].toString(16).padStart(2, '0')}`;
  const yy = bytes[1];
  const mm = bytes[2];
  const dd = bytes[3];
  const fullYear = yy < 70 ? 2000 + yy : 1900 + yy;
  const lastUpdate = `${fullYear}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;

  const totalRecordsHeader = view.getUint32(4, true);
  const headerLength = view.getUint16(8, true);
  const recordLength = view.getUint16(10, true);

  if (recordLength <= 1 || headerLength < 32) {
    throw new Error('Encabezado .DBF corrupto o formato desconocido.');
  }

  const decoder = new TextDecoder('windows-1252');
  const fields = [];
  let offset = 32;
  while (offset + 32 <= headerLength && bytes[offset] !== 0x0d) {
    let nameEnd = offset;
    while (nameEnd < offset + 11 && bytes[nameEnd] !== 0x00) nameEnd++;
    const name = decoder.decode(bytes.subarray(offset, nameEnd)).trim();
    const type = String.fromCharCode(bytes[offset + 11]);
    const length = bytes[offset + 16];
    const decimals = bytes[offset + 17];
    if (name && length > 0) {
      fields.push({ name, type, length, decimals });
    }
    offset += 32;
  }

  const rows = [];
  let deletedCount = 0;
  let activeCount = 0;
  let recPtr = headerLength;

  for (let i = 0; i < totalRecordsHeader && recPtr + recordLength <= bytes.length; i++) {
    const delFlag = bytes[recPtr];
    if (delFlag === 0x2a) {
      deletedCount += 1;
      recPtr += recordLength;
      continue;
    }
    if (delFlag === 0x1a) break;

    activeCount += 1;
    if (rows.length < maxRows) {
      const rowObj = {};
      let fPos = recPtr + 1;
      for (const f of fields) {
        const rawSlice = bytes.subarray(fPos, fPos + f.length);
        fPos += f.length;
        if (f.type === 'C' || f.type === 'V') {
          rowObj[f.name] = decoder.decode(rawSlice).trim();
        } else if (f.type === 'N' || f.type === 'F') {
          const s = decoder.decode(rawSlice).trim();
          rowObj[f.name] = s === '' ? 0 : Number(s);
        } else if (f.type === 'D') {
          const s = decoder.decode(rawSlice).trim();
          rowObj[f.name] =
            s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : s;
        } else if (f.type === 'L') {
          const c = String.fromCharCode(rawSlice[0] || 32).toUpperCase();
          rowObj[f.name] = c === 'T' || c === 'Y' ? 'SÍ' : c === 'F' || c === 'N' ? 'NO' : '';
        } else if (f.type === 'I' && f.length === 4) {
          rowObj[f.name] = new DataView(
            rawSlice.buffer,
            rawSlice.byteOffset,
            4
          ).getInt32(0, true);
        } else {
          rowObj[f.name] = `[${f.type}]`;
        }
      }
      rows.push(rowObj);
    }
    recPtr += recordLength;
  }

  return {
    version,
    lastUpdate,
    totalRecordsHeader,
    activeCount,
    deletedCount,
    fields,
    rows,
    truncated: activeCount > maxRows
  };
}
