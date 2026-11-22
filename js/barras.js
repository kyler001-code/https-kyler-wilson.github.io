/* Barras de nivel.
   - Siempre se ven llenas al 30% (nunca vacías, ni sin JavaScript).
   - Al pasar el cursor, tocar o enfocar una habilidad, la barra se
     vuelve a "cargar" de 0 hasta su porcentaje.
   Nunca se vacían por sí solas: solo se animan cuando las seleccionas. */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var DURACION = 1300; // un poco más que la transición del CSS (1.2 s)

  function recargar(hab) {
    var barra = hab.querySelector('.barra-relleno');
    if (!barra || hab.dataset.cargando) return;
    hab.dataset.cargando = '1';
    barra.classList.add('reiniciando');   // vacía sin animar
    void barra.offsetWidth;               // fuerza el redibujado
    barra.classList.remove('reiniciando'); // vuelve a llenarse animada
    setTimeout(function () { delete hab.dataset.cargando; }, DURACION);
  }

  var habilidades = document.querySelectorAll('.habilidad');

  habilidades.forEach(function (hab) {
    hab.addEventListener('pointerenter', function () { recargar(hab); });
    hab.addEventListener('focus', function () { recargar(hab); });
    hab.addEventListener('click', function () { recargar(hab); });
  });

})();
