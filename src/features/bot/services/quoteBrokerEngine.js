// ============================================================================
// MOTOR DE INTERMEDIACIÓN DE PRESUPUESTOS, AUDITORÍA PDF, SLA COMERCIAL
// Y COMPARADOR DE PRECIOS ENTRE SUCURSALES (CHECK-OIL 2.0 & REMEX OS)
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
  modo_presupuesto_intermediario: 'programado', // 'programado' | 'true' | 'false'
  fecha_inicio_intermediario: '2026-11-10', // Martes 10 de noviembre 2026
  sucursales_intermediario_json: '["Centro"]',
  sla_recordatorio_minutos: '25',
  horario_comercial_json: JSON.stringify(DEFAULT_BUSINESS_HOURS)
};

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
  const maxEnd = Math.min(endMs, cursor + 10080 * 60000); // Máx 7 días

  while (cursor < maxEnd) {
    if (isDateWithinBusinessHours(new Date(cursor), schedule)) {
      count++;
    }
    cursor += 60000;
  }
  return count;
}

export function evaluateBrokerActivationStatus(botConfig = {}, nowDate = new Date()) {
  const mode = String(botConfig?.modo_presupuesto_intermediario || 'programado').toLowerCase();
  const targetDate = String(botConfig?.fecha_inicio_intermediario || '2026-11-10').trim();
  const branches = getParsedActiveBrokerBranches(botConfig);
  const schedule = getParsedBusinessHours(botConfig);
  const slaMinutes = Number(botConfig?.sla_recordatorio_minutos || 25);

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
    statusDescription = `El Bot NO deriva en ${branchLabel} hasta confirmar presupuesto. Mide demora hábil y alerta a los ${slaMinutes} min.`;
  } else if (mode === 'programado') {
    statusBadge = `PROGRAMADO (${targetDate}) • ${branchLabel}`;
    statusTone = 'amber';
    statusDescription = `Hoy sigue apagado sin alterar la operación actual. Se activará solo desde el ${formattedTarget} en Suc. ${branchLabel}.`;
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
  // 1. Texto directo sin comprimir
  const direct = extractOperatorsText(latin1);
  if (direct.length > 10) extractedSegments.push(direct);

  // 2. Streams comprimidos con FlateDecode
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
// PARSER DETERMINÍSTICO DE PRESUPUESTOS (PARA SIMULADOR SANDBOX Y AUDITORÍA)
// ============================================================================
function parseArAmount(raw) {
  if (typeof raw === 'number') return raw;
  const s = String(raw || '').trim();
  if (!s) return 0;
  // Formato argentino: 148.500,00 o 148.500 o 148500
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
  if (ctx.includes('habit') || ctx.includes('cabina') || ctx.includes('polen') || c.startsWith('AKX')) return 'habitaculo';
  if (ctx.includes('comb') || ctx.includes('nafta') || ctx.includes('gasoil') || ctx.includes('diesel') || c.startsWith('FCI') || c.startsWith('FCD') || c.startsWith('JFC') || c.startsWith('WK')) return 'combustible';
  if (ctx.includes('aire') || c.startsWith('FAP') || c.startsWith('JFA') || c.startsWith('WR') || /^C\s?\d{3,5}/.test(c) || c.startsWith('LX')) return 'aire';
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

  // Detectar si es una pregunta de la sucursal en vez de presupuesto
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

  // Extraer códigos de filtros WEGA / MANN / FRAM / MAHLE
  const filterCodeRegex = /\b((?:WO|JFO|FAP|JFA|WR|AKX|FCI|FCD|JFC|W|WK|HU|CUK|CU|PH|CA|CH|OC|LX|KL|LA)[-\s]?\d{2,5}[A-Z0-9/]*)\b/gi;
  const filtrosMap = new Map();

  for (const line of lines) {
    let fm;
    filterCodeRegex.lastIndex = 0;
    while ((fm = filterCodeRegex.exec(line)) !== null) {
      const rawCode = fm[1].toUpperCase().replace(/\s+/g, '-');
      // Evitar confundir viscosidades como W-30 o W-40
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

  // Extraer Aceite
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

  // Calcular Total Cotizado
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

  // Armar el resumen claro en texto para enviar al cliente (sin teléfonos directos de sucursal)
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
          : 'Cotización enviada en texto.',
      texto_original_sucursal: text
    }
  };
}

// ============================================================================
// CONSOLIDADOR DE AUDITORÍA DE TIEMPOS, QUÉ COTIZAN Y DISPERSIÓN DE PRECIOS
// ============================================================================
export function extractAllQuotesFromSessions(sessions = [], extraQuotes = []) {
  const map = new Map();

  for (const q of extraQuotes || []) {
    if (q && q.ticket_id) {
      map.set(q.ticket_id, q);
    }
  }

  for (const s of sessions || []) {
    const histList = parseSafeJson(s.cotizaciones_historial_json, []);
    if (Array.isArray(histList)) {
      for (const q of histList) {
        if (q && q.ticket_id) {
          map.set(q.ticket_id, {
            ...q,
            cliente_nombre: q.cliente_nombre || s.cliente_nombre || 'Cliente',
            cliente_telefono: q.cliente_telefono || s.cliente_telefono || '',
            estado: s.estado_cotizacion === 'confirmado' && s.ticket_id === q.ticket_id ? 'confirmado' : (q.estado || s.estado_cotizacion || 'presupuesto_enviado')
          });
        }
      }
    }
    const curr = parseSafeJson(s.cotizacion_actual_json, null);
    if (curr && curr.ticket_id && !map.has(curr.ticket_id)) {
      map.set(curr.ticket_id, {
        ...curr,
        cliente_nombre: curr.cliente_nombre || s.cliente_nombre || 'Cliente',
        cliente_telefono: curr.cliente_telefono || s.cliente_telefono || '',
        estado: s.estado_cotizacion || curr.estado || 'presupuesto_enviado'
      });
    }
    // También incluir pedidos que están actualmente esperando a la sucursal (aún sin respuesta)
    if (s.ticket_id && (s.estado_cotizacion === 'esperando_sucursal' || s.estado_cotizacion === 'esperando_respuesta_cliente') && !map.has(s.ticket_id)) {
      map.set(s.ticket_id, {
        ticket_id: s.ticket_id,
        cliente_jid: s.documentId,
        cliente_nombre: s.cliente_nombre || 'Cliente',
        cliente_telefono: s.cliente_telefono || '',
        sucursal: s.sucursal_cotizacion || s.sucursal_elegida || 'Centro',
        vehiculo: s.vehiculo || 'No especificado',
        fecha_pedido: s.fecha_pedido_cotizacion || s.ultima_interaccion,
        fecha_respuesta: '',
        demora_neta_sucursal_min: null,
        formato_origen: 'pendiente',
        total_cotizado: 0,
        aceite: null,
        filtros: [],
        resumen_items: s.estado_cotizacion === 'esperando_respuesta_cliente'
          ? `Sucursal repreguntó: "${s.ultima_pregunta_sucursal || ''}"`
          : 'Esperando cotización de la sucursal...',
        estado: s.estado_cotizacion
      });
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.fecha_pedido || b.fecha_respuesta || 0).getTime() - new Date(a.fecha_pedido || a.fecha_respuesta || 0).getTime()
  );
}

export function buildBranchQuotesAuditReport(quotes = [], botConfig = {}) {
  const schedule = getParsedBusinessHours(botConfig);
  const slaLimit = Number(botConfig?.sla_recordatorio_minutos || 25);
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
    return {
      ...q,
      waitingLiveMin,
      effectiveDelay,
      exceededSla: effectiveDelay != null && effectiveDelay > slaLimit
    };
  });

  // KPIs por sucursal
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
    const slaBreaches = bQuotes.filter((q) => q.exceededSla).length;

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
      slaBreaches
    };
  });

  // Matriz comparativa de valores de Filtros y Aceites entre sucursales
  const itemBuckets = new Map();

  for (const q of enrichedQuotes) {
    const branchKey = BROKER_BRANCHES.find((b) =>
      String(q.sucursal || '').toLowerCase().includes(b.key.toLowerCase())
    )?.key || q.sucursal || 'Centro';

    // 1. Filtros individuales
    for (const f of q.filtros || []) {
      const price = Number(f.precio_unitario || f.subtotal || 0);
      if (!f.codigo || price <= 0) continue;
      const itemKey = `FILTRO:${normalizeFilterCodeKey(f.codigo)}`;
      if (!itemBuckets.has(itemKey)) {
        itemBuckets.set(itemKey, {
          itemKey,
          categoria: `Filtro (${f.tipo || 'general'})`,
          codigo: normalizeFilterCodeKey(f.codigo),
          descripcion: `${f.marca || 'WEGA'} ${normalizeFilterCodeKey(f.codigo)}`,
          porSucursal: {}
        });
      }
      const bucket = itemBuckets.get(itemKey);
      if (!bucket.porSucursal[branchKey]) {
        bucket.porSucursal[branchKey] = { precios: [], ultimoPrecio: price, ultimoTicket: q.ticket_id, vehiculo: q.vehiculo };
      }
      bucket.porSucursal[branchKey].precios.push(price);
      bucket.porSucursal[branchKey].ultimoPrecio = price;
    }

    // 2. Aceites (normalizados por litro para poder comparar entre un auto de 4L y uno de 5L!)
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
            categoria: 'Aceite (Valor x Litro)',
            codigo: oilCode,
            descripcion: `${oilCode} (x 1L)`,
            porSucursal: {}
          });
        }
        const bucket = itemBuckets.get(itemKey);
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
        return { sucursal: suc, avgPrice: avg, lastPrice: info.ultimoPrecio, count: info.precios.length, ticket: info.ultimoTicket };
      });
      const allPrices = entries.flatMap((e) => [e.avgPrice, e.lastPrice]).filter((n) => n > 0);
      const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
      const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;
      const diffAbs = maxPrice - minPrice;
      const diffPct = minPrice > 0 ? Math.round((diffAbs / minPrice) * 100) : 0;

      return {
        ...b,
        entries,
        branchesCount: entries.length,
        minPrice,
        maxPrice,
        diffAbs,
        diffPct,
        hasDiscrepancy: diffPct >= 3 && diffAbs >= 500
      };
    })
    .sort((a, b) => b.diffPct - a.diffPct || b.branchesCount - a.branchesCount);

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
    enrichedQuotes,
    branchStats,
    priceDispersionRows
  };
}

// ============================================================================
// EJEMPLOS DEMO CLARAMENTE ETIQUETADOS (SOLO PARA VISTA PREVIA ANTES DEL MARTES 10)
// ============================================================================
export const DEMO_PREVIEW_QUOTES = [
  {
    ticket_id: 'DEMO-101',
    isDemoPreview: true,
    cliente_nombre: 'Juan Pérez (Ejemplo Piloto)',
    cliente_telefono: '5492944550101',
    sucursal: 'Centro',
    sucursal_nombre: 'Check Oil Suc. Centro',
    vehiculo: 'Toyota Hilux 2019 2.8 TDI',
    fecha_pedido: '2026-11-10T12:10:00.000Z',
    fecha_respuesta: '2026-11-10T12:19:00.000Z',
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
    ticket_id: 'DEMO-102',
    isDemoPreview: true,
    cliente_nombre: 'Lucía Gómez (Ejemplo Comparativo)',
    cliente_telefono: '5492944550202',
    sucursal: 'Centro',
    sucursal_nombre: 'Check Oil Suc. Centro',
    vehiculo: 'VW Gol Trend 2017 1.6 MSI',
    fecha_pedido: '2026-11-10T14:05:00.000Z',
    fecha_respuesta: '2026-11-10T14:28:00.000Z',
    demora_total_min: 23,
    demora_habil_min: 23,
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
    observaciones_calidad: 'Consultó motor al cliente (9 min espera cliente) • Demora neta sucursal: 14 min.',
    estado: 'presupuesto_enviado'
  },
  {
    ticket_id: 'DEMO-103',
    isDemoPreview: true,
    cliente_nombre: 'Carlos Ruiz (Ejemplo Comparación Futura)',
    cliente_telefono: '5492944550303',
    sucursal: 'Estadio',
    sucursal_nombre: 'Check Oil Suc. Estadio',
    vehiculo: 'VW Suran 2016 1.6',
    fecha_pedido: '2026-11-12T15:00:00.000Z',
    fecha_respuesta: '2026-11-12T15:31:00.000Z',
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
    observaciones_calidad: 'Cotizó por texto (sin PDF) • Superó 25m • Diferencia detectada en WO-130 (+17%) y Motul 5W40 (+9%).',
    estado: 'presupuesto_enviado'
  }
];
