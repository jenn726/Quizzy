// Quizzy — cargador ampliado de preguntas
// Carga el banco principal y los 7 bancos extra.
(function(){
  const archivos = [
    "preguntas.json",
    "preguntas-extra-1.json",
    "preguntas-extra-2.json",
    "preguntas-extra-3.json",
    "preguntas-extra-4.json",
    "preguntas-extra-5.json",
    "preguntas-extra-6.json",
    "preguntas-extra-7.json"
  ];

  const correcciones = {
    "¿En qué planeta está la Tierra?": "¿En qué sistema está la Tierra?",
    "¿Qué parte de la planta produce muchas semillas?": "¿Qué parte de la planta contiene las semillas?",
    "¿Cuál es el río más largo de España?": "¿Cuál es el río más largo de la península ibérica?",
    "¿Qué continente es España?": "¿En qué continente está España?",
    "¿Qué escala mide la intensidad de los terremotos en términos de magnitud?": "¿Qué escala se utiliza tradicionalmente para expresar la magnitud de los terremotos?"
  };

  const cargarJson = async (archivo) => {
    const r = await fetch(archivo + "?" + Date.now());
    if (!r.ok) throw new Error("No se pudo cargar " + archivo);
    return r.json();
  };

  const normalizar = texto => String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  window.cargarPreguntasAmpliadas = async function(curso, categoria){
    const bancos = await Promise.all(archivos.map(cargarJson));
    const resultado = [];
    const vistas = new Set();
    const enunciados = new Set();

    for (const banco of bancos) {
      const claveCurso = Object.keys(banco).find(k => k.trim() === String(curso).trim());
      const preguntas = claveCurso && banco[claveCurso] && banco[claveCurso][categoria];
      if (!Array.isArray(preguntas)) continue;

      for (const original of preguntas) {
        if (!Array.isArray(original) || original.length < 3 || !Array.isArray(original[1])) continue;

        const q = [original[0], [...original[1]], original[2]];
        const correccion = correcciones[String(q[0]).trim()];
        if (correccion) q[0] = correccion;

        const clave = JSON.stringify(q);
        const claveEnunciado = normalizar(q[0]);

        if (vistas.has(clave) || enunciados.has(claveEnunciado)) continue;
        vistas.add(clave);
        enunciados.add(claveEnunciado);
        resultado.push(q);
      }
    }

    return resultado.sort(() => Math.random() - 0.5).slice(0, 5);
  };
})();
