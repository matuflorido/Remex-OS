// ============================================================================
// MOTOR DE INTERMEDIACIÓN DE PRESUPUESTOS, AUDITORÍA PDF, SLA COMERCIAL,
// MATRIZ DE FILTROS/ACEITES POR MODELO Y DEMORAS POR FRANJA HORARIA
// (CHECK-OIL 2.0 & REMEX OS)
// ============================================================================

export const BROKER_BRANCHES = [
  { key: 'Centro', name: 'Check Oil Suc. Centro (Bariloche)', phone: '5492944579792' },
  { key: 'Estadio', name: 'Check Oil Suc. Estadio (Bariloche)', phone: '5492944638500' },
  { key: 'Ñireco', name: 'Check Oil Suc. Ñireco (Bariloche)', phone: '5492944907667' },
  { key: 'Km13', name: 'Check Oil Suc. Km13 (Bariloche)', phone: '5492944615570' },
  { key: 'Bolsón', name: 'Check Oil Suc. Bolsón (El Bolsón)', phone: '5492944631155' },
  { key: 'Dominico', name: 'Check Oil Suc. Dominico (Avellaneda)', phone: '5491161217529' }
];

export const DEFAULT_BUSINESS_HOURS = {
  lun_vie_apertura: '08:30',
  lun_vie_cierre: '20:00',
  sab_apertura: '09:00',
  sab_cierre: '13:30',
  dom_abierto: false
};

export const DEFAULT_BROKER_CONFIG = {
  modo_presupuesto_intermediario: 'activo', // 'programado' | 'activo' | 'true' | 'false'
  fecha_inicio_intermediario: '2026-11-09',
  sucursales_intermediario_json: '["Centro"]',
  sla_recordatorio_minutos: '15',
  max_recordatorios_sla: '3',
  horario_comercial_json: JSON.stringify(DEFAULT_BUSINESS_HOURS)
};

export const TIME_SLOTS_CONFIG = [
  {
    id: 'manana_temprano',
    label: '🌅 Mañana (08:30 a 11:00)',
    shortLabel: '08:30–11:00',
    description: 'Apertura de sucursales y primeros servicios del día',
    minHour: 8.5,
    maxHour: 11
  },
  {
    id: 'mediodia_pico',
    label: '☀️ Mediodía / Pico (11:00 a 14:00)',
    shortLabel: '11:00–14:00',
    description: 'Franja de alta congestión en fosa y mostrador',
    minHour: 11,
    maxHour: 14
  },
  {
    id: 'tarde',
    label: '🌤️ Tarde (14:00 a 17:00)',
    shortLabel: '14:00–17:00',
    description: 'Reinicio de tarde y atención constante',
    minHour: 14,
    maxHour: 17
  },
  {
    id: 'cierre',
    label: '🌆 Último Turno / Cierre (17:00 a 20:00)',
    shortLabel: '17:00–20:00',
    description: 'Cierre de órdenes y entrega de vehículos',
    minHour: 17,
    maxHour: 20
  },
  {
    id: 'fuera_horario',
    label: '🌙 Fuera de Horario (20:00 a 08:30)',
    shortLabel: 'Fuera de horario',
    description: 'Consultas nocturnas o domingo (SLA corre al abrir)',
    minHour: -1,
    maxHour: -1
  }
];

export function parseSafeJson(val, fallback) {
  if (val == null || val === '') return fallback;
  if (typeof val === 'object') return val;
  try {
    const parsed = JSON.parse(val);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function getParsedBusinessHours(botConfig = {}) {
  const raw = parseSafeJson(botConfig?.horario_comercial_json, DEFAULT_BUSINESS_HOURS);
  return {
    ...DEFAULT_BUSINESS_HOURS,
    ...(raw && typeof raw === 'object' ? raw : {})
  };
}

export function getParsedActiveBrokerBranches(botConfig = {}) {
  const raw = parseSafeJson(botConfig?.sucursales_intermediario_json, ['Centro']);
  return Array.isArray(raw) ? raw.filter(Boolean) : ['Centro'];
}

function hhmmToMinutes(hhmm, fallback = 510) {
  const parts = String(hhmm || '').split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return fallback;
  return parts[0] * 60 + parts[1];
}

const AR_DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const AR_PARTS_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Argentina/Buenos_Aires',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

export function getArgentinaTimeMetadata(isoString) {
  if (!isoString) {
    return {
      slotId: 'mediodia_pico',
      slotLabel: '☀️ Mediodía / Pico (11:00 a 14:00)',
      shortSlot: '11:00–14:00',
      hourFormatted: '—',
      weekdayEs: 'Sin fecha'
    };
  }
  const dt = new Date(isoString);
  if (isNaN(dt.getTime())) {
    return {
      slotId: 'mediodia_pico',
      slotLabel: '☀️ Mediodía / Pico (11:00 a 14:00)',
      shortSlot: '11:00–14:00',
      hourFormatted: '—',
      weekdayEs: 'Sin fecha'
    };
  }

  const parts = AR_PARTS_FMT.formatToParts(dt);
  const wk = parts.find((p) => p.type === 'weekday')?.value || 'Tue';
  const hh = Number(parts.find((p) => p.type === 'hour')?.value || 0) % 24;
  const mm = Number(parts.find((p) => p.type === 'minute')?.value || 0);
  const decimalHour = hh + mm / 60;

  const weekdayMap = {
    Mon: 'Lunes',
    Tue: 'Martes',
    Wed: 'Miércoles',
    Thu: 'Jueves',
    Fri: 'Viernes',
    Sat: 'Sábado',
    Sun: 'Domingo'
  };

  let slot = TIME_SLOTS_CONFIG[4]; // fuera_horario
  if (wk !== 'Sun') {
    if (decimalHour >= 8.5 && decimalHour < 11) slot = TIME_SLOTS_CONFIG[0];
    else if (decimalHour >= 11 && decimalHour < 14) slot = TIME_SLOTS_CONFIG[1];
    else if (decimalHour >= 14 && decimalHour < 17) slot = TIME_SLOTS_CONFIG[2];
    else if (decimalHour >= 17 && decimalHour <= 20) slot = TIME_SLOTS_CONFIG[3];
  }

  return {
    slotId: slot.id,
    slotLabel: slot.label,
    shortSlot: slot.shortLabel,
    hourFormatted: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} hs`,
    weekdayEs: weekdayMap[wk] || 'Martes',
    decimalHour
  };
}

export function isDateWithinBusinessHours(dateObj = new Date(), scheduleInput = DEFAULT_BUSINESS_HOURS) {
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return false;
  const schedule = typeof scheduleInput === 'string'
    ? parseSafeJson(scheduleInput, DEFAULT_BUSINESS_HOURS)
    : { ...DEFAULT_BUSINESS_HOURS, ...(scheduleInput || {}) };

  const lvOpen = hhmmToMinutes(schedule.lun_vie_apertura, 510);
  const lvClose = hhmmToMinutes(schedule.lun_vie_cierre, 1200);
  const sabOpen = hhmmToMinutes(schedule.sab_apertura, 540);
  const sabClose = hhmmToMinutes(schedule.sab_cierre, 810);

  const parts = AR_PARTS_FMT.formatToParts(dateObj);
  const wk = parts.find((p) => p.type === 'weekday')?.value || '';
  const hh = Number(parts.find((p) => p.type === 'hour')?.value || 0) % 24;
  const mm = Number(parts.find((p) => p.type === 'minute')?.value || 0);
  const curMin = hh * 60 + mm;

  if (wk === 'Sun') {
    return Boolean(schedule.dom_abierto && curMin >= sabOpen && curMin < sabClose);
  }
  if (wk === 'Sat') {
    return curMin >= sabOpen && curMin < sabClose;
  }
  return curMin >= lvOpen && curMin < lvClose;
}

export function calculateBusinessMinutesBetween(startIso, endIso = new Date().toISOString(), scheduleInput = DEFAULT_BUSINESS_HOURS) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0;

  const schedule = typeof scheduleInput === 'string'
    ? parseSafeJson(scheduleInput, DEFAULT_BUSINESS_HOURS)
    : { ...DEFAULT_BUSINESS_HOURS, ...(scheduleInput || {}) };

  let count = 0;
  let cursor = Math.floor(start.getTime() / 60000) * 60000;
  const endMs = Math.floor(end.getTime() / 60000) * 60000;
  const maxEnd = Math.min(endMs, cursor + 10080 * 60000);

  while (cursor < maxEnd) {
    if (isDateWithinBusinessHours(new Date(cursor), schedule)) {
      count++;
    }
    cursor += 60000;
  }
  return count;
}

export function evaluateBrokerActivationStatus(botConfig = {}, nowDate = new Date()) {
  const mode = String(botConfig?.modo_presupuesto_intermediario || 'activo').toLowerCase();
  const targetDate = String(botConfig?.fecha_inicio_intermediario || '2026-11-09').trim();
  const branches = getParsedActiveBrokerBranches(botConfig);
  const schedule = getParsedBusinessHours(botConfig);
  const slaMinutes = Number(botConfig?.sla_recordatorio_minutos || 15);
  const maxReminders = Number(botConfig?.max_recordatorios_sla || 3);

  const todayAr = AR_DATE_FMT.format(nowDate);
  const withinScheduleDate = Boolean(targetDate && todayAr >= targetDate);

  let isActiveNow = false;
  if (mode === 'true' || mode === 'activo') {
    isActiveNow = branches.length > 0;
  } else if (mode === 'programado') {
    isActiveNow = withinScheduleDate && branches.length > 0;
  }

  let formattedTarget = targetDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    const [y, m, d] = targetDate.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    formattedTarget = dt.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC'
    });
  }

  const branchLabel = branches.length > 0 ? branches.join(', ') : 'Ninguna seleccionada';
  const inBizHours = isDateWithinBusinessHours(nowDate, schedule);

  let statusBadge = 'APAGADO (Derivación Directa)';
  let statusTone = 'zinc';
  let statusDescription = 'Todas las sucursales operan con derivación tradicional inmediata.';

  if (mode === 'false' || mode === 'off') {
    statusBadge = 'APAGADO (Derivación Directa)';
    statusTone = 'zinc';
  } else if (isActiveNow) {
    statusBadge = `ACTIVO EN VIVO • ${branchLabel}`;
    statusTone = 'emerald';
    statusDescription = `El Bot solicita presupuesto a ${branchLabel} sin derivar al cliente hasta confirmar. Analiza valores, códigos de filtros, aceite y demora hábil por franja horaria (alerta > ${slaMinutes} min).`;
  } else if (mode === 'programado') {
    statusBadge = `PROGRAMADO (${targetDate}) • ${branchLabel}`;
    statusTone = 'amber';
    statusDescription = `Se activará automáticamente desde el ${formattedTarget} en Suc. ${branchLabel}.`;
  }

  return {
    mode,
    isActiveNow,
    targetDate,
    formattedTarget,
    branches,
    branchLabel,
    schedule,
    slaMinutes,
    inBizHours,
    todayAr,
    statusBadge,
    statusTone,
    statusDescription
  };
}

// ============================================================================
// NORMALIZADOR INTELIGENTE DE MODELOS DE VEHÍCULOS (PARA AGRUPAR COTIZACIONES)
// ============================================================================
export function normalizeVehicleModelGroup(rawVehicle = '') {
  const s = String(rawVehicle || '').trim();
  if (!s || s.toLowerCase() === 'no especificado' || s.toLowerCase() === 'vehículo') {
    return 'Vehículo sin especificar';
  }
  const low = s.toLowerCase();
  if (low.includes('hilux')) {
    if (low.includes('2.8')) return 'Toyota Hilux 2.8 TDI';
    if (low.includes('2.4')) return 'Toyota Hilux 2.4 TDI';
    if (low.includes('3.0')) return 'Toyota Hilux 3.0 TDI';
    return 'Toyota Hilux';
  }
  if (low.includes('amarok')) {
    if (low.includes('v6') || low.includes('3.0')) return 'VW Amarok 3.0 V6 TDI';
    return 'VW Amarok 2.0 TDI';
  }
  if (low.includes('gol') || low.includes('suran') || low.includes('fox') || low.includes('saveiro') || low.includes('voyage')) {
    return 'VW Gol Trend / Suran / Saveiro 1.6';
  }
  if (low.includes('pulse')) {
    if (low.includes('1.3')) return 'Fiat Pulse 1.3 GSE';
    return 'Fiat Pulse 1.0 Turbo (T200)';
  }
  if (low.includes('cronos') || low.includes('argo')) {
    if (low.includes('1.8')) return 'Fiat Cronos / Argo 1.8 E.torQ';
    return 'Fiat Cronos / Argo 1.3 GSE';
  }
  if (low.includes('ranger')) {
    if (low.includes('3.2')) return 'Ford Ranger 3.2 TDCi';
    if (low.includes('2.0')) return 'Ford Ranger 2.0 Bi-Turbo';
    return 'Ford Ranger';
  }
  if (low.includes('corolla')) {
    return 'Toyota Corolla 1.8 / 2.0';
  }
  if (low.includes('etios') || low.includes('yaris')) {
    return 'Toyota Etios / Yaris 1.5';
  }
  if (low.includes('kangoo') || low.includes('sandero') || low.includes('logan') || low.includes('stepway')) {
    return 'Renault Kangoo / Sandero / Logan 1.6';
  }
  if (low.includes('208') || low.includes('partner') || low.includes('berlingo')) {
    return 'Peugeot 208 / Partner 1.6';
  }
  // Limpiar años sueltos (ej. 2018, 2022, 2025) para agrupar el mismo modelo/motor
  return s.replace(/\b(199\d|20[0-2]\d)\b/g, '').replace(/\s+/g, ' ').trim() || s;
}

// ============================================================================
// EXTRACTOR LIGERO DE TEXTO DESDE PDF EN EL NAVEGADOR (0 DEPENDENCIAS EXTERNAS)
// ============================================================================
async function inflatePdfStreamBytes(bytes) {
  if (typeof DecompressionStream === 'undefined') return null;
  for (const format of ['deflate', 'deflate-raw']) {
    try {
      const ds = new DecompressionStream(format);
      const writer = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const resp = new Response(ds.readable);
      const ab = await resp.arrayBuffer();
      return new Uint8Array(ab);
    } catch {
      // probar siguiente variante deflate
    }
  }
  return null;
}

function decodePdfLiteralString(str) {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

function decodePdfHexString(hex) {
  const clean = hex.replace(/\s+/g, '');
  if (clean.startsWith('FEFF') || clean.startsWith('feff')) {
    let out = '';
    for (let i = 4; i + 3 < clean.length; i += 4) {
      out += String.fromCharCode(parseInt(clean.slice(i, i + 4), 16));
    }
    return out;
  }
  let out = '';
  for (let i = 0; i + 1 < clean.length; i += 2) {
    const code = parseInt(clean.slice(i, i + 2), 16);
    if (code >= 32 && code <= 255) out += String.fromCharCode(code);
  }
  return out;
}

function extractOperatorsText(contentStr) {
  const chunks = [];
  const tjRegex = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  let m;
  while ((m = tjRegex.exec(contentStr)) !== null) {
    const inner = m[0].replace(/\)\s*Tj$/, '').slice(1);
    chunks.push(decodePdfLiteralString(inner));
  }

  const arrRegex = /\[((?:.|\n|\r)*?)\]\s*TJ/g;
  while ((m = arrRegex.exec(contentStr)) !== null) {
    const arrBody = m[1];
    const subParts = [];
    const subRe = /\((?:\\.|[^\\)])*\)|<([0-9A-Fa-f\s]+)>/g;
    let sm;
    while ((sm = subRe.exec(arrBody)) !== null) {
      if (sm[0].startsWith('(')) {
        subParts.push(decodePdfLiteralString(sm[0].slice(1, -1)));
      } else if (sm[1]) {
        subParts.push(decodePdfHexString(sm[1]));
      }
    }
    if (subParts.length > 0) chunks.push(subParts.join(''));
  }

  return chunks.join(' ').replace(/\s+/g, ' ').trim();
}

export async function extractRawTextFromPdfFile(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const latin1 = new TextDecoder('latin1').decode(bytes);

  const extractedSegments = [];
  const direct = extractOperatorsText(latin1);
  if (direct.length > 10) extractedSegments.push(direct);

  const streamMarker = /stream\r?\n/g;
  let match;
  let countStreams = 0;
  while ((match = streamMarker.exec(latin1)) !== null && countStreams < 45) {
    const startOffset = match.index + match[0].length;
    const endIdx = latin1.indexOf('endstream', startOffset);
    if (endIdx === -1) break;
    let sliceEnd = endIdx;
    if (latin1[sliceEnd - 1] === '\n') sliceEnd--;
    if (latin1[sliceEnd - 1] === '\r') sliceEnd--;

    const slice = bytes.slice(startOffset, sliceEnd);
    countStreams++;
    const inflated = await inflatePdfStreamBytes(slice);
    if (inflated && inflated.length > 0) {
      const decStr = new TextDecoder('latin1').decode(inflated);
      const txt = extractOperatorsText(decStr);
      if (txt) extractedSegments.push(txt);
    }
  }

  return extractedSegments.join('\n').trim();
}

// ============================================================================
// PARSER DETERMINÍSTICO DE PRESUPUESTOS (PARA PDF, TEXTO Y CHARLAS DE WHATSAPP)
// ============================================================================
function parseArAmount(raw) {
  if (typeof raw === 'number') return raw;
  const s = String(raw || '').trim();
  if (!s) return 0;
  let clean = s.replace(/[^\d.,]/g, '');
  if (!clean) return 0;
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    const parts = clean.split(',');
    if (parts[parts.length - 1].length <= 2) {
      clean = clean.replace(',', '.');
    } else {
      clean = clean.replace(/,/g, '');
    }
  } else if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts[parts.length - 1].length === 3) {
      clean = clean.replace(/\./g, '');
    }
  }
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : Math.round(n);
}

function classifyFilterTypeByCode(code, contextLine = '') {
  const c = String(code || '').toUpperCase();
  const ctx = String(contextLine || '').toLowerCase();
  if (ctx.includes('habit') || ctx.includes('cabina') || ctx.includes('polen') || c.startsWith('AKX') || c.startsWith('CU')) return 'habitaculo';
  if (ctx.includes('comb') || ctx.includes('nafta') || ctx.includes('gasoil') || ctx.includes('diesel') || c.startsWith('FCI') || c.startsWith('FCD') || c.startsWith('JFC') || c.startsWith('WK') || c.startsWith('KL')) return 'combustible';
  if (ctx.includes('aire') || c.startsWith('FAP') || c.startsWith('JFA') || c.startsWith('WR') || /^C\s?\d{3,5}/.test(c) || c.startsWith('LX') || c.startsWith('CA')) return 'aire';
  return 'aceite';
}

export function normalizeFilterCodeKey(code) {
  return String(code || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .trim();
}

export function parseQuoteFromTextOrPdf(rawText, options = {}) {
  const {
    fileName = '',
    branchKey = 'Centro',
    branchName = 'Check Oil Suc. Centro',
    vehicleHint = 'Vehículo',
    ticketId = `COT-${String(Date.now()).slice(-4)}`,
    formatoOrigen = fileName ? 'pdf' : 'texto'
  } = options;

  const text = String(rawText || '').trim();
  const lines = text
    .split(/\r?\n|(?=\b(?:WO|JFO|FAP|JFA|WR|AKX|FCI|FCD|JFC|MOTUL|GULF|LIQUI)\b)/i)
    .map((l) => l.trim())
    .filter(Boolean);

  const hasQuestionWords = /\?|motor|cilindrada|nafta|diesel|gasolera|patente|chasis|sint[eé]tico|semi|4x2|4x4|autom[aá]tic|manual/i.test(text);
  const moneyMatches = text.match(/\$\s*\d[\d.,]*|\b\d{2,3}(?:\.\d{3})+(?:,\d{2})?\b/g) || [];
  if (formatoOrigen === 'texto' && hasQuestionWords && moneyMatches.length === 0) {
    return {
      tipo_respuesta_sucursal: 'pregunta_al_cliente',
      pregunta_para_cliente: `Para terminar de cotizar exacto tu ${vehicleHint}, desde ${branchName} me consultan: *${text}*`,
      resumen_para_cliente: '',
      quoteRecord: null
    };
  }

  const filterCodeRegex = /\b((?:WO|JFO|FAP|JFA|WR|AKX|FCI|FCD|JFC|W|WK|HU|CUK|CU|PH|CA|CH|OC|LX|KL|LA)[-\s]?\d{2,5}[A-Z0-9/]*)\b/gi;
  const filtrosMap = new Map();

  for (const line of lines) {
    let fm;
    filterCodeRegex.lastIndex = 0;
    while ((fm = filterCodeRegex.exec(line)) !== null) {
      const rawCode = fm[1].toUpperCase().replace(/\s+/g, '-');
      if (/^W-?(16|20|30|40|50|60|80|90)$/i.test(rawCode)) continue;
      const normKey = normalizeFilterCodeKey(rawCode);
      const linePrices = (line.match(/\$\s*\d[\d.,]*|\b\d{1,3}(?:\.\d{3})+(?:,\d{2})?\b|\b\d{4,6}\b/g) || [])
        .map(parseArAmount)
        .filter((n) => n >= 2500 && n <= 350000);
      const unitPrice = linePrices.length > 0 ? linePrices[linePrices.length - 1] : 0;

      let marca = 'WEGA';
      if (/mann|\b(w|wk|hu|cu|cuk)-?\d/i.test(line) && !/^(WO|WR)/i.test(rawCode)) marca = 'MANN';
      else if (/fram|\b(ph|ca|ch)-?\d/i.test(line)) marca = 'FRAM';
      else if (/mahle|\b(oc|lx|kl|la)-?\d/i.test(line)) marca = 'MAHLE';

      if (!filtrosMap.has(normKey)) {
        filtrosMap.set(normKey, {
          tipo: classifyFilterTypeByCode(rawCode, line),
          marca,
          codigo: rawCode,
          cantidad: 1,
          precio_unitario: unitPrice,
          subtotal: unitPrice
        });
      }
    }
  }

  const oilBrandMatch = text.match(/\b(MOTUL|LIQUI\s*MOLY|GULF|SHELL|YPF\s*ELAION|ELAION|TOTAL|CASTROL|VALVOLINE|MOBIL)\b/i);
  const oilViscMatch = text.match(/\b(0W-?16|0W-?20|0W-?30|5W-?30|5W-?40|10W-?40|15W-?40|20W-?50|25W-?60|75W-?90)\b/i);
  let aceite = null;
  if (oilBrandMatch || oilViscMatch) {
    const oilLineObj = lines.find((l) =>
      /(MOTUL|LIQUI\s*MOLY|GULF|SHELL|ELAION|TOTAL|CASTROL|VALVOLINE|0W|5W|10W|15W|20W)/i.test(l)
    ) || text;

    const litrosMatch =
      oilLineObj.match(/(\d+(?:[.,]\d+)?)\s*(?:litros?|lts?\.?|l\b)/i) ||
      text.match(/x\s*(\d)\s*(?:l|lts)/i);
    const litros = litrosMatch ? parseFloat(litrosMatch[1].replace(',', '.')) : 4;

    const lineNums = (oilLineObj.match(/\$\s*\d[\d.,]*|\b\d{1,3}(?:\.\d{3})+(?:,\d{2})?\b|\b\d{5,6}\b/g) || [])
      .map(parseArAmount)
      .filter((n) => n >= 5000 && n <= 600000);

    let subtotal = lineNums.length > 0 ? Math.max(...lineNums) : 0;
    let precioPorLitro = litros > 0 && subtotal > 0 ? Math.round(subtotal / litros) : 0;
    if (lineNums.length >= 2) {
      const sorted = [...lineNums].sort((a, b) => a - b);
      if (Math.abs(sorted[0] * litros - sorted[sorted.length - 1]) < 4000) {
        precioPorLitro = sorted[0];
        subtotal = sorted[sorted.length - 1];
      }
    }

    const lineaMatch = oilLineObj.match(/\b(8100|6100|4100|SPECIFIC|ULTRASYNTH|FORMULA\s*G|MAX|LEICHTLAUF|TOP\s*TEC|MOLYGEN)\b/i);

    aceite = {
      marca: (oilBrandMatch ? oilBrandMatch[1] : 'LUBRICANTE').toUpperCase().replace(/\s+/g, ' '),
      linea: lineaMatch ? lineaMatch[1].toUpperCase() : '',
      viscosidad: oilViscMatch ? oilViscMatch[1].toUpperCase().replace('-', '') : '',
      litros,
      precio_por_litro: precioPorLitro,
      subtotal
    };
  }

  const filtros = Array.from(filtrosMap.values());

  const explicitTotalMatch = text.match(/total(?:\s+general|\s+presupuesto|\s+final)?\s*:?\s*\$?\s*(\d[\d.,]*)/i);
  let totalCotizado = explicitTotalMatch ? parseArAmount(explicitTotalMatch[1]) : 0;
  const sumItems = (aceite?.subtotal || 0) + filtros.reduce((acc, f) => acc + (f.subtotal || 0), 0);

  if (!totalCotizado) {
    const allAmounts = moneyMatches.map(parseArAmount).filter((n) => n >= 8000 && n <= 2500000);
    if (sumItems > 0 && allAmounts.includes(sumItems)) {
      totalCotizado = sumItems;
    } else if (allAmounts.length > 0) {
      totalCotizado = Math.max(...allAmounts);
    } else {
      totalCotizado = sumItems;
    }
  }

  const discountMatch = text.match(/(\d{1,2})\s*%\s*(?:off|desc|descuento|efectivo|transferencia)/i);
  const descuentoPorcentaje = discountMatch ? Number(discountMatch[1]) : 0;
  const totalConDescuento = descuentoPorcentaje > 0 && totalCotizado > 0
    ? Math.round(totalCotizado * (1 - descuentoPorcentaje / 100))
    : 0;

  const partsSummary = [];
  if (aceite) {
    partsSummary.push(`${aceite.marca}${aceite.linea ? ' ' + aceite.linea : ''} ${aceite.viscosidad} (${aceite.litros}L)`.trim());
  }
  if (filtros.length > 0) {
    partsSummary.push(`${filtros.length} Filtro${filtros.length > 1 ? 's' : ''} (${filtros.map((f) => f.codigo).join(', ')})`);
  }
  const resumenItemsCorto = partsSummary.join(' + ') || 'Cotización de servicio de lubricentro';

  const bulletLines = [];
  if (aceite) {
    bulletLines.push(
      `• *Aceite:* ${aceite.marca}${aceite.linea ? ' ' + aceite.linea : ''} ${aceite.viscosidad} x ${aceite.litros}L` +
        (aceite.subtotal ? ` — $${aceite.subtotal.toLocaleString('es-AR')}` : '')
    );
  }
  const tipoNombre = {
    aceite: 'Filtro de Aceite',
    aire: 'Filtro de Aire',
    combustible: 'Filtro de Combustible',
    habitaculo: 'Filtro de Habitáculo'
  };
  for (const f of filtros) {
    bulletLines.push(
      `• *${tipoNombre[f.tipo] || 'Filtro'}:* ${f.marca} ${f.codigo}` +
        (f.subtotal ? ` — $${f.subtotal.toLocaleString('es-AR')}` : '')
    );
  }

  const resumenParaCliente =
    `¡Hola! Ya tenemos el presupuesto de *${branchName}* para tu *${vehicleHint}* (Ref. #${ticketId}):\n\n` +
    (bulletLines.length > 0 ? `${bulletLines.join('\n')}\n\n` : `• *Detalle:* ${text.slice(0, 260)}\n\n`) +
    (totalCotizado > 0 ? `💰 *Total Presupuestado:* $${totalCotizado.toLocaleString('es-AR')}\n` : '') +
    (totalConDescuento > 0
      ? `💵 *Efectivo / Transferencia (${descuentoPorcentaje}% OFF):* $${totalConDescuento.toLocaleString('es-AR')}\n`
      : '') +
    (formatoOrigen === 'pdf' ? `\n📎 _Te adjuntamos también el presupuesto original en PDF._\n` : '\n') +
    `¿Querés que *confirmemos este presupuesto* para reservar tu turno o coordinar con la sucursal?`;

  return {
    tipo_respuesta_sucursal: 'presupuesto',
    pregunta_para_cliente: '',
    resumen_para_cliente: resumenParaCliente,
    quoteRecord: {
      ticket_id: ticketId,
      sucursal: branchKey,
      sucursal_nombre: branchName,
      vehiculo: vehicleHint,
      modelo_normalizado: normalizeVehicleModelGroup(vehicleHint),
      formato_origen: formatoOrigen,
      archivo_nombre: fileName,
      moneda: 'ARS',
      total_cotizado: totalCotizado,
      total_con_descuento: totalConDescuento,
      descuento_porcentaje: descuentoPorcentaje,
      aceite,
      filtros,
      otros_items: [],
      resumen_items: resumenItemsCorto,
      observaciones_calidad:
        formatoOrigen === 'pdf'
          ? `PDF procesado (${filtros.length} filtros detectados${aceite ? ` + aceite ${aceite.marca} ${aceite.viscosidad}` : ''}).`
          : 'Cotización procesada desde mensaje de texto.',
      texto_original_sucursal: text
    }
  };
}

// ============================================================================
// EXTRACTOR Y ANALIZADOR PROFUNDO DE CHARLAS Y PRESUPUESTOS EN SESIONES
// ============================================================================
export function extractAllQuotesFromSessions(sessions = [], extraQuotes = []) {
  const map = new Map();

  for (const q of extraQuotes || []) {
    if (q && q.ticket_id) {
      map.set(q.ticket_id, {
        ...q,
        modelo_normalizado: q.modelo_normalizado || normalizeVehicleModelGroup(q.vehiculo)
      });
    }
  }

  for (const s of sessions || []) {
    const historial = parseSafeJson(s.historial_json, []);
    const histList = parseSafeJson(s.cotizaciones_historial_json, []);
    if (Array.isArray(histList)) {
      for (const q of histList) {
        if (q && q.ticket_id) {
          map.set(q.ticket_id, {
            ...q,
            cliente_jid: q.cliente_jid || s.documentId,
            cliente_nombre: q.cliente_nombre || s.cliente_nombre || 'Cliente',
            cliente_telefono: q.cliente_telefono || s.cliente_telefono || '',
            vehiculo: q.vehiculo || s.vehiculo || 'Vehículo',
            modelo_normalizado: normalizeVehicleModelGroup(q.vehiculo || s.vehiculo),
            historial_charla: Array.isArray(historial) ? historial : [],
            estado:
              s.estado_cotizacion === 'confirmado' && s.ticket_id === q.ticket_id
                ? 'confirmado'
                : q.estado || s.estado_cotizacion || 'presupuesto_enviado'
          });
        }
      }
    }

    const curr = parseSafeJson(s.cotizacion_actual_json, null);
    if (curr && curr.ticket_id && !map.has(curr.ticket_id)) {
      map.set(curr.ticket_id, {
        ...curr,
        cliente_jid: curr.cliente_jid || s.documentId,
        cliente_nombre: curr.cliente_nombre || s.cliente_nombre || 'Cliente',
        cliente_telefono: curr.cliente_telefono || s.cliente_telefono || '',
        vehiculo: curr.vehiculo || s.vehiculo || 'Vehículo',
        modelo_normalizado: normalizeVehicleModelGroup(curr.vehiculo || s.vehiculo),
        historial_charla: Array.isArray(historial) ? historial : [],
        estado: s.estado_cotizacion || curr.estado || 'presupuesto_enviado'
      });
    }

    // Pedidos activos esperando respuesta de la sucursal o repregunta
    if (
      s.ticket_id &&
      (s.estado_cotizacion === 'esperando_sucursal' ||
        s.estado_cotizacion === 'esperando_respuesta_cliente' ||
        s.estado_cotizacion === 'presupuesto_enviado') &&
      !map.has(s.ticket_id)
    ) {
      map.set(s.ticket_id, {
        ticket_id: s.ticket_id,
        cliente_jid: s.documentId,
        cliente_nombre: s.cliente_nombre || 'Cliente',
        cliente_telefono: s.cliente_telefono || '',
        sucursal: s.sucursal_cotizacion || s.sucursal_elegida || 'Centro',
        vehiculo: s.vehiculo || 'No especificado',
        modelo_normalizado: normalizeVehicleModelGroup(s.vehiculo),
        fecha_pedido: s.fecha_pedido_cotizacion || s.ultima_interaccion,
        fecha_respuesta: s.fecha_respuesta_cotizacion || '',
        demora_neta_sucursal_min: s.demora_neta_sucursal_min ? Number(s.demora_neta_sucursal_min) : null,
        formato_origen: 'pendiente',
        total_cotizado: 0,
        aceite: null,
        filtros: [],
        historial_charla: Array.isArray(historial) ? historial : [],
        resumen_items:
          s.estado_cotizacion === 'esperando_respuesta_cliente'
            ? `Sucursal repreguntó: "${s.ultima_pregunta_sucursal || ''}"`
            : 'Esperando cotización de la sucursal...',
        estado: s.estado_cotizacion
      });
    }

    // ESCANEO INTELIGENTE DE CHARLAS: si una sesión en sesiones_clientes tiene mensajes con códigos de filtros,
    // marcas de aceite o montos cotizados en el historial y aún no tenía objeto cotizacion_actual_json, lo analiza automáticamente
    if (Array.isArray(historial) && historial.length > 0 && !s.ticket_id) {
      const combinedChatText = historial.map((m) => m?.texto || '').join('\n');
      const hasFilterOrOilAndPrice =
        (/\b(WO|JFO|FAP|JFA|WR|AKX|FCI|FCD|JFC|MOTUL|LIQUI\s*MOLY|GULF|5W30|5W40|0W20|10W40)\b/i.test(combinedChatText) &&
          /\$\s*\d{2,3}(?:\.\d{3})|\b\d{5,6}\b/.test(combinedChatText));

      if (hasFilterOrOilAndPrice) {
        const autoId = `CHAT-${String(s.documentId || '').replace(/\D/g, '').slice(-4) || '001'}`;
        if (!map.has(autoId)) {
          const parsedFromChat = parseQuoteFromTextOrPdf(combinedChatText, {
            branchKey: s.sucursal_elegida && s.sucursal_elegida !== 'Sin definir' ? s.sucursal_elegida : 'Centro',
            branchName: `Check Oil Suc. ${s.sucursal_elegida || 'Centro'}`,
            vehicleHint: s.vehiculo || 'Vehículo en charla',
            ticketId: autoId,
            formatoOrigen: 'charla_analizada'
          });
          if (parsedFromChat.quoteRecord && (parsedFromChat.quoteRecord.filtros.length > 0 || parsedFromChat.quoteRecord.aceite)) {
            const firstMsgTime = historial[0]?.fecha || s.ultima_interaccion;
            const lastMsgTime = historial[historial.length - 1]?.fecha || s.ultima_interaccion;
            const delayCalc = calculateBusinessMinutesBetween(firstMsgTime, lastMsgTime);
            map.set(autoId, {
              ...parsedFromChat.quoteRecord,
              cliente_jid: s.documentId,
              cliente_nombre: s.cliente_nombre || 'Cliente',
              cliente_telefono: s.cliente_telefono || '',
              fecha_pedido: firstMsgTime,
              fecha_respuesta: lastMsgTime,
              demora_total_min: delayCalc,
              demora_habil_min: delayCalc,
              demora_neta_sucursal_min: delayCalc,
              historial_charla: historial,
              estado: s.estado_charla === 'derivada' ? 'confirmado' : 'presupuesto_enviado',
              extraidoDeCharla: true
            });
          }
        }
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.fecha_pedido || b.fecha_respuesta || 0).getTime() - new Date(a.fecha_pedido || a.fecha_respuesta || 0).getTime()
  );
}

// ============================================================================
// CONSOLIDADOR DE ESTADÍSTICAS: SUCURSALES, MODELOS, PRECIOS Y FRANJAS HORARIAS
// ============================================================================
export function buildBranchQuotesAuditReport(quotes = [], botConfig = {}) {
  const schedule = getParsedBusinessHours(botConfig);
  const slaLimit = Number(botConfig?.sla_recordatorio_minutos || 15);
  const nowIso = new Date().toISOString();

  const enrichedQuotes = quotes.map((q) => {
    const waitingLiveMin =
      !q.fecha_respuesta && q.fecha_pedido && q.estado === 'esperando_sucursal'
        ? calculateBusinessMinutesBetween(q.fecha_pedido, nowIso, schedule)
        : null;
    const effectiveDelay =
      q.demora_neta_sucursal_min != null && q.demora_neta_sucursal_min !== ''
        ? Number(q.demora_neta_sucursal_min)
        : waitingLiveMin;

    const timeMeta = getArgentinaTimeMetadata(q.fecha_pedido || q.fecha_respuesta);
    const respMeta = q.fecha_respuesta ? getArgentinaTimeMetadata(q.fecha_respuesta) : null;
    const modelGroup = q.modelo_normalizado || normalizeVehicleModelGroup(q.vehiculo);

    return {
      ...q,
      modelo_normalizado: modelGroup,
      waitingLiveMin,
      effectiveDelay,
      exceededSla: effectiveDelay != null && effectiveDelay > slaLimit,
      timeSlotId: timeMeta.slotId,
      timeSlotLabel: timeMeta.slotLabel,
      shortSlot: timeMeta.shortSlot,
      requestHourFormatted: timeMeta.hourFormatted,
      responseHourFormatted: respMeta ? respMeta.hourFormatted : 'Pendiente',
      weekdayEs: timeMeta.weekdayEs
    };
  });

  // 1. KPIs por sucursal
  const branchStats = BROKER_BRANCHES.map((b) => {
    const bQuotes = enrichedQuotes.filter((q) =>
      String(q.sucursal || '').toLowerCase().includes(b.key.toLowerCase())
    );
    const responded = bQuotes.filter((q) => Boolean(q.fecha_respuesta) || q.estado === 'presupuesto_enviado' || q.estado === 'confirmado');
    const waiting = bQuotes.filter((q) => q.estado === 'esperando_sucursal');
    const askingClient = bQuotes.filter((q) => q.estado === 'esperando_respuesta_cliente');
    const confirmed = bQuotes.filter((q) => q.estado === 'confirmado');
    const pdfOnes = responded.filter((q) => q.formato_origen === 'pdf');
    const delays = responded
      .map((q) => Number(q.demora_neta_sucursal_min || q.demora_habil_min || 0))
      .filter((n) => n > 0);

    const avgDelayMin = delays.length > 0 ? Math.round(delays.reduce((a, c) => a + c, 0) / delays.length) : null;
    const minDelayMin = delays.length > 0 ? Math.min(...delays) : null;
    const maxDelayMin = delays.length > 0 ? Math.max(...delays) : null;
    const fastUnder15 = delays.filter((d) => d <= 15).length;
    const fastPct = delays.length > 0 ? Math.round((fastUnder15 / delays.length) * 100) : 0;
    const slaBreaches = bQuotes.filter((q) => q.exceededSla).length;

    const totalsQuoted = responded.map((q) => Number(q.total_cotizado || 0)).filter((n) => n > 0);
    const avgTicketArs = totalsQuoted.length > 0
      ? Math.round(totalsQuoted.reduce((a, c) => a + c, 0) / totalsQuoted.length)
      : 0;

    return {
      ...b,
      total: bQuotes.length,
      respondedCount: responded.length,
      waitingCount: waiting.length,
      askingClientCount: askingClient.length,
      confirmedCount: confirmed.length,
      acceptancePct: responded.length > 0 ? Math.round((confirmed.length / responded.length) * 100) : 0,
      pdfPct: responded.length > 0 ? Math.round((pdfOnes.length / responded.length) * 100) : 0,
      avgDelayMin,
      minDelayMin,
      maxDelayMin,
      fastPct,
      slaBreaches,
      avgTicketArs
    };
  });

  // 2. Matriz de Filtros y Aceites cotizados por Modelo de Vehículo y Sucursal
  const modelMap = new Map();
  for (const q of enrichedQuotes) {
    if (!q.filtros?.length && !q.aceite && !q.total_cotizado) continue;
    const mKey = q.modelo_normalizado || 'Vehículo sin especificar';
    if (!modelMap.has(mKey)) {
      modelMap.set(mKey, {
        modelo: mKey,
        cotizaciones: [],
        sucursalesParticipantes: new Set(),
        codigosPorTipo: {
          aceite: new Set(),
          aire: new Set(),
          combustible: new Set(),
          habitaculo: new Set()
        },
        aceitesUsados: new Set()
      });
    }
    const group = modelMap.get(mKey);
    const branchKey = BROKER_BRANCHES.find((b) =>
      String(q.sucursal || '').toLowerCase().includes(b.key.toLowerCase())
    )?.key || q.sucursal || 'Centro';

    group.sucursalesParticipantes.add(branchKey);

    const byType = { aceite: null, aire: null, combustible: null, habitaculo: null };
    for (const f of q.filtros || []) {
      const t = f.tipo || 'aceite';
      const code = normalizeFilterCodeKey(f.codigo);
      if (byType[t] === null && code) {
        byType[t] = { codigo: code, marca: f.marca || 'WEGA', precio: Number(f.precio_unitario || f.subtotal || 0) };
      }
      if (code && group.codigosPorTipo[t]) {
        group.codigosPorTipo[t].add(code);
      }
    }

    const oilLabel = q.aceite?.marca
      ? `${q.aceite.marca} ${q.aceite.linea || ''} ${q.aceite.viscosidad || ''}`.replace(/\s+/g, ' ').trim()
      : '';
    if (oilLabel) group.aceitesUsados.add(oilLabel);

    group.cotizaciones.push({
      ticket_id: q.ticket_id,
      sucursal: branchKey,
      vehiculo_detalle: q.vehiculo,
      fecha_pedido: q.fecha_pedido,
      demora_min: q.effectiveDelay,
      formato_origen: q.formato_origen,
      filtrosPorTipo: byType,
      aceite: q.aceite,
      oilLabel,
      total_cotizado: Number(q.total_cotizado || 0),
      isDemoPreview: Boolean(q.isDemoPreview)
    });
  }

  const vehicleModelsComparison = Array.from(modelMap.values()).map((g) => {
    const totals = g.cotizaciones.map((c) => c.total_cotizado).filter((n) => n > 0);
    const minTotal = totals.length > 0 ? Math.min(...totals) : 0;
    const maxTotal = totals.length > 0 ? Math.max(...totals) : 0;
    const diffTotalAbs = maxTotal - minTotal;
    const diffTotalPct = minTotal > 0 ? Math.round((diffTotalAbs / minTotal) * 100) : 0;

    // Detectar si para el mismo modelo de auto dos sucursales pasaron distinto código de filtro
    const filterCodeMismatch = Object.entries(g.codigosPorTipo)
      .filter(([, setCodes]) => setCodes.size > 1)
      .map(([tipo, setCodes]) => `${tipo.toUpperCase()}: ${Array.from(setCodes).join(' vs ')}`);

    return {
      modelo: g.modelo,
      quotesCount: g.cotizaciones.length,
      branchesCount: g.sucursalesParticipantes.size,
      branchesList: Array.from(g.sucursalesParticipantes),
      cotizaciones: g.cotizaciones,
      minTotal,
      maxTotal,
      diffTotalAbs,
      diffTotalPct,
      filterCodeMismatch,
      hasCodeMismatch: filterCodeMismatch.length > 0,
      hasPriceSpread: diffTotalPct >= 4 && diffTotalAbs >= 2000
    };
  });

  // 3. Dispersión de Precios por Filtro y por Aceite entre Sucursales
  const itemBuckets = new Map();

  for (const q of enrichedQuotes) {
    const branchKey = BROKER_BRANCHES.find((b) =>
      String(q.sucursal || '').toLowerCase().includes(b.key.toLowerCase())
    )?.key || q.sucursal || 'Centro';

    for (const f of q.filtros || []) {
      const price = Number(f.precio_unitario || f.subtotal || 0);
      if (!f.codigo || price <= 0) continue;
      const itemKey = `FILTRO:${normalizeFilterCodeKey(f.codigo)}`;
      if (!itemBuckets.has(itemKey)) {
        itemBuckets.set(itemKey, {
          itemKey,
          tipoItem: 'filtro',
          subtipoFiltro: f.tipo || 'aceite',
          categoria: `Filtro de ${(f.tipo || 'aceite').charAt(0).toUpperCase() + (f.tipo || 'aceite').slice(1)}`,
          codigo: normalizeFilterCodeKey(f.codigo),
          descripcion: `${f.marca || 'WEGA'} ${normalizeFilterCodeKey(f.codigo)}`,
          modelosDondeAplica: new Set(),
          porSucursal: {}
        });
      }
      const bucket = itemBuckets.get(itemKey);
      bucket.modelosDondeAplica.add(q.modelo_normalizado);
      if (!bucket.porSucursal[branchKey]) {
        bucket.porSucursal[branchKey] = { precios: [], ultimoPrecio: price, ultimoTicket: q.ticket_id, vehiculo: q.vehiculo };
      }
      bucket.porSucursal[branchKey].precios.push(price);
      bucket.porSucursal[branchKey].ultimoPrecio = price;
    }

    if (q.aceite && q.aceite.marca) {
      const unitOilPrice =
        Number(q.aceite.precio_por_litro || 0) ||
        (Number(q.aceite.litros || 0) > 0 && Number(q.aceite.subtotal || 0) > 0
          ? Math.round(Number(q.aceite.subtotal) / Number(q.aceite.litros))
          : 0);

      if (unitOilPrice > 0) {
        const oilCode = `${q.aceite.marca} ${q.aceite.linea || ''} ${q.aceite.viscosidad || ''}`
          .replace(/\s+/g, ' ')
          .trim()
          .toUpperCase();
        const itemKey = `ACEITE:${oilCode}`;
        if (!itemBuckets.has(itemKey)) {
          itemBuckets.set(itemKey, {
            itemKey,
            tipoItem: 'aceite',
            subtipoFiltro: 'lubricante',
            categoria: 'Aceite Lubricante (Valor por Litro)',
            codigo: oilCode,
            descripcion: `${oilCode} ($/Litro)`,
            modelosDondeAplica: new Set(),
            porSucursal: {}
          });
        }
        const bucket = itemBuckets.get(itemKey);
        bucket.modelosDondeAplica.add(q.modelo_normalizado);
        if (!bucket.porSucursal[branchKey]) {
          bucket.porSucursal[branchKey] = { precios: [], ultimoPrecio: unitOilPrice, ultimoTicket: q.ticket_id, vehiculo: q.vehiculo };
        }
        bucket.porSucursal[branchKey].precios.push(unitOilPrice);
        bucket.porSucursal[branchKey].ultimoPrecio = unitOilPrice;
      }
    }
  }

  const priceDispersionRows = Array.from(itemBuckets.values())
    .map((b) => {
      const entries = Object.entries(b.porSucursal).map(([suc, info]) => {
        const avg = Math.round(info.precios.reduce((acc, v) => acc + v, 0) / info.precios.length);
        return {
          sucursal: suc,
          avgPrice: avg,
          lastPrice: info.ultimoPrecio,
          count: info.precios.length,
          ticket: info.ultimoTicket,
          vehiculo: info.vehiculo
        };
      });
      const allPrices = entries.flatMap((e) => [e.avgPrice, e.lastPrice]).filter((n) => n > 0);
      const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
      const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;
      const diffAbs = maxPrice - minPrice;
      const diffPct = minPrice > 0 ? Math.round((diffAbs / minPrice) * 100) : 0;

      const cheapestBranch = entries.find((e) => e.lastPrice === minPrice)?.sucursal || '';
      const priciestBranch = entries.find((e) => e.lastPrice === maxPrice)?.sucursal || '';

      return {
        ...b,
        modelosList: Array.from(b.modelosDondeAplica),
        entries,
        branchesCount: entries.length,
        minPrice,
        maxPrice,
        diffAbs,
        diffPct,
        cheapestBranch,
        priciestBranch,
        hasDiscrepancy: diffPct >= 3 && diffAbs >= 500
      };
    })
    .sort((a, b) => b.diffPct - a.diffPct || b.branchesCount - a.branchesCount);

  // 4. Estadística de Demoras por Franja Horaria (¿Hay más o menos demora en ciertos horarios?)
  const hourlySlotStats = TIME_SLOTS_CONFIG.map((slot) => {
    const slotQuotes = enrichedQuotes.filter((q) => q.timeSlotId === slot.id);
    const delays = slotQuotes
      .map((q) => q.effectiveDelay)
      .filter((d) => d != null && d > 0);

    const avgDelayMin = delays.length > 0 ? Math.round(delays.reduce((a, c) => a + c, 0) / delays.length) : null;
    const minDelayMin = delays.length > 0 ? Math.min(...delays) : null;
    const maxDelayMin = delays.length > 0 ? Math.max(...delays) : null;
    const slaBreaches = slotQuotes.filter((q) => q.exceededSla).length;

    // Desglose por sucursal dentro de esta franja horaria
    const byBranch = {};
    for (const q of slotQuotes) {
      if (q.effectiveDelay != null && q.effectiveDelay > 0) {
        const bKey = q.sucursal || 'Centro';
        if (!byBranch[bKey]) byBranch[bKey] = [];
        byBranch[bKey].push(q.effectiveDelay);
      }
    }
    const branchBreakdown = Object.entries(byBranch).map(([suc, arr]) => ({
      sucursal: suc,
      avgMin: Math.round(arr.reduce((a, c) => a + c, 0) / arr.length),
      count: arr.length
    }));

    return {
      ...slot,
      totalPedidos: slotQuotes.length,
      avgDelayMin,
      minDelayMin,
      maxDelayMin,
      slaBreaches,
      branchBreakdown
    };
  });

  // Detectar cuál es la franja horaria más lenta y más rápida
  const slotsWithData = hourlySlotStats.filter((s) => s.avgDelayMin != null);
  const slowestSlot = slotsWithData.length > 0
    ? [...slotsWithData].sort((a, b) => b.avgDelayMin - a.avgDelayMin)[0]
    : null;
  const fastestSlot = slotsWithData.length > 0
    ? [...slotsWithData].sort((a, b) => a.avgDelayMin - b.avgDelayMin)[0]
    : null;

  const allResponded = enrichedQuotes.filter((q) => Boolean(q.fecha_respuesta) || q.estado === 'presupuesto_enviado' || q.estado === 'confirmado');
  const allConfirmed = enrichedQuotes.filter((q) => q.estado === 'confirmado');
  const allWaiting = enrichedQuotes.filter((q) => q.estado === 'esperando_sucursal' || q.estado === 'esperando_respuesta_cliente');
  const allDelays = allResponded
    .map((q) => Number(q.demora_neta_sucursal_min || q.demora_habil_min || 0))
    .filter((n) => n > 0);
  const globalAvgDelayMin = allDelays.length > 0 ? Math.round(allDelays.reduce((a, c) => a + c, 0) / allDelays.length) : null;

  return {
    totalQuotes: enrichedQuotes.length,
    respondedCount: allResponded.length,
    waitingCount: allWaiting.length,
    confirmedCount: allConfirmed.length,
    globalAcceptancePct: allResponded.length > 0 ? Math.round((allConfirmed.length / allResponded.length) * 100) : 0,
    globalAvgDelayMin,
    discrepanciesCount: priceDispersionRows.filter((r) => r.hasDiscrepancy).length,
    modelsWithDifferenceCount: vehicleModelsComparison.filter((m) => m.hasCodeMismatch || m.hasPriceSpread).length,
    enrichedQuotes,
    branchStats,
    vehicleModelsComparison,
    priceDispersionRows,
    hourlySlotStats,
    slowestSlot,
    fastestSlot
  };
}

// ============================================================================
// DATASET DEMO MULTI-SUCURSAL PARA VER MATRIZ DE MODELOS, FILTROS Y HORARIOS
// ============================================================================
export const DEMO_PREVIEW_QUOTES = [
  {
    ticket_id: 'DEMO-101',
    isDemoPreview: true,
    cliente_nombre: 'Matías (Ejemplo Pulse 1.0)',
    cliente_telefono: '5492944912803',
    sucursal: 'Centro',
    sucursal_nombre: 'Check Oil Suc. Centro',
    vehiculo: 'Fiat Pulse Audace 2025 1.0 Turbo',
    fecha_pedido: '2026-11-10T12:15:00.000Z', // 09:15 AR (Mañana)
    fecha_respuesta: '2026-11-10T12:23:00.000Z',
    demora_total_min: 8,
    demora_habil_min: 8,
    demora_neta_sucursal_min: 8,
    formato_origen: 'pdf',
    archivo_nombre: 'Presupuesto_Centro_Pulse_00421.pdf',
    total_cotizado: 149500,
    total_con_descuento: 134550,
    descuento_porcentaje: 10,
    aceite: { marca: 'MOTUL', linea: '8100', viscosidad: '0W20', litros: 4, precio_por_litro: 22500, subtotal: 90000 },
    filtros: [
      { tipo: 'aceite', marca: 'WEGA', codigo: 'WO-120', cantidad: 1, precio_unitario: 14500, subtotal: 14500 },
      { tipo: 'aire', marca: 'WEGA', codigo: 'FAP-3285', cantidad: 1, precio_unitario: 24000, subtotal: 24000 },
      { tipo: 'habitaculo', marca: 'WEGA', codigo: 'AKX-1938', cantidad: 1, precio_unitario: 21000, subtotal: 21000 }
    ],
    resumen_items: 'MOTUL 8100 0W20 (4L) + 3 Filtros (WO-120, FAP-3285, AKX-1938)',
    observaciones_calidad: 'Franja Mañana (09:15 hs) • Respondió en 8 min con PDF completo.',
    estado: 'confirmado'
  },
  {
    ticket_id: 'DEMO-102',
    isDemoPreview: true,
    cliente_nombre: 'Diego (Comparativa Pulse 1.0)',
    cliente_telefono: '5492944550911',
    sucursal: 'Ñireco',
    sucursal_nombre: 'Check Oil Suc. Ñireco',
    vehiculo: 'Fiat Pulse Impetus 2024 1.0 Turbo',
    fecha_pedido: '2026-11-10T15:40:00.000Z', // 12:40 AR (Mediodía Pico)
    fecha_respuesta: '2026-11-10T16:07:00.000Z',
    demora_total_min: 27,
    demora_habil_min: 27,
    demora_neta_sucursal_min: 27,
    formato_origen: 'texto',
    archivo_nombre: '',
    total_cotizado: 162000,
    total_con_descuento: 0,
    descuento_porcentaje: 0,
    aceite: { marca: 'MOTUL', linea: '8100', viscosidad: '0W20', litros: 4, precio_por_litro: 24500, subtotal: 98000 },
    filtros: [
      { tipo: 'aceite', marca: 'WEGA', codigo: 'WO-120', cantidad: 1, precio_unitario: 16500, subtotal: 16500 },
      { tipo: 'aire', marca: 'WEGA', codigo: 'FAP-3285', cantidad: 1, precio_unitario: 26500, subtotal: 26500 },
      { tipo: 'habitaculo', marca: 'WEGA', codigo: 'AKX-1938', cantidad: 1, precio_unitario: 21000, subtotal: 21000 }
    ],
    resumen_items: 'MOTUL 8100 0W20 (4L) + 3 Filtros (WO-120, FAP-3285, AKX-1938)',
    observaciones_calidad: 'Franja Mediodía (12:40 hs) • Demoró 27m (>25m SLA) • Diferencia +$12.500 vs Centro para el mismo auto.',
    estado: 'presupuesto_enviado'
  },
  {
    ticket_id: 'DEMO-103',
    isDemoPreview: true,
    cliente_nombre: 'Juan Pérez (Ejemplo Hilux 2.8)',
    cliente_telefono: '5492944550101',
    sucursal: 'Centro',
    sucursal_nombre: 'Check Oil Suc. Centro',
    vehiculo: 'Toyota Hilux 2019 2.8 TDI',
    fecha_pedido: '2026-11-10T13:10:00.000Z', // 10:10 AR (Mañana)
    fecha_respuesta: '2026-11-10T13:19:00.000Z',
    demora_total_min: 9,
    demora_habil_min: 9,
    demora_neta_sucursal_min: 9,
    formato_origen: 'pdf',
    archivo_nombre: 'Presupuesto_Centro_Hilux_00412.pdf',
    total_cotizado: 236500,
    total_con_descuento: 212850,
    descuento_porcentaje: 10,
    aceite: { marca: 'MOTUL', linea: '8100', viscosidad: '5W30', litros: 8, precio_por_litro: 19500, subtotal: 156000 },
    filtros: [
      { tipo: 'aceite', marca: 'WEGA', codigo: 'JFO-0211', cantidad: 1, precio_unitario: 16500, subtotal: 16500 },
      { tipo: 'aire', marca: 'WEGA', codigo: 'JFA-0295', cantidad: 1, precio_unitario: 26000, subtotal: 26000 },
      { tipo: 'combustible', marca: 'WEGA', codigo: 'JFC-209', cantidad: 1, precio_unitario: 19500, subtotal: 19500 },
      { tipo: 'habitaculo', marca: 'WEGA', codigo: 'AKX-1965', cantidad: 1, precio_unitario: 18500, subtotal: 18500 }
    ],
    resumen_items: 'MOTUL 8100 5W30 (8L) + 4 Filtros (JFO-0211, JFA-0295, JFC-209, AKX-1965)',
    observaciones_calidad: 'PDF formal del sistema • Cotizó kit completo 4 filtros + 10% OFF efvo/transf.',
    estado: 'confirmado'
  },
  {
    ticket_id: 'DEMO-104',
    isDemoPreview: true,
    cliente_nombre: 'Martín (Comparativa Hilux 2.8)',
    cliente_telefono: '5492944550888',
    sucursal: 'Km13',
    sucursal_nombre: 'Check Oil Suc. Km13',
    vehiculo: 'Toyota Hilux SRX 2021 2.8 TDI',
    fecha_pedido: '2026-11-10T21:15:00.000Z', // 18:15 AR (Cierre)
    fecha_respuesta: '2026-11-10T21:34:00.000Z',
    demora_total_min: 19,
    demora_habil_min: 19,
    demora_neta_sucursal_min: 19,
    formato_origen: 'pdf',
    archivo_nombre: 'Presupuesto_Km13_Hilux.pdf',
    total_cotizado: 248000,
    total_con_descuento: 0,
    descuento_porcentaje: 0,
    aceite: { marca: 'LIQUI MOLY', linea: 'TOP TEC', viscosidad: '5W30', litros: 8, precio_por_litro: 21000, subtotal: 168000 },
    filtros: [
      { tipo: 'aceite', marca: 'WEGA', codigo: 'JFO-0211', cantidad: 1, precio_unitario: 17500, subtotal: 17500 },
      { tipo: 'aire', marca: 'WEGA', codigo: 'JFA-0295', cantidad: 1, precio_unitario: 26000, subtotal: 26000 },
      { tipo: 'combustible', marca: 'WEGA', codigo: 'JFC-298', cantidad: 1, precio_unitario: 18000, subtotal: 18000 },
      { tipo: 'habitaculo', marca: 'WEGA', codigo: 'AKX-1965', cantidad: 1, precio_unitario: 18500, subtotal: 18500 }
    ],
    resumen_items: 'LIQUI MOLY TOP TEC 5W30 (8L) + 4 Filtros (JFO-0211, JFA-0295, JFC-298, AKX-1965)',
    observaciones_calidad: 'Franja Cierre (18:15 hs) • OJO: Cotizó filtro combustible JFC-298 en vez de JFC-209.',
    estado: 'presupuesto_enviado'
  },
  {
    ticket_id: 'DEMO-105',
    isDemoPreview: true,
    cliente_nombre: 'Lucía Gómez (Ejemplo Gol 1.6)',
    cliente_telefono: '5492944550202',
    sucursal: 'Centro',
    sucursal_nombre: 'Check Oil Suc. Centro',
    vehiculo: 'VW Gol Trend 2017 1.6 MSI',
    fecha_pedido: '2026-11-10T18:05:00.000Z', // 15:05 AR (Tarde)
    fecha_respuesta: '2026-11-10T18:19:00.000Z',
    demora_total_min: 14,
    demora_habil_min: 14,
    demora_neta_sucursal_min: 14,
    formato_origen: 'pdf',
    archivo_nombre: 'Presupuesto_Centro_Gol_00419.pdf',
    total_cotizado: 132000,
    total_con_descuento: 0,
    descuento_porcentaje: 0,
    aceite: { marca: 'MOTUL', linea: '8100', viscosidad: '5W40', litros: 4, precio_por_litro: 18500, subtotal: 74000 },
    filtros: [
      { tipo: 'aceite', marca: 'WEGA', codigo: 'WO-130', cantidad: 1, precio_unitario: 14500, subtotal: 14500 },
      { tipo: 'aire', marca: 'WEGA', codigo: 'FAP-4033', cantidad: 1, precio_unitario: 22500, subtotal: 22500 },
      { tipo: 'combustible', marca: 'WEGA', codigo: 'FCI-1630', cantidad: 1, precio_unitario: 21000, subtotal: 21000 }
    ],
    resumen_items: 'MOTUL 8100 5W40 (4L) + 3 Filtros (WO-130, FAP-4033, FCI-1630)',
    observaciones_calidad: 'Franja Tarde (15:05 hs) • Demora neta sucursal: 14 min.',
    estado: 'presupuesto_enviado'
  },
  {
    ticket_id: 'DEMO-106',
    isDemoPreview: true,
    cliente_nombre: 'Carlos Ruiz (Comparativa Gol/Suran 1.6)',
    cliente_telefono: '5492944550303',
    sucursal: 'Estadio',
    sucursal_nombre: 'Check Oil Suc. Estadio',
    vehiculo: 'VW Suran 2016 1.6 MSI',
    fecha_pedido: '2026-11-10T16:10:00.000Z', // 13:10 AR (Mediodía Pico)
    fecha_respuesta: '2026-11-10T16:41:00.000Z',
    demora_total_min: 31,
    demora_habil_min: 31,
    demora_neta_sucursal_min: 31,
    formato_origen: 'texto',
    archivo_nombre: '',
    total_cotizado: 144500,
    total_con_descuento: 0,
    descuento_porcentaje: 0,
    aceite: { marca: 'MOTUL', linea: '8100', viscosidad: '5W40', litros: 4, precio_por_litro: 20200, subtotal: 80800 },
    filtros: [
      { tipo: 'aceite', marca: 'WEGA', codigo: 'WO-130', cantidad: 1, precio_unitario: 16900, subtotal: 16900 },
      { tipo: 'aire', marca: 'WEGA', codigo: 'FAP-4033', cantidad: 1, precio_unitario: 22500, subtotal: 22500 },
      { tipo: 'combustible', marca: 'WEGA', codigo: 'FCI-1630', cantidad: 1, precio_unitario: 24300, subtotal: 24300 }
    ],
    resumen_items: 'MOTUL 8100 5W40 (4L) + 3 Filtros (WO-130, FAP-4033, FCI-1630)',
    observaciones_calidad: 'Franja Mediodía (13:10 hs) • Superó 25m (31m) • Diferencia en WO-130 (+17%) y Motul 5W40 (+9%).',
    estado: 'presupuesto_enviado'
  }
];
