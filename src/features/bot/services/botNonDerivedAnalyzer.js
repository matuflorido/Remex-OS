/**
 * Analizador Forense e Informe Ejecutivo de Conversaciones Sin Derivación (Check-Oil Bot)
 * Audita el historial completo de WhatsApp para distinguir:
 * 1) Derivaciones reales cuyo estado fue pisado por un "Gracias / Ok" posterior del cliente.
 * 2) Registros vacíos pre-migración (0 mensajes).
 * 3) Cotizaciones activas / enviadas en el Piloto de Sucursal Centro (incluyendo repreguntas sin responder como "¿Hay cuotas?").
 * 4) Conversaciones que realmente no terminaron en derivación, clasificadas por causa raíz exacta y catálogo de servicios no ofrecidos solicitados.
 */

const UNSUPPORTED_SERVICE_CATALOG = [
  {
    id: 'frenos',
    label: 'Frenos (pastillas, discos o mantenimiento)',
    note: 'Solo mecánica ligera en Dominico; no disponible en Bariloche / El Bolsón',
    regex: /\b(pastillas?\s+de\s+freno|cambio\s+de\s+frenos?|mantenimiento\s+de\s+frenos?|manenimiento\s+de\s+frenos?|frenos|discos?\s+de\s+freno|cintas?\s+de\s+freno)\b/i
  },
  {
    id: 'baterias',
    label: 'Baterías y piezas de batería',
    note: 'Consulta por compra de batería o borne/pieza eléctrica',
    regex: /\b(bater[ií]as?|borne)\b/i
  },
  {
    id: 'cubiertas',
    label: 'Cubiertas / Neumáticos / Gomeria',
    note: 'Venta o colocación de neumáticos',
    regex: /\b(cubiertas?|neum[aá]ticos?|llantas?|alineaci[oó]n|balanceo)\b/i
  },
  {
    id: 'inyectores',
    label: 'Limpieza y prueba de inyectores',
    note: 'Mecánica / laboratorio de inyección',
    regex: /\b(inyectores?|limpieza\s+de\s+inyectores|inyecci[oó]n\s+electr[oó]nica)\b/i
  },
  {
    id: 'aire_acondicionado',
    label: 'Carga o reparación de Aire Acondicionado',
    note: 'Recarga de gas refrigerante A/C',
    regex: /\b(recargas?\s+de\s+aire\s+acondicionado|carga\s+de\s+aire|gas\s+del?\s+aire|aire\s+acondicionado)\b/i
  },
  {
    id: 'perdida_aceite_motor',
    label: 'Revisión y sellado de pérdidas de aceite / Mecánica motor',
    note: 'Subir al elevador para diagnosticar/sellar fuga mecánica',
    regex: /\b(perdiendo\s+aceite|p[eé]rdida\s+de\s+aceite|revisarle\s+la\s+perdida|sellarla|junta|ret[eé]n|embrague|tren\s+delantero|amortiguador)\b/i
  },
  {
    id: 'escape',
    label: 'Reparación / cambio de caño de escape',
    note: 'Taller de escapes / soldadura',
    regex: /\b(hacer\s+el\s+escape|ca[ñn]o\s+de\s+escape|silenciador|escape\s+de\s+un)\b/i
  },
  {
    id: 'parabrisas',
    label: 'Reparación de parabrisas / Cristalería',
    note: 'Picaduras o cambio de cristales',
    regex: /\b(picadura\s+de\s+parabrisas|parabrisas|cristales|luneta)\b/i
  },
  {
    id: 'revision_tecnica',
    label: 'Revisión Técnica Obligatoria (RTO / VTV)',
    note: 'Inspección técnica vehicular oficial',
    regex: /\b(revisi[oó]n\s+t[eé]cnica|\brto\b|\bvtv\b)\b/i
  },
  {
    id: 'bujias_distribucion',
    label: 'Bujías, correas o kit de distribución',
    note: 'Repuestos de encendido / distribución mecánica',
    regex: /\b(buj[ií]as?|cables?\s+de\s+buj[ií]a|bobina|kit\s+de\s+distribuci[oó]n|correa\s+de\s+distribuci[oó]n)\b/i
  },
  {
    id: 'repuestos_especificos',
    label: 'Repuestos mecánicos específicos (reguladores, bombas, lámparas)',
    note: 'Casa de repuestos general / electricidad',
    regex: /\b(regulador\s+de\s+presi[oó]n|bomba\s+de\s+nafta|bomba\s+de\s+agua|colocaci[oó]n\s+de\s+foco|l[aá]mparas?)\b/i
  }
];

const DERIVATION_CONFIRM_PATTERNS = [
  'derivé tu consulta',
  'derive tu consulta',
  'derivé su consulta',
  'derive su consulta',
  'derivé tu solicitud',
  'derive tu solicitud',
  'ya derivé tu',
  'ya derive tu',
  'ya está derivado a la sucursal',
  'ya esta derivado a la sucursal',
  'fue derivado a la sucursal',
  'ya fue informada para que te contacten',
  'pasé tus datos a la sucursal',
  'pase tus datos a la sucursal'
];

const REJECTION_AFTER_DERIVATION_PATTERNS = [
  'no ofrecen ese servicio',
  'no ofrecemos ese servicio',
  'no realizamos servicio',
  'solo se realiza en la sucursal dominico'
];

const PURE_COURTESY_OR_CLOSING_REGEX =
  /^(ok|okay|okey|dale|gracias|muchas gracias|mil gracias|joya muchas gracias|buenisimo gracias|buenísimo gracias|perfecto muchas gracias|no|no gracias|no, gracias|no nada mas muchas gracias|listo|listo gracias|genial|👍|🙏|👌|🙌)[\s!.,?]*$/i;

const SUPPLIER_OR_SPAM_REGEX =
  /\b(alternativa\s+m[aá]s\s+cuando\s+necesites\s+comparar\s+precios|nuestra\s+presentaci[oó]n\s+para\s+que\s+tengas\s+nuestros\s+datos|lista\s+de\s+precios\s+mayorista|proveedor)\b/i;

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

export function parseSessionHistorial(session) {
  if (Array.isArray(session?.historial)) return session.historial;
  const raw = session?.historial_json;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
}

/**
 * Determina si una conversación tuvo derivación efectiva real (incluso si el cliente
 * luego dijo "Gracias / Ok" y un nodo posterior pisó estado_charla).
 */
export function evaluateEffectiveDerivation(session, historialInput = null) {
  const historial = historialInput || parseSessionHistorial(session);
  const rh = safeStr(session?.resumen_historico).toLowerCase();
  const explicitDerived =
    session?.estado_charla === 'derivada' ||
    session?.estado_cotizacion === 'confirmado' ||
    (historial.length === 0 && rh.includes('check oil'));

  let lastDerivationIdx = -1;
  let lastRejectionIdx = -1;

  for (let i = 0; i < historial.length; i++) {
    const m = historial[i];
    if (!m || m.rol === 'cliente') continue;
    const low = safeStr(m.texto).toLowerCase();
    if (DERIVATION_CONFIRM_PATTERNS.some((p) => low.includes(p))) {
      lastDerivationIdx = i;
    }
    if (REJECTION_AFTER_DERIVATION_PATTERNS.some((p) => low.includes(p))) {
      lastRejectionIdx = i;
    }
  }

  const derivedInMessages = lastDerivationIdx >= 0 && lastRejectionIdx <= lastDerivationIdx;

  if (explicitDerived) {
    return {
      isEffectivelyDerived: true,
      wasOverwrittenByCourtesy: false
    };
  }

  if (derivedInMessages) {
    return {
      isEffectivelyDerived: true,
      wasOverwrittenByCourtesy: true
    };
  }

  return {
    isEffectivelyDerived: false,
    wasOverwrittenByCourtesy: false
  };
}

export function isGhostEmptySession(session, historialInput = null) {
  const docId = safeStr(session?.documentId);
  if (!docId || docId === 'undefined' || docId.endsWith('@lid')) {
    const hist = historialInput || parseSessionHistorial(session);
    if (hist.length === 0) return true;
  }
  const hist = historialInput || parseSessionHistorial(session);
  const rh = safeStr(session?.resumen_historico);
  const rc = safeStr(session?.resumen_charla);
  const hasSummary =
    (rh && rh !== 'Sin datos previos disponibles' && rh !== 'Sin datos aún') ||
    Boolean(rc);
  return hist.length === 0 && !hasSummary;
}

export function extractRequestedUnsupportedServices(session, historialInput = null) {
  const hist = historialInput || parseSessionHistorial(session);
  const clientMsgList = hist
    .filter((m) => m && m.rol === 'cliente')
    .map((m) => safeStr(m.texto))
    .filter(Boolean);
  const clientTexts = clientMsgList.join(' \n ');

  // Evitar falsos positivos con el filtro de habitáculo ("filtro habitaculo aire acondicionado")
  const cleanedClientText = clientTexts.replace(/filtro\s+(?:de\s+)?habit[aá]culo\s+aire\s+acondicionado/gi, 'filtro habitaculo');
  const fullContext = `${cleanedClientText}\n${safeStr(session?.pregunta_detectada)}\n${safeStr(session?.resumen_charla)}\n${safeStr(session?.incompleta_motivo)}`;

  const matched = [];
  for (const item of UNSUPPORTED_SERVICE_CATALOG) {
    if (item.regex.test(fullContext)) {
      const matchingClientMsg =
        clientMsgList.find((txt) => item.regex.test(txt.replace(/filtro\s+(?:de\s+)?habit[aá]culo\s+aire\s+acondicionado/gi, 'filtro habitaculo'))) ||
        safeStr(session?.pregunta_detectada) ||
        safeStr(session?.resumen_charla);
      matched.push({
        ...item,
        matchedQuote: matchingClientMsg
      });
    }
  }
  return matched;
}

/**
 * Clasifica en profundidad una sesión para el Informe Ejecutivo de Conversaciones Sin Derivación.
 */
export function analyzeSingleBotSession(session) {
  const historial = parseSessionHistorial(session);
  const phone = safeStr(session?.cliente_telefono || session?.documentId).replace('@s.whatsapp.net', '');
  const nombre =
    safeStr(session?.cliente_nombre) && safeStr(session?.cliente_nombre) !== 'Cliente'
      ? safeStr(session.cliente_nombre)
      : `+${phone}`;
  const lastMsg = historial.length > 0 ? historial[historial.length - 1] : null;
  const clientMsgs = historial.filter((m) => m && m.rol === 'cliente');
  const botOrOpMsgs = historial.filter((m) => m && m.rol !== 'cliente');
  const firstClientText = safeStr(clientMsgs[0]?.texto);
  const lastClientText = safeStr(clientMsgs[clientMsgs.length - 1]?.texto);
  const lastBotText = safeStr(botOrOpMsgs[botOrOpMsgs.length - 1]?.texto);
  const effectiveDate = safeStr(lastMsg?.fecha || session?.ultima_interaccion || session?.updatedTime);

  // 1. Registro fantasma / vacío antiguo
  if (isGhostEmptySession(session, historial)) {
    return {
      documentId: session?.documentId,
      phone,
      nombre,
      effectiveDate,
      vehiculo: safeStr(session?.vehiculo) || 'No especificado',
      sucursal: safeStr(session?.sucursal_elegida) || 'Sin definir',
      bucket: 'ghost_empty',
      reasonId: 'registro_vacio_antiguo',
      reasonLabel: 'Registro vacío pre-migración (0 mensajes)',
      subReasonLabel: 'Contacto técnico sin mensajes guardados',
      explanation: 'Documento antiguo en base sin historial de mensajes (previo al guardado completo del 15/10).',
      actionable: false,
      requestedUnsupported: [],
      clientMsgsCount: 0,
      totalMsgsCount: 0,
      lastClientText: '',
      lastBotText: ''
    };
  }

  // 2. Derivación efectiva (explícita o pisada por saludo final)
  const derivCheck = evaluateEffectiveDerivation(session, historial);
  if (derivCheck.isEffectivelyDerived) {
    const requestedUnsupported = extractRequestedUnsupportedServices(session, historial);
    return {
      documentId: session?.documentId,
      phone,
      nombre,
      effectiveDate,
      vehiculo: safeStr(session?.vehiculo) || 'No especificado',
      sucursal: safeStr(session?.sucursal_elegida) || 'Derivada',
      bucket: 'derived',
      wasOverwrittenByCourtesy: derivCheck.wasOverwrittenByCourtesy,
      reasonId: derivCheck.wasOverwrittenByCourtesy ? 'derivada_recuperada' : 'derivada_ok',
      reasonLabel: derivCheck.wasOverwrittenByCourtesy
        ? 'Derivada (antes figuraba No Derivada por saludo final)'
        : 'Derivada a sucursal',
      subReasonLabel: derivCheck.wasOverwrittenByCourtesy
        ? `Dijo "${lastClientText.slice(0, 30)}" luego de ser derivado`
        : 'Derivación estándar',
      explanation: derivCheck.wasOverwrittenByCourtesy
        ? `El bot sí derivó la consulta a la sucursal, pero cuando el cliente agradeció ("${lastClientText.slice(0, 40)}"), el resumen cambió el estado.`
        : 'Consulta derivada correctamente a la sucursal.',
      actionable: false,
      requestedUnsupported,
      clientMsgsCount: clientMsgs.length,
      totalMsgsCount: historial.length,
      lastClientText,
      lastBotText
    };
  }

  // 3. Flujo de Intermediario de Presupuestos (Sucursal Centro)
  const estCot = safeStr(session?.estado_cotizacion);
  if (['esperando_sucursal', 'esperando_respuesta_cliente', 'presupuesto_enviado'].includes(estCot)) {
    const requestedUnsupported = extractRequestedUnsupportedServices(session, historial);
    const lastIsClient = lastMsg?.rol === 'cliente';
    const clientDeclined =
      lastIsClient &&
      /\b(por ahora no|no gracias|no, gracias|lo analizo|cualquier cosa aviso|muy caro|gracias igual)\b/i.test(
        lastClientText
      );
    const clientAskedFollowUp =
      estCot === 'presupuesto_enviado' &&
      lastIsClient &&
      !clientDeclined &&
      !PURE_COURTESY_OR_CLOSING_REGEX.test(lastClientText);

    let subId = 'cotizacion_en_espera';
    let subLabel = `Presupuesto #${session?.ticket_id || 'COT'} en evaluación`;
    let explanation = `En flujo de presupuesto con Sucursal Centro (${estCot.replace(/_/g, ' ')}). Por regla, Centro solo deriva cuando el cliente confirma.`;
    let actionable = false;

    if (clientAskedFollowUp) {
      subId = 'cotizacion_repregunta_sin_respuesta';
      subLabel = 'Preguntó tras recibir el presupuesto (Sin respuesta)';
      explanation = `Recibió presupuesto #${session?.ticket_id || 'COT'} y luego escribió: "${lastClientText}" — requiere respuesta para cerrar la venta.`;
      actionable = true;
    } else if (requestedUnsupported.length > 0) {
      subId = 'cotizacion_item_distinto';
      subLabel = `Pidió ${requestedUnsupported[0].label} en Centro`;
      explanation = `El cliente consultó por "${lastClientText || requestedUnsupported[0].label}" y recibió presupuesto estándar de service (#${session?.ticket_id || 'COT'}).`;
      actionable = true;
    } else if (clientDeclined) {
      subId = 'cotizacion_rechazada_o_postergada';
      subLabel = 'Recibió presupuesto y postergó / rechazó';
      explanation = `Recibió el presupuesto #${session?.ticket_id || 'COT'} de Centro y respondió: "${lastClientText}".`;
    } else if (estCot === 'esperando_respuesta_cliente') {
      subId = 'cotizacion_esperando_dato_cliente';
      subLabel = 'Sucursal repreguntó un dato y el cliente aún no contestó';
      explanation = `Centro consultó "${session?.ultima_pregunta_sucursal || 'año/motor'}" en #${session?.ticket_id || 'COT'} y aguarda respuesta del cliente.`;
    }

    return {
      documentId: session?.documentId,
      phone,
      nombre,
      effectiveDate,
      vehiculo: safeStr(session?.vehiculo) || 'No especificado',
      sucursal: safeStr(session?.sucursal_cotizacion || session?.sucursal_elegida) || 'Centro',
      ticketId: safeStr(session?.ticket_id),
      bucket: 'quote_broker',
      reasonId: subId,
      reasonLabel: 'En flujo de Presupuesto Centro (Sin confirmar turno aún)',
      subReasonLabel: subLabel,
      explanation,
      actionable,
      requestedUnsupported,
      clientMsgsCount: clientMsgs.length,
      totalMsgsCount: historial.length,
      lastClientText,
      lastBotText
    };
  }

  // 4. Conversaciones REALES que "No quedaron en nada"
  const requestedUnsupported = extractRequestedUnsupportedServices(session, historial);
  const allCombinedLow = `${safeStr(session?.incompleta_motivo)} ${safeStr(session?.pregunta_detectada)} ${safeStr(session?.resumen_charla)} ${historial.map((m) => safeStr(m?.texto)).join(' ')}`.toLowerCase();

  // 4A. Pedía un servicio o repuesto que Check-Oil NO ofrece
  const botSaidNotOffered =
    /\b(no ofrecemos|no vendemos repuestos|no realizamos|ninguna sucursal ofrece|no trabajamos con|solo hacemos mec[aá]nica ligera en la sucursal dominico|solo se realiza en la sucursal dominico)\b/i.test(
      allCombinedLow
    );

  if (
    requestedUnsupported.length > 0 ||
    botSaidNotOffered ||
    session?.estado_charla === 'fuera_de_contexto' && clientMsgs.length >= 2
  ) {
    const primarySvc = requestedUnsupported[0]?.label || 'Servicio / repuesto fuera de lubricentro';
    return {
      documentId: session?.documentId,
      phone,
      nombre,
      effectiveDate,
      vehiculo: safeStr(session?.vehiculo) || 'No especificado',
      sucursal: safeStr(session?.sucursal_elegida) || 'Sin definir',
      bucket: 'real_non_derived',
      reasonId: 'servicio_no_ofrecido',
      reasonLabel: 'Pedía un servicio o repuesto que NO ofrecemos',
      subReasonLabel: primarySvc,
      explanation:
        safeStr(session?.resumen_charla) ||
        `Consultó por ${primarySvc.toLowerCase()} ("${lastClientText || firstClientText}").`,
      actionable: false,
      requestedUnsupported:
        requestedUnsupported.length > 0
          ? requestedUnsupported
          : [{ id: 'otros', label: primarySvc, note: 'Fuera del alcance de lubricentro' }],
      clientMsgsCount: clientMsgs.length,
      totalMsgsCount: historial.length,
      lastClientText,
      lastBotText
    };
  }

  // 4B. Mensajes sueltos de cortesía, equivocados o proveedores comerciales (no son clientes perdidos)
  const isSingleCourtesy =
    clientMsgs.length === 1 &&
    botOrOpMsgs.length === 0 &&
    (PURE_COURTESY_OR_CLOSING_REGEX.test(firstClientText) ||
      firstClientText.trim().length <= 5 && /^(olla|hola\.?)$/i.test(firstClientText.trim()) && safeStr(session?.fuera_de_contexto).startsWith('s'));

  if (isSingleCourtesy || SUPPLIER_OR_SPAM_REGEX.test(firstClientText)) {
    const isSupplier = SUPPLIER_OR_SPAM_REGEX.test(firstClientText);
    const isWrongMsg = /^olla$/i.test(firstClientText.trim());
    return {
      documentId: session?.documentId,
      phone,
      nombre,
      effectiveDate,
      vehiculo: 'No aplica',
      sucursal: 'Sin definir',
      bucket: 'real_non_derived',
      reasonId: 'cortesia_spam_proveedor',
      reasonLabel: 'Mensaje suelto sin consulta / Cortesía / Proveedor',
      subReasonLabel: isSupplier
        ? 'Proveedor ofreciendo servicios comerciales'
        : isWrongMsg
          ? 'Mensaje equivocado / sin sentido'
          : `Solo envió "${firstClientText}" (cierre previo)`,
      explanation: isSupplier
        ? `Contacto de proveedor comercial ("${firstClientText.slice(0, 80)}..."). No era un cliente pidiendo service.`
        : `El contacto únicamente escribió "${firstClientText}" sin hacer ninguna consulta de vehículo ni servicio.`,
      actionable: false,
      requestedUnsupported: [],
      clientMsgsCount: clientMsgs.length,
      totalMsgsCount: historial.length,
      lastClientText,
      lastBotText
    };
  }

  // 4C. El cliente hizo una consulta real pero quedó SIN RESPUESTA del Bot / Operador
  if (lastMsg && lastMsg.rol === 'cliente') {
    const endedWithThanksTrap = /\bgracias\b/i.test(lastClientText) && lastClientText.length > 20;
    return {
      documentId: session?.documentId,
      phone,
      nombre,
      effectiveDate,
      vehiculo: safeStr(session?.vehiculo) || 'No especificado',
      sucursal: safeStr(session?.sucursal_elegida) || 'Sin definir',
      bucket: 'real_non_derived',
      reasonId: 'sin_respuesta_bot',
      reasonLabel: 'Quedó esperando respuesta del Bot / Operador',
      subReasonLabel: endedWithThanksTrap
        ? 'Terminó su consulta diciendo "Gracias" y el bot no contestó'
        : 'Último mensaje del cliente sin respuesta',
      explanation: endedWithThanksTrap
        ? `Escribió una consulta real ("${lastClientText}") pero al cerrar con "Gracias" el filtro de cortesía evitó que el bot respondiera.`
        : `El último mensaje fue del cliente ("${lastClientText}") y no recibió seguimiento posterior.`,
      actionable: true,
      requestedUnsupported: [],
      clientMsgsCount: clientMsgs.length,
      totalMsgsCount: historial.length,
      lastClientText,
      lastBotText
    };
  }

  // 4D. El Bot le contestó pidiendo un dato y EL CLIENTE DEJÓ DE RESPONDER (analizamos exactamente en qué paso abandonó)
  let dropStageId = 'abandono_datos_vehiculo';
  let dropStageLabel = 'No respondió cuando el bot pidió datos del vehículo';
  let explanation = `El bot respondió y el cliente dejó de contestar. Último mensaje del cliente: "${lastClientText}".`;

  if (/\b(quilmes|berazategui|lan[uú]s|lomas|neuqu[eé]n|cipolletti|roca|esquel|angostura)\b/i.test(lastClientText) && /no es una sucursal/i.test(lastBotText)) {
    dropStageId = 'abandono_zona_sin_sucursal';
    dropStageLabel = `Pidió sucursal en "${lastClientText}" (zona sin local propio)`;
    explanation = `Consultó por "${lastClientText}"; el bot le indicó que no hay sucursal allí y el cliente no eligió otra sucursal cercana (ej. Dominico).`;
  } else if (/pasame tambi[eé]n tu n[uú]mero de tel[eé]fono|necesito tu tel[eé]fono de contacto/i.test(lastBotText)) {
    dropStageId = 'abandono_friccion_telefono';
    dropStageLabel = 'Dejó de responder cuando el bot antiguo le pidió teléfono';
    explanation = `Ya había indicado auto (${safeStr(session?.vehiculo)}), pero abandonó cuando la versión anterior del bot le pidió escribir su número de teléfono.`;
  } else if (/\[imagen|\[audio|no puedo ver im[aá]genes/i.test(allCombinedLow) && (!session?.vehiculo || session?.vehiculo === 'No especificado')) {
    dropStageId = 'abandono_imagen_audio';
    dropStageLabel = 'Envió foto/audio sin aclarar por texto qué buscaba';
    explanation = `Mandó una imagen o referencia visual ("${lastClientText}"), el bot le pidió escribir el producto por texto y no volvió a contestar.`;
  } else if (
    (safeStr(session?.vehiculo) && safeStr(session?.vehiculo) !== 'No especificado') ||
    /en qu[eé] sucursal|en qu[eé] zona o sucursal|confirmes la sucursal|alguna sucursal espec[ií]fica/i.test(lastBotText)
  ) {
    dropStageId = 'abandono_falta_sucursal';
    dropStageLabel = 'Consultó auto/producto pero no respondió qué sucursal quería';
    explanation = `Consultó por "${safeStr(session?.vehiculo) !== 'No especificado' ? session.vehiculo : lastClientText}", el bot le pidió elegir sucursal y el cliente no respondió más.`;
  }

  return {
    documentId: session?.documentId,
    phone,
    nombre,
    effectiveDate,
    vehiculo: safeStr(session?.vehiculo) || 'No especificado',
    sucursal: safeStr(session?.sucursal_elegida) || 'Sin definir',
    bucket: 'real_non_derived',
    reasonId: 'cliente_dejo_de_responder',
    dropStageId,
    reasonLabel: 'El cliente simplemente dejó de responder',
    subReasonLabel: dropStageLabel,
    explanation,
    actionable: true,
    requestedUnsupported: [],
    clientMsgsCount: clientMsgs.length,
    totalMsgsCount: historial.length,
    lastClientText,
    lastBotText
  };
}

/**
 * Ejecuta la auditoría completa sobre el conjunto de sesiones del Bot y devuelve
 * todas las métricas, rankings de servicios no ofrecidos, etapas de abandono y hallazgos accionables.
 */
export function buildNonDerivedExecutiveReport(sessions = [], periodDays = 0) {
  const nowMs = Date.now();
  const cutoffMs = periodDays > 0 ? nowMs - periodDays * 86400000 : 0;

  const analyzedAll = sessions.map((s) => analyzeSingleBotSession(s));

  const filteredByPeriod =
    periodDays > 0
      ? analyzedAll.filter((item) => {
          if (item.bucket === 'ghost_empty') return false;
          if (!item.effectiveDate) return false;
          const t = new Date(item.effectiveDate).getTime();
          return !isNaN(t) && t >= cutoffMs;
        })
      : analyzedAll;

  const ghostEmpty = filteredByPeriod.filter((x) => x.bucket === 'ghost_empty');
  const realConversations = filteredByPeriod.filter((x) => x.bucket !== 'ghost_empty');
  const derivedAll = realConversations.filter((x) => x.bucket === 'derived');
  const derivedRecovered = derivedAll.filter((x) => x.wasOverwrittenByCourtesy);
  const quoteBrokerItems = realConversations.filter((x) => x.bucket === 'quote_broker');
  const realNonDerived = realConversations.filter((x) => x.bucket === 'real_non_derived');

  // Desglose de las conversaciones que realmente no quedaron en nada
  const reasonDefs = [
    {
      id: 'servicio_no_ofrecido',
      title: 'Pedían servicios o repuestos que NO ofrecemos',
      badge: 'Servicio / Repuesto No Ofrecido',
      colorClass: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
      barClass: 'bg-rose-500',
      summaryHint: 'Clientes que buscaban taller mecánico, frenos, cubiertas, baterías, A/C, RTO, etc.'
    },
    {
      id: 'cliente_dejo_de_responder',
      title: 'El cliente simplemente dejó de responder',
      badge: 'Cliente dejó de responder',
      colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
      barClass: 'bg-amber-500',
      summaryHint: 'El bot contestó pidiendo sucursal o datos del vehículo y el cliente no siguió la charla.'
    },
    {
      id: 'cortesia_spam_proveedor',
      title: 'Mensajes sueltos sin consulta ("Gracias", "Ok", proveedores)',
      badge: 'Saludo suelto / Proveedor / Error',
      colorClass: 'text-slate-500 bg-slate-500/10 border-slate-500/30',
      barClass: 'bg-slate-500',
      summaryHint: 'No son ventas perdidas: agradecimientos sueltos, errores de número o carpetas de proveedores.'
    },
    {
      id: 'sin_respuesta_bot',
      title: 'Quedaron esperando respuesta del Bot / Operador',
      badge: 'Quedó sin respuesta (Recuperable)',
      colorClass: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
      barClass: 'bg-purple-500',
      summaryHint: 'El cliente escribió una consulta válida (ej. terminando con "Gracias") y no recibió contestación.'
    }
  ];

  const reasonBreakdown = reasonDefs
    .map((def) => {
      const items = realNonDerived.filter((x) => x.reasonId === def.id);
      return {
        ...def,
        count: items.length,
        pctOfNonDerived:
          realNonDerived.length > 0 ? Math.round((items.length / realNonDerived.length) * 100) : 0,
        pctOfRealTotal:
          realConversations.length > 0
            ? Math.round((items.length / realConversations.length) * 100)
            : 0,
        items
      };
    })
    .sort((a, b) => b.count - a.count);

  // Ranking exacto de qué servicios / repuestos NO ofrecidos pidieron (incluyendo menciones en toda la base real)
  const unsupportedMap = new Map();
  for (const item of realConversations) {
    if (!item.requestedUnsupported || item.requestedUnsupported.length === 0) continue;
    for (const svc of item.requestedUnsupported) {
      if (!unsupportedMap.has(svc.id)) {
        unsupportedMap.set(svc.id, {
          id: svc.id,
          label: svc.label,
          note: svc.note,
          count: 0,
          examples: []
        });
      }
      const entry = unsupportedMap.get(svc.id);
      entry.count += 1;
      if (entry.examples.length < 4) {
        entry.examples.push({
          documentId: item.documentId,
          nombre: item.nombre,
          phone: item.phone,
          vehiculo: item.vehiculo,
          quote: svc.matchedQuote || item.lastClientText || item.explanation,
          wasDerivedForOtherService: item.bucket === 'derived'
        });
      }
    }
  }
  const unsupportedServicesRanking = Array.from(unsupportedMap.values()).sort(
    (a, b) => b.count - a.count
  );

  // Etapas exactas donde el cliente dejó de responder
  const dropOffClients = realNonDerived.filter((x) => x.reasonId === 'cliente_dejo_de_responder');
  const dropStageDefs = [
    { id: 'abandono_falta_sucursal', label: 'Dio el vehículo/producto pero no eligió sucursal' },
    { id: 'abandono_friccion_telefono', label: 'Abandonó cuando el bot anterior pidió teléfono (ya corregido)' },
    { id: 'abandono_imagen_audio', label: 'Mandó foto/audio sin describir por escrito' },
    { id: 'abandono_zona_sin_sucursal', label: 'Pidió localidad sin sucursal propia (ej. Quilmes)' },
    { id: 'abandono_datos_vehiculo', label: 'No contestó al pedido inicial de Marca / Modelo / Motor' }
  ];
  const dropOffStages = dropStageDefs
    .map((st) => {
      const items = dropOffClients.filter((x) => x.dropStageId === st.id);
      return {
        ...st,
        count: items.length,
        pct: dropOffClients.length > 0 ? Math.round((items.length / dropOffClients.length) * 100) : 0,
        items
      };
    })
    .filter((st) => st.count > 0)
    .sort((a, b) => b.count - a.count);

  // Alertas accionables hoy (clientes recuperables o repreguntas sin contestar)
  const actionableLeads = [...quoteBrokerItems, ...realNonDerived]
    .filter((x) => x.actionable)
    .sort((a, b) => new Date(b.effectiveDate || 0).getTime() - new Date(a.effectiveDate || 0).getTime());

  const realConversionPct =
    realConversations.length > 0
      ? Math.round((derivedAll.length / realConversations.length) * 100)
      : 0;

  const effectiveHandledPct =
    realConversations.length > 0
      ? Math.round(
          ((derivedAll.length + quoteBrokerItems.length) / realConversations.length) * 100
        )
      : 0;

  return {
    generatedAt: new Date().toISOString(),
    periodDays,
    totals: {
      rawSessionsCount: filteredByPeriod.length,
      ghostEmptyCount: ghostEmpty.length,
      realConversationsCount: realConversations.length,
      derivedTotalCount: derivedAll.length,
      derivedPreviouslyCountedCount: derivedAll.length - derivedRecovered.length,
      derivedRecoveredFromCourtesyCount: derivedRecovered.length,
      quoteBrokerCount: quoteBrokerItems.length,
      realNonDerivedCount: realNonDerived.length,
      realConversionPct,
      effectiveHandledPct
    },
    reasonBreakdown,
    unsupportedServicesRanking,
    dropOffStages,
    quoteBrokerItems,
    derivedRecovered,
    realNonDerived,
    actionableLeads
  };
}

/**
 * Genera el texto ejecutivo limpio listo para copiar y compartir por WhatsApp o guardar en archivo.
 */
export function formatExecutiveReportAsText(report) {
  if (!report) return '';
  const t = report.totals;
  const lines = [];
  lines.push('📊 INFORME DE CONVERSACIONES SIN DERIVACIÓN — BOT CHECK-OIL');
  lines.push('==============================================================');
  lines.push(
    `• Contactos reales con conversación: ${t.realConversationsCount} (se excluyen ${t.ghostEmptyCount} registros antiguos vacíos sin mensajes)`
  );
  lines.push(
    `• Derivadas efectivamente a sucursal: ${t.derivedTotalCount} (${t.realConversionPct}%) — incluye ${t.derivedRecoveredFromCourtesyCount} charlas que antes figuraban "No Derivadas" solo porque el cliente dijo "Gracias/Ok" al final`
  );
  lines.push(
    `• En proceso / Presupuesto enviado (Suc. Centro): ${t.quoteBrokerCount}`
  );
  lines.push(
    `• Conversaciones que realmente NO terminaron en derivación: ${t.realNonDerivedCount} (${100 - t.effectiveHandledPct}% de las charlas reales)`
  );
  lines.push('');
  lines.push('1) ¿POR QUÉ QUEDARON SIN DERIVACIÓN ESAS ' + t.realNonDerivedCount + ' CHARLAS?');
  for (const r of report.reasonBreakdown) {
    lines.push(`   - ${r.title}: ${r.count} casos (${r.pctOfNonDerived}%)`);
  }
  lines.push('');
  lines.push('2) SERVICIOS Y REPUESTOS QUE PIDIERON Y NO OFRECEMOS:');
  for (const s of report.unsupportedServicesRanking) {
    lines.push(`   - ${s.label}: ${s.count} consulta(s)`);
  }
  if (report.dropOffStages.length > 0) {
    lines.push('');
    lines.push('3) ¿EN QUÉ PASO DEJÓ DE RESPONDER EL CLIENTE?');
    for (const st of report.dropOffStages) {
      lines.push(`   - ${st.label}: ${st.count} caso(s)`);
    }
  }
  return lines.join('\n');
}
