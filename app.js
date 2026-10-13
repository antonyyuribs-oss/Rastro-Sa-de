/* Evolução — aplicativo local, sem serviços externos ou dependências. */
(() => {
  'use strict';

  const STORAGE_KEY = 'evolucao-pessoal-v1';
  const APP_NAME = 'evolucao';
  const MIN_WEIGHT = 35;
  const MAX_WEIGHT = 250;
  const MIN_WAIST = 50;
  const MAX_WAIST = 160;
  const WAIST_WINDOW = 5;
  const WAIST_STEP = 0.5;
  const SETTINGS_KEY = 'evolucao-pessoal-config-v1';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const icons = {
    good: '<svg viewBox="0 0 24 24"><path d="m5 12 4.5 4.5L19 7"/></svg>',
    bad: '<svg viewBox="0 0 24 24"><path d="M6 6 18 18M18 6 6 18"/></svg>',
    train: '<svg viewBox="0 0 24 24"><path d="m6.5 6.5 11 11M3 8l5-5M16 21l5-5M2 11l9-9M13 22l9-9"/></svg>'
  };

  let records = loadRecords();
  let weight = 90;
  let waist = 98;
  let waistWindowCenter = 98;
  let weightChanged = false;
  let waistChanged = false;
  let goalWeight = loadGoal();
  let chartMetric = 'weight';
  let chartPeriod = '30';
  let listFilter = 'all';
  let selectedPoint = null;
  let editId = null;
  let editorOrigin = 'home';
  let logType = 'food';
  let foodStatus = 'good';
  let toastTimer;

  function localDay(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function parseDay(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d, 12);
  }
  function validDay(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const date = parseDay(s);
    return Number.isFinite(date.getTime()) && localDay(date) === s && s >= '2000-01-01' && s <= localDay();
  }
  function fmt(v) { return Number(v).toFixed(1).replace('.', ','); }
  function todayLabel(dateString) {
    return parseDay(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function newid() {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  function loadRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const saved = JSON.parse(raw);
      if (!saved || saved.app !== APP_NAME || ![1, 2].includes(saved.schemaVersion) || !Array.isArray(saved.records)) return [];
      return validateRecords(saved.records);
    } catch (err) {
      console.warn('Não foi possível ler os registros locais.', err);
      return [];
    }
  }
  function validTimestamp(s) {
    return typeof s === 'string' && s.length <= 40 && Number.isFinite(Date.parse(s));
  }
  function validateRecords(items) {
    if (!Array.isArray(items) || items.length > 25000) throw new Error('Quantidade de registros inválida.');
    const ids = new Set();
    const uniqueDays = new Set();
    return items.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Registro inválido.');
      const { id, type, date, createdAt, updatedAt } = item;
      if (typeof id !== 'string' || id.length < 1 || id.length > 100 || ids.has(id)) throw new Error('Identificador inválido ou repetido.');
      ids.add(id);
      if (!validDay(date) || !validTimestamp(createdAt) || !validTimestamp(updatedAt)) throw new Error('Data de registro inválida.');
      if (type === 'measure') {
        const hasWeight = Object.hasOwn(item, 'weight');
        const hasWaist = Object.hasOwn(item, 'waist');
        if ((!hasWeight && !hasWaist) ||
          (hasWeight && (!Number.isFinite(item.weight) || item.weight < MIN_WEIGHT || item.weight > MAX_WEIGHT)) ||
          (hasWaist && (!Number.isFinite(item.waist) || item.waist < MIN_WAIST || item.waist > MAX_WAIST))) {
          throw new Error('Medidas inválidas.');
        }
        if (uniqueDays.has(`measure:${date}`)) throw new Error('Medidas duplicadas na mesma data.');
        uniqueDays.add(`measure:${date}`);
        return { id, type, date, ...(hasWeight ? { weight: item.weight } : {}),
          ...(hasWaist ? { waist: item.waist } : {}), createdAt, updatedAt };
      }
      if (type === 'food' || type === 'train') {
        if (typeof item.note !== 'string' || item.note.length > 2000) throw new Error('Observação inválida.');
        if (type === 'food') {
          if (item.status !== 'good' && item.status !== 'bad') throw new Error('Situação alimentar inválida.');
          if (uniqueDays.has(`food:${date}`)) throw new Error('Registro alimentar duplicado na mesma data.');
          uniqueDays.add(`food:${date}`);
          return { id, type, date, status: item.status, note: item.note, createdAt, updatedAt };
        }
        return { id, type, date, note: item.note, createdAt, updatedAt };
      }
      throw new Error('Tipo de registro desconhecido.');
    });
  }
  function persist(next) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ app: APP_NAME, schemaVersion: 2, records: next }));
      records = next;
      return true;
    } catch (err) {
      console.error('Erro ao salvar localmente.', err);
      toast('Não foi possível salvar. Verifique o armazenamento do navegador.');
      return false;
    }
  }
  function toast(message) {
    const node = $('#toast');
    node.textContent = message;
    node.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('visible'), 3300);
  }
  function loadGoal() {
    try {
      const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      const g = Number(settings.weightGoal);
      return settings.weightGoal != null && Number.isFinite(g) && g >= MIN_WEIGHT && g <= MAX_WEIGHT ? g : null;
    } catch (_) { return null; }
  }
  function initialMeasurements() {
    const sorted = records.filter((r) => r.type === 'measure').sort((a, b) =>
      b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
    const w = sorted.find((r) => Number.isFinite(r.weight));
    const c = sorted.find((r) => Number.isFinite(r.waist));
    setWeight(w ? w.weight : 90);
    setWaist(c ? c.waist : 98, false, true);
    weightChanged = false;
    waistChanged = false;
  }
  function setWeight(value, edited = false) {
    weight = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, Math.round(Number(value) * 10) / 10));
    $('#weight-number').textContent = fmt(weight);
    $('#weight-dial').setAttribute('aria-valuenow', String(weight));
    $('#weight-dial').setAttribute('aria-valuetext', `${fmt(weight)} quilogramas`);
    if (edited) weightChanged = true;
  }
  function setWaist(value, edited = false, recenter = false) {
    // Exibe medições antigas exatamente como foram salvas; novos ajustes usam 0,5 cm.
    waist = Math.min(MAX_WAIST, Math.max(MIN_WAIST, edited ? Math.round(Number(value) / WAIST_STEP) * WAIST_STEP : Number(value)));
    $('#waist-number').textContent = fmt(waist);
    if (edited) waistChanged = true;
    if (recenter) waistWindowCenter = Math.round(waist / WAIST_STEP) * WAIST_STEP;
    const lo = Math.max(MIN_WAIST, waistWindowCenter - WAIST_WINDOW);
    const hi = Math.min(MAX_WAIST, waistWindowCenter + WAIST_WINDOW);
    const slider = $('#waist-range');
    slider.min = String(lo);
    slider.max = String(hi);
    slider.value = String(waist);
    slider.style.setProperty('--fill', `${100 * (waist - lo) / (hi - lo)}%`);
  }
  function inlineNumber(button, current, min, max, setter) {
    if (button.hidden) return;
    button.hidden = true;
    const input = document.createElement('input');
    input.className = 'inline-number-input';
    input.style.cssText = `width:${button.id === 'weight-number' ? '170px' : '150px'};max-width:100%;background:transparent;color:#edf6fa;border:0;border-bottom:1px solid #9ebccb;border-radius:0;text-align:center;font-size:${button.id === 'weight-number' ? '44px' : '34px'};font-weight:300;outline:none;margin-bottom:${button.id === 'weight-number' ? '0' : '11px'};`;
    input.setAttribute('aria-label', button.getAttribute('aria-label'));
    input.type = 'text';
    input.inputMode = 'decimal';
    input.value = fmt(current);
    button.insertAdjacentElement('afterend', input);
    input.focus();
    input.select();
    let closed = false;
    function close(commit) {
      if (closed) return;
      closed = true;
      if (commit) {
        const number = Number(input.value.trim().replace(',', '.'));
        if (input.value.trim() && Number.isFinite(number) && number >= min && number <= max) setter(number);
        else if (input.value.trim()) toast('Valor fora do intervalo permitido.');
      }
      input.remove();
      button.hidden = false;
    }
    input.addEventListener('blur', () => close(true));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); input.blur(); }
      if (event.key === 'Escape') { event.preventDefault(); close(false); button.focus(); }
    });
  }

  function setupDial() {
    const dial = $('#weight-dial');
    let dragging = false;
    let lastAngle = 0;
    let total = 0;
    function angle(ev) {
      const rect = dial.getBoundingClientRect();
      return Math.atan2(ev.clientY - rect.top - rect.height / 2, ev.clientX - rect.left - rect.width / 2) * 180 / Math.PI;
    }
    dial.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button, input') || event.button > 0) return;
      dragging = true;
      lastAngle = angle(event);
      total = 0;
      dial.setPointerCapture(event.pointerId);
    });
    dial.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      let delta = angle(event) - lastAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      lastAngle = angle(event);
      total += delta;
      const steps = Math.trunc(total / 6);
      if (steps) {
        setWeight(weight + steps * 0.1, true);
        total -= steps * 6;
      }
    });
    dial.addEventListener('pointerup', () => { dragging = false; });
    dial.addEventListener('pointercancel', () => { dragging = false; });
    dial.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(event.key)) {
        event.preventDefault();
        setWeight(weight + (['ArrowUp', 'ArrowRight'].includes(event.key) ? 0.1 : -0.1), true);
      }
    });
    dial.addEventListener('wheel', (event) => {
      if (document.activeElement !== dial) return;
      event.preventDefault();
      setWeight(weight + (event.deltaY < 0 ? 0.1 : -0.1), true);
    }, { passive: false });
    $('#weight-number').addEventListener('click', () => inlineNumber($('#weight-number'), weight, MIN_WEIGHT, MAX_WEIGHT, (v) => setWeight(v, true)));
    $('#waist-number').addEventListener('click', () => inlineNumber($('#waist-number'), waist, MIN_WAIST, MAX_WAIST, (v) => setWaist(v, true, true)));
    $('#waist-range').addEventListener('input', (event) => setWaist(event.target.value, true));
  }

  function showScreen(name) {
    $$('.screen').forEach((node) => {
      const active = node.id === `screen-${name}`;
      node.hidden = !active;
      node.classList.toggle('active', active);
    });
    if (name === 'history') renderHistory();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function saveHomeMeasure() {
    const feedback = $('#home-feedback');
    if (!weightChanged && !waistChanged) {
      feedback.textContent = 'Toque na medida realizada, mesmo sem mudança, e confirme.';
      return;
    }
    const date = localDay();
    const now = new Date().toISOString();
    const old = records.find((r) => r.type === 'measure' && r.date === date);
    const item = old
      ? { ...old, ...(weightChanged ? { weight } : {}), ...(waistChanged ? { waist } : {}), updatedAt: now }
      : { id: newid(), type: 'measure', date, ...(weightChanged ? { weight } : {}),
          ...(waistChanged ? { waist } : {}), createdAt: now, updatedAt: now };
    if (persist(old ? records.map((r) => r.id === old.id ? item : r) : [...records, item])) {
      weightChanged = false;
      waistChanged = false;
      setWaist(waist, false, true);
      feedback.textContent = '✓';
      setTimeout(() => { if (feedback.textContent === '✓') feedback.textContent = ''; }, 1800);
    }
  }
  function openLog(statusOrTrain, id = null, origin = 'home') {
    const today = localDay();
    const old = id ? records.find((r) => r.id === id) :
      statusOrTrain !== 'train' ? records.find((r) => r.type === 'food' && r.date === today) : null;
    if (id && (!old || (old.type !== 'food' && old.type !== 'train'))) return;
    editId = old ? old.id : null;
    editorOrigin = origin;
    logType = old ? old.type : (statusOrTrain === 'train' ? 'train' : 'food');
    foodStatus = id && old && old.type === 'food' ? old.status : statusOrTrain !== 'train' ? statusOrTrain : 'good';
    $('#log-date').value = old ? old.date : today;
    $('#log-date').max = today;
    $('#log-notes').value = old ? old.note : '';
    $('#log-error').textContent = '';
    $('#log-heading').textContent = logType === 'train' ? 'Treino' : 'Alimentação';
    $('#delete-log').hidden = !old;
    $('#log-top-spacer').hidden = !!old;
    $('#food-switch').hidden = logType !== 'food';
    updateLogIcon();
    showScreen('log');
  }
  function updateLogIcon() {
    const symbol = $('#log-symbol');
    const kind = logType === 'train' ? 'train' : foodStatus;
    symbol.className = `log-symbol ${kind}`;
    symbol.innerHTML = icons[kind];
    $$('.food-choice').forEach((node) => {
      const isSelected = node.dataset.foodStatus === foodStatus;
      node.classList.toggle('selected', isSelected);
      node.setAttribute('aria-pressed', String(isSelected));
    });
  }
  function saveLog(event) {
    event.preventDefault();
    const date = $('#log-date').value;
    const note = $('#log-notes').value.trim();
    if (!validDay(date)) { $('#log-error').textContent = 'Escolha uma data válida até hoje.'; return; }
    if (note.length > 2000) { $('#log-error').textContent = 'A observação está muito longa.'; return; }
    const now = new Date().toISOString();
    const existing = editId ? records.find((r) => r.id === editId) : null;
    const conflict = logType === 'food' ? records.find((r) => r.type === 'food' && r.date === date && r.id !== editId) : null;
    if (conflict && existing) { $('#log-error').textContent = 'Já existe um registro alimentar nesta data.'; return; }
    const old = existing || conflict;
    const item = logType === 'food'
      ? { id: old ? old.id : newid(), type: 'food', date, status: foodStatus, note, createdAt: old ? old.createdAt : now, updatedAt: now }
      : { id: old ? old.id : newid(), type: 'train', date, note, createdAt: old ? old.createdAt : now, updatedAt: now };
    const next = old ? records.map((r) => r.id === old.id ? item : r) : [...records, item];
    if (persist(next)) {
      showScreen(editorOrigin);
      toast(logType === 'train' ? 'Treino registrado.' : 'Alimentação registrada.');
    }
  }
  function openMeasureEditor(id) {
    const item = records.find((r) => r.id === id && r.type === 'measure');
    if (!item) return;
    editId = id;
    editorOrigin = 'history';
    $('#measure-date').value = item.date;
    $('#measure-date').max = localDay();
    $('#measure-weight').value = item.weight == null ? '' : String(item.weight);
    $('#measure-waist').value = item.waist == null ? '' : String(item.waist);
    $('#measure-error').textContent = '';
    showScreen('measure');
  }
  function saveEditedMeasure(event) {
    event.preventDefault();
    const date = $('#measure-date').value;
    const w = Number($('#measure-weight').value);
    const c = Number($('#measure-waist').value);
    const old = records.find((r) => r.id === editId && r.type === 'measure');
    if (!old) return;
    if (!validDay(date)) { $('#measure-error').textContent = 'Escolha uma data válida até hoje.'; return; }
    const hasW = $('#measure-weight').value.trim() !== '';
    const hasC = $('#measure-waist').value.trim() !== '';
    if ((!hasW && !hasC) || (hasW && (!Number.isFinite(w) || w < MIN_WEIGHT || w > MAX_WEIGHT)) ||
      (hasC && (!Number.isFinite(c) || c < MIN_WAIST || c > MAX_WAIST))) {
      $('#measure-error').textContent = 'Informe pelo menos uma medida válida.'; return;
    }
    if (records.some((r) => r.type === 'measure' && r.date === date && r.id !== old.id)) {
      $('#measure-error').textContent = 'Já existem medidas registradas nessa data.'; return;
    }
    const { weight: _oldWeight, waist: _oldWaist, ...rest } = old;
    const item = { ...rest, date, ...(hasW ? { weight: Math.round(w * 10) / 10 } : {}),
      ...(hasC ? { waist: c === old.waist ? c : Math.round(c / WAIST_STEP) * WAIST_STEP } : {}), updatedAt: new Date().toISOString() };
    if (persist(records.map((r) => r.id === old.id ? item : r))) {
      initialMeasurements();
      showScreen('history');
      toast('Medidas atualizadas.');
    }
  }
  function deleteEditorRecord() {
    if (!editId) return;
    const old = records.find((r) => r.id === editId);
    if (!old) return;
    if (!confirm('Excluir este registro? Esta ação não pode ser desfeita.')) return;
    if (persist(records.filter((r) => r.id !== editId))) {
      initialMeasurements();
      showScreen(editorOrigin);
      toast('Registro excluído.');
    }
  }

  function sortRecords(items) {
    return items.slice().sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }
  function filteredMeasures() {
    const current = parseDay(localDay());
    const start = new Date(current);
    if (chartPeriod !== 'all') start.setDate(start.getDate() - (Number(chartPeriod) - 1));
    return records.filter((r) => r.type === 'measure' && Number.isFinite(r[chartMetric]) &&
      (chartPeriod === 'all' || parseDay(r.date) >= start))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  function renderHistory() {
    const allMeasures = records.filter((r) => r.type === 'measure' && Number.isFinite(r[chartMetric])).sort((a, b) => b.date.localeCompare(a.date));
    const latest = allMeasures[0];
    const unit = chartMetric === 'weight' ? 'kg' : 'cm';
    $('#stats-unit').textContent = unit;
    $('#stats-current').textContent = latest ? fmt(latest[chartMetric]) : '—';
    $('#stats-period-label').textContent = chartPeriod === '30' ? 'Últimos 30 dias' : chartPeriod === '90' ? 'Últimos 90 dias' : 'Desde o início';
    const points = filteredMeasures();
    const changeNode = $('#stats-change');
    changeNode.className = 'stats-change neutral';
    changeNode.textContent = '—';
    if (points.length >= 2) {
      const diff = Math.round((points.at(-1)[chartMetric] - points[0][chartMetric]) * 10) / 10;
      changeNode.textContent = `${diff < 0 ? '−' : diff > 0 ? '+' : ''}${fmt(Math.abs(diff))} ${unit}`;
      changeNode.className = `stats-change ${diff < 0 ? 'decrease' : diff > 0 ? 'increase' : 'neutral'}`;
    }
    renderChart(points, unit);
    renderHabits();
    renderList();
  }
  function dayNumber(day) { return Date.parse(`${day}T12:00:00Z`) / 86400000; }
  function renderChart(points, unit) {
    const root = $('#history-chart');
    const info = $('#chart-point-info');
    const legend = $('#chart-legend');
    legend.hidden = true;
    legend.textContent = '';
    if (!points.length) {
      root.innerHTML = '<div class="chart-empty">Nenhuma medida neste período</div>';
      info.textContent = '';
      return;
    }
    const values = points.map((p) => p[chartMetric]);
    let min = Math.min(...values), max = Math.max(...values);
    const padding = Math.max(chartMetric === 'weight' ? 0.7 : 1, (max - min) * 0.12);
    min -= padding;
    max += padding;
    const left = 34, right = 294, top = 22, bottom = 151;
    const range = max - min;
    const firstDay = dayNumber(points[0].date);
    const lastDay = dayNumber(points.at(-1).date);
    const x = (point) => firstDay === lastDay ? (left + right) / 2 :
      left + (dayNumber(point.date) - firstDay) / (lastDay - firstDay) * (right - left);
    const y = (value) => bottom - (value - min) / range * (bottom - top);
    const coords = points.map((p) => ({ x: x(p), y: y(p[chartMetric]) }));
    const path = coords.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
    const area = `${path} L${coords.at(-1).x.toFixed(2)} ${bottom} L${coords[0].x.toFixed(2)} ${bottom} Z`;
    const grid = [0, 0.5, 1].map((pos) => {
      const val = max - pos * range;
      const gy = top + pos * (bottom - top);
      return `<line x1="33" y1="${gy}" x2="299" y2="${gy}" stroke="#34444e" stroke-width=".8" stroke-dasharray="3 5"/><text x="2" y="${gy + 4}" fill="#8195a1" font-size="10">${fmt(val)}</text>`;
    }).join('');
    const circles = coords.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="${selectedPoint === points[i].id ? 5.5 : 3.4}" fill="#c3dfed" stroke="#24333c" stroke-width="1.6"/><circle class="chart-point" data-point="${i}" tabindex="0" role="button" aria-label="${todayLabel(points[i].date)}: ${fmt(points[i][chartMetric])} ${unit}" cx="${p.x}" cy="${p.y}" r="13" fill="transparent"/>`).join('');
    const leftDate = todayLabel(points[0].date).replace(/\. de | de /g, ' ');
    const rightDate = todayLabel(points.at(-1).date).replace(/\. de | de /g, ' ');
    // Média dos registros disponíveis nos sete dias anteriores, sem inventar medições ausentes.
    const trend = chartMetric === 'weight' ? points.map((point) => {
      const t = dayNumber(point.date);
      const recent = points.filter((r) => dayNumber(r.date) >= t - 6 && dayNumber(r.date) <= t);
      return recent.length >= 3 ? { x: x(point), y: y(recent.reduce((sum, r) => sum + r.weight, 0) / recent.length) } : null;
    }) : [];
    let trendPath = '';
    const trendPoints = trend.filter(Boolean);
    if (trendPoints.length >= 2) {
      let active = false;
      trend.forEach((p) => {
        if (!p) { active = false; return; }
        trendPath += `${active ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
        active = true;
      });
      // Só exibe segmentos com dois ou mais pontos (e não pontos isolados).
      const segments = trendPath.trim().split(/(?=M)/).filter(segment => (segment.match(/L/g) || []).length);
      trendPath = segments.join(' ');
      if (trendPath) {
        legend.hidden = false;
        legend.innerHTML = '<span class="dash"></span>Média móvel de 7 dias (mín. 3 medições)';
      }
    }
    const goalInView = chartMetric === 'weight' && goalWeight !== null && goalWeight >= min && goalWeight <= max;
    const goalMarkup = goalInView ? `<line x1="33" y1="${y(goalWeight)}" x2="299" y2="${y(goalWeight)}" stroke="#80baa3" stroke-dasharray="5 5" stroke-width="1.4"/><text x="299" y="${Math.max(top+10, y(goalWeight)-5)}" text-anchor="end" font-size="10" fill="#9fcdb2">Meta ${fmt(goalWeight)}</text>` : '';
    root.innerHTML = `<svg viewBox="0 0 320 195" preserveAspectRatio="none" role="img" aria-label="Evolução de ${chartMetric === 'weight' ? 'peso' : 'circunferência'}">
      <defs><linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93bed4" stop-opacity=".22"/><stop offset="1" stop-color="#93bed4" stop-opacity="0"/></linearGradient></defs>
      ${grid}${coords.length > 1 ? `<path d="${area}" fill="url(#chart-gradient)"/><path d="${path}" fill="none" stroke="#b8d7e8" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
      ${goalMarkup}${trendPath ? `<path d="${trendPath}" fill="none" stroke="#dfba83" stroke-width="2" stroke-dasharray="4 4" stroke-linecap="round"/>` : ''}
      ${circles}<text x="34" y="182" fill="#8398a3" font-size="11">${leftDate}</text>${points.length > 1 ? `<text x="294" y="182" fill="#8398a3" font-size="11" text-anchor="end">${rightDate}</text>` : ''}
      </svg>`;
    if (chartMetric === 'weight' && goalWeight !== null && !goalInView) {
      legend.hidden = false;
      const goal = document.createElement('span');
      goal.textContent = `${legend.textContent ? ' · ' : ''}Meta: ${fmt(goalWeight)} kg (fora da escala)`;
      legend.append(goal);
    }
    const selected = points.find((p) => p.id === selectedPoint);
    info.textContent = selected ? `${todayLabel(selected.date)} · ${fmt(selected[chartMetric])} ${unit}` : 'Toque em um ponto para ver o registro';
    root.querySelectorAll('[data-point]').forEach((node) => {
      const select = () => { selectedPoint = points[Number(node.dataset.point)].id; renderChart(points, unit); };
      node.addEventListener('click', select);
      node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
    });
  }
  function renderHabits() {
    const grid = $('#habits-grid');
    grid.replaceChildren();
    const today = parseDay(localDay());
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - 13 + i);
      return localDay(d);
    });
    const label = (value) => { const el = document.createElement('div'); el.className = 'habit-label'; el.textContent = value; grid.append(el); };
    label('');
    days.forEach((day, i) => {
      const el = document.createElement('span'); el.className = 'habit-day';
      el.textContent = i % 3 === 1 || i === 13 ? String(Number(day.slice(-2))) : '·';
      el.title = todayLabel(day); grid.append(el);
    });
    const food = new Map(records.filter(r => r.type === 'food').map(r => [r.date, r]));
    const train = new Set(records.filter(r => r.type === 'train').map(r => r.date));
    label('Alimentação');
    days.forEach(day => {
      const item = food.get(day);
      const cell = document.createElement('span');
      cell.className = 'habit-cell' + (item ? ` ${item.status}` : '');
      cell.title = `${todayLabel(day)}: ${item ? (item.status === 'good' ? 'Dentro do planejado' : 'Fora do planejado') : 'Sem registro alimentar'}`;
      grid.append(cell);
    });
    label('Treino');
    days.forEach(day => {
      const cell = document.createElement('span'); cell.className = 'habit-cell' + (train.has(day) ? ' train' : '');
      cell.title = `${todayLabel(day)}: ${train.has(day) ? 'Treino registrado' : 'Sem registro de treino'}`;
      grid.append(cell);
    });
    const good = days.filter(day => food.get(day)?.status === 'good').length;
    const bad = days.filter(day => food.get(day)?.status === 'bad').length;
    const trained = days.filter(day => train.has(day)).length;
    $('#habits-summary').textContent = `${good} dia(s) no planejado · ${bad} fora · ${trained} dia(s) com treino. Cinza = sem registro.`;
  }
  function renderList() {
    const all = sortRecords(records).filter((r) => listFilter === 'all' ||
      (listFilter === 'measure' && r.type === 'measure') ||
      (listFilter === 'activity' && r.type !== 'measure'));
    $('#record-count').textContent = `${all.length} ${all.length === 1 ? 'registro' : 'registros'}`;
    const list = $('#history-list');
    list.replaceChildren();
    if (!all.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-list';
      empty.textContent = 'Nenhum registro. Use a tela inicial para começar.';
      list.append(empty);
      return;
    }
    const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
    all.forEach((r) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'entry';
      row.setAttribute('aria-label', `Editar registro de ${todayLabel(r.date)}`);
      const date = document.createElement('span');
      date.className = 'entry-date';
      const day = document.createElement('span');
      day.className = 'entry-day';
      day.textContent = String(Number(r.date.slice(-2))).padStart(2, '0');
      const month = document.createElement('span');
      month.className = 'entry-month';
      month.textContent = monthFmt.format(parseDay(r.date)).replace('.', '').toUpperCase();
      date.append(day, month);
      const main = document.createElement('span');
      main.className = 'entry-main';
      const title = document.createElement('span');
      title.className = 'entry-title';
      title.style.display = 'block';
      const sub = document.createElement('span');
      sub.className = 'entry-sub';
      sub.style.display = 'block';
      const right = document.createElement('span');
      right.className = 'entry-right';
      if (r.type === 'measure') {
        title.textContent = 'Medidas';
        sub.textContent = Number.isFinite(r.weight) && Number.isFinite(r.waist) ? 'Peso e circunferência' : Number.isFinite(r.weight) ? 'Peso' : 'Circunferência';
        right.textContent = `${Number.isFinite(r.weight) ? fmt(r.weight) : '—'} / ${Number.isFinite(r.waist) ? fmt(r.waist) : '—'}`;
      } else {
        title.textContent = r.type === 'train' ? 'Treino' : 'Alimentação';
        sub.textContent = r.note || (r.type === 'train' ? 'Treino realizado' : r.status === 'good' ? 'Dentro do planejado' : 'Fora do planejado');
        const bubble = document.createElement('span');
        bubble.className = `entry-bubble ${r.type === 'train' ? 'train' : r.status}`;
        bubble.innerHTML = icons[r.type === 'train' ? 'train' : r.status];
        right.append(bubble);
      }
      main.append(title, sub);
      row.append(date, main, right);
      row.addEventListener('click', () => r.type === 'measure'
        ? openMeasureEditor(r.id)
        : openLog(r.type === 'train' ? 'train' : r.status, r.id, 'history'));
      list.append(row);
    });
  }
  function setMetric(metric) {
    chartMetric = metric;
    selectedPoint = null;
    $$('[data-metric]').forEach((b) => {
      const active = b.dataset.metric === metric;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    renderHistory();
  }
  function setPeriod(period) {
    chartPeriod = period;
    selectedPoint = null;
    $$('[data-period]').forEach((b) => {
      const active = b.dataset.period === period;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    renderHistory();
  }
  function setFilter(filter) {
    listFilter = filter;
    $$('[data-filter]').forEach((b) => {
      const active = b.dataset.filter === filter;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    renderList();
  }
  function downloadBackup() {
    const backup = { app: APP_NAME, schemaVersion: 2, exportedAt: new Date().toISOString(), settings: { weightGoal: goalWeight }, records };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `evolucao-backup-${localDay()}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    try { localStorage.setItem('evolucao-last-backup-v1', new Date().toISOString()); } catch (_) {}
    refreshBackupReminder();
    toast('Backup gerado.');
  }
  async function importBackup(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Arquivo maior que 5 MB.');
      const raw = JSON.parse(await file.text());
      if (!raw || raw.app !== APP_NAME || ![1, 2].includes(raw.schemaVersion) || !Array.isArray(raw.records)) throw new Error('O arquivo não é um backup válido deste aplicativo.');
      const incoming = validateRecords(raw.records);
      if (!confirm(`Importar ${incoming.length} registro(s)? Todos os ${records.length} registro(s) atuais serão substituídos.`)) return;
      if (persist(incoming)) {
        if (raw.schemaVersion === 2 && raw.settings && Object.hasOwn(raw.settings, 'weightGoal')) {
          const g = raw.settings.weightGoal;
          const validGoal = g === null || (typeof g === 'number' && Number.isFinite(g) && g >= MIN_WEIGHT && g <= MAX_WEIGHT);
          if (validGoal) {
            goalWeight = g;
            try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ weightGoal: g })); } catch (_) {}
          }
        }
        $('#weight-goal').value = goalWeight == null ? '' : String(goalWeight);
        refreshBackupReminder();
        initialMeasurements();
        selectedPoint = null;
        $('#settings-status').textContent = `Importados ${incoming.length} registros.`;
        toast('Backup importado.');
      }
    } catch (err) {
      $('#settings-status').textContent = err.message || 'Não foi possível importar o backup.';
    }
  }
  function clearData() {
    if (!confirm('Apagar permanentemente todos os registros deste aparelho? Faça um backup antes de continuar.')) return;
    if (!confirm('Confirma a exclusão de TODOS os registros?')) return;
    if (persist([])) {
      initialMeasurements();
      selectedPoint = null;
      refreshBackupReminder();
      $('#settings-status').textContent = 'Todos os registros foram apagados.';
      toast('Dados apagados.');
    }
  }

  function saveGoal() {
    const raw = $('#weight-goal').value.trim();
    const value = raw === '' ? null : Number(raw);
    if (value !== null && (!Number.isFinite(value) || value < MIN_WEIGHT || value > MAX_WEIGHT)) {
      $('#settings-status').textContent = 'Meta inválida: informe um valor entre 35 e 250 kg.';
      return;
    }
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ weightGoal: value }));
      goalWeight = value;
      $('#settings-status').textContent = value === null ? 'Meta removida.' : 'Meta salva.';
    } catch (err) {
      $('#settings-status').textContent = 'Não foi possível salvar a meta.';
    }
  }
  function refreshBackupReminder() {
    const el = $('#backup-reminder');
    const last = localStorage.getItem('evolucao-last-backup-v1');
    const hasRecords = records.length >= 5;
    const oldest = records.reduce((min, r) => r.createdAt < min ? r.createdAt : min, new Date().toISOString());
    const daysSinceFirst = (Date.now() - Date.parse(oldest)) / 86400000;
    const daysSinceBackup = last && Number.isFinite(Date.parse(last)) ? (Date.now() - Date.parse(last)) / 86400000 : Infinity;
    el.hidden = !(hasRecords && daysSinceFirst >= 7 && daysSinceBackup >= 7);
    if (!el.hidden) el.textContent = 'Já faz algum tempo sem gerar um backup. Exporte seus dados para mantê-los seguros.';
  }

  // Interações e navegação.
  setupDial();
  initialMeasurements();
  $('#open-history').addEventListener('click', () => showScreen('history'));
  $('#open-settings').addEventListener('click', () => showScreen('settings'));
  $$('[data-back]').forEach((b) => b.addEventListener('click', () => showScreen(b.dataset.back)));
  $$('[data-cancel-editor]').forEach((b) => b.addEventListener('click', () => showScreen(editorOrigin)));
  $$('[data-new-log]').forEach((b) => b.addEventListener('click', () => openLog(b.dataset.newLog)));
  $$('.food-choice').forEach((b) => b.addEventListener('click', () => { foodStatus = b.dataset.foodStatus; updateLogIcon(); }));
  $('#save-measure').addEventListener('click', saveHomeMeasure);
  $('#log-form').addEventListener('submit', saveLog);
  $('#measure-form').addEventListener('submit', saveEditedMeasure);
  $('#delete-log').addEventListener('click', deleteEditorRecord);
  $('#delete-measure').addEventListener('click', deleteEditorRecord);
  $$('[data-metric]').forEach((b) => b.addEventListener('click', () => setMetric(b.dataset.metric)));
  $$('[data-period]').forEach((b) => b.addEventListener('click', () => setPeriod(b.dataset.period)));
  $$('[data-filter]').forEach((b) => b.addEventListener('click', () => setFilter(b.dataset.filter)));
  $('#export-backup').addEventListener('click', downloadBackup);
  $('#import-backup').addEventListener('click', () => $('#backup-file').click());
  $('#backup-file').addEventListener('change', importBackup);
  $('#clear-data').addEventListener('click', clearData);
  $('#waist-range').step = String(WAIST_STEP);
  $('#weight-goal').value = goalWeight == null ? '' : String(goalWeight);
  $('#save-goal').addEventListener('click', saveGoal);
  $('#open-settings').addEventListener('click', refreshBackupReminder);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Modo offline indisponível:', err));
    });
  }
})();
