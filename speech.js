(function (root) {
  'use strict';
  const normalize = text => String(text).normalize('NFKC').toLocaleLowerCase('pl-PL')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

  // Accept extra words only after the complete requested phrase.
  const matchesPhrase = (text, phrase) => {
    const spoken = normalize(text), expected = normalize(phrase);
    return expected.length > 0 && (spoken === expected || spoken.startsWith(expected + ' '));
  };

  function create(host = root) {
    const Recognition = host.SpeechRecognition || host.webkitSpeechRecognition;
    const media = host.navigator?.mediaDevices;
    const supported = !!(Recognition && media?.getUserMedia && host.isSecureContext !== false);
    let permission = supported ? 'unknown' : 'unavailable', pendingPermission = null, session = null;
    const listeners = new Set();
    const setPermission = state => { permission = state; listeners.forEach(fn => fn(state)); };
    function requestPermission(retry = false) {
      if (!supported || pendingPermission || (!retry && permission !== 'unknown'))
        return pendingPermission || Promise.resolve(permission);
      setPermission('pending');
      // A prompt may stay unanswered indefinitely. It never blocks the game.
      pendingPermission = Promise.resolve().then(() => media.getUserMedia({ audio: true })).then(stream => {
        // This stream only checks permission; recognition starts on a button click.
        stream.getTracks().forEach(track => track.stop());
        setPermission('granted');
      }, error => setPermission(error.name === 'NotAllowedError' || error.name === 'SecurityError' ? 'denied' : 'error'))
        .then(() => { pendingPermission = null; return permission; });
      return pendingPermission;
    }
    function dispose(s) {
      if (s.timer != null) host.clearTimeout(s.timer);
      const r = s.recognition;
      if (r) {
        r.onstart = r.onresult = r.onerror = r.onend = r.onnomatch = null;
        try { r.abort(); } catch (_) { /* Already stopped. */ }
      }
    }
    function cancel() {
      if (!session) return;
      const old = session; session = null; dispose(old);
      old.update({ state: 'cancelled', text: '' });
    }
    function start(update) {
      if (!supported || session || permission !== 'granted') return false;
      const s = { update, finalText: '', recognition: null, timer: null };
      session = s;
      const active = () => session === s;
      const emit = data => { if (active()) update(data); };
      const finish = data => {
        if (!active()) return;
        session = null; dispose(s); update(data);
      };
      emit({ state: 'starting', text: '' });
      try {
        const r = s.recognition = new Recognition();
        r.lang = 'pl-PL'; r.continuous = false; r.interimResults = true; r.maxAlternatives = 1;
        r.onstart = () => emit({ state: 'listening', text: '' });
        r.onresult = event => {
          if (!active()) return;
          const final = [], interim = [];
          // Rebuild from the complete result list: repeated events cannot duplicate words.
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            (result.isFinal ? final : interim).push(result[0].transcript);
          }
          s.finalText = final.join(' ').trim();
          emit({ state: 'transcript', text: [...final, ...interim].join(' ').trim() });
        };
        r.onerror = event => {
          if (!active()) return;
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') setPermission('denied');
          finish({ state: 'error', error: event.error, text: '' });
        };
        r.onnomatch = () => finish({ state: 'error', error: 'no-speech', text: '' });
        r.onend = () => finish(s.finalText ? { state: 'result', text: s.finalText } : { state: 'error', error: 'no-speech', text: '' });
        // Also recover if a browser never emits onend / onerror.
        s.timer = host.setTimeout(() => finish(s.finalText ? { state: 'result', text: s.finalText } : { state: 'error', error: 'timeout', text: '' }), 20000);
        r.start();
      } catch (error) { finish({ state: 'error', error: error.name, text: '' }); }
      return true;
    }
    return { supported, normalize, matchesPhrase, requestPermission, start, cancel,
      get permission() { return permission; }, get listening() { return !!session; },
      subscribe(fn) { listeners.add(fn); fn(permission); return () => listeners.delete(fn); } };
  }
  root.ForestSpeech = { create, normalize, matchesPhrase };
})(window);
