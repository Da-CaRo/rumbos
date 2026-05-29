import { TIPOS_CARTA, MODOS_JUEGO, CONFIG_FILAS_HEX } from './config.js';
// =========================================================
// Funciones de Visibilidad y Estado del Tablero
// =========================================================

/**
 * Muestra los botones de inicio y oculta los controles del juego.
 */
export function mostrarBotonesInicio() {
    document.getElementById('start-buttons').classList.remove('hidden');
    document.getElementById('show-key-btn').classList.add('hidden');
    document.getElementById('reset-game-btn').classList.add('hidden');
    document.getElementById('share-key-btn').classList.add('hidden');
    document.getElementById('game-board').innerHTML = '';
    document.getElementById('current-turn').innerHTML = 'Esperando inicio...';
}

/**
 * Oculta los botones de inicio y muestra los controles del juego.
 */
export function ocultarBotonesInicio() {
    document.getElementById('start-buttons').classList.add('hidden');
    document.getElementById('show-key-btn').classList.remove('hidden');
    document.getElementById('reset-game-btn').classList.remove('hidden');
    document.getElementById('share-key-btn').classList.remove('hidden');
}

// =========================================================
// Funciones de Renderizado y Marcador
// =========================================================
/**
 * Genera una cadena de texto con emojis que representan el progreso de recolección.
 * @param {number} total - Cantidad total de este tipo de cartas en la partida.
 * @param {number} ocultos - Cantidad de cartas que siguen ocultas actualmente.
 * @param {string} emojiConseguido - El emoji cuando ya ha sido revelado/obtenido.
 * @param {string} emojiPendiente - El emoji que marca el hueco vacío.
 */
function generarFilaProgreso(total, ocultos, emojiConseguido, emojiPendiente) {
    const conseguidos = total - ocultos;
    // Repetimos el emoji conseguido tantas veces como hayamos descubierto, 
    // y rellenamos el resto con el emoji pendiente.
    return emojiConseguido.repeat(conseguidos) + emojiPendiente.repeat(ocultos);
}

/**
 * Controla la visibilidad de los paneles del marcador y actualiza sus iconos de progreso.
 * @param {Object} datos - Objeto con los contadores de cartas y totales.
 * @param {string} modo - MODOS_JUEGO.COOPERATIVO o MODOS_JUEGO.EQUIPOS
 */
export function actualizarMarcadorRumbos(datos, modo) {
    // 1. Mostrar el contenedor general de estadísticas
    document.getElementById('game-stats').classList.remove('hidden');

    const panelCoop = document.getElementById('marcador-cooperativo');
    const panelEquipos = document.getElementById('marcador-equipos');

    if (modo === MODOS_JUEGO.COOPERATIVO) {
        panelEquipos.classList.add('hidden');
        panelCoop.classList.remove('hidden');

        // --- CÁLCULO DE LA CANTIMPLORA DAÑADA ---
        const ranurasLlenas = datos.agua;
        const ranurasVacias = datos.capacidadMaxima - datos.agua;
        const ranurasBloqueadas = 7 - datos.capacidadMaxima;

        // 1. AGUA DISPONIBLE (Suministros actuales de exploración sobre un máximo de 7)
        document.getElementById('coop-agua').textContent =
            "💧".repeat(ranurasLlenas) +
            "🏜️".repeat(ranurasVacias) +
            "🚫".repeat(ranurasBloqueadas);

        // 2. CASILLAS DE AGUA ENCONTRADAS (Ranuras según la configuración, ej: básico tiene 3)
        // Usamos la función auxiliar generarFilaProgreso(total, ocultas, iconoConseguido, iconoFalta)
        document.getElementById('coop-agua-encontrada').innerHTML = generarFilaProgreso(
            datos.aguaEncontradaTotal,
            datos.aguaEncontradaOcultas,
            "🪣", // Encontrado (Un pozo/cubo de agua asegurado)
            "⭕"  // Oculto (Ranura vacía en el mapa)
        );

        // TESOROS COOPERATIVOS (Total: 3)
        document.getElementById('coop-tesoros').innerHTML = generarFilaProgreso(3, datos.tesoros, "🪙", "⭕");

        // TRAMPAS (Total: 4)
        document.getElementById('coop-trampas').innerHTML = generarFilaProgreso(4, datos.trampas, "🪤", "⭕");

        // --- NUEVA LÓGICA UNIFICADA DE MALDICIONES Y AMULETOS (MODO INDIVIDUAL) ---
        const mOriginal = datos.maldicionesPisadas || 0;
        let mActivas = mOriginal;
        let aActivos = datos.amuletosEncontrados || 0;

        // Regla de absorción: el amuleto encontrado salva de la maldición pisada
        const anulaciones = Math.min(mActivas, aActivos);

        mActivas -= anulaciones;
        aActivos -= anulaciones;

        // El mapa cooperativo suele configurarse con 4 maldiciones y 1 amuleto en total (ajústalo según tu config)
        const MALDICIONES_TOTALES = 4;
        const AMULETOS_TOTALES = 1;

        const maldicionesRestantes = Math.max(0, MALDICIONES_TOTALES - mOriginal);
        const amuletosEnNiebla = Math.max(0, AMULETOS_TOTALES - (datos.amuletosEncontrados || 0));


        // Construcción de la hilera del Explorador
        // [Maldiciones] Anuladas (🚫) + Activas/Sufriendo (💀) + Escondidas (⭕) 
        // + [Amuletos] Activos (🧿) + Consumidos (🚫) + Ocultos en Niebla (⚪)
        const filaMaldicionesAmuletosCoop =
            "🚫".repeat(anulaciones) +
            "💀".repeat(mActivas) +
            "⭕".repeat(maldicionesRestantes) +
            "🧿".repeat(aActivos) +
            "🚫".repeat(anulaciones) +
            "⚪".repeat(amuletosEnNiebla);

        const contenedorMaldicionCoop = document.getElementById('coop-maldiciones');
        if (contenedorMaldicionCoop) {
            contenedorMaldicionCoop.innerHTML = filaMaldicionesAmuletosCoop;

        }

    } else {
        panelCoop.classList.add('hidden');
        panelEquipos.classList.remove('hidden');

        // --- NUEVA LÓGICA DE TESOROS COMPARTIDOS/COMUNES EN LA MISMA LÍNEA ---

        // Obtenemos cuántos tesoros de cada color quedan ocultos
        const ocultosAzul = datos.tesorosAzul;
        const ocultosRojo = datos.tesorosRojo;

        // Calculamos cuántos de los 2 tesoros comunes han sido descubiertos por cada bando.
        // (Si no tienes estas variables mapeadas en tu estado actual, puedes usar 'datos.tesorosComunesAzul' o similar)
        const comunesAzul = datos.tesorosComunesAzul || 0;
        const comunesRojo = datos.tesorosComunesRojo || 0;

        // Los tesoros comunes totales son 2. Los que nadie ha encontrado todavía se consideran "libres" u ocultos.
        const comunesRestantes = Math.max(0, 2 - comunesAzul - comunesRojo);

        // --- RENDERIZADO EQUIPO AZUL ---
        // 4 Propios (🔵 / ⚪) + Comunes propios (🪙) + Comunes perdidos (🚫) + Comunes en juego (⭕)
        const filaAzul = "🔵".repeat(4 - ocultosAzul) + "⚪".repeat(ocultosAzul) +
            "🪙".repeat(comunesAzul) + "🚫".repeat(comunesRojo) + "⭕".repeat(comunesRestantes);
        document.getElementById('team-azul-score').innerHTML = filaAzul;

        // --- RENDERIZADO EQUIPO ROJO ---
        // 4 Propios (🔴 / ⚪) + Comunes propios (🪙) + Comunes perdidos (🚫) + Comunes en juego (⭕)
        const filaRojo = "🔴".repeat(4 - ocultosRojo) + "⚪".repeat(ocultosRojo) +
            "🪙".repeat(comunesRojo) + "🚫".repeat(comunesAzul) + "⭕".repeat(comunesRestantes);
        document.getElementById('team-rojo-score').innerHTML = filaRojo;

        // Ocultamos el contenedor antiguo del tesoro común independiente de la UI anterior
        const panelComunAnterior = document.getElementById('team-comun-score');
        if (panelComunAnterior) panelComunAnterior.parentElement.classList.add('hidden');

        // --- CÁLCULO DINÁMICO DE MALDICIONES Y AMULETOS (REGLA DE ABSORCIÓN) ---
        // --- CÁLCULO DINÁMICO DE MALDICIONES Y AMULETOS (REGLA DE ABSORCIÓN CORREGIDA) ---
        const mAzulOriginal = datos.maldicionesAzul || 0;
        const mRojoOriginal = datos.maldicionesRojo || 0;

        let mAzul = mAzulOriginal;
        let mRojo = mRojoOriginal;
        let aAzul = datos.amuletosAzul || 0;
        let aRojo = datos.amuletosRojo || 0;

        // --- LÓGICA DE ABSORCIÓN CON AMULETO ---
        // Si un equipo tiene un amuleto disponible (🧿) y cae en una maldición (💀),
        // el amuleto se "consume" para anularla. Guardamos cuántas anulaciones ocurren:
        const anulacionesAzul = Math.min(mAzul, aAzul);
        const anulacionesRojo = Math.min(mRojo, aRojo);

        // Restamos las anulaciones de los contadores visuales para que no se muestren como activos (calaveras)
        mAzul -= anulacionesAzul;
        aAzul -= anulacionesAzul;

        mRojo -= anulacionesRojo;
        aRojo -= anulacionesRojo;

        // Las 6 maldiciones totales se reducen por cualquier maldición que haya salido (activa o anulada)
        const totalMaldicionesPisadas = mAzulOriginal + mRojoOriginal;
        const maldicionesRestantes = Math.max(0, 6 - totalMaldicionesPisadas);

        // Los 2 amuletos totales se reducen por cualquier amuleto asignado (activo o anulado)
        const totalAmuletosAsignados = (datos.amuletosAzul || 0) + (datos.amuletosRojo || 0);
        const amuletosRestantes = Math.max(0, 2 - totalAmuletosAsignados);

        // --- CONSTRUCCIÓN DE FILAS SEGÚN EL REGLAMENTO ---
        const ventajaRojo = Math.max(0, datos.amuletosRojo - datos.amuletosAzul);
        const ventajaAzul = Math.max(0, datos.amuletosAzul - datos.amuletosRojo);

        const huecoAmuletoAzul = "🔘".repeat(ventajaRojo);
        const huecoAmuletoRojo = "🔘".repeat(ventajaAzul);

        // Fila Azul: 
        // [Maldiciones] Anuladas (🚫) + Sufridas (💀) + Salvado por rival (🔘) + Ocultas (⭕) 
        // + [Amuletos] Propio Activo (🧿) + Propio Consumido (🚫) + Hueco de amuleto del rival (⭕ si el Rojo tiene y el Azul no) + En Niebla (⚪)
        //const huecoAmuletoAzul = (datos.amuletosRojo > datos.amuletosAzul) ? "⭕" : "";
        const filaMaldicionesAmuletosAzul =
            "🚫".repeat(anulacionesAzul) +
            "💀".repeat(mAzul) +
            "🔘".repeat(mRojoOriginal) +
            "⭕".repeat(maldicionesRestantes) +
            "|" +
            "🧿".repeat(aAzul) +
            "🚫".repeat(anulacionesAzul) +
            huecoAmuletoAzul +
            "⚪".repeat(amuletosRestantes);

        // Fila Rojo:
        // [Maldiciones] Anuladas (🚫) + Sufridas (💀) + Salvado por rival (🔘) + Ocultas (⭕) 
        // + [Amuletos] Propio Activo (🧿) + Propio Consumido (🚫) + Hueco de amuleto del rival (⭕ si el Azul tiene y el Rojo no) + En Niebla (⚪)
        //const huecoAmuletoRojo = (datos.amuletosAzul > datos.amuletosRojo) ? "⭕" : "";
        const filaMaldicionesAmuletosRojo =
            "🚫".repeat(anulacionesRojo) +
            "💀".repeat(mRojo) +
            "🔘".repeat(mAzulOriginal) +
            "⭕".repeat(maldicionesRestantes) +
            "|" +
            "🧿".repeat(aRojo) +
            "🚫".repeat(anulacionesRojo) +
            huecoAmuletoRojo +
            "⚪".repeat(amuletosRestantes);

        // --- INYECCIÓN EN LAS ETIQUETAS ORIGINALES DEL HTML ---
        document.getElementById('team-azul-curse').innerHTML = filaMaldicionesAmuletosAzul;
        document.getElementById('team-rojo-curse').innerHTML = filaMaldicionesAmuletosRojo;




    }
}



/** Actualiza el indicador del turno actual en la interfaz.
 * @param {string} turnoActual - El equipo cuyo turno es actualmente ('red' o 'blue').
 * @param {string} modo - El modo de juego ('cooperativo' o 'competitivo').
 * @param {number} agua - La cantidad de agua restante.
 * @param {boolean} juegoTerminado - Indica si el juego ha terminado.
 * @param {string} mensajeFin - Mensaje a mostrar si el juego ha terminado.
 */
export function actualizarIndicadorTurnoRumbos(turnoActual, modo, agua, juegoTerminado, mensajeFin) {
    const indicator = document.getElementById('current-turn');
    if (juegoTerminado) {
        indicator.innerHTML = mensajeFin;
        return;
    }

    if (modo === MODOS_JUEGO.COOPERATIVO) {
        indicator.innerHTML = `🎒 Expedición Coop | 💧 Agua: <span class="text-blue-400 font-bold">${agua}</span>`;
    } else {
        const color = turnoActual === 'blue' ? 'blue-400' : 'red-400';
        const texto = turnoActual === 'blue' ? 'Azul 🔵' : 'Rojo 🔴';
        indicator.innerHTML = `Turno: <span class="text-${color} font-bold">${texto}</span>`;
    }
}

/** Renderiza el tablero de juego en la interfaz.
 * @param {Array} tableroLogico - El tablero lógico con las cartas y sus estados.
 * @param {Function} manejarClickTarjeta - Función para manejar el clic en una tarjeta.
 * @param {boolean} juegoTerminado - Indica si el juego ha terminado.
 */
export function renderizarTableroHex(tableroLogico, manejarClickTarjeta, juegoTerminado) {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    board.className = "hex-grid w-full overflow-auto py-6 mx-auto max-w-xl";

    let indexAcumulado = 0;

    CONFIG_FILAS_HEX.forEach((numCasillas) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = "hex-row";

        for (let c = 0; c < numCasillas; c++) {
            const index = indexAcumulado;
            const card = tableroLogico[index];
            indexAcumulado++;

            const hexWrapper = document.createElement('div');
            hexWrapper.className = "hexagon flex flex-col items-center justify-center text-center p-1 cursor-pointer relative text-[9px] font-bold uppercase select-none shadow-sm transition-all";
            hexWrapper.setAttribute('data-index', index);

            // --- CREACIÓN DE LOS 3 NIVELES DE INFORMACIÓN ---

            // 1. Primer nivel: El Emoji del estado de la carta
            const emojiSpan = document.createElement('span');
            emojiSpan.className = "text-xs mt-0.5 filter drop-shadow-sm block";

            // 2. Segundo nivel: La palabra central (con altura fija solicitada)
            const wordSpan = document.createElement('span');
            wordSpan.className = "text-[11px] h-5 min-h-[20px] mt-0.5 filter drop-shadow-sm block flex items-center justify-center";
            wordSpan.innerText = card.word || ""; // Si no hay palabra, se mantiene vacío pero ocupando espacio

            // 3. Tercer nivel: El número de celda o coordenadas
            const indexSpan = document.createElement('span');
            indexSpan.className = "block text-[8px] leading-tight break-words max-w-[60px] text-center font-bold px-0.5 mt-1";
            indexSpan.innerText = `#${index + 1}`;

            if (card.type === TIPOS_CARTA.INICIO || card.type === 'start') {
                indexSpan.innerText = "START";
            } else {
                indexSpan.innerText = `#${index + 1}`;
            }

            // --- LÓGICA DE ESTADOS Y COLORES ---
            if (card.revealed || juegoTerminado) {
                // Creamos un contenedor para el emoji para que no se pegue al texto
                switch (card.type) {
                    case TIPOS_CARTA.INICIO:
                        hexWrapper.classList.add('bg-[#7c7c67]', 'text-white');
                        emojiSpan.innerText = "🚩";
                        hexWrapper.appendChild(emojiSpan);
                        break;
                    case TIPOS_CARTA.TESORO_AZUL:
                        hexWrapper.classList.add('bg-blue-600', 'text-white');
                        emojiSpan.innerText = "🔵";
                        hexWrapper.appendChild(emojiSpan);
                        break;
                    case TIPOS_CARTA.TESORO_ROJO:
                        hexWrapper.classList.add('bg-red-600', 'text-white');
                        emojiSpan.innerText = "🔴";
                        hexWrapper.appendChild(emojiSpan);
                        break;
                    case TIPOS_CARTA.TESORO: // Tesoro Cooperativo / Común
                        hexWrapper.classList.add('bg-yellow-400', 'text-white');
                        emojiSpan.innerText = "🪙";
                        hexWrapper.appendChild(emojiSpan);
                        break;
                    case TIPOS_CARTA.AMULETO: // Amuleto de protección
                        hexWrapper.classList.add('bg-emerald-700', 'text-white');
                        emojiSpan.innerText = "🧿";
                        hexWrapper.appendChild(emojiSpan);
                        break;
                    case TIPOS_CARTA.SALIDA: // Punto de Escape
                        hexWrapper.classList.add('bg-stone-400', 'text-white');
                        emojiSpan.innerText = "🏁";
                        hexWrapper.appendChild(emojiSpan);
                        break;
                    case TIPOS_CARTA.AGUA: // Oasis de suministros
                        hexWrapper.classList.add('bg-cyan-700', 'text-white');
                        emojiSpan.innerText = "💧";
                        hexWrapper.appendChild(emojiSpan);
                        break;
                    case TIPOS_CARTA.TRAMPA: // Trampa de pinchos
                        hexWrapper.classList.add('bg-fuchsia-700', 'text-white');
                        emojiSpan.innerText = "🪤";
                        hexWrapper.appendChild(emojiSpan);
                        break;
                    case TIPOS_CARTA.MALDICION: // Maldición Antigua
                        hexWrapper.classList.add('bg-red-700', 'text-white');
                        emojiSpan.innerText = "💀";
                        hexWrapper.appendChild(emojiSpan);
                        break;
                    default: // Neutros descubiertos en ruta
                        emojiSpan.innerHTML = "&nbsp;";
                        hexWrapper.appendChild(emojiSpan);
                        hexWrapper.classList.add('bg-[#abab9c]', 'text-white');
                        break;
                }
                indexSpan.className += " opacity-60";

            } else {
                // Casillas ocultas (Niebla)
                hexWrapper.classList.add('bg-lime-700', 'text-gray-400', 'hover:bg-gray-700');

                // Mantenemos el emoji invisible/vacío pero presente en el DOM para preservar el espacio
                emojiSpan.innerHTML = "&nbsp;";
                indexSpan.className += " block text-[6px] leading-tight break-words max-w-[60px] text-center font-bold px-0.5 mt-1";

                if (!juegoTerminado) {
                    hexWrapper.addEventListener('click', manejarClickTarjeta);
                }
            }

            // --- INYECCIÓN ORDENADA EN EL CONTENEDOR ---
            hexWrapper.appendChild(emojiSpan); // Nivel 1 (Arriba)
            hexWrapper.appendChild(wordSpan);  // Nivel 2 (Centro)
            hexWrapper.appendChild(indexSpan); // Nivel 3 (Abajo)

            rowDiv.appendChild(hexWrapper);

        }
        board.appendChild(rowDiv);
    });
}

// =========================================================
// Funciones de Clave Secreta
// =========================================================

/**
 * Muestra la clave secreta en la consola para el líder de espías.
 * @param {Array} tableroLogico - El tablero lógico con las cartas y sus tipos.
 */
export function mostrarClaveEnConsola(tableroLogico) {
    if (!tableroLogico || tableroLogico.length !== 25) return;

    console.log("--- CLAVE SECRETA (PARA EL LÍDER DE ESPÍAS) ---");
    console.log("-----------------------------------------------");

    let claveConsola = "";
    for (let i = 0; i < 25; i++) {
        claveConsola += TIPOS_CARTA.MAPEO_EMOJI[tableroLogico[i].type];
        if ((i + 1) % 5 === 0) {
            claveConsola += "\n";
        }
    }

    console.log(claveConsola);
    console.log("-----------------------------------------------\n");
}

/**
 * Muestra la clave secreta en una alerta para el líder de espías.
 * @param {Array} tableroLogico - El tablero lógico con las cartas y sus tipos.
 */
export function mostrarClaveEnAlerta(tableroLogico) {
    const modal = document.getElementById('qr-modal'); // Reutilizamos el contenedor modal de la clave
    const instructions = document.getElementById('qr-instructions');
    const codeArea = document.getElementById('clave-code');
    const canvas = document.getElementById('qr-canvas');

    if (!modal || !codeArea) return;

    // Configurar textos de la cabecera
    instructions.innerText = "🗺️ Mapa Secreto del Guía";
    instructions.className = "text-2xl font-bold text-yellow-400 mb-4 text-center";

    // Ocultamos el canvas del código QR si existía, ya que ahora pintaremos el mapa visual
    if (canvas) canvas.classList.add('hidden');

    // Limpiamos el contenedor para construir la rejilla de hexágonos
    codeArea.innerHTML = '';
    codeArea.className = "flex flex-col items-center gap-1 p-4 bg-gray-900 border border-gray-700 rounded-lg overflow-auto mx-auto w-full max-w-sm";

    let indexAcumulado = 0;

    // Patrón original de Landmarks de 37 celdas
    CONFIG_FILAS_HEX.forEach((numCasillas) => {
        const rowDiv = document.createElement('div');
        // Usamos flexbox y un margin-bottom negativo para encajar los hexágonos verticalmente
        rowDiv.className = "flex justify-center gap-1.5 -mb-2.5 last:mb-0";

        for (let c = 0; c < numCasillas; c++) {
            const index = indexAcumulado;
            const card = tableroLogico[index];
            indexAcumulado++;

            const miniHex = document.createElement('div');
            // Estructura del minihéxagono usando clip-path
            miniHex.className = "w-8 h-9 flex items-center justify-center text-sm font-bold relative transition-transform hover:scale-110";
            miniHex.style.clipPath = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

            // Si por algún motivo la celda no existe o está corrupta, asegurar un respaldo neutro
            const tipo = card ? card.type : TIPOS_CARTA.NEUTRAL;
            const emoji = TIPOS_CARTA.MAPEO_EMOJI[tipo] || '🧭';

            // Asignar colores de fondo idénticos al mapa para que el capitán se oriente de un vistazo

            switch (tipo) {
                case TIPOS_CARTA.INICIO:
                    miniHex.classList.add('bg-indigo-600', 'text-white', 'border-2', 'border-indigo-400');
                    break;
                case TIPOS_CARTA.TESORO_AZUL:
                    miniHex.classList.add('bg-blue-800', 'text-white');
                    break;
                case TIPOS_CARTA.TESORO_ROJO:
                    miniHex.classList.add('bg-red-800', 'text-white');
                    break;
                case TIPOS_CARTA.TRAMPA:
                    miniHex.classList.add('bg-amber-700', 'text-amber-200');
                    break;
                case TIPOS_CARTA.AGUA:
                    miniHex.classList.add('bg-cyan-600', 'text-white');
                    break;
                case TIPOS_CARTA.MALDICION:
                    miniHex.classList.add('bg-black', 'text-red-500');
                    break;
                default:
                    miniHex.classList.add('bg-gray-700', 'text-gray-400');
                    break;
            }


            // Insertar el emoji (o número de coordenada pequeño de apoyo si se prefiere)
            miniHex.innerText = emoji;
            miniHex.title = `Celda #${index}`;

            rowDiv.appendChild(miniHex);
        }
        codeArea.appendChild(rowDiv);
    });

    // Mostrar la ventana modal quitando la clase hidden
    modal.classList.remove('hidden');

}

/**
 * Genera un código QR para la URL proporcionada y lo muestra en un modal.
 * @param {string} url - La URL de la clave secreta a codificar.
 */
export function mostrarQR(url) {
    const qrCanvas = document.getElementById('qr-canvas');
    const qrModal = document.getElementById('qr-modal');

    // 1. Generar el código QR
    new QRious({
        element: qrCanvas,
        value: url,
        size: 250 // Tamaño del QR
    });

    // 2. Mostrar el modal
    document.getElementById('clave-code').classList.add('hidden'); // OCULTA el texto de la clave
    document.getElementById('qr-canvas').classList.remove('hidden'); // MUESTRA el canvas del QR
    document.getElementById('qr-instructions').classList.remove('hidden');

    qrModal.classList.remove('hidden');
}

/** Actualiza la interfaz para el modo líder.
 * @param {Array} tableroLogico - El tablero lógico con las cartas y sus tipos.
 */
export function actualizarUIModoLider(tableroLogico) {
    // 1. Ocultar botones no relevantes
    document.getElementById('reset-game-btn').classList.add('hidden');
    document.getElementById('show-key-btn').classList.add('hidden');
    document.getElementById('share-key-btn').classList.add('hidden');

    // 2. Actualizar el indicador de turno
    document.getElementById('current-turn').innerHTML = '🚨 <span class="text-purple-400 font-bold">MODO LÍDER</span> 🚨';

    // 3. Calcular y actualziar los conteos iniciales contando las cartas del tablero
    /*
    const initialCounts = tableroLogico.reduce((counts, card) => {
        if (card.type === TIPOS_CARTA.AZUL) counts.blue++;
        else if (card.type === TIPOS_CARTA.ROJO) counts.red++;
        else if (card.type === TIPOS_CARTA.VERDE) counts.green++;
        return counts;
    }, { blue: 0, red: 0, green: 0 });

    document.querySelector('#blue-score span').textContent = initialCounts.blue;
    document.querySelector('#red-score span').textContent = initialCounts.red;
    //document.querySelector('#green-score span').textContent = initialCounts.green;
    */
    /*const is3TeamGame = tableroLogico.some(card => card.type === TIPOS_CARTA.VERDE);
    if (is3TeamGame) {
        document.getElementById('green-score').classList.remove('hidden');
    } else {
        document.getElementById('green-score').classList.add('hidden');
    }*/

    // 4. Renderizar el tablero
    renderizarTableroHex(tableroLogico, null, true); // Pasar 'null' para el click handler

    // 5. Mostrar la clave en consola
    mostrarClaveEnConsola(tableroLogico);
}

/** 
 * Oculta el contenedor de estadísticas del juego. 
 */
export function ocultarEstadisticas() {
    document.getElementById('game-stats').classList.add('hidden');
}

/** 
 * Oculta el layout del juego. 
 */
export function ocultarTablero() {
    document.getElementById('game-layout').classList.add('hidden');
    document.getElementById('start-buttons').classList.remove('hidden');
    document.querySelector('footer').classList.remove('hidden')
}

/** 
 * Muestra el layout del juego. 
 */
export function mostrarTablero() {
    document.getElementById('game-layout').classList.remove('hidden');
    document.getElementById('start-buttons').classList.add('hidden');
    document.querySelector('footer').classList.add('hidden')
}

/** 
 * Muestra el contenedor de estadísticas del juego. 
 */
export function mostrarEstadisticas() {
    document.getElementById('game-stats').classList.remove('hidden');
}
