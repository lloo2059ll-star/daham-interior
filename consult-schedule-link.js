(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DAHAM_CONSULT_SCHEDULE = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  var STATUS_CONFIG = {
    inquiry: { status: 'inquiry', key: 'consultationInquiry', eventType: 'consultation_inquiry', generalType: 'consult', label: '상담문의' },
    site_check: { status: 'site_check', key: 'siteMeasurement', eventType: 'site_measurement', generalType: 'survey', label: '현장실측' },
    est_meeting: { status: 'est_meeting', key: 'estimateMeeting', eventType: 'estimate_meeting', generalType: 'consult', label: '견적미팅' }
  };
  var STATUS_ORDER = { inquiry: 0, site_check: 1, est_meeting: 2, est_done: 3, contracted: 4, cancelled: 5 };
  var CONFIGS = [STATUS_CONFIG.inquiry, STATUS_CONFIG.site_check, STATUS_CONFIG.est_meeting];

  function timestamp(date, time) {
    if (!date) return NaN;
    return new Date(date + 'T' + (time || '23:59')).getTime();
  }

  function isPast(value, now) {
    var date = value && (value.date || value.end || value.start);
    var time = value && (value.time || value.startTime);
    var eventTime = timestamp(date, time);
    var nowTime = new Date(now || new Date().toISOString()).getTime();
    return Number.isFinite(eventTime) && eventTime <= nowTime;
  }

  function updateReservations(previous, draft, now) {
    var reservations = Object.assign({}, previous && previous.scheduleReservations || {});
    var previousConfig = STATUS_CONFIG[previous && previous.status];
    if (previousConfig && !reservations[previousConfig.key] && previous.schedDate && previous.schedTime) {
      reservations[previousConfig.key] = { date: previous.schedDate, time: previous.schedTime };
    }

    if (draft && draft.status === 'cancelled') {
      CONFIGS.forEach(function (config) {
        if (reservations[config.key] && !isPast(reservations[config.key], now)) delete reservations[config.key];
      });
      return reservations;
    }

    var config = STATUS_CONFIG[draft && draft.status];
    if (config && draft.schedDate && draft.schedTime) {
      reservations[config.key] = { date: draft.schedDate, time: draft.schedTime };
    } else if (config && reservations[config.key] && !isPast(reservations[config.key], now)) {
      delete reservations[config.key];
    }
    return reservations;
  }

  function linkedId(consultationId, eventType) {
    return 'consult-' + String(consultationId).replace(/[^A-Za-z0-9_-]/g, '_') + '-' + eventType;
  }

  function buildEvent(existing, consultation, config, reservation) {
    var titleBase = consultation.siteName || consultation.name || '상담';
    var event = Object.assign({}, existing || {});
    event.id = event.id || linkedId(consultation.id, config.eventType);
    event.kind = 'general';
    event.generalType = config.generalType;
    event.name = titleBase + ' · ' + config.label;
    event.start = reservation.date;
    event.end = reservation.date;
    event.startTime = reservation.time || '';
    event.status = event.status || 'planned';
    event.memo = event.memo || '';
    event.consultationId = consultation.id;
    event.eventType = config.eventType;
    event.manager = consultation.manager || '';
    event.source = 'consultation';
    return event;
  }

  function reconcile(events, consultation, mode, now) {
    var input = Array.isArray(events) ? events : [];
    var output = input.filter(function (event) {
      return event.consultationId !== consultation.id || !CONFIGS.some(function (config) { return event.eventType === config.eventType; });
    });

    CONFIGS.forEach(function (config) {
      var matches = input.filter(function (event) {
        return event.consultationId === consultation.id && event.eventType === config.eventType;
      });
      var reservation = consultation.scheduleReservations && consultation.scheduleReservations[config.key];
      var primary = matches.find(function (event) { return event.id === linkedId(consultation.id, config.eventType); }) || matches[0] || null;

      if (mode === 'cancel' || mode === 'delete') {
        primary = matches.find(function (event) { return isPast(event, now); }) || null;
        if (primary) output.push(buildEvent(primary, consultation, config, { date: primary.end || primary.start, time: primary.startTime || '' }));
        return;
      }

      if (reservation) {
        output.push(buildEvent(primary, consultation, config, reservation));
        return;
      }

      primary = matches.find(function (event) { return isPast(event, now); }) || null;
      if (primary) output.push(buildEvent(primary, consultation, config, { date: primary.end || primary.start, time: primary.startTime || '' }));
    });
    return output;
  }

  function mergeEditableGeneralEvent(existing, editable) {
    return Object.assign({}, existing || {}, editable || {});
  }

  function mergeEventCollections(remote, local) {
    var output = Array.isArray(remote) ? remote.slice() : [];
    var ids = {};
    output.forEach(function (event) { if (event && event.id) ids[event.id] = true; });
    (Array.isArray(local) ? local : []).forEach(function (event) {
      if (!event || !event.id || ids[event.id]) return;
      ids[event.id] = true;
      output.push(event);
    });
    return output;
  }

  function generalDisplayName(event, typeLabel) {
    var name = event && event.name || '';
    return event && event.source === 'consultation' ? name : (typeLabel ? typeLabel + ' · ' + name : name);
  }

  function reservationFromMilestone(consultation, config) {
    var history = Array.isArray(consultation && consultation.history) ? consultation.history : [];
    for (var index = history.length - 1; index >= 0; index -= 1) {
      var item = history[index];
      if (!item || item.type !== 'milestone' || item.status !== config.status || !item.at) continue;
      var parts = String(item.at).split('T');
      if (parts[0] && parts[1]) return { date: parts[0], time: parts[1].slice(0, 5) };
    }
    return null;
  }

  function withDerivedReservation(consultation, now) {
    var copy = Object.assign({}, consultation || {});
    var config = STATUS_CONFIG[copy.status];
    if (!config) return copy;
    var reservations = Object.assign({}, copy.scheduleReservations || {});
    CONFIGS.forEach(function (item) {
      var milestoneReservation = reservationFromMilestone(copy, item);
      if (milestoneReservation) reservations[item.key] = milestoneReservation;
    });
    if (!reservations[config.key]) {
      var fallback = copy.schedDate && copy.schedTime
        ? { date: copy.schedDate, time: copy.schedTime }
        : null;
      if (fallback) reservations[config.key] = fallback;
    }
    copy.scheduleReservations = reservations;
    return copy;
  }

  function reconcileConsultations(events, consultations, now) {
    return (Array.isArray(consultations) ? consultations : []).reduce(function (current, consultation) {
      return reconcile(current, withDerivedReservation(consultation, now), 'save', now);
    }, Array.isArray(events) ? events : []);
  }

  return {
    updateReservations: updateReservations,
    reconcile: reconcile,
    mergeEditableGeneralEvent: mergeEditableGeneralEvent,
    mergeEventCollections: mergeEventCollections,
    generalDisplayName: generalDisplayName,
    reconcileConsultations: reconcileConsultations
  };
});


