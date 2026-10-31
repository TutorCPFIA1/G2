/* CPFIA · Generación 2 — Sitio de estudiantes (v3)
   Todo el contenido variable (sesiones, avisos, materiales, textos, temas) llega desde G2 Config
   a través del backend. Este archivo no necesita cambios para actualizarlo. */
(function () {
'use strict';
var CFG = window.G2_CONFIG || {};
var DEMO = !CFG.apiUrl;
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var LS = {
  get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
};
var S = { token: null, exp: 0, usuario: null, config: null, estado: null, offset: 0, ultimo: 0, vista: '', flash: {} };
var ticker = null;
var ESCRITURAS = ['subirDocumento', 'registrarFecha', 'registrarDuda', 'noCertificara', 'aceptarAviso', 'voucher'];

/* ---------- Utilidades ---------- */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function urlOk(u) { u = String(u || '').trim(); return /^https?:\/\//i.test(u) || /^assets\//.test(u) ? u : ''; }
function parr(t) { return String(t || '').split(/\n+/).filter(Boolean).map(function (x) { return '<p>' + esc(x) + '</p>'; }).join(''); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function nuevoId() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2); }
function titleCase(s) { return String(s || '').toLowerCase().replace(/(^|[\s\-'])([a-záéíóúüñ])/g, function (m, a, b) { return a + b.toUpperCase(); }); }
function ahoraS() { return Date.now() + S.offset; }
function docs() { return (S.estado && S.estado.docs) || {}; }
function P(k, def) { var v = S.config && S.config.params[k]; return v === undefined || v === '' ? def : v; }
function mostrarMsg(el, tipo, texto) { el.hidden = false; el.className = 'msg ' + tipo; el.textContent = texto; }
function fmtFecha(iso) {
  var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return '';
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtDia(iso) {
  var m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  var t = new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function fmtTs(s) {
  var m = String(s || '').match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  return m ? fmtFecha(m[1]) + ', ' + hora12(m[2]) : fmtFecha(s) || String(s || '');
}
function hora12(hhmm) {
  var p = hhmm.split(':'), h = +p[0], m = p[1], suf = h >= 12 ? 'pm' : 'am';
  h = h % 12; if (h === 0) h = 12; return h + ':' + m + ' ' + suf;
}
function lunesDe(iso) {
  var m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/), d = new Date(+m[1], +m[2] - 1, +m[3]);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/* ---------- Comunicación con el backend ---------- */
async function api(action, datos, op) {
  op = op || {};
  datos = Object.assign({ action: action }, datos || {});
  if (S.token && action !== 'login') datos.token = S.token;
  if (ESCRITURAS.indexOf(action) >= 0 && !datos.reqId) datos.reqId = nuevoId();
  if (DEMO) return window.G2_DEMO.handle(datos);
  var intento = 0, max = op.reintentos == null ? 3 : op.reintentos;
  for (;;) {
    var to = null;
    try {
      var ctl = new AbortController();
      to = setTimeout(function () { ctl.abort(); }, op.timeout || 60000);
      var r = await fetch(CFG.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(datos), signal: ctl.signal, redirect: 'follow' });
      clearTimeout(to);
      if (!r.ok) throw new Error('http ' + r.status);
      var j = await r.json();
      if (j.ok === false && j.codigo === 'servidor' && intento < 1) throw new Error('servidor');
      return j;
    } catch (e) {
      if (to) clearTimeout(to);
      if (intento >= max) break;
      await sleep(700 * Math.pow(2, intento) + Math.random() * 500);
      intento++;
    }
  }
  return { ok: false, codigo: 'red', error: 'No pudimos conectar con el servidor. Revisa tu internet e intenta de nuevo.' };
}
async function llamar(action, datos, op) {
  var j = await api(action, datos, op);
  if (!j.ok) {
    if (j.codigo === 'auth') { cerrarSesion('Tu sesión expiró. Vuelve a entrar con tu correo.'); }
    var e = new Error(j.error || 'No se pudo completar la solicitud.'); e.codigo = j.codigo; throw e;
  }
  return j;
}

/* ---------- Sesión ---------- */
function aplicar(j) {
  S.usuario = j.usuario; S.config = j.config; S.estado = j.estado; S.offset = j.ahora - Date.now(); S.ultimo = Date.now();
}
function guardarSesion() { LS.set('g2_sesion', { token: S.token, exp: S.exp }); }
function ocultarSplash() { var s = $('#splash'); if (s) s.hidden = true; }
function mostrarLogin(texto) {
  ocultarSplash(); $('#app').hidden = true; $('#login').hidden = false;
  var m = $('#lgMsg');
  if (texto) mostrarMsg(m, 'info', texto); else m.hidden = true;
  setTimeout(function () { try { $('#lgCorreo').focus(); } catch (e) {} }, 50);
}
function cerrarSesion(texto) {
  try { SIM.fase = ''; SIM.resultado = null; SIM.preguntas = []; } catch (e) {}
  S.token = null; S.exp = 0; S.usuario = null; S.config = null; S.estado = null; S.flash = {};
  LS.del('g2_sesion'); clearInterval(ticker);
  mostrarLogin(texto);
}
async function restaurar() {
  var g = LS.get('g2_sesion');
  if (g && g.token && g.exp * 1000 > Date.now()) {
    S.token = g.token; S.exp = g.exp;
    var j = await api('bootstrap');
    if (j.ok) { aplicar(j); abrirApp(); return; }
    if (j.codigo === 'red') { mostrarLogin('No pudimos conectar. Revisa tu internet e intenta de nuevo.'); S.token = null; return; }
    S.token = null; LS.del('g2_sesion');
  }
  mostrarLogin('');
}
async function refrescar() {
  try { var j = await llamar('bootstrap'); aplicar(j); } catch (e) { /* se conserva lo que ya hay */ }
}

$('#fLogin').addEventListener('submit', async function (ev) {
  ev.preventDefault();
  var correo = $('#lgCorreo').value.trim(), btn = $('#lgBtn'), m = $('#lgMsg');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { mostrarMsg(m, 'err', 'Escribe un correo electrónico válido.'); return; }
  btn.disabled = true; mostrarMsg(m, 'info', 'Verificando…');
  var j = await api('login', { correo: correo });
  btn.disabled = false;
  if (!j.ok) { mostrarMsg(m, 'err', j.error || 'No se pudo iniciar sesión.'); return; }
  S.token = j.token; S.exp = j.exp; aplicar(j); guardarSesion(); m.hidden = true; abrirApp();
});
$('#btnSalir').addEventListener('click', function () { cerrarSesion(''); });

/* ---------- Aplicación ---------- */
var RUTAS = [
  { id: 'inicio', t: 'Inicio' }, { id: 'info', t: 'Información general' }, { sep: 1 },
  { id: 'paso1', t: '1 · Curso', chk: function () { return !!docs().constancia_curso; } },
  { id: 'paso2', t: '2 · Agendar', chk: function () { return !!S.estado.fechaExamen; } },
  { id: 'paso3', t: '3 · Guía y simulacro' },
  { id: 'paso4', t: '4 · Tu examen', chk: function () { return !!docs().resultado_examen; } },
  { id: 'paso5', t: '5 · Certificado', chk: function () { return !!docs().certificado_oficial; } },
  { id: 'paso6', t: '6 · Constancia NETEC (opcional)', chk: function () { return !!docs().constancia_netec; } }, { sep: 1 },
  { id: 'sesiones', t: 'Sesiones' }, { id: 'mentorias', t: 'Mentorías' }, { id: 'dudas', t: 'Dudas' }
];

function abrirApp() {
  ocultarSplash(); $('#login').hidden = true; $('#app').hidden = false; $('#preview').hidden = !DEMO;
  document.title = P('nombre_programa', 'CPFIA · Generación 2') + ' · ' + P('titulo_sitio', 'Certificación AWS Cloud Practitioner');
  pintarCabecera();
  if (!location.hash || location.hash === '#') location.hash = '#/inicio';
  ruta();
  pedirAviso();
}
function pintarCabecera() {
  $('#marca').textContent = P('nombre_programa', 'CPFIA · Generación 2');
  $('#uNombre').textContent = titleCase(S.usuario.nombre);
  $('#uCohort').textContent = S.usuario.tipo === 'Revisor' ? (S.usuario.rol || 'Equipo') + ' · modo lectura' : 'Cohort ' + S.usuario.cohort;
  var pt = $('#pieTexto'); if (pt) pt.textContent = P('pie_texto', pt.textContent);
}
function actualizarFab() { var f = $('#fabDudas'); if (!f) return; f.hidden = !S.usuario || S.vista === 'dudas' || (S.vista === 'simulacro' && SIM.fase === 'examen'); }
function pintarMenu(actual) {
  setTimeout(actualizarFab, 0);
  $('#menu').innerHTML = RUTAS.map(function (r) {
    if (r.sep) return '<span class="sep"></span>';
    return '<a href="#/' + r.id + '"' + (r.id === actual ? ' class="act" aria-current="page"' : '') + '>' + esc(r.t) + (r.chk && r.chk() ? '<span class="chk" title="Completado">✓</span>' : '') + '</a>';
  }).join('');
}

window.addEventListener('hashchange', ruta);
async function ruta() {
  if (!S.usuario) return;
  var id = (location.hash.replace(/^#\/?/, '') || 'inicio');
  if (!VISTAS[id]) id = id === 'privacidad' ? 'privacidad' : 'inicio';
  clearInterval(ticker);
  if (Date.now() - S.ultimo > 180000) { $('#vista').innerHTML = '<div class="cargando"><div class="spin" aria-hidden="true"></div>Cargando…</div>'; await refrescar(); }
  S.vista = id;
  pintarCabecera(); pintarMenu(id);
  var v = $('#vista'); v.innerHTML = bannerRev() + VISTAS[id](); window.scrollTo(0, 0);
  if (POST[id]) POST[id]();
}
function bannerRev() { return S.usuario && S.usuario.tipo === 'Revisor' ? '<div class="banner"><b>Modo revisión:</b> ves el sitio como lo ven los estudiantes. Puedes recorrerlo, pero no subir documentos ni registrar fechas o dudas.</div>' : ''; }
function repintar() { if (!S.vista) return; pintarMenu(S.vista); var y = window.scrollY; $('#vista').innerHTML = bannerRev() + VISTAS[S.vista](); window.scrollTo(0, y); if (POST[S.vista]) POST[S.vista](); }

/* ---------- Bloques reutilizables ---------- */
function textos(clave) { return (S.config.textos || []).filter(function (t) { return t.clave === clave; }); }
function textoHtml(clave) { return textos(clave).map(function (t) { return (t.titulo ? '<h3>' + esc(t.titulo) + '</h3>' : '') + parr(t.texto); }).join(''); }
function textoPlano(clave, def) { var t = textos(clave)[0]; return t && t.texto ? t.texto : def; }
function pendiente(t) { return '<div class="pendiente">' + esc(t || 'Próximamente') + '</div>'; }

function videoHtml(u) {
  var m, src = null;
  if ((m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|live\/|shorts\/)|youtu\.be\/)([\w-]{11})/))) src = 'https://www.youtube-nocookie.com/embed/' + m[1];
  else if ((m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/))) src = 'https://drive.google.com/file/d/' + m[1] + '/preview';
  return (src ? '<div class="videobox"><iframe src="' + esc(src) + '" allowfullscreen loading="lazy" title="Video" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>' : '') +
    '<div class="acciones"><a class="btn sec" href="' + esc(u) + '" target="_blank" rel="noopener">Abrir el video en otra pestaña</a></div>';
}
function pdfHtml(u) {
  return '<div class="acciones"><a class="btn" href="' + esc(u) + '" target="_blank" rel="noopener">Abrir en pestaña nueva</a>' +
    '<a class="btn sec" href="' + esc(u) + '" download>Descargar</a></div>';
}
function cardMat(m) {
  var u = urlOk(m.url), cuerpo;
  if (m.tipo === 'liga') cuerpo = u ? '<div class="acciones"><a class="btn" href="' + esc(u) + '" target="_blank" rel="noopener">Abrir</a></div>' : pendiente('Próximamente');
  else if (m.tipo === 'video') cuerpo = u ? videoHtml(u) : pendiente('El video estará disponible próximamente.');
  else cuerpo = u ? pdfHtml(u) : pendiente('Estará disponible próximamente.');
  return '<div class="card"><h3>' + esc(m.titulo) + '</h3>' + (m.descripcion ? '<p style="margin:0 0 4px;color:var(--suave)">' + esc(m.descripcion) + '</p>' : '') + cuerpo + '</div>';
}
function materiales(paso) {
  var l = (S.config.materiales || []).filter(function (m) { return m.paso === String(paso); });
  return l.length ? '<div class="mat">' + l.map(cardMat).join('') + '</div>' : '';
}
function ejemploHtml(u) {
  var items = String(u || '').split(/[;\n]+/).map(function (x) { var p = x.split('|'); return { u: urlOk(p[0]), t: (p[1] || '').trim() }; }).filter(function (x) { return x.u; });
  if (!items.length) return '';
  return '<div class="ejemplo"><button class="btn sec" type="button" data-ejemplo="1" aria-expanded="false">Ver ejemplo del documento</button><div class="ejimgs" hidden>' +
    '<p class="ayuda" style="margin:10px 0 0;color:var(--suave)">Ejemplo con los datos personales tapados. Toca la imagen para verla completa en una pestaña nueva.</p>' +
    items.map(function (x, k) {
      return '<figure>' + (x.t ? '<figcaption>' + esc(x.t) + '</figcaption>' : '') + '<a href="' + esc(x.u) + '" target="_blank" rel="noopener"><img src="' + esc(x.u) + '" alt="' + esc(x.t || 'Ejemplo del documento') + '" loading="lazy"></a></figure>';
    }).join('') + '</div></div>';
}
function estadoDoc(clave) {
  var e = docs()[clave];
  return e ? '<div class="entregado"><span class="ico" aria-hidden="true">✓</span><div><b>Entregado</b> · ' + esc(e.nombre) + '<small>' + esc(fmtTs(e.fecha)) + ' · ' + esc(e.kb) + ' KB' + (e.resultado ? ' · ' + esc(e.resultado) : '') + '</small></div></div>'
    : '<div class="faltante">Pendiente: todavía no has subido este documento.</div>';
}
function subidaHtml(clave) {
  var def = null; (S.config.documentos || []).forEach(function (d) { if (d.clave === clave) def = d; });
  if (!def) return '';
  var e = docs()[clave], max = P('max_archivo_mb', '3');
  var f = S.flash[clave]; delete S.flash[clave];
  var abierto = String(P('registro_abierto', 'S')).toUpperCase() !== 'N';
  return '<div class="card"><h3>' + esc(def.nombre) + '</h3>' + (def.descripcion ? '<p style="margin:0 0 10px;color:var(--suave)">' + esc(def.descripcion) + '</p>' : '') + estadoDoc(clave) +
    (abierto ? '<form data-doc="' + esc(clave) + '" novalidate><div class="fila">' +
      (def.requiere_resultado ? '<div><label for="res_' + esc(clave) + '">Resultado</label><select name="resultado" id="res_' + esc(clave) + '"><option value="">Selecciona…</option><option>Aprobatorio</option><option>No aprobatorio</option></select></div>' : '') +
      '<div><label for="arc_' + esc(clave) + '">Archivo</label><input type="file" name="archivo" id="arc_' + esc(clave) + '" accept=".pdf,application/pdf"><small class="ayuda">Solo PDF, máx. ' + esc(max) + ' MB.</small></div></div>' +
      '<div><button class="btn" type="submit">' + (e ? 'Reemplazar documento' : 'Subir documento') + '</button></div>' +
      '<div class="msg ' + (f ? 'ok' : '') + '" role="status" aria-live="polite"' + (f ? '' : ' hidden') + '>' + esc(f || '') + '</div></form>' +
      '<p class="ayuda" style="font-size:14px;color:var(--suave);margin:10px 0 0">' + esc(textoPlano('nota_documentos', '')) + '</p>'
      : '<div class="msg info">La recepción de documentos está pausada por el momento.</div>') +
    ejemploHtml(def.ejemplo) + '</div>';
}
function voucherHtml() {
  var v = (S.estado && S.estado.voucher) || '';
  var abierto = String(P('registro_abierto', 'S')).toUpperCase() !== 'N';
  var est = v === 'Sí' ? '<div class="msg ok">Registraste que <b>ya recibiste tu voucher</b>.</div>'
    : v === 'Aún no' ? '<div class="msg info">Registraste que <b>todavía no recibes tu voucher</b>. Cuando te llegue, actualiza tu respuesta.</div>' : '';
  return '<div class="card" id="cardVoucher"><h3>¿Ya recibiste tu voucher?</h3>' +
    '<p style="margin:0 0 10px;color:var(--suave)">El voucher te llega por correo de NETEC después de concluir el curso y entregar tu certificado. Cuéntanos si ya lo recibiste.</p>' + est +
    (abierto ? '<div class="acciones" style="margin-top:12px"><button class="btn' + (v === 'Sí' ? '' : ' sec') + '" type="button" data-voucher="Sí">Sí, ya lo recibí</button>' +
      '<button class="btn' + (v === 'Aún no' ? '' : ' sec') + '" type="button" data-voucher="Aún no">Todavía no</button></div>' +
      '<div class="msg" role="status" aria-live="polite" hidden></div>' : '') + '</div>';
}
async function enviarVoucher(btn) {
  var card = btn.closest('#cardVoucher'), msg = $('.msg[role=status]', card), valor = btn.getAttribute('data-voucher');
  $$('button[data-voucher]', card).forEach(function (b) { b.disabled = true; });
  try { mostrarMsg(msg, 'info', 'Guardando…'); var j = await llamar('voucher', { valor: valor }); S.estado = j.estado; repintar(); }
  catch (e) { mostrarMsg(msg, 'err', e.message); $$('button[data-voucher]', card).forEach(function (b) { b.disabled = false; }); }
}
function navPaso(ant, sig) {
  return '<div class="acciones" style="justify-content:space-between;margin-top:26px">' +
    (ant ? '<a class="btn sec" href="#/' + ant[0] + '">← ' + esc(ant[1]) + '</a>' : '<span></span>') +
    (sig ? '<a class="btn" href="#/' + sig[0] + '">' + esc(sig[1]) + ' →</a>' : '') + '</div>';
}
function titulo(etapa, t, lead) {
  return (etapa ? '<div class="etapa">' + esc(etapa) + '</div>' : '') + '<h1 class="t">' + esc(t) + '</h1>' + (lead ? '<p class="lead">' + esc(lead) + '</p>' : '');
}

/* ---------- Vistas ---------- */
var VISTAS = {};
var POST = {};

function pasosEstado() {
  var d = docs(), res = d.resultado_examen;
  return [
    { id: 'paso1', t: 'Realiza el curso en Skill Builder', d: 'Haz el curso y entrega tu certificado de conclusión.', ok: !!d.constancia_curso, pend: 'Pendiente: sube tu certificado' },
    { id: 'paso2', t: 'Agenda tu examen', d: 'Video y guía paso a paso, y registro de tu fecha.', ok: !!S.estado.fechaExamen, pend: 'Pendiente: registra tu fecha', okTxt: S.estado.fechaExamen ? 'Fecha registrada: ' + fmtFecha(S.estado.fechaExamen) : '' },
    { id: 'paso3', t: 'Prepárate: guía del examen y simulacro', d: simActivo() ? 'Dominios, porcentajes, estrategia y simulacro de examen.' : 'Dominios, porcentajes y estrategia. Simulacro próximamente.', ok: null, prox: !simActivo() && !P('simulacro_url', '') },
    { id: 'paso4', t: 'Presenta tu examen y sube tu resultado', d: 'Aprobatorio o no aprobatorio (700 puntos para aprobar).', ok: !!res, pend: 'Pendiente: sube tu resultado', okTxt: res ? 'Resultado entregado: ' + res.resultado : '' },
    { id: 'paso5', t: 'Sube tu certificado oficial', d: 'Solo si tu examen fue aprobatorio.', ok: !!d.certificado_oficial, pend: 'Pendiente' },
    { id: 'paso6', t: 'Paso opcional: constancia de mentorías NETEC', d: 'Si recibiste tu constancia de las mentorías, súbela aquí.', ok: !!d.constancia_netec, opc: true, pend: 'Opcional', okTxt: 'Entregada' }
  ];
}
function chipPaso(p) {
  if (p.ok === null) return p.prox ? '<span class="chip prox">Simulacro: próximamente</span>' : '<span class="chip pend">Disponible</span>';
  return p.ok ? '<span class="chip ok">✓ ' + esc(p.okTxt || 'Completado') + '</span>' : '<span class="chip pend">' + esc(p.pend) + '</span>';
}
function proximaSesion() {
  var now = ahoraS(), r = null;
  (S.config.sesiones || []).forEach(function (s) { if (s.tipo === 'Apoyo' && !r && now <= s.finMs + s.despuesMs) r = s; });
  return r;
}

VISTAS.inicio = function () {
  var pasos = pasosEstado(), hechos = pasos.filter(function (p) { return p.ok === true && !p.opc; }).length, total = pasos.filter(function (p) { return p.ok !== null && !p.opc; }).length;
  var avisos = (S.config.avisos || []).map(function (a) {
    var l = urlOk(a.liga);
    return '<div class="aviso ' + (/^importante/i.test(a.tipo) ? '' : 'info') + '"><b>' + esc(a.titulo) + '</b>' + parr(a.texto) + (l ? '<p><a href="' + esc(l) + '" target="_blank" rel="noopener">' + esc(a.texto_liga || 'Más información') + '</a></p>' : '') + '</div>';
  }).join('');
  var nc = S.estado.noCertifica ? '<div class="alto"><h3>Registraste que no tomarás la certificación</h3><p>Motivo: ' + esc(S.estado.noCertifica.motivo) + ' (' + esc(fmtTs(S.estado.noCertifica.fecha)) + '). Coordinación dará seguimiento. Si cambias de opinión, escríbelo en la sección <a href="#/dudas">Dudas</a>.</p></div>' : '';
  var ps = proximaSesion(), banner = '';
  if (ps) banner = '<div class="banner"><b>Próxima sesión de apoyo:</b> ' + esc(fmtDia(ps.fecha)) + ', ' + esc(hora12(ps.inicio)) + ' a ' + esc(hora12(ps.fin)) + ' · <a href="#/sesiones">ver todas</a></div>';
  return '<div class="etapa">' + esc(P('nombre_programa', 'CPFIA · Generación 2')) + '</div><h1 class="t">Hola, ' + esc(titleCase(S.usuario.nombre)) + '</h1>' +
    '<p class="lead">' + esc(textoPlano('bienvenida', '')) + '</p>' + nc + avisos +
    '<h2 class="sec">Tu ruta en 5 pasos y uno opcional</h2>' +
    '<p style="margin:0 0 4px"><b>Tu avance:</b> ' + hechos + ' de ' + total + ' entregas</p><div class="progreso" aria-hidden="true"><i style="width:' + Math.round(100 * hechos / total) + '%"></i></div>' +
    '<ol class="ruta" style="margin-top:14px">' + pasos.map(function (p) {
      return '<li><a href="#/' + p.id + '" class="' + (p.ok === true ? 'hecho' : '') + '"><b>' + esc(p.t) + '</b>' + esc(p.d) + '<span class="est">' + chipPaso(p) + '</span></a></li>';
    }).join('') + '</ol>' + banner;
};

VISTAS.info = function () {
  return titulo('Antes de empezar', 'Información general', 'Qué es la certificación AWS Certified Cloud Practitioner, cómo es el examen y qué documentos entregas a lo largo del proceso.') +
    materiales(0);
};

VISTAS.paso1 = function () {
  var aviso = textos('paso1_aviso')[0];
  return titulo('Paso 1', 'Realiza el curso en Skill Builder', 'Haz el curso AWS Cloud Practitioner Essentials (Español LATAM) y entrega tu certificado de conclusión.') +
    (aviso ? '<div class="alto"><h3>' + esc(aviso.titulo) + '</h3><p>' + esc(aviso.texto) + '</p></div>' : '') +
    '<h2 class="sec">Curso y materiales</h2>' + materiales(1) +
    '<h2 class="sec">Entrega tu certificado del curso</h2>' + subidaHtml('constancia_curso') +
    voucherHtml() +
    navPaso(['inicio', 'Inicio'], ['paso2', 'Paso 2: Agenda tu examen']);
};

var DIEZ_PASOS = '<ol class="pasos">' +
  '<li><b>Entra a tu cuenta de AWS Certification.</b> Desde Skill Builder: <i>Más AWS Training → Examen de certificación de AWS</i>; o desde aws.amazon.com/certification con el botón <i>Programe un examen</i>.</li>' +
  '<li><b>Completa tu perfil.</b> Acepta el acuerdo del programa y confirma tu nombre: debe coincidir con la identificación que usarás el día del examen.</li>' +
  '<li><b>Revisa tus preferencias.</b> En <i>Preferences</i> ajusta el idioma de correspondencia y la zona horaria, y guarda.</li>' +
  '<li><b>Programa el examen.</b> Elige <i>CLF-C02: AWS Certified Cloud Practitioner</i> y la modalidad en línea con OnVUE. Haz la prueba de tu sistema y da clic en <i>Siguiente</i>.</li>' +
  '<li class="clave"><span class="stop">No lo omitas</span><b>Elige el idioma del examen.</b> En <i>Seleccione el idioma del examen</i> marca <b>Español-Castellano</b> y da clic en <i>Siguiente</i>.</li>' +
  '<li><b>Acepta las políticas.</b> Marca las casillas de las políticas de examen en línea y del procesamiento de datos de OnVUE (están al final de la pantalla), y da clic en <i>Siguiente</i> y en <i>De acuerdo</i>.</li>' +
  '<li class="clave"><span class="stop">No lo omitas</span><b>Elige el idioma del supervisor.</b> En <i>Seleccione el idioma del supervisor</i> marca <b>Hispano-Latinoamérica</b> y da clic en <i>Siguiente</i>.</li>' +
  '<li><b>Elige fecha y hora.</b> Confirma tu zona horaria, selecciona un día con disponibilidad y reserva la cita.</li>' +
  '<li><b>Aplica tu voucher.</b> En el pago, agrega el código de promoción/cupón que recibiste por correo; el total debe quedar en 0.00. Después envía el pedido.</li>' +
  '<li><b>Guarda tu confirmación.</b> Recibirás dos correos de Pearson VUE. Registra tu fecha aquí abajo y, si quieres, sube el correo de la cita.</li></ol>';

VISTAS.paso2 = function () {
  var max = P('fecha_examen_max', ''), e = S.estado, abierto = String(P('registro_abierto', 'S')).toUpperCase() !== 'N';
  var f = S.flash.fecha; delete S.flash.fecha;
  var reg = e.fechaExamen ? '<div class="entregado"><span class="ico" aria-hidden="true">✓</span><div><b>Fecha registrada:</b> ' + esc(fmtFecha(e.fechaExamen)) + ' · ' + esc(e.modalidad) + '<small>Si cambia, vuelve a registrarla.</small></div></div>'
    : '<div class="faltante">Pendiente: todavía no registras la fecha de tu examen.</div>';
  var def = null; (S.config.documentos || []).forEach(function (d) { if (d.clave === 'confirmacion_fecha') def = d; });
  return titulo('Paso 2', 'Agenda tu examen', 'Sigue el video y la guía mientras agendas. Cuando tengas tu cita, registra la fecha aquí.') +
    '<h2 class="sec">Materiales</h2>' + materiales(2) +
    '<h2 class="sec">El proceso en 10 pasos</h2><div class="card">' + DIEZ_PASOS + '</div>' +
    '<h2 class="sec">Registra la fecha de tu examen</h2><div class="card">' + reg +
    (abierto ? '<form id="fFecha" novalidate><div class="fila">' +
      '<div><label for="fxFecha">Fecha de tu examen</label><input type="date" id="fxFecha" name="fecha"' + (max ? ' max="' + esc(max) + '"' : '') + '></div>' +
      '<div><label for="fxMod">Modalidad</label><select name="modalidad" id="fxMod"><option value="">Selecciona…</option><option>En línea (OnVUE)</option><option>Centro de pruebas</option></select></div>' +
      '<div><label for="fxArc">Correo de Pearson VUE (opcional)</label><input type="file" id="fxArc" name="archivo" accept=".pdf,application/pdf"><small class="ayuda">Solo PDF del correo con tu cita. Máx. ' + esc(P('max_archivo_mb', '3')) + ' MB.</small></div></div>' +
      (max ? '<div class="nota">La fecha máxima para presentar el examen es el ' + esc(fmtFecha(max)) + '.</div>' : '') +
      '<div class="nota">Al agendar recibes dos correos de Pearson VUE: <i>Action required and exam time confirmed</i> y <i>Confirmation of Payment</i>. Puedes subir cualquiera de los dos.</div>' +
      '<div><button class="btn" type="submit">' + (e.fechaExamen ? 'Actualizar fecha' : 'Registrar fecha') + '</button></div>' +
      '<div class="msg ' + (f ? 'ok' : '') + '" role="status" aria-live="polite"' + (f ? '' : ' hidden') + '>' + esc(f || '') + '</div></form>'
      : '<div class="msg info">El registro está pausado por el momento.</div>') +
    '</div>' +
    (def ? '<h2 class="sec">Tu documento de la cita</h2><div class="card"><p style="margin-top:0;color:var(--suave)">' + esc(def.descripcion) + '</p>' + estadoDoc('confirmacion_fecha') + ejemploHtml(def.ejemplo) + '</div>' : '') +
    navPaso(['paso1', 'Paso 1'], ['paso3', 'Paso 3: Guía y simulacro']);
};

VISTAS.paso3 = function () {
  var url = urlOk(P('simulacro_url', ''));
  var sim = textos('simulacro_texto')[0];
  return titulo('Paso 3', 'Guía del examen y simulacro', 'Conoce los dominios que se evalúan y prepárate con la estrategia.') +
    '<h2 class="sec">Simulacro</h2>' + (simActivo() ? simTarjeta() : '<div class="card"><h3>' + esc(sim ? sim.titulo : 'Simulacro de examen') + '</h3>' +
    (url ? '<p>Practica con un simulacro del examen.</p><div class="acciones"><a class="btn" href="' + esc(url) + '" target="_blank" rel="noopener">Ir al simulacro</a></div>'
         : '<p style="margin-top:0">' + esc(sim ? sim.texto : 'El simulacro estará disponible próximamente.') + '</p><span class="chip prox">Próximamente</span>') + '</div>') +
    '<h2 class="sec">Guía y estrategia</h2>' + materiales(3) +
    '<h2 class="sec">Dominios que se evalúan</h2><div class="card"><table class="t"><thead><tr><th>Dominio</th><th>Peso</th></tr></thead><tbody>' +
    '<tr><td>1 · Conceptos de la nube</td><td>24 %</td></tr><tr><td>2 · Seguridad y cumplimiento</td><td>30 %</td></tr>' +
    '<tr><td>3 · Tecnología y servicios en la nube</td><td>34 %</td></tr><tr><td>4 · Facturación, precios y soporte</td><td>12 %</td></tr></tbody></table>' +
    '<p style="margin-bottom:0;color:var(--suave)">El detalle de cada dominio está en la guía del examen de arriba.</p></div>' +
    navPaso(['paso2', 'Paso 2'], ['paso4', 'Paso 4: Tu examen']);
};

VISTAS.paso4 = function () {
  return titulo('Paso 4', 'Presenta tu examen y sube tu resultado') +
    '<h2 class="sec">Sobre el examen</h2><div class="grid g2">' +
    '<div class="card"><h3>Formato</h3><table class="t"><tbody>' +
    '<tr><td><b>Categoría</b></td><td>Foundational</td></tr><tr><td><b>Duración</b></td><td>90 minutos</td></tr>' +
    '<tr><td><b>Preguntas</b></td><td>65; varias opciones o varias respuestas</td></tr>' +
    '<tr><td><b>Modalidad</b></td><td>En persona (centro Pearson VUE) o en línea con supervisión</td></tr>' +
    '<tr><td><b>Puntaje mínimo</b></td><td>700 puntos</td></tr><tr><td><b>Costo</b></td><td>100 USD · sin costo a través de INFOTEC</td></tr></tbody></table></div>' +
    '<div class="card"><h3>Antes del día de tu examen</h3><ul class="check">' +
    '<li>Haz la <b>prueba de tu sistema</b> con la misma computadora, conexión y espacio que usarás ese día (10 a 15 minutos).</li>' +
    '<li>Necesitas Windows 10 o macOS 14 (o superior), cámara web, micrófono y altavoz (sin auriculares). Se recomienda computadora personal y conexión por cable.</li>' +
    '<li>Procura estar <b>media hora antes</b> de tu cita para prepararte con calma ante cualquier imprevisto.</li>' +
    '<li>Tu <b>nombre debe coincidir con tu identificación</b>.</li>' +
    '<li>Para reprogramar o cancelar, hazlo con más de 24 horas de anticipación para no perder tu examen.</li>' +
    '</ul></div></div>' +
    '<div class="card"><h3>Durante el examen</h3><ul class="check">' +
    '<li>Mantén tus pertenencias personales (celular, reloj, bolsas, libros, notas) fuera de tu alcance.</li>' +
    '<li>No te levantes de tu lugar durante el examen, ni siquiera para ir al baño.</li>' +
    '<li>No murmures ni hables en voz alta, salvo para comunicarte con el supervisor.</li>' +
    '<li>No hay alimentos ni bebidas en la estación de trabajo.</li></ul></div>' +
    '<h2 class="sec">Sube tu resultado</h2>' +
    '<p class="lead">Al terminar recibes el resultado del examen (aprobatorio o no aprobatorio). Guárdalo y súbelo aquí.</p>' + subidaHtml('resultado_examen') +
    navPaso(['paso3', 'Paso 3'], ['paso5', 'Paso 5: Certificado oficial']);
};

VISTAS.paso5 = function () {
  var lim = P('fecha_limite_certificado', ''), txt = P('texto_fecha_limite', 'Fecha límite para enviar tu certificado oficial');
  return titulo('Paso 5', 'Sube tu certificado oficial', 'Si tu examen fue aprobatorio, AWS te envía el certificado oficial. Súbelo aquí.') +
    (lim ? '<div class="alto"><h3>' + esc(txt) + '</h3><p><b>' + esc(fmtFecha(lim)) + '</b></p></div>' : '') +
    subidaHtml('certificado_oficial') + navPaso(['paso4', 'Paso 4'], ['paso6', 'Paso 6 (opcional)']);
};

VISTAS.paso6 = function () {
  return titulo('Paso 6 · Opcional', 'Constancia de mentorías NETEC', 'Si cumpliste los criterios de las mentorías de NETEC, recibiste una constancia. Súbela aquí; si aún no la tienes, solicítala directamente a NETEC.') +
    subidaHtml('constancia_netec') +
    '<div class="alto"><p style="margin:0">Si no la recibiste, no te preocupes: el documento indispensable para ser acreedor al voucher es el <b>certificado del curso en Skill Builder</b> (<a href="#/paso1">Paso 1</a>).</p></div>' +
    navPaso(['paso5', 'Paso 5']);
};

/* ---- Sesiones y mentorías ---- */
function estadoSes(s, now) {
  if (now > s.finMs + s.despuesMs) return 'pasada';
  if (now >= s.iniMs - s.antesMs) return 'ahora';
  return 'futura';
}
function etiquetaSes(s, now, e) {
  if (e === 'pasada') return 'Finalizada';
  if (e === 'ahora') return now < s.iniMs ? 'Ya puedes entrar (inicia a las ' + hora12(s.inicio) + ')' : 'En curso';
  var falta = s.iniMs - s.antesMs - now;
  if (falta < 86400000) { var h = Math.floor(falta / 3600000), m = Math.ceil((falta % 3600000) / 60000); if (m === 60) { h++; m = 0; } return 'Se habilita en ' + (h ? h + ' h ' : '') + m + ' min'; }
  return 'Se habilita ' + Math.round(s.antesMs / 60000) + ' min antes';
}
function sesHtml(s, now) {
  var e = estadoSes(s, now);
  return '<div class="ses ' + (e === 'ahora' ? 'ahora' : e === 'pasada' ? 'pasada' : '') + '" data-ses="' + esc(s.id) + '"><div><div class="dia">' + esc(fmtDia(s.fecha)) + '</div><div class="hora">' + esc(hora12(s.inicio)) + ' a ' + esc(hora12(s.fin)) + '</div>' +
    '<div class="sub">' + esc(s.titulo) + (s.tutor ? ' · ' + esc(s.tutor) : '') + '</div></div>' +
    '<div><button class="btn' + (e === 'ahora' ? '' : ' off') + '" type="button" data-meet="' + esc(s.id) + '"' + (e === 'ahora' ? '' : ' disabled') + '>Entrar a la sesión</button><div class="estado">' + esc(etiquetaSes(s, now, e)) + '</div></div></div>';
}
function listaSes(tipo) {
  var now = ahoraS(), todas = (S.config.sesiones || []).filter(function (s) { return s.tipo === tipo; });
  var vig = todas.filter(function (s) { return estadoSes(s, now) !== 'pasada'; }), pas = todas.filter(function (s) { return estadoSes(s, now) === 'pasada'; });
  if (!todas.length) return pendiente(tipo === 'Apoyo' ? 'Pronto publicaremos el calendario de sesiones.' : 'Pronto publicaremos los horarios de mentorías: tutor, día, hora y liga.');
  var h = '', semana = '';
  vig.forEach(function (s) {
    var w = lunesDe(s.fecha);
    if (w !== semana) { semana = w; h += '<div class="semana">Semana del ' + esc(fmtDia(w).replace(/^[^ ]+ /, '')) + '</div>'; }
    h += sesHtml(s, now);
  });
  if (!vig.length) h += pendiente('No hay más sesiones programadas por ahora.');
  if (pas.length) h += '<details class="past"><summary>Sesiones anteriores (' + pas.length + ')</summary>' + pas.slice().reverse().map(function (s) { return sesHtml(s, now); }).join('') + '</details>';
  return h;
}
function actualizarSes() {
  var now = ahoraS(), mapa = {};
  (S.config.sesiones || []).forEach(function (s) { mapa[s.id] = s; });
  var cambio = false;
  $$('.ses[data-ses]').forEach(function (el) {
    var s = mapa[el.getAttribute('data-ses')]; if (!s) return;
    var e = estadoSes(s, now), btn = $('[data-meet]', el);
    var antes = el.classList.contains('pasada') ? 'pasada' : el.classList.contains('ahora') ? 'ahora' : 'futura';
    if (antes !== e && (e === 'pasada' || antes === 'pasada')) cambio = true;
    el.classList.toggle('ahora', e === 'ahora'); el.classList.toggle('pasada', e === 'pasada');
    btn.disabled = e !== 'ahora'; btn.classList.toggle('off', e !== 'ahora');
    $('.estado', el).textContent = etiquetaSes(s, now, e);
  });
  if (cambio) repintar();
}
function iniciarTicker() { clearInterval(ticker); ticker = setInterval(actualizarSes, 15000); }

VISTAS.sesiones = function () {
  return titulo('Apoyo', 'Sesiones de apoyo', 'Sesiones por Google Meet (hora de la Ciudad de México). Puedes asistir a la que más te acomode. El botón se habilita ' + Math.round(((S.config.sesiones.filter(function (s) { return s.tipo === 'Apoyo'; })[0] || { antesMs: 1800000 }).antesMs) / 60000) + ' minutos antes de iniciar y se deshabilita al terminar.') +
    '<div class="msg info" id="sesMsg" role="status" aria-live="polite" hidden></div>' + listaSes('Apoyo') +
    '<div class="card" style="margin-top:18px"><h3>¿Qué hacemos en las sesiones?</h3><ul class="check">' +
    '<li>Te ayudamos a <b>agendar tu examen</b>.</li><li>Revisamos los <b>documentos</b> que debes subir como evidencia de tu proceso de certificación.</li>' +
    '<li>Vemos <b>información del examen</b>: formato, dominios y cómo se evalúa.</li><li>Compartimos <b>estrategias y guías</b> para prepararte y presentar con confianza.</li></ul></div>';
};
POST.sesiones = iniciarTicker;
VISTAS.mentorias = function () {
  return titulo('Apoyo', 'Mentorías', 'Sesiones con tutores para resolver dudas de contenido. Elige el tutor y el horario que prefieras.') +
    '<div class="msg info" id="sesMsg" role="status" aria-live="polite" hidden></div>' + listaSes('Mentoría');
};
POST.mentorias = iniciarTicker;

async function abrirMeet(id, btn) {
  var msg = $('#sesMsg'), w = window.open('', '_blank');
  if (w) { try { w.opener = null; } catch (e) {} w.document.write('<p style="font-family:sans-serif">Abriendo la sesión…</p>'); }
  btn.disabled = true;
  try {
    var j = await llamar('meet', { id: id });
    if (w) w.location.href = j.liga;
    else { msg.hidden = false; msg.className = 'msg ok'; msg.innerHTML = 'Tu navegador bloqueó la ventana. <a href="' + esc(j.liga) + '" target="_blank" rel="noopener">Abre la sesión aquí</a>.'; }
  } catch (e) {
    if (w) w.close();
    mostrarMsg(msg, 'err', e.message);
  } finally { actualizarSes(); }
}

/* ---- Dudas ---- */
VISTAS.dudas = function () {
  var temas = S.config.temas || [], nc = S.estado.noCertifica, f = S.flash.duda; delete S.flash.duda;
  var adv = textos('no_certifica_advertencia')[0];
  return titulo('Apoyo', 'Dudas', 'Escribe aquí tus dudas para darles seguimiento puntual. Las revisamos y te respondemos.') +
    '<div class="card"><form id="fDuda" novalidate><div><label for="dtTema">Tema</label><select id="dtTema" name="tema"><option value="">Selecciona…</option>' +
    temas.map(function (t) { return '<option value="' + esc(t.tema) + '" data-nc="' + (t.no_certifica ? 1 : 0) + '">' + esc(t.tema) + '</option>'; }).join('') + '</select></div>' +
    '<div id="boxDuda"><div><label for="dtTexto">Tu duda</label><textarea id="dtTexto" name="duda" maxlength="2000"></textarea></div>' +
    '<div style="margin-top:14px"><button class="btn" type="submit">Enviar duda</button></div></div>' +
    '<div id="boxNC" hidden>' + (nc ? '<div class="msg info">Ya registraste que no tomarás la certificación (' + esc(nc.motivo) + '). Si cambias de opinión, escríbelo aquí como una duda.</div>' :
      '<div class="alto"><h3>' + esc(adv ? adv.titulo : 'Antes de continuar') + '</h3><p>' + esc(adv ? adv.texto : '') + '</p></div>' +
      '<div class="fila"><div><label for="ncMotivo">Motivo</label><select id="ncMotivo" name="motivo"><option value="">Selecciona…</option>' + (S.config.motivos || []).map(function (m) { return '<option>' + esc(m) + '</option>'; }).join('') + '</select></div>' +
      '<div><label for="ncCom">Comentario (opcional)</label><input type="text" id="ncCom" name="comentario" maxlength="300"></div></div>' +
      '<div class="check-row" style="margin:14px 0"><input type="checkbox" id="ncOk" name="confirmar"><label for="ncOk">Entiendo que coordinación podrá reasignar mi voucher y que no podré deshacer esta decisión desde el sitio.</label></div>' +
      '<div><button class="btn peligro" type="button" id="btnNC">Registrar que no tomaré la certificación</button></div>') + '</div>' +
    '<div class="msg ' + (f ? 'ok' : '') + '" id="mDuda" role="status" aria-live="polite" style="margin-top:12px"' + (f ? '' : ' hidden') + '>' + esc(f || '') + '</div></form></div>';
};
POST.dudas = function () {
  var sel = $('#dtTema');
  sel.addEventListener('change', function () {
    var nc = sel.selectedOptions[0] && sel.selectedOptions[0].getAttribute('data-nc') === '1';
    $('#boxDuda').hidden = nc; $('#boxNC').hidden = !nc; $('#mDuda').hidden = true;
  });
  var b = $('#btnNC'); if (b) b.addEventListener('click', enviarNC);
};
async function enviarNC() {
  var f = $('#fDuda'), m = $('#mDuda'), btn = $('#btnNC');
  var motivo = f.elements.motivo.value;
  if (!motivo) { mostrarMsg(m, 'err', 'Selecciona un motivo.'); return; }
  if (!f.elements.confirmar.checked) { mostrarMsg(m, 'err', 'Marca la casilla para confirmar que entiendes el aviso.'); return; }
  btn.disabled = true; mostrarMsg(m, 'info', 'Registrando…');
  try {
    var j = await llamar('noCertificara', { motivo: motivo, comentario: f.elements.comentario.value.trim(), confirmar: true });
    S.estado = j.estado; S.flash.duda = j.mensaje; repintar();
  } catch (e) { mostrarMsg(m, 'err', e.message); btn.disabled = false; }
}

VISTAS.privacidad = function () {
  return titulo('', 'Aviso de privacidad') + '<div class="card">' + textoHtml('aviso_privacidad') + '</div>';
};

/* ---------- Eventos delegados ---------- */
document.addEventListener('click', function (ev) {
  var t = ev.target.closest ? ev.target.closest('[data-ejemplo],[data-meet],[data-voucher]') : null;
  if (!t) return;
  if (t.hasAttribute('data-voucher')) { enviarVoucher(t); return; }
  if (t.hasAttribute('data-meet')) { abrirMeet(t.getAttribute('data-meet'), t); return; }
  var cont = t.parentElement.querySelector('.ejimgs'); if (!cont) return;
  var abierto = !cont.hidden; cont.hidden = abierto;
  t.setAttribute('aria-expanded', abierto ? 'false' : 'true');
  t.textContent = abierto ? 'Ver ejemplo del documento' : 'Ocultar ejemplo';
});
document.addEventListener('submit', function (ev) {
  var f = ev.target;
  if (f.id === 'fLogin') return;
  ev.preventDefault();
  if (f.hasAttribute('data-doc')) enviarDoc(f);
  else if (f.id === 'fFecha') enviarFecha(f);
  else if (f.id === 'fDuda') enviarDuda(f);
});

/* ---------- Archivos ---------- */
function aBase64(blob) {
  return new Promise(function (res, rej) {
    var fr = new FileReader();
    fr.onload = function () { res(String(fr.result).split(',')[1]); };
    fr.onerror = function () { rej(new Error('No se pudo leer el archivo.')); };
    fr.readAsDataURL(blob);
  });
}
async function comprimir(file, maxB) {
  var bmp;
  try { bmp = await createImageBitmap(file); } catch (e) { throw new Error('No pudimos leer la imagen. Sube un PDF, PNG o JPG.'); }
  var escala = Math.min(1, 1800 / Math.max(bmp.width, bmp.height)), q = 0.85, ultimo = null, tope = Math.min(maxB * 0.9, 1.2 * 1048576);
  for (var i = 0; i < 6; i++) {
    var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * escala)); c.height = Math.max(1, Math.round(bmp.height * escala));
    var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, 0, 0, c.width, c.height);
    ultimo = await new Promise(function (r) { c.toBlob(r, 'image/jpeg', q); });
    if (ultimo && ultimo.size <= tope) return ultimo;
    q = Math.max(0.5, q - 0.1); escala *= 0.85;
  }
  return ultimo;
}
async function prepararArchivo(file) {
  var maxB = parseFloat(P('max_archivo_mb', '3')) * 1048576, maxMB = P('max_archivo_mb', '3');
  var esPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name), esImg = false;
  var blob = file, nombre = file.name;
  if (esPdf) {
    if (file.size > maxB) throw new Error('Tu PDF pesa ' + (file.size / 1048576).toFixed(1) + ' MB y el máximo es ' + maxMB + ' MB. Reduce el PDF (por ejemplo, vuelve a descargarlo o expórtalo con menor calidad).');
  } else if (esImg) {
    var yaOk = /^image\/(png|jpeg)$/.test(file.type) && file.size <= 1.2 * 1048576;
    if (!yaOk) { blob = await comprimir(file, maxB); nombre = nombre.replace(/\.\w+$/, '') + '.jpg'; }
  } else throw new Error('El archivo debe ser PDF.');
  if (blob.size > maxB) throw new Error('El archivo pesa ' + (blob.size / 1048576).toFixed(1) + ' MB y el máximo es ' + maxMB + ' MB.');
  return { nombre: nombre, base64: await aBase64(blob) };
}

async function enviarDoc(form) {
  var clave = form.getAttribute('data-doc'), msg = $('.msg', form), btn = $('button[type=submit]', form);
  try {
    var file = form.elements.archivo.files[0];
    if (!file) throw new Error('Selecciona un archivo.');
    var resultado = form.elements.resultado ? form.elements.resultado.value : '';
    if (form.elements.resultado && !resultado) throw new Error('Indica si el resultado fue aprobatorio o no aprobatorio.');
    btn.disabled = true; mostrarMsg(msg, 'info', 'Preparando tu archivo…');
    var arch = await prepararArchivo(file);
    mostrarMsg(msg, 'info', 'Subiendo… no cierres esta página.');
    var j = await llamar('subirDocumento', { tipo: clave, resultado: resultado, archivo: arch }, { timeout: 120000 });
    S.estado = j.estado; S.flash[clave] = j.mensaje; repintar();
  } catch (e) { mostrarMsg(msg, 'err', e.message); btn.disabled = false; }
}
async function enviarFecha(form) {
  var msg = $('.msg', form), btn = $('button[type=submit]', form);
  try {
    var fecha = form.elements.fecha.value, mod = form.elements.modalidad.value;
    if (!fecha) throw new Error('Selecciona la fecha de tu examen.');
    if (!mod) throw new Error('Selecciona la modalidad.');
    var max = P('fecha_examen_max', ''); if (max && fecha > max) throw new Error('La fecha máxima para presentar el examen es el ' + fmtFecha(max) + '.');
    var file = form.elements.archivo.files[0], arch = null;
    btn.disabled = true; mostrarMsg(msg, 'info', 'Enviando…');
    if (file) arch = await prepararArchivo(file);
    var j = await llamar('registrarFecha', { fecha: fecha, modalidad: mod, archivo: arch }, { timeout: 120000 });
    S.estado = j.estado; S.flash.fecha = j.mensaje; repintar();
  } catch (e) { mostrarMsg(msg, 'err', e.message); btn.disabled = false; }
}
async function enviarDuda(form) {
  var msg = $('#mDuda'), btn = $('button[type=submit]', form);
  try {
    var tema = form.elements.tema.value, duda = form.elements.duda.value.trim();
    if (!tema) throw new Error('Selecciona el tema.');
    if (duda.length < 10) throw new Error('Describe tu duda con un poco más de detalle.');
    btn.disabled = true; mostrarMsg(msg, 'info', 'Enviando…');
    var j = await llamar('registrarDuda', { tema: tema, duda: duda });
    S.flash.duda = j.mensaje; repintar();
  } catch (e) { mostrarMsg(msg, 'err', e.message); btn.disabled = false; }
}

/* ---------- Aviso de privacidad (primer ingreso) ---------- */
function pedirAviso() {
  var ver = P('aviso_privacidad_version', '1'), ac = S.estado.avisoAceptado || '';
  if (ac.indexOf('v' + ver) === 0 || S.usuario.tipo === 'Revisor') return;
  $('#modalCuerpo').innerHTML = textoHtml('aviso_privacidad') || '<h3>Aviso de privacidad</h3>';
  $('#modalMsg').hidden = true; $('#modalAviso').hidden = false;
  $('#btnAcepto').onclick = async function () {
    var b = this; b.disabled = true;
    try { var j = await llamar('aceptarAviso'); S.estado = j.estado; $('#modalAviso').hidden = true; }
    catch (e) { mostrarMsg($('#modalMsg'), 'err', e.message); }
    finally { b.disabled = false; }
  };
}


/* ---------- Simulacro de examen ---------- */
var DOMINIOS = { 1: 'Conceptos de la nube', 2: 'Seguridad y cumplimiento', 3: 'Tecnología y servicios en la nube', 4: 'Facturación, precios y soporte', 0: 'Otros' };
var SIM = { fase: '', intento: '', inicio: 0, minutos: 90, aprobar: 70, preguntas: [], resp: {}, marcas: {}, i: 0, resultado: null, filtro: 'todas', confirmando: false, error: '', cargando: false };
function simActivo() { return !!(S.config && S.config.simulacro && S.config.simulacro.activo); }
function simClave() { return 'g2_sim_' + (S.usuario ? S.usuario.correo : ''); }
function simGuardar() { LS.set(simClave(), { intento: SIM.intento, inicio: SIM.inicio, minutos: SIM.minutos, aprobar: SIM.aprobar, preguntas: SIM.preguntas, resp: SIM.resp, marcas: SIM.marcas, i: SIM.i }); }
function simRestaurar() {
  if (SIM.fase === 'examen' || SIM.fase === 'resultado') return;
  var g = LS.get(simClave());
  if (g && g.intento && g.preguntas && g.preguntas.length) {
    SIM.intento = g.intento; SIM.inicio = g.inicio; SIM.minutos = g.minutos; SIM.aprobar = g.aprobar; SIM.preguntas = g.preguntas;
    SIM.resp = g.resp || {}; SIM.marcas = g.marcas || {}; SIM.i = Math.min(g.i || 0, g.preguntas.length - 1); SIM.fase = 'examen';
  }
}
function simEnCurso() { var g = LS.get(simClave()); return !!(g && g.intento); }
function simLimpiar() { LS.del(simClave()); SIM = { fase: '', intento: '', inicio: 0, minutos: 90, aprobar: 70, preguntas: [], resp: {}, marcas: {}, i: 0, resultado: null, filtro: 'todas', confirmando: false, error: '', cargando: false }; }
function simTarjeta() {
  if (SIM.fase === 'resultado') { SIM.fase = ''; SIM.resultado = null; }
  var c = S.config.simulacro, e = (S.estado && S.estado.sim) || {};
  var stats = e.intentos ? '<p class="sim-stats"><b>Tus intentos:</b> ' + esc(e.intentos) + ' · <b>Mejor:</b> ' + esc(e.mejor) + ' % · <b>Último:</b> ' + esc(e.ultimo) + ' %</p>' : '';
  return '<div class="card"><h3>Simulacro de examen</h3>' +
    '<ul class="check"><li><b>' + esc(c.preguntas) + ' preguntas</b></li><li><b>' + esc(c.minutos) + ' minutos</b></li><li><b>Intentos ilimitados</b>: practica las veces que quieras.</li></ul>' + stats +
    '<div class="acciones"><a class="btn" href="#/simulacro">' + (simEnCurso() ? 'Continuar mi intento' : 'Iniciar simulacro') + '</a></div></div>';
}
function simPendientes() { return SIM.preguntas.filter(function (q) { return !(SIM.resp[q.id] && SIM.resp[q.id].length); }).length; }

VISTAS.simulacro = function () {
  if (!simActivo()) return titulo('Paso 3', 'Simulacro de examen', '') + '<div class="msg info">El simulacro aún no está disponible.</div>' + navPaso(['paso3', 'Volver al paso 3']);
  simRestaurar();
  if (SIM.fase === 'resultado') return simResultado();
  if (SIM.fase === 'examen') return simExamen();
  var c = S.config.simulacro;
  return titulo('Paso 3', 'Simulacro de examen', 'Un ensayo con ' + c.preguntas + ' preguntas, como el examen real.') +
    '<div class="card"><ul class="check"><li><b>' + esc(c.preguntas) + ' preguntas</b> · <b>' + esc(c.minutos) + ' minutos</b> · <b>intentos ilimitados</b>.</li>' +
    '<li>Puedes avanzar, regresar y marcar preguntas para revisarlas.</li>' +
    '<li>Algunas preguntas piden marcar más de una respuesta; se indica en cada una.</li></ul>' +
    (SIM.error ? '<div class="msg err" role="alert">' + esc(SIM.error) + '</div>' : '') +
    '<div class="acciones"><button class="btn" type="button" data-sim="iniciar"' + (SIM.cargando ? ' disabled' : '') + '>' + (SIM.cargando ? 'Preparando tu simulacro…' : 'Comenzar') + '</button><a class="btn sec" href="#/paso3">Volver al paso 3</a></div></div>';
};
POST.simulacro = function () {
  clearInterval(ticker);
  if (SIM.fase !== 'examen') return;
  var f = function () { var el = $('#simReloj'); if (!el) return; var rest = SIM.inicio + SIM.minutos * 60000 - ahoraS(); if (rest <= 0) { el.textContent = 'Tiempo cumplido · puedes terminar cuando quieras'; el.className = 'reloj fin'; return; } var m = Math.floor(rest / 60000), sg = Math.floor(rest % 60000 / 1000); el.textContent = 'Tiempo: ' + m + ':' + ('0' + sg).slice(-2); el.className = 'reloj' + (rest < 300000 ? ' poco' : ''); };
  f(); ticker = setInterval(f, 1000);
};
function simExamen() {
  var q = SIM.preguntas[SIM.i], n = SIM.preguntas.length, sel = SIM.resp[q.id] || [], hechas = n - simPendientes();
  var opts = q.opciones.map(function (t, j) {
    var on = sel.indexOf(j) >= 0;
    return '<label class="opt' + (on ? ' on' : '') + '"><input type="' + (q.multi ? 'checkbox' : 'radio') + '" name="simop" value="' + j + '" data-simop="' + j + '"' + (on ? ' checked' : '') + '><span>' + esc(t) + '</span></label>';
  }).join('');
  var mapa = SIM.preguntas.map(function (x, k) {
    var r = SIM.resp[x.id] && SIM.resp[x.id].length, cls = (k === SIM.i ? ' act' : '') + (r ? ' resp' : '') + (SIM.marcas[x.id] ? ' marca' : '');
    return '<button type="button" class="mp' + cls + '" data-simir="' + k + '" aria-label="Pregunta ' + (k + 1) + (r ? ', respondida' : ', sin responder') + (SIM.marcas[x.id] ? ', marcada' : '') + '">' + (k + 1) + '</button>';
  }).join('');
  var conf = SIM.confirmando ? '<div class="aviso"><b>¿Calificar ahora?</b><p>' + (simPendientes() ? 'Te faltan <b>' + simPendientes() + '</b> pregunta(s) sin responder; contarán como incorrectas.' : 'Respondiste todas las preguntas.') + '</p>' +
    '<div class="acciones"><button class="btn" type="button" data-sim="calificar"' + (SIM.cargando ? ' disabled' : '') + '>' + (SIM.cargando ? 'Calificando…' : 'Sí, calificar') + '</button><button class="btn sec" type="button" data-sim="seguir">Seguir contestando</button></div></div>' : '';
  return '<div class="sim-top"><span class="pn">Pregunta ' + (SIM.i + 1) + ' de ' + n + '</span><span id="simReloj" class="reloj"></span></div>' +
    '<div class="progreso" aria-hidden="true"><i style="width:' + Math.round(100 * hechas / n) + '%"></i></div><p class="ayuda" style="margin:4px 0 12px;color:var(--suave)">Respondidas: ' + hechas + ' de ' + n + '</p>' +
    '<div class="card simq"><div class="dom">Dominio ' + (q.dom || '—') + (q.dom ? ' · ' + esc(DOMINIOS[q.dom]) : '') + '</div><div class="qtxt">' + parr(q.texto) + '</div>' +
    '<p class="ayuda" style="margin:0 0 10px;color:var(--suave)">' + (q.multi ? 'Selecciona <b>' + q.multi + '</b> respuestas.' : 'Selecciona <b>una</b> respuesta.') + '</p>' +
    '<div class="opts" role="' + (q.multi ? 'group' : 'radiogroup') + '">' + opts + '</div>' +
    '<div class="acciones" style="justify-content:space-between;margin-top:16px"><button class="btn sec" type="button" data-sim="ant"' + (SIM.i === 0 ? ' disabled' : '') + '>← Anterior</button>' +
    '<button class="btn sec' + (SIM.marcas[q.id] ? ' marcado' : '') + '" type="button" data-sim="marcar">' + (SIM.marcas[q.id] ? '⚑ Marcada para revisar' : '⚐ Marcar para revisar') + '</button>' +
    (SIM.i < n - 1 ? '<button class="btn" type="button" data-sim="sig">Siguiente →</button>' : '<button class="btn" type="button" data-sim="terminar">Terminar</button>') + '</div></div>' +
    (SIM.error ? '<div class="msg err" role="alert" style="margin-top:12px">' + esc(SIM.error) + '</div>' : '') + conf +
    '<h2 class="sec">Todas las preguntas</h2><div class="mapa">' + mapa + '</div><p class="leyenda"><span class="mp resp">1</span> respondida · <span class="mp marca">1</span> marcada · <span class="mp">1</span> sin responder</p>' +
    '<div class="acciones" style="margin-top:14px"><button class="btn" type="button" data-sim="terminar">Terminar y calificar</button><button class="btn sec" type="button" data-sim="abandonar">Abandonar intento</button></div>';
}
function simResultado() {
  var r = SIM.resultado, rev = r.revision, filtro = SIM.filtro, pasa = r.pct >= r.aprobar;
  var filas = [1, 2, 3, 4, 0].filter(function (d) { return r.dominios[d]; }).map(function (d) {
    var x = r.dominios[d], p = Math.round(1000 * x.ok / x.total) / 10;
    return '<tr><td>' + (d ? d + ' · ' : '') + esc(DOMINIOS[d]) + '</td><td>' + x.ok + ' / ' + x.total + '</td><td style="min-width:120px"><div class="progreso"><i style="width:' + p + '%"></i></div> ' + p + ' %</td></tr>';
  }).join('');
  var lista = rev.map(function (x, k) {
    if (filtro === 'falladas' && x.acierto) return '';
    var ops = x.opciones.map(function (t, j) {
      var cor = x.correctas.indexOf(j) >= 0, el = x.elegidas.indexOf(j) >= 0;
      return '<li class="' + (cor ? 'cor' : '') + (el && !cor ? ' mal' : '') + '"><span class="ico">' + (cor ? '✓' : (el ? '✗' : '')) + '</span><span>' + esc(t) + (el ? ' <em>(tu respuesta)</em>' : '') + '</span></li>';
    }).join('');
    return '<details class="rev ' + (x.acierto ? 'ok' : 'no') + '"' + (x.acierto ? '' : ' open') + '><summary><b>' + (x.acierto ? '✓' : '✗') + ' ' + (k + 1) + '.</b> ' + esc(x.texto.length > 110 ? x.texto.slice(0, 110) + '…' : x.texto) + '</summary>' +
      '<div class="qtxt">' + parr(x.texto) + '</div><ul class="revops">' + ops + '</ul>' + (x.elegidas.length ? '' : '<p class="ayuda" style="color:var(--suave)">No respondiste esta pregunta.</p>') +
      (x.explicacion ? '<div class="expl"><b>Explicación.</b> ' + esc(x.explicacion) + '</div>' : '') + '</details>';
  }).join('');
  return titulo('Paso 3', 'Resultado del simulacro', '') +
    '<div class="card resu"><div class="gran">' + r.pct + ' %</div><div><b>' + r.aciertos + ' de ' + r.total + ' respuestas correctas</b> · ' + r.minutos + ' min' +
    '<p style="margin:6px 0 0">' + (pasa ? '<span class="chip ok">Por encima de la referencia (' + esc(r.aprobar) + ' %)</span>' : '<span class="chip pend">Por debajo de la referencia (' + esc(r.aprobar) + ' %)</span>') + '</p>' +
    '<p class="ayuda" style="margin:8px 0 0;color:var(--suave)">El examen real usa un puntaje escalado (se aprueba con 700 de 1000); este porcentaje es solo una referencia para practicar.</p></div></div>' +
    '<h2 class="sec">Por dominio</h2><div class="card"><table class="t"><thead><tr><th>Dominio</th><th>Aciertos</th><th>Avance</th></tr></thead><tbody>' + filas + '</tbody></table></div>' +
    '<h2 class="sec">Revisión de preguntas</h2><div class="acciones" style="margin-bottom:10px"><button class="btn' + (filtro === 'todas' ? '' : ' sec') + '" type="button" data-simfiltro="todas">Todas (' + rev.length + ')</button>' +
    '<button class="btn' + (filtro === 'falladas' ? '' : ' sec') + '" type="button" data-simfiltro="falladas">Solo las falladas (' + rev.filter(function (x) { return !x.acierto; }).length + ')</button></div>' + (lista || '<p>¡Sin falladas!</p>') +
    '<div class="acciones" style="margin-top:20px"><button class="btn" type="button" data-sim="nuevo">Hacer otro simulacro</button><a class="btn sec" href="#/paso3">Volver al paso 3</a></div>';
}
function simPintar() { actualizarFab(); var y = window.scrollY; $('#vista').innerHTML = VISTAS.simulacro(); window.scrollTo(0, y); POST.simulacro(); }
async function simIniciar() {
  SIM.error = ''; SIM.cargando = true; simPintar();
  try {
    var j = await llamar('simIniciar', {}, { timeout: 90000 });
    SIM.intento = j.intento; SIM.inicio = j.inicio; SIM.minutos = j.minutos; SIM.aprobar = j.aprobar; SIM.preguntas = j.preguntas;
    SIM.resp = {}; SIM.marcas = {}; SIM.i = 0; SIM.fase = 'examen'; SIM.resultado = null; SIM.confirmando = false; SIM.filtro = 'todas';
    SIM.inicio = ahoraS();
    simGuardar();
  } catch (e) { SIM.error = e.message; }
  SIM.cargando = false; simPintar(); window.scrollTo(0, 0);
}
async function simCalificar() {
  SIM.error = ''; SIM.cargando = true; simPintar();
  try {
    var j = await llamar('simEnviar', { intento: SIM.intento, respuestas: SIM.resp }, { timeout: 90000 });
    SIM.resultado = { aciertos: j.aciertos, total: j.total, pct: j.pct, aprobar: j.aprobar, minutos: j.minutos, dominios: j.dominios, revision: j.revision };
    if (j.sim) S.estado.sim = j.sim;
    LS.del(simClave()); SIM.fase = 'resultado'; SIM.confirmando = false; SIM.filtro = 'todas';
    SIM.cargando = false; simPintar(); window.scrollTo(0, 0); return;
  } catch (e) {
    SIM.error = e.message + (e.codigo === 'sim_expiro' || e.codigo === 'sim_intento' ? ' Puedes abandonar este intento y comenzar uno nuevo.' : '');
  }
  SIM.cargando = false; simPintar();
}
document.addEventListener('click', function (ev) {
  var t = ev.target.closest ? ev.target.closest('[data-sim],[data-simir],[data-simfiltro]') : null;
  if (!t || S.vista !== 'simulacro') return;
  if (t.hasAttribute('data-simfiltro')) { SIM.filtro = t.getAttribute('data-simfiltro'); simPintar(); return; }
  if (t.hasAttribute('data-simir')) { SIM.i = +t.getAttribute('data-simir'); SIM.confirmando = false; simGuardar(); simPintar(); window.scrollTo(0, 0); return; }
  var a = t.getAttribute('data-sim'), q = SIM.preguntas[SIM.i];
  if (a === 'iniciar') simIniciar();
  else if (a === 'sig' && SIM.i < SIM.preguntas.length - 1) { SIM.i++; simGuardar(); simPintar(); window.scrollTo(0, 0); }
  else if (a === 'ant' && SIM.i > 0) { SIM.i--; simGuardar(); simPintar(); window.scrollTo(0, 0); }
  else if (a === 'marcar') { if (SIM.marcas[q.id]) delete SIM.marcas[q.id]; else SIM.marcas[q.id] = 1; simGuardar(); simPintar(); }
  else if (a === 'terminar') { SIM.confirmando = true; simPintar(); var c = $('.aviso'); if (c) c.scrollIntoView({ block: 'center' }); }
  else if (a === 'seguir') { SIM.confirmando = false; simPintar(); }
  else if (a === 'calificar') simCalificar();
  else if (a === 'abandonar') { if (window.confirm('¿Abandonar este intento? Se perderán tus respuestas.')) { simLimpiar(); location.hash = '#/paso3'; } }
  else if (a === 'nuevo') { simLimpiar(); simPintar(); }
});
document.addEventListener('change', function (ev) {
  var t = ev.target;
  if (!t || !t.hasAttribute || !t.hasAttribute('data-simop') || SIM.fase !== 'examen') return;
  var q = SIM.preguntas[SIM.i], j = +t.getAttribute('data-simop'), cur = (SIM.resp[q.id] || []).slice();
  if (q.multi) { var k = cur.indexOf(j); if (t.checked && k < 0) cur.push(j); if (!t.checked && k >= 0) cur.splice(k, 1); cur.sort(function (a, b) { return a - b; }); }
  else cur = [j];
  SIM.resp[q.id] = cur; SIM.confirmando = false; SIM.error = ''; simGuardar(); simPintar();
  var el = $('[data-simop="' + j + '"]'); if (el) el.focus();
});

restaurar();
})();
