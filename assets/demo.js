/* Vista previa con datos de ejemplo. Solo se usa cuando assets/config.js tiene apiUrl vacío.
   No se conecta a nada y nada se guarda. */
(function () {
'use strict';
var pad = function (n) { return ('0' + n).slice(-2); };
var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
var hm = function (d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
var mk = function (id, tipo, ini, durMin, tutor) {
  var fin = new Date(ini.getTime() + durMin * 60000);
  return { id: id, tipo: tipo, tutor: tutor, titulo: tipo === 'Apoyo' ? 'Sesión de apoyo' : 'Mentoría', fecha: iso(ini), inicio: hm(ini), fin: hm(fin),
    iniMs: ini.getTime(), finMs: fin.getTime(), antesMs: 30 * 60000, despuesMs: tipo === 'Apoyo' ? 60 * 60000 : 30 * 60000 };
};
function sesiones() {
  // Calendario real (igual al de G2 Config). En el sitio real viene de la hoja Sesiones.
  var out = [], n = 1, T = 'Iliana Lizbeth Alvarado Lara';
  var add = function (y, m, d, h1, m1, durMin) { var ini = new Date(y, m - 1, d, h1, m1); out.push(mk('S' + n++, 'Apoyo', ini, durMin, T)); };
  add(2026, 10, 22, 9, 0, 90);
  for (var t = new Date(2026, 9, 26); t <= new Date(2026, 11, 10); t.setDate(t.getDate() + 1)) { var w = t.getDay(); if (w === 1 || w === 4) add(t.getFullYear(), t.getMonth() + 1, t.getDate(), 11, 30, 90); }
  add(2026, 11, 6, 18, 30, 60);
  add(2026, 11, 14, 10, 30, 60);
  return out.sort(function (a, b) { return a.iniMs - b.iniMs; });
}
var cfg = {
  params: { nombre_programa: 'CPFIA · Generación 2', titulo_sitio: 'Certificación AWS Cloud Practitioner (CLF-C02)', correo_contacto: 'tutor.cpfia1@infotec.mx', max_archivo_mb: '3',
    registro_abierto: 'S', fecha_limite_certificado: '2026-12-11', texto_fecha_limite: 'Fecha límite para enviar tu certificado oficial', fecha_examen_max: '', simulacro_url: '', aviso_privacidad_version: '1' },
  sesiones: sesiones(),
  avisos: [{ id: 'A01', prioridad: 1, tipo: 'Importante', titulo: 'Tu voucher solo es válido este año', texto: 'El voucher que recibas solo es válido para canjearse este año (2026). Si no lo utilizas, a partir de enero de 2027 será reasignado.', liga: '', texto_liga: '' }],
  materiales: [
    { paso: '0', orden: 1, tipo: 'pdf', titulo: 'Conoce la certificación y tus entregas', descripcion: 'PDF con la información general y los documentos a entregar.', url: 'assets/pdf/conoce-la-certificacion.pdf' },
    { paso: '0', orden: 2, tipo: 'video', titulo: 'Video: información general', descripcion: 'Presentación de la certificación y del proceso.', url: '' },
    { paso: '1', orden: 1, tipo: 'liga', titulo: 'Curso en AWS Skill Builder', descripcion: 'AWS Cloud Practitioner Essentials (Español LATAM). Entra con tu cuenta de Skill Builder.', url: 'https://skillbuilder.aws/learn/94T2BEN85A/aws-cloud-practitioner-essentials-espaol-latam/RX7XZB6CTM' },
    { paso: '1', orden: 2, tipo: 'pdf', titulo: 'Presentación: cómo tomar el curso', descripcion: 'Diapositivas para seguir el curso paso a paso.', url: '' },
    { paso: '1', orden: 3, tipo: 'video', titulo: 'Video: cómo tomar el curso', descripcion: 'Explicación en video de la presentación.', url: '' },
    { paso: '1', orden: 4, tipo: 'pdf', titulo: 'Cómo descargar tu certificado del curso', descripcion: 'Pasos para descargar el certificado de conclusión.', url: '' },
    { paso: '2', orden: 1, tipo: 'liga', titulo: 'Agendar el examen (AWS Certification)', descripcion: 'Entra con tu cuenta de AWS Certification.', url: 'https://aws.amazon.com/certification/' },
    { paso: '2', orden: 2, tipo: 'video', titulo: 'Video: cómo agendar tu examen', descripcion: 'Explicación en video de la presentación.', url: '' },
    { paso: '2', orden: 3, tipo: 'pdf', titulo: 'Presentación: agenda tu examen', descripcion: 'PDF de 54 pantallas con el paso a paso completo.', url: 'assets/pdf/presentacion-agendar-examen.pdf' },
    { paso: '2', orden: 4, tipo: 'pdf', titulo: 'Guía detallada para agendar tu examen', descripcion: 'PDF de consulta rápida, para imprimir o tener a la mano.', url: 'assets/pdf/guia-detallada-agendar-examen.pdf' },
    { paso: '3', orden: 1, tipo: 'pdf', titulo: 'Guía del examen (dominios y porcentajes)', descripcion: 'Guía oficial de AWS: dominios, porcentajes y servicios que se evalúan.', url: 'assets/pdf/guia-examen-cloud-practitioner.pdf' },
    { paso: '3', orden: 2, tipo: 'pdf', titulo: 'Estrategia para el examen', descripcion: 'Cómo abordar las preguntas y administrar tu tiempo.', url: '' }
  ],
  documentos: [
    { clave: 'constancia_curso', paso: '1', nombre: 'Certificado del curso', descripcion: 'Curso AWS Cloud Practitioner Essentials (Español LATAM), descargado desde Skill Builder.', cuando: 'Al concluir el curso', ejemplo: 'assets/ejemplos/certificado-curso.jpg', requiere_resultado: false },
    { clave: 'confirmacion_fecha', paso: '2', nombre: 'Fecha programada del examen', descripcion: 'Sube cualquiera de los dos correos que te envía Pearson VUE al agendar: la confirmación de tu cita (Action required and exam time confirmed) o la confirmación de pago (Pearson VUE Confirmation of Payment). Puede ser el PDF del correo o una captura donde se vea tu información.', cuando: 'Al agendar', ejemplo: 'assets/ejemplos/correo-cita.jpg|Opción A: correo «Action required and exam time confirmed»; assets/ejemplos/correo-pago.jpg|Opción B: correo «Pearson VUE Confirmation of Payment»', requiere_resultado: false },
    { clave: 'resultado_examen', paso: '4', nombre: 'Resultado del examen', descripcion: 'El documento que te dan al terminar: aprobatorio o no aprobatorio (puntaje aprobatorio: 700).', cuando: 'Al presentar', ejemplo: 'assets/ejemplos/resultado-examen.jpg', requiere_resultado: true },
    { clave: 'certificado_oficial', paso: '5', nombre: 'Certificado oficial', descripcion: 'Solo si tu examen fue aprobatorio.', cuando: 'Cuando AWS lo envíe', ejemplo: 'assets/ejemplos/certificado-oficial.jpg', requiere_resultado: false },
    { clave: 'constancia_netec', paso: '6', nombre: 'Constancia de mentorías NETEC (opcional)', descripcion: 'Constancia que NETEC entrega a quienes cumplieron los criterios de sus mentorías.', cuando: 'Si la recibiste', ejemplo: '', requiere_resultado: false }
  ],
  temas: [{ tema: 'Curso en Skill Builder', no_certifica: false }, { tema: 'Agendar el examen', no_certifica: false }, { tema: 'Voucher', no_certifica: false }, { tema: 'Documentos a entregar', no_certifica: false },
    { tema: 'Sesiones de apoyo', no_certifica: false }, { tema: 'Contenido del examen', no_certifica: false }, { tema: 'Acceso al sitio', no_certifica: false }, { tema: 'No tomaré la certificación', no_certifica: true }, { tema: 'Otro', no_certifica: false }],
  motivos: ['No tengo tiempo', 'Ya cuento con una certificación', 'Problema técnico o de equipo', 'Otro'],
  simulacro: { activo: true, preguntas: 65, minutos: 90, aprobar: 70 },
  textos: [
    { clave: 'bienvenida', orden: 1, titulo: '', texto: 'Aquí encuentras todo lo que necesitas para completar tu proceso de certificación: el curso, cómo agendar tu examen, la guía del examen, el simulacro, las sesiones de apoyo y un espacio para entregar tus documentos y registrar tus dudas.' },
    { clave: 'paso1_aviso', orden: 1, titulo: 'Importante: concluye el curso para recibir tu voucher', texto: 'Es necesario concluir el curso y entregar el certificado de conclusión para poder recibir el voucher con el que presentarás el examen de certificación. Si no entregas el certificado del curso, no podrás recibir el voucher.' },
    { clave: 'simulacro_texto', orden: 1, titulo: 'Simulacro de examen', texto: 'El simulacro estará disponible próximamente. Mientras tanto, revisa la guía del examen y la estrategia.' },
    { clave: 'no_certifica_advertencia', orden: 1, titulo: 'Antes de continuar', texto: 'Al registrar que no tomarás la certificación, coordinación podrá reasignar tu voucher. Esta decisión no se puede deshacer desde el sitio; si más adelante cambias de opinión, escribe a tutor.cpfia1@infotec.mx.' },
    { clave: 'nota_documentos', orden: 1, titulo: '', texto: 'Sube únicamente el documento que se pide en cada paso. No solicitamos datos personales sensibles; te pedimos no subir documentos distintos a los indicados.' },
    { clave: 'aviso_privacidad', orden: 1, titulo: 'Aviso de privacidad', texto: 'Este sitio es operado por la tutoría del programa CPFIA (Generación 2) del INFOTEC para dar seguimiento al proceso de certificación AWS Cloud Practitioner (CLF-C02).' },
    { clave: 'aviso_privacidad', orden: 2, titulo: 'Datos que utilizamos', texto: 'Utilizamos los datos de tu registro al curso de certificación (nombre completo, correo electrónico y cohort) para validar tu acceso al sitio.' },
    { clave: 'aviso_privacidad', orden: 3, titulo: 'Datos que recabamos', texto: 'Recabamos los documentos que subes en cada paso, la fecha y modalidad de tu examen, las dudas que registras y tu actividad en el sitio.' },
    { clave: 'aviso_privacidad', orden: 4, titulo: 'Datos sensibles', texto: 'No solicitamos datos personales sensibles; te pedimos no subir documentos distintos a los indicados.' }
  ]
};
var estado = { sim: { intentos: 0, mejor: null, ultimo: null }, docs: {}, fechaExamen: '', modalidad: '', registradaEl: '', estadoFinal: 'En proceso', noCertifica: null, avisoAceptado: '' };
var usuario = { correo: 'demo@ejemplo.mx', nombre: 'ALUMNA DE DEMOSTRACIÓN PÉREZ', cohort: 8, tutor: '', tipo: 'Prueba' };
var dudas = [];
var ts = function () { var d = new Date(); return iso(d) + ' ' + hm(d) + ':00'; };
var pausa = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
var copia = function (o) { return JSON.parse(JSON.stringify(o)); };

/* Preguntas de EJEMPLO solo para la vista previa. El banco real vive en G2 Config › Banco_Simulacro. */
var BANCO = [
  [1, '¿Qué ventaja de la nube describe pagar solo por lo que se usa?', ['Economía de escala', 'Pago por uso', 'Alta disponibilidad', 'Elasticidad'], [1], 'En la nube se paga por el consumo real, sin comprar capacidad por adelantado.'],
  [1, '¿Cuáles DOS son beneficios de la elasticidad en la nube? (Elige dos)', ['Aumentar o reducir recursos según la demanda', 'Eliminar la necesidad de seguridad', 'Evitar sobreaprovisionar capacidad', 'Garantizar costo cero'], [0, 2], 'La elasticidad ajusta los recursos a la demanda y evita pagar capacidad ociosa.'],
  [1, '¿Qué es una Región de AWS?', ['Un edificio de oficinas', 'Una ubicación geográfica con varias Zonas de Disponibilidad', 'Un tipo de instancia', 'Un servicio de red'], [1], 'Cada Región contiene varias Zonas de Disponibilidad aisladas entre sí.'],
  [2, '¿Quién es responsable de parchar el sistema operativo de una instancia EC2?', ['AWS', 'El cliente', 'Ambos por igual', 'Nadie'], [1], 'En el modelo de responsabilidad compartida, el cliente gestiona el SO invitado.'],
  [2, '¿Qué servicio administra usuarios, grupos y permisos en AWS?', ['IAM', 'CloudTrail', 'Route 53', 'S3'], [0], 'IAM controla la identidad y el acceso.'],
  [2, '¿Qué práctica se recomienda para la cuenta raíz?', ['Usarla a diario', 'Activar MFA y evitar su uso rutinario', 'Compartir su contraseña', 'Eliminarla'], [1], 'Protege la cuenta raíz con MFA y úsala solo cuando sea indispensable.'],
  [3, '¿Qué servicio ofrece almacenamiento de objetos?', ['EBS', 'S3', 'RDS', 'VPC'], [1], 'Amazon S3 es almacenamiento de objetos.'],
  [3, '¿Qué servicio permite ejecutar código sin administrar servidores?', ['Lambda', 'EC2', 'Lightsail', 'Snowball'], [0], 'AWS Lambda ejecuta código por eventos sin administrar servidores.'],
  [3, '¿Cuáles DOS servicios son bases de datos administradas? (Elige dos)', ['Amazon RDS', 'Amazon DynamoDB', 'AWS Shield', 'Amazon CloudFront'], [0, 1], 'RDS (relacional) y DynamoDB (NoSQL) son bases de datos administradas.'],
  [3, '¿Qué servicio distribuye contenido con baja latencia mediante ubicaciones de borde?', ['CloudFront', 'Direct Connect', 'Glue', 'Config'], [0], 'Amazon CloudFront es la red de entrega de contenido (CDN).'],
  [4, '¿Qué herramienta te permite ver y analizar tus costos de AWS a lo largo del tiempo?', ['Cost Explorer', 'Inspector', 'Artifact', 'Macie'], [0], 'AWS Cost Explorer visualiza y analiza costos y uso.'],
  [4, '¿Qué plan de soporte incluye un Technical Account Manager (TAM) asignado?', ['Basic', 'Developer', 'Business', 'Enterprise'], [3], 'El TAM se incluye con Enterprise On-Ramp y Enterprise.']
];
var intentoDemo = null;
var barajar = function (a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

var okPaquete = function () { return { ok: true, ahora: Date.now(), usuario: usuario, config: cfg, estado: copia(estado) }; };

window.G2_DEMO = { handle: async function (d) {
  await pausa(250);
  switch (d.action) {
    case 'login': var r = okPaquete(); r.token = 'demo'; r.exp = Math.floor(Date.now() / 1000) + 86400; return r;
    case 'bootstrap': return okPaquete();
    case 'meet': return { ok: true, liga: 'https://meet.google.com/' };
    case 'subirDocumento': {
      var def = cfg.documentos.filter(function (x) { return x.clave === d.tipo; })[0];
      if (!def) return { ok: false, codigo: 'tipo', error: 'Selecciona el tipo de documento.' };
      estado.docs[d.tipo] = { nombre: d.archivo.nombre, kb: Math.round(d.archivo.base64.length * 0.75 / 1024), fecha: ts(), resultado: d.resultado || '' };
      if (d.tipo === 'resultado_examen' && d.resultado === 'No aprobatorio') estado.estadoFinal = 'No aprobó';
      return { ok: true, estado: copia(estado), mensaje: 'Recibimos tu documento: ' + def.nombre + '. (vista previa: no se guardó)' };
    }
    case 'registrarFecha':
      estado.fechaExamen = d.fecha; estado.modalidad = d.modalidad; estado.registradaEl = ts();
      if (d.archivo) estado.docs.confirmacion_fecha = { nombre: d.archivo.nombre, kb: Math.round(d.archivo.base64.length * 0.75 / 1024), fecha: ts(), resultado: '' };
      return { ok: true, estado: copia(estado), mensaje: 'Registramos la fecha de tu examen: ' + d.fecha + '. (vista previa: no se guardó)' };
    case 'registrarDuda': dudas.push({ folio: 'D-DEMO-' + (dudas.length + 1), fecha: ts(), tema: d.tema, duda: d.duda, estado: 'Nueva', respuesta: '' }); return { ok: true, folio: 'D-DEMO', mensaje: 'Recibimos tu duda. (vista previa: no se guardó)' };
    case 'noCertificara': estado.noCertifica = { motivo: d.motivo, comentario: d.comentario, fecha: ts() }; estado.estadoFinal = 'No certificará'; return { ok: true, estado: copia(estado), mensaje: 'Registramos tu decisión. (vista previa)' };
    case 'simIniciar': {
      var sel = []; for (var k = 0; k < 65; k++) sel.push(k);
      intentoDemo = barajar(sel).map(function (k) { var i = k % BANCO.length, perm = barajar(BANCO[i][2].map(function (_, z) { return z; })); return { id: 'D' + k, i: i, perm: perm }; });
      try { sessionStorage.setItem('g2_demo_int', JSON.stringify(intentoDemo)); } catch (e) {}
      return { ok: true, intento: 'demo.' + Date.now(), inicio: Date.now(), minutos: 90, aprobar: 70, preguntas: intentoDemo.map(function (x) {
        var q = BANCO[x.i]; return { id: x.id, dom: q[0], texto: q[1], multi: q[3].length > 1 ? q[3].length : 0, opciones: x.perm.map(function (o) { return q[2][o]; }) }; }) };
    }
    case 'simEnviar': {
      if (!intentoDemo) { try { intentoDemo = JSON.parse(sessionStorage.getItem('g2_demo_int')); } catch (e) {} }
      if (!intentoDemo) return { ok: false, codigo: 'sim_intento', error: 'Este intento no es válido. Inicia un simulacro nuevo.' };
      var ac = 0, doms = {}, rev = [];
      intentoDemo.forEach(function (x) {
        var q = BANCO[x.i], okm = []; x.perm.forEach(function (o, pos) { if (q[3].indexOf(o) >= 0) okm.push(pos); });
        var el = ((d.respuestas || {})[x.id] || []).slice().sort(function (a, b) { return a - b; });
        var a = el.length === okm.length && el.every(function (v, k) { return v === okm[k]; });
        if (a) ac++; var dm = doms[q[0]] = doms[q[0]] || { ok: 0, total: 0 }; dm.total++; if (a) dm.ok++;
        rev.push({ id: x.id, dom: q[0], texto: q[1], opciones: x.perm.map(function (o) { return q[2][o]; }), elegidas: el, correctas: okm, acierto: a, explicacion: q[4] });
      });
      var pct = Math.round(ac * 1000 / intentoDemo.length) / 10;
      estado.sim.intentos++; estado.sim.ultimo = pct; estado.sim.mejor = Math.max(estado.sim.mejor || 0, pct);
      return { ok: true, aciertos: ac, total: intentoDemo.length, pct: pct, aprobar: 70, minutos: 1, dominios: doms, revision: rev, sim: copia(estado.sim) };
    }
    case 'aceptarAviso': estado.avisoAceptado = 'v1 · ' + ts(); return { ok: true, estado: copia(estado) };
  }
  return { ok: false, codigo: 'accion', error: 'Acción no válida.' };
} };
})();
