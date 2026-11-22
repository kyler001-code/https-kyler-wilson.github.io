/* Efecto de escritura tipo terminal.
   - El texto se escribe solo cuando entra en pantalla (al hacer scroll).
   - Los textos cortos (menú, botones, títulos) se vuelven a escribir
     cuando acercas el cursor a ellos. */
(function () {
  'use strict';

  // Respeta a quien pide menos movimiento.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ---- Qué elementos se animan --------------------------------------
  var SELECTOR = [
    '.etiqueta', 'h1', 'h2', '.subtitulo', 'p', '.boton',
    '.tarjeta-titulo', '.tarjeta-texto',
    '.proyecto-datos', '.fecha', '.detalle-titulo', '.detalle > div',
    '.dato-etiqueta', '.dato-valor', '.pie'
  ].join(',');

  // ---- Ajustes (puedes cambiarlos) -----------------------------------
  var MS_POR_LETRA   = 28;    // velocidad base de escritura
  var MAX_MS_TOTAL   = 1100;  // ningún texto tarda más que esto
  var RADIO_CURSOR   = 60;    // px de cercanía para re-escribir
  var ESPERA_REPETIR = 3000;  // ms mínimos entre repeticiones
  var MAX_LETRAS_REPETIR = 40; // solo se repiten textos cortos

  var items = [];
  var vistos = new Set();

  document.querySelectorAll(SELECTOR).forEach(function (el) {
    if (vistos.has(el) || el.children.length > 0) return;
    if (el.closest('.sidebar')) return; // el sidebar nunca se anima
    var texto = el.textContent.replace(/\s+/g, ' ').trim();
    if (!texto) return;
    vistos.add(el);

    // Texto completo solo para lectores de pantalla.
    var sr = document.createElement('span');
    sr.className = 'solo-lectores';
    sr.textContent = texto;

    var visible = document.createElement('span');
    var cursor  = document.createElement('span');
    var oculto  = document.createElement('span');
    visible.setAttribute('aria-hidden', 'true');
    cursor.setAttribute('aria-hidden', 'true');
    oculto.setAttribute('aria-hidden', 'true');
    cursor.className = 'cursor-tipeo';
    oculto.style.visibility = 'hidden'; // reserva el espacio: nada se mueve

    el.classList.add('tipeando');
    el.textContent = '';
    el.append(sr, visible, oculto);
    oculto.textContent = texto;

    items.push({
      el: el, texto: texto, visible: visible, cursor: cursor, oculto: oculto,
      estado: 'pendiente',   // pendiente | escribiendo | listo
      ultimo: 0, dentro: false, raf: 0
    });
  });

  function pintar(it, n) {
    it.visible.textContent = it.texto.slice(0, n);
    it.oculto.textContent  = it.texto.slice(n);
  }

  function escribir(it, retraso) {
    if (it.estado === 'escribiendo') return;
    it.estado = 'escribiendo';
    it.el.classList.add('tipeando');
    var ms = Math.min(MS_POR_LETRA, MAX_MS_TOTAL / it.texto.length);
    var inicio = null;
    pintar(it, 0);
    it.visible.after(it.cursor);

    function paso(t) {
      if (inicio === null) inicio = t + (retraso || 0);
      var n = Math.max(0, Math.min(it.texto.length, Math.floor((t - inicio) / ms)));
      pintar(it, n);
      if (n < it.texto.length) {
        it.raf = requestAnimationFrame(paso);
      } else {
        it.cursor.remove();
        it.estado = 'listo';
        it.el.classList.remove('tipeando');
        it.ultimo = performance.now();
      }
    }
    it.raf = requestAnimationFrame(paso);
  }

  // Al inicio todo queda "en blanco" hasta que toque escribirlo.
  items.forEach(function (it) { pintar(it, 0); });

  // ---- 1) Escribir al entrar en pantalla -----------------------------
  var porMapa = new Map(items.map(function (it) { return [it.el, it]; }));
  var cola = 0;
  var io = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      if (!e.isIntersecting) return;
      var it = porMapa.get(e.target);
      io.unobserve(e.target);
      if (it.estado === 'pendiente') {
        escribir(it, cola * 140);       // escalonado: uno tras otro
        cola = Math.min(cola + 1, 12);
        setTimeout(function () { cola = Math.max(0, cola - 1); }, 140);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach(function (it) { io.observe(it.el); });

  // ---- 2) Re-escribir al acercar el cursor ---------------------------
  var px = -1, py = -1, pendiente = false;
  window.addEventListener('pointermove', function (e) {
    px = e.clientX; py = e.clientY;
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(function () {
      pendiente = false;
      var ahora = performance.now();
      items.forEach(function (it) {
        if (it.texto.length > MAX_LETRAS_REPETIR) return;
        var r = it.el.getBoundingClientRect();
        var cerca = px > r.left - RADIO_CURSOR && px < r.right + RADIO_CURSOR &&
                    py > r.top - RADIO_CURSOR && py < r.bottom + RADIO_CURSOR;
        if (cerca && !it.dentro && it.estado === 'listo' &&
            ahora - it.ultimo > ESPERA_REPETIR) {
          escribir(it, 0);
        }
        it.dentro = cerca;
      });
    });
  }, { passive: true });
})();
