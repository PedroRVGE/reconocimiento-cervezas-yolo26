// =====================================================================================
// app.js — Lógica del "Naíto virtual"
//
// 1. Abre la webcam en el navegador (1280x720, 30 fps, como en la presentación).
// 2. Envía cada frame (JPEG) al servidor (servidor.py), que corre YOLO y devuelve las cajas.
// 3. Con las cervezas que se ven, el robot escoge la que más le gusta según la lista de gustos
//    (índice 0 = le encanta, índice 5 = nada) y la señala con el brazo.
// =====================================================================================

// ------------------------------- CONFIGURACIÓN ---------------------------------------
const ANCHO = 1280, ALTO = 720, FPS_CAMARA = 30;   // formato de la webcam del portátil
const CALIDAD_JPEG = 0.85;
const CONF_INICIAL = 0.50;
// Cada lata es una "pista": con tracking, una por ID de ByteTrack; sin tracking, una por marca.
const CONFIRMA = 2;          // frames que hay que ver una pista antes de tenerla en cuenta (evita detecciones sueltas)
const OLVIDO_MS = 500;       // una lata deja de contar si no se ve en este tiempo...
const OLVIDO_ELEGIDA_MS = 1200;  // ...salvo la que está señalando, que aguanta más (no se distrae si parpadea)
const REPETIR_MS = 8000;     // no repite la misma frase en voz alta antes de este tiempo

// Nombres bonitos y colores (solo para la pantalla; las clases reales vienen del modelo)
const MARCAS = {
  aguila:        { nombre: "Águila",        color: "#f5c400" },
  andina:        { nombre: "Andina",        color: "#ff7b39" },
  club_colombia: { nombre: "Club Colombia", color: "#c9a227" },
  costena:       { nombre: "Costeña",       color: "#4cc3ff" },
  heineken:      { nombre: "Heineken",      color: "#3ccf6e" },
  poker:         { nombre: "Póker",         color: "#ff4d5a" },
};
const nombre = c => (MARCAS[c] ? MARCAS[c].nombre : c.replace(/_/g, " "));
const color = c => (MARCAS[c] ? MARCAS[c].color : "#ffffff");

// Lo que dice el robot según la posición de la cerveza elegida en su lista
const FRASES = [
  m => `¡¡${m}!! ¡Es mi favorita!`,
  m => `¡Uy, una ${m}! Me gusta mucho.`,
  m => `Me quedo con la ${m}, está rica.`,
  m => `Bueno... la ${m} no está mal.`,
  m => `Mmm, la ${m}... si no hay más.`,
  m => `Uff, solo hay ${m}. Qué remedio...`,
];
const FRASE_NADA = "No veo ninguna cerveza... ¿me muestras una?";

// ------------------------------- ESTADO ----------------------------------------------
const $ = id => document.getElementById(id);
const video = $("video"), lienzo = $("cajas"), ctx = lienzo.getContext("2d");
const laser = $("laser"), ctxLaser = laser.getContext("2d");
const captura = document.createElement("canvas"), ctxCaptura = captura.getContext("2d");

let clases = Object.keys(MARCAS);    // se reemplaza con las del modelo cargado
let gustos = [...clases];           // orden de preferencia
let conf = CONF_INICIAL;
let modeloListo = false, camaraLista = false, cambiandoModelo = false;
let ultimas = [];                   // cajas del último frame
const pistas = new Map();           // clave -> { clave, votos {marca: suma conf}, clase, caja, conf, visto, golpes }
let pistaElegida = null;            // clave de la lata que el robot está señalando
let elegida = null;                 // marca de esa lata
let ultimoAnuncio = { clase: undefined, t: 0 };
let fpsDet = 0, msInf = 0;

const guardado = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const leido = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };

// ------------------------------- ESCALA DEL ESCENARIO --------------------------------
// Mientras se está en la entrada, el bar se ve en miniatura (escala K) a través del hueco de la puerta:
// el punto FOCO del bar (la cabeza de Naíto) queda en el punto PUERTA de la fachada, asomado sobre las hojas.
// K y FOCO están escogidos para que el bar LLENE todo el HUECO de la puerta y no se vean bordes negros.
const HUECO = { x1: 640, x2: 960, y1: 440, y2: 860 };     // debe coincidir con la máscara y el marco del SVG
const K_MINI = 0.6, FOCO = { x: 280, y: 300 }, PUERTA = { x: 800, y: 520 };
let enLaEntrada = true;

function escalar() {
  const s = Math.min(innerWidth / 1600, innerHeight / 900);
  const k = enLaEntrada ? K_MINI : 1;
  const tx = enLaEntrada ? PUERTA.x - 800 - k * (FOCO.x - 800) : 0;
  const ty = enLaEntrada ? PUERTA.y - 450 - k * (FOCO.y - 450) : 0;
  $("escenario").style.transform = `translate(-50%, -50%) scale(${s}) translate(${tx}px, ${ty}px) scale(${k})`;
  // En la entrada, el bar solo se ve por el hueco de la puerta (x 610–990, y 330–900 de la fachada);
  // al acercarse, el recorte se abre hasta mostrar todo el bar.
  if (enLaEntrada) {
    const ox = PUERTA.x - k * FOCO.x, oy = PUERTA.y - k * FOCO.y;
    const izq = (HUECO.x1 - ox) / k, der = (HUECO.x2 - ox) / k, arr = (HUECO.y1 - oy) / k, aba = (HUECO.y2 - oy) / k;
    $("escenario").style.clipPath = `inset(${arr}px ${1600 - der}px ${900 - aba}px ${izq}px)`;
  } else {
    $("escenario").style.clipPath = "inset(0px 0px 0px 0px)";
  }
  $("fachada").style.transform = `translate(-50%, -50%) scale(${s})`;
}
addEventListener("resize", escalar);
escalar();

// Bombillos de la guirnalda (sobre la curva del SVG)
(function bombillos() {
  const g = $("bombillos"), colores = ["#ffd166", "#ef476f", "#06d6a0", "#4cc9f0", "#ffd166"];
  for (let i = 0; i < 32; i++) {
    const x = 25 + i * 50, fase = (x % 400) / 400;               // un arco cada 400 px
    const y = 20 + 48 * Math.sin(Math.PI * fase) * 0.5 + 12;
    g.insertAdjacentHTML("beforeend",
      `<circle cx="${x}" cy="${y}" r="8" fill="${colores[i % 5]}" class="bombillo" style="filter:drop-shadow(0 0 6px ${colores[i % 5]})"/>`);
  }
  // Botellas en las repisas
  const r = $("repisas"), tonos = ["#2f7d32", "#8b2d1f", "#c9a227", "#3a5ba0", "#6b3d1e"];
  [330, 500].forEach((y, fila) => {
    for (let i = 0; i < 11; i++) {
      const x = 30 + i * 48 + (fila ? 20 : 0), h = 70 + ((i * 37 + fila * 11) % 30), t = tonos[(i + fila * 2) % 5];
      r.insertAdjacentHTML("beforeend",
        `<path d="M${x} ${y} v-${h - 30} q0 -10 8 -16 v-14 h8 v14 q8 6 8 16 v${h - 30} z" fill="${t}" stroke="#1d120b" stroke-width="3"/>` +
        `<rect x="${x + 3}" y="${y - h / 2}" width="18" height="14" fill="#f3e6c8" opacity=".8"/>`);
    }
  });
})();

// ------------------------------- PANEL ------------------------------------------------
function mostrarPanel(v) { $("panel").classList.toggle("oculto", !v); }
$("boton-panel").onclick = () => mostrarPanel($("panel").classList.contains("oculto"));

$("conf").value = conf = leido("naito_conf") ?? CONF_INICIAL;
$("txt-conf").textContent = (+conf).toFixed(2);
$("conf").oninput = e => { conf = +e.target.value; $("txt-conf").textContent = conf.toFixed(2); guardado("naito_conf", conf); };

$("chk-espejo").onchange = e => document.body.classList.toggle("espejo", e.target.checked);
$("chk-tracking").onchange = () => olvidarPistas();   // los IDs viejos ya no sirven
$("btn-azar").onclick = () => { gustos.sort(() => Math.random() - 0.5); guardarGustos(); };
$("btn-restablecer").onclick = () => { gustos = [...clases]; guardarGustos(); };

function guardarGustos() { guardado("naito_gustos", gustos); pintarGustos(); }

function pintarGustos() {
  // Lista editable del panel (se puede arrastrar o usar ▲▼)
  const ol = $("lista-gustos");
  ol.innerHTML = "";
  gustos.forEach((c, i) => {
    const li = document.createElement("li");
    li.dataset.clase = c;
    li.innerHTML = `<span class="agarre">⠿</span><span class="pos">${i + 1}</span><span class="punto" style="background:${color(c)};width:12px;height:12px;border-radius:50%"></span>
      <span class="nombre">${nombre(c)}</span><button title="Subir">▲</button><button title="Bajar">▼</button>`;
    const [subir, bajar] = li.querySelectorAll("button");
    subir.disabled = i === 0; bajar.disabled = i === gustos.length - 1;
    subir.onclick = () => { [gustos[i - 1], gustos[i]] = [gustos[i], gustos[i - 1]]; guardarGustos(); };
    bajar.onclick = () => { [gustos[i + 1], gustos[i]] = [gustos[i], gustos[i + 1]]; guardarGustos(); };
    ol.appendChild(li);
  });
  // Pizarra del bar
  $("ranking").innerHTML = gustos.map((c, i) =>
    `<li data-clase="${c}"><span class="num">${i + 1}.</span><span class="marca"><span class="punto" style="background:${color(c)}"></span>${nombre(c)}</span></li>`
  ).join("");
  hacerArrastrable(ol, false);
  hacerArrastrable($("ranking"), true);
  pistaElegida = elegida = null;                // que vuelva a escoger con el orden nuevo
}

// Arrastrar y soltar: la cajita se mueve en vivo y al soltar se guarda el nuevo orden.
// Funciona en la lista del panel (vertical) y en la pizarra del bar (horizontal).
function hacerArrastrable(lista, horizontal) {
  let arrastrada = null;
  for (const li of lista.children) {
    li.draggable = true;
    li.ondragstart = e => {
      arrastrada = li;
      li.classList.add("arrastrando");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", li.dataset.clase);
    };
    li.ondragend = () => {
      li.classList.remove("arrastrando");
      arrastrada = null;
      gustos = [...lista.children].map(x => x.dataset.clase);
      guardarGustos();
    };
  }
  lista.ondragover = e => {
    if (!arrastrada) return;
    e.preventDefault();
    const encima = e.target.closest("li");
    if (!encima || encima === arrastrada || encima.parentNode !== lista) return;
    const r = encima.getBoundingClientRect();
    const despues = horizontal ? e.clientX > r.left + r.width / 2 : e.clientY > r.top + r.height / 2;
    lista.insertBefore(arrastrada, despues ? encima.nextSibling : encima);
  };
  lista.ondrop = e => e.preventDefault();
}

// ------------------------------- MODELOS ----------------------------------------------
async function api(ruta, opciones) {
  let r;
  try {
    r = await fetch(ruta, opciones);
  } catch (e) {                                 // "Failed to fetch" = el servidor no está corriendo
    throw new Error("no hay conexión con servidor.py (¿se cerró la consola de iniciar.bat?)");
  }
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d;
}

async function iniciarModelos() {
  try {
    const d = await api("/api/modelos");
    const sel = $("sel-modelo");
    sel.innerHTML = d.modelos.map(m => `<option>${m}</option>`).join("");
    if (!d.modelos.length) return estadoModelo("No hay ningún .pt en la carpeta modelos/", true);
    const inicial = d.actual || (d.modelos.includes(d.por_defecto) ? d.por_defecto : d.modelos[0]);
    sel.value = inicial;
    sel.onchange = () => cargarModelo(sel.value);
    await cargarModelo(inicial);
  } catch (e) {
    aviso("No hay conexión con el servidor.<br>¿Está corriendo <b>servidor.py</b>?");
  }
}

async function cargarModelo(m) {
  cambiandoModelo = true;
  estadoModelo(`Cargando ${m}...`);
  try {
    const d = await api("/api/cargar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modelo: m }) });
    clases = d.clases;
    const previos = leido("naito_gustos");
    gustos = previos && previos.length === clases.length && previos.every(c => clases.includes(c)) ? previos : [...clases];
    olvidarPistas();
    pintarGustos();
    estadoModelo(d.aviso ? `⚠ ${d.aviso}` : `Listo: ${d.clases.length} clases · ${d.dispositivo}`, !!d.aviso);
    modeloListo = true;
  } catch (e) {
    estadoModelo(`Error al cargar: ${e.message}`, true);
  }
  cambiandoModelo = false;
}

function estadoModelo(t, error = false) {
  const el = $("estado-modelo");
  el.textContent = t;
  el.classList.toggle("error", error);
}

function aviso(html) {
  const a = $("aviso");
  a.hidden = !html;
  if (html) a.innerHTML = html;
}

// ------------------------------- CÁMARA -----------------------------------------------
async function abrirCamara(idDispositivo) {
  if (video.srcObject) video.srcObject.getTracks().forEach(t => t.stop());
  camaraLista = false;
  try {
    const flujo = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        width: { ideal: ANCHO }, height: { ideal: ALTO }, frameRate: { ideal: FPS_CAMARA },
        ...(idDispositivo ? { deviceId: { exact: idDispositivo } } : {}),
      },
    });
    video.srcObject = flujo;
    await video.play();
    camaraLista = true;
    aviso(null);
    // Ya con permiso, se pueden listar las cámaras con su nombre
    const camaras = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "videoinput");
    const sel = $("sel-camara"), actual = flujo.getVideoTracks()[0].getSettings().deviceId;
    sel.innerHTML = camaras.map((c, i) => `<option value="${c.deviceId}">${c.label || "Cámara " + (i + 1)}</option>`).join("");
    sel.value = actual;
    sel.onchange = () => abrirCamara(sel.value);
  } catch (e) {
    aviso(`No se pudo abrir la cámara (${e.name}).<br>Revisa el permiso del navegador o que otro programa no la esté usando.`);
  }
}

// ------------------------------- BUCLE DE DETECCIÓN -----------------------------------
const esperar = ms => new Promise(r => setTimeout(r, ms));

async function bucleDeteccion() {
  let tPrev = performance.now();
  while (true) {
    if (!modeloListo || !camaraLista || cambiandoModelo || !video.videoWidth) { await esperar(100); continue; }
    // El frame se manda SIN espejo y a la resolución real de la cámara (1280x720);
    // YOLO lo reescala a 640 manteniendo la proporción, igual que en probar_modelo.py.
    captura.width = video.videoWidth; captura.height = video.videoHeight;
    ctxCaptura.drawImage(video, 0, 0);
    const jpeg = await new Promise(r => captura.toBlob(r, "image/jpeg", CALIDAD_JPEG));
    try {
      const trk = $("chk-tracking").checked ? 1 : 0;
      const d = await api(`/api/detectar?conf=${conf}&tracking=${trk}`, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: jpeg });
      procesar(d.cajas);
      msInf = d.ms;
      const t = performance.now();
      fpsDet = fpsDet * 0.8 + (1000 / Math.max(t - tPrev, 1)) * 0.2;
      tPrev = t;
      if (!$("aviso").innerHTML.includes("cámara")) aviso(null);
    } catch (e) {
      aviso(`Error del servidor: ${e.message}`);
      await esperar(500);
    }
  }
}

function olvidarPistas() {
  pistas.clear();
  pistaElegida = elegida = null;
}

function procesar(cajas) {
  ultimas = cajas;
  const ahora = performance.now();
  const enEsteFrame = new Set();

  // 1. Actualizar las pistas. Con tracking la clave es el ID (la misma lata en todos los frames);
  //    sin tracking es la marca, y si hay dos latas iguales se queda con la de más confianza.
  for (const c of cajas) {
    c.clave = c.id != null ? `id${c.id}` : c.clase;
    const p = pistas.get(c.clave) || { clave: c.clave, id: c.id, votos: {}, golpes: 0 };
    if (enEsteFrame.has(c.clave)) { if (c.conf <= p.conf) continue; }
    else { p.golpes++; enEsteFrame.add(c.clave); }
    // La marca de cada lata se decide por VOTACIÓN entre todos sus frames (sumando la confianza):
    // si un frame suelto dice "poker" sobre una lata que lleva 30 frames siendo "aguila", gana aguila.
    p.votos[c.clase] = (p.votos[c.clase] || 0) + c.conf;
    p.clase = Object.keys(p.votos).reduce((a, b) => (p.votos[a] >= p.votos[b] ? a : b));
    Object.assign(p, { caja: c.caja, conf: c.conf, visto: ahora });
    pistas.set(c.clave, p);
  }
  for (const [k, p] of pistas) if (ahora - p.visto > OLVIDO_ELEGIDA_MS) pistas.delete(k);

  const activas = [...pistas.values()].filter(p =>
    p.golpes >= CONFIRMA && ahora - p.visto < (p.clave === pistaElegida ? OLVIDO_ELEGIDA_MS : OLVIDO_MS));
  const rango = p => gustos.indexOf(p.clase);

  // 2. Escoger. El robot se queda con SU lata (su ID) mientras siga ahí y no aparezca una que le guste más.
  let actual = activas.find(p => p.clave === pistaElegida);
  const mejorRango = Math.min(...activas.map(rango));
  if (!actual || rango(actual) > mejorRango) {
    actual = activas.filter(p => rango(p) === mejorRango).sort((a, b) => b.conf - a.conf)[0] || null;
  }
  pistaElegida = actual ? actual.clave : null;

  // 3. Solo habla cuando cambia la MARCA elegida (no en cada frame, ni si cambia el ID de la misma marca)
  const nueva = actual ? actual.clase : null;
  if (nueva !== elegida) {
    elegida = nueva;
    const texto = nueva === null ? FRASE_NADA : FRASES[Math.min(rango(actual), FRASES.length - 1)](nombre(nueva));
    const repetida = ultimoAnuncio.clase === nueva && ahora - ultimoAnuncio.t < REPETIR_MS;
    hablar(texto, !repetida);
    if (!repetida) ultimoAnuncio = { clase: nueva, t: ahora };
  }

  const conteo = {};
  for (const p of activas) conteo[p.clase] = (conteo[p.clase] || 0) + 1;
  const vistas = gustos.filter(c => conteo[c]);
  $("veo").textContent = vistas.length
    ? `Veo: ${vistas.map(c => (conteo[c] > 1 ? `${conteo[c]} ${nombre(c)}` : nombre(c))).join(", ")}` : "";
  document.querySelectorAll("#ranking li").forEach(li => {
    li.classList.toggle("visible", vistas.includes(li.dataset.clase));
    li.classList.toggle("elegida", li.dataset.clase === elegida);
  });
}

// ------------------------------- VOZ Y BOCADILLO --------------------------------------
let ultimaVoz = 0;
// conVoz = false: solo cambia el texto (p. ej. la misma marca volvió a aparecer hace poco)
function hablar(texto, conVoz = true) {
  $("texto-bocadillo").textContent = texto;
  if (!conVoz) return;
  const b = $("bocadillo");
  b.classList.add("salta");
  setTimeout(() => b.classList.remove("salta"), 250);
  if ($("chk-voz").checked && "speechSynthesis" in window && performance.now() - ultimaVoz > 1500) {
    ultimaVoz = performance.now();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    const voces = speechSynthesis.getVoices();
    u.voice = voces.find(v => v.lang === "es-CO") || voces.find(v => v.lang.startsWith("es")) || null;
    u.lang = u.voice ? u.voice.lang : "es-ES";
    u.pitch = 1.6; u.rate = 1.05;             // vocecita de robot
    speechSynthesis.speak(u);
  }
}

// ------------------------------- DIBUJO: CAJAS Y ROBOT --------------------------------
// Dónde queda el video dentro del lienzo de 1280x720 (por si la cámara no es 16:9)
function rectVideo() {
  const vw = video.videoWidth || ANCHO, vh = video.videoHeight || ALTO;
  const s = Math.min(ANCHO / vw, ALTO / vh), w = vw * s, h = vh * s;
  return { x: (ANCHO - w) / 2, y: (ALTO - h) / 2, w, h };
}
// Caja normalizada (0–1) -> coordenadas del lienzo, aplicando el espejo si está activo
function aLienzo([x1, y1, x2, y2]) {
  const r = rectVideo();
  if (document.body.classList.contains("espejo")) [x1, x2] = [1 - x2, 1 - x1];
  return [r.x + x1 * r.w, r.y + y1 * r.h, r.x + x2 * r.w, r.y + y2 * r.h];
}

function dibujarCajas() {
  ctx.clearRect(0, 0, ANCHO, ALTO);
  const todas = $("chk-todas").checked;
  ctx.font = "bold 26px Trebuchet MS, sans-serif";
  for (const c of ultimas) {
    const p = pistas.get(c.clave);
    const esLaElegida = p && p.clave === pistaElegida && p.caja === c.caja;
    if (!todas && !esLaElegida) continue;
    const marca = p ? p.clase : c.clase;          // la marca ganadora de la votación de esa lata
    const [x1, y1, x2, y2] = aLienzo(c.caja);
    const col = esLaElegida ? "#ffd23f" : color(marca);
    ctx.lineWidth = esLaElegida ? 7 : 4;
    ctx.strokeStyle = col;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    const pos = gustos.indexOf(marca) + 1;
    const txt = `${esLaElegida ? "★ " : ""}${c.id != null ? "#" + c.id + " " : ""}${nombre(marca)} ${Math.round(c.conf * 100)}%  (gusto ${pos})`;
    const w = ctx.measureText(txt).width + 14;
    const ty = y1 > 36 ? y1 - 34 : y1;
    ctx.fillStyle = col;
    ctx.fillRect(x1 - 2, ty, w, 34);
    ctx.fillStyle = "#111";
    ctx.fillText(txt, x1 + 5, ty + 26);
  }
  $("hud").textContent = modeloListo
    ? `${$("sel-modelo").value.replace(".pt", "")} · ${fpsDet.toFixed(1)} FPS · inferencia ${msInf} ms · conf ${(+conf).toFixed(2)}`
    : "Cargando modelo...";
}

// Posiciones fijas en el escenario (deben coincidir con estilos.css)
const ROBOT = { x: 90, y: 175 };
const HOMBRO = { x: ROBOT.x + 262, y: ROBOT.y + 240 };   // hombro del brazo que señala
const LARGO_BRAZO = 186;                                   // del hombro a la punta del dedo
const PANTALLA = { x: 636 + 5 + 14, y: 116 + 5 + 14, w: 892 - 28, h: 514 - 28 };

// Animación: los ángulos se acercan poco a poco al objetivo para que se mueva suave
const anim = { brazo: 80, brazoIzq: 100, cabeza: 0, mira: { x: 0, y: 0 }, objetivo: null, parpadeo: 0 };
const suave = (a, b, k) => a + (b - a) * k;

function humor() {
  if (!elegida) return "nada";
  const i = gustos.indexOf(elegida);
  return i === 0 ? "encanta" : i <= 2 ? "gusta" : i <= 4 ? "meh" : "nada-gusta";
}
const LEDS = { nada: "#38d9ff", encanta: "#ff4d8d", gusta: "#4ade80", meh: "#facc15", "nada-gusta": "#6d8dff" };
const BOCAS = {
  nada: "M170 186 Q190 192 210 186",
  encanta: "M160 178 Q190 214 220 178",
  gusta: "M164 182 Q190 204 216 182",
  meh: "M168 188 L212 188",
  "nada-gusta": "M166 196 Q190 176 214 196",
};

function animar(t) {
  const h = humor();
  document.documentElement.style.setProperty("--led", LEDS[h]);
  $("boca").setAttribute("d", BOCAS[h]);
  $("corazones").style.display = h === "encanta" ? "" : "none";
  $("ojos").style.visibility = h === "encanta" ? "hidden" : "visible";
  $("mejilla1").setAttribute("opacity", h === "encanta" || h === "gusta" ? 0.8 : 0);
  $("mejilla2").setAttribute("opacity", h === "encanta" || h === "gusta" ? 0.8 : 0);

  // ¿A dónde señala? Al centro de la caja de SU lata (la pista elegida), en coordenadas del escenario
  let destino = null;
  const suLata = pistas.get(pistaElegida);
  if (suLata) {
    const [x1, y1, x2, y2] = aLienzo(suLata.caja);
    destino = { x: PANTALLA.x + ((x1 + x2) / 2 / ANCHO) * PANTALLA.w, y: PANTALLA.y + ((y1 + y2) / 2 / ALTO) * PANTALLA.h };
    anim.objetivo = anim.objetivo ? { x: suave(anim.objetivo.x, destino.x, 0.2), y: suave(anim.objetivo.y, destino.y, 0.2) } : destino;
  } else {
    anim.objetivo = null;
  }

  const s = t / 1000;
  if (anim.objetivo) {
    const ang = (Math.atan2(anim.objetivo.y - HOMBRO.y, anim.objetivo.x - HOMBRO.x) * 180) / Math.PI;
    anim.brazo = suave(anim.brazo, ang, 0.15);
    // Si le encanta, saluda con el otro brazo; si no le gusta, lo deja caído
    anim.brazoIzq = suave(anim.brazoIzq, h === "encanta" ? 225 + 25 * Math.sin(s * 9) : h === "nada-gusta" ? 95 : 120, 0.2);
    anim.cabeza = suave(anim.cabeza, Math.max(-10, Math.min(10, ang * 0.35)) + (h === "nada-gusta" ? 6 : 0), 0.1);
    anim.mira = { x: suave(anim.mira.x, 5, 0.2), y: suave(anim.mira.y, Math.max(-5, Math.min(5, ang / 6)), 0.2) };
  } else if (enLaEntrada) {
    // En la puerta: Naíto saluda a los que van a entrar
    anim.brazo = suave(anim.brazo, 80, 0.1);
    anim.brazoIzq = suave(anim.brazoIzq, 225 + 25 * Math.sin(s * 7), 0.2);
    anim.cabeza = suave(anim.cabeza, 6 * Math.sin(s * 1.4), 0.08);
    anim.mira = { x: suave(anim.mira.x, 0, 0.1), y: suave(anim.mira.y, 0, 0.1) };
  } else {
    // Sin cervezas: brazos abajo y mira de lado a lado buscando
    anim.brazo = suave(anim.brazo, 80 + 4 * Math.sin(s * 1.5), 0.08);
    anim.brazoIzq = suave(anim.brazoIzq, 100 - 4 * Math.sin(s * 1.5), 0.08);
    anim.cabeza = suave(anim.cabeza, 9 * Math.sin(s * 1.2), 0.08);
    anim.mira = { x: suave(anim.mira.x, 6 * Math.sin(s * 1.2), 0.1), y: suave(anim.mira.y, 0, 0.1) };
  }

  const rebote = h === "encanta" ? Math.abs(Math.sin(s * 6)) * -14 : Math.sin(s * 2) * 3;
  $("cuerpo").setAttribute("transform", `translate(0 ${rebote})`);
  $("brazo-der").setAttribute("transform", `translate(262 240) rotate(${anim.brazo})`);
  $("brazo-izq").setAttribute("transform", `translate(118 240) rotate(${anim.brazoIzq})`);
  $("cabeza").setAttribute("transform", `rotate(${anim.cabeza} 190 215)`);
  document.querySelectorAll("#ojos .pupila").forEach(p => p.setAttribute("transform", `translate(${anim.mira.x} ${anim.mira.y})`));

  // Parpadeo cada ~4 s (los ojos se aplastan un instante)
  const fase = s % 4;
  const ry = fase < 0.12 ? 3 : h === "nada-gusta" ? 10 : 18;
  document.querySelectorAll("#ojos .ojo").forEach(o => o.setAttribute("ry", ry));

  // Línea punteada del dedo a la lata
  ctxLaser.clearRect(0, 0, 1600, 900);
  if (anim.objetivo) {
    const a = (anim.brazo * Math.PI) / 180;
    const dedo = { x: HOMBRO.x + LARGO_BRAZO * Math.cos(a), y: HOMBRO.y + rebote + LARGO_BRAZO * Math.sin(a) };
    ctxLaser.setLineDash([4, 14]);
    ctxLaser.lineDashOffset = -s * 60;
    ctxLaser.lineCap = "round";
    ctxLaser.lineWidth = 7;
    ctxLaser.strokeStyle = LEDS[h];
    ctxLaser.shadowColor = LEDS[h];
    ctxLaser.shadowBlur = 12;
    ctxLaser.beginPath();
    ctxLaser.moveTo(dedo.x, dedo.y);
    ctxLaser.lineTo(anim.objetivo.x, anim.objetivo.y);
    ctxLaser.stroke();
    ctxLaser.setLineDash([]);
    ctxLaser.beginPath();
    ctxLaser.arc(anim.objetivo.x, anim.objetivo.y, 12 + 3 * Math.sin(s * 8), 0, Math.PI * 2);
    ctxLaser.stroke();
  }

  dibujarCajas();
  requestAnimationFrame(animar);
}

// ------------------------------- TECLAS ------------------------------------------------
addEventListener("keydown", e => {
  if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT" && e.target.type !== "checkbox") return;
  const k = e.key.toLowerCase();
  if (k === "p") mostrarPanel($("panel").classList.contains("oculto"));
  if (k === "f") document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  if (k === "v") $("chk-voz").click();
  if (k === "m") $("chk-espejo").click();
});

// ------------------------------- ARRANQUE ---------------------------------------------
// ------------------------------- ENTRADA AL BAR ---------------------------------------
// La página abre en la fachada. El botón "Entrar" abre las puertas vaqueras, se acerca hasta Naíto
// y ahí sí arranca la cámara y el modelo (el servidor ya lo arrancó iniciar.bat).
(function estrellas() {
  const g = $("estrellas");
  for (let i = 0; i < 70; i++) {
    const x = (i * 233) % 1600, y = (i * 97) % 260, r = 1 + (i % 3) * 0.7;
    g.insertAdjacentHTML("beforeend", `<circle cx="${x}" cy="${y}" r="${r}" opacity="${0.4 + (i % 5) / 8}"/>`);
  }
  // Banderines de estrellas colgando bajo el techo del porche (siguen la curva de la cuerda)
  const b = $("banderines"), colores = ["#f2b134", "#e2553d", "#f7f1e3"];
  const tramos = [[171, 616], [616, 984], [984, 1429]];
  let n = 0;
  for (const [a, z] of tramos) {
    for (let x = a + 22; x < z - 10; x += 44) {
      const t = (x - a) / (z - a), y = 432 + 38 * Math.sin(Math.PI * t) * 0.5 + 6;
      const pts = [...Array(10)].map((_, i) => {
        const r = i % 2 ? 4.5 : 11, ang = -Math.PI / 2 + (i * Math.PI) / 5;
        return `${(x + r * Math.cos(ang)).toFixed(1)},${(y + 11 + r * Math.sin(ang)).toFixed(1)}`;
      }).join(" ");
      b.insertAdjacentHTML("beforeend",
        `<polygon points="${pts}" fill="${colores[n++ % 3]}" stroke="#3a2010" stroke-width="2" style="animation-delay:${-(n % 7) * 0.3}s"/>`);
    }
  }
  // Botellas en las repisas de las barras abiertas
  const bot = $("botellas-fachada"), tonos = ["#2f7d32", "#8b2d1f", "#c9a227", "#3a5ba0", "#6b3d1e"];
  for (const x0 of [200, 1020]) {
    for (const y of [560, 660]) {
      bot.insertAdjacentHTML("beforeend", `<rect x="${x0 - 4}" y="${y}" width="388" height="10" fill="#5a3519"/>`);
      for (let i = 0; i < 12; i++) {
        const x = x0 + 8 + i * 31, h = 52 + ((i * 37 + y) % 26), t = tonos[(i + y) % 5];
        bot.insertAdjacentHTML("beforeend",
          `<path d="M${x} ${y} v-${h - 24} q0 -8 7 -13 v-11 h7 v11 q7 5 7 13 v${h - 24} z" fill="${t}" stroke="#1d120b" stroke-width="2.5"/>`);
      }
    }
  }
})();

async function revisarServidor() {
  const el = $("estado-servidor");
  try {
    const d = await api("/api/modelos");
    el.classList.remove("error");
    el.textContent = d.actual
      ? `✓ Servidor listo · ${d.actual.replace(".pt", "")} · ${d.dispositivo}`
      : `✓ Servidor listo · cargando el modelo...`;
    if (!d.actual && enLaEntrada) setTimeout(revisarServidor, 1000);
  } catch (e) {
    el.classList.add("error");
    el.textContent = "⚠ No encuentro el servidor: abre iniciar.bat y recarga la página";
    if (enLaEntrada) setTimeout(revisarServidor, 2000);
  }
}

function campanita() {                         // "¡ding!" de la puerta del bar, hecho con Web Audio
  try {
    const ac = new AudioContext();
    [1318, 1976].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.18 / (i + 1), ac.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.12 + 1.2);
      o.connect(g).connect(ac.destination);
      o.start(ac.currentTime + i * 0.12);
      o.stop(ac.currentTime + i * 0.12 + 1.3);
    });
  } catch (e) {}
}

function entrar() {
  const entrada = $("entrada"), esc = $("escenario");
  if (!enLaEntrada || entrada.classList.contains("abrir")) return;   // por si llega clic + Enter a la vez
  mostrarPanel(false);                                  // que se vea limpio; el panel sigue en ⚙ o tecla P
  campanita();
  entrada.classList.add("abrir");                       // 1. se abren las puertas
  setTimeout(() => {                                    // 2. nos acercamos a Naíto
    entrada.classList.add("acercar");
    esc.classList.add("viajando");
    enLaEntrada = false;
    escalar();
  }, 650);
  setTimeout(() => {                                    // 3. ya estamos adentro: arranca todo
    entrada.classList.add("fuera");
    document.body.classList.remove("en-entrada");
    esc.classList.remove("viajando");
    hablar("¡Bienvenidos al Bar Naíto! Muéstrenme unas cervezas...");
    abrirCamara();
    iniciarModelos();
  }, 2350);
}
$("btn-entrar").onclick = entrar;
addEventListener("keydown", e => { if (enLaEntrada && e.key === "Enter") entrar(); });

// ------------------------------- ARRANQUE ---------------------------------------------
escalar();
pintarGustos();
requestAnimationFrame(animar);
revisarServidor();
bucleDeteccion();
