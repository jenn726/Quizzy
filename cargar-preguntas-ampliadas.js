// Quizzy — cargador ampliado de preguntas
// Carga el banco principal y los 6 bancos extra, elimina duplicados y mantiene 5 preguntas por partida.
(function(){
  const archivos = [
    "preguntas.json",
    "preguntas-extra-1.json",
    "preguntas-extra-2.json",
    "preguntas-extra-3.json",
    "preguntas-extra-4.json",
    "preguntas-extra-5.json",
    "preguntas-extra-6.json"
  ];

  const cargarJson = async (archivo) => {
    const r = await fetch(archivo + "?" + Date.now());
    if (!r.ok) throw new Error("No se pudo cargar " + archivo);
    return r.json();
  };

  window.cargarPreguntasAmpliadas = async function(curso, categoria){
    const bancos = await Promise.all(archivos.map(cargarJson));
    const resultado = [];
    const vistas = new Set();

    for (const banco of bancos) {
      const claveCurso = Object.keys(banco).find(k => k.trim() === String(curso).trim());
      const preguntas = claveCurso && banco[claveCurso] && banco[claveCurso][categoria];
      if (!Array.isArray(preguntas)) continue;

      for (const q of preguntas) {
        if (!Array.isArray(q) || q.length < 3 || !Array.isArray(q[1])) continue;
        const clave = JSON.stringify(q);
        if (!vistas.has(clave)) {
          vistas.add(clave);
          resultado.push(q);
        }
      }
    }

    return resultado.sort(() => Math.random() - 0.5).slice(0, 5);
  };
})();
