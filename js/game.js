import { PALABRAS_SECRETAS } from '../data/palabras.js';
import { TIPOS_CARTA, GAME_STATE_STORAGE_KEY, MODOS_JUEGO, ADYACENCIAS_TABLERO, DISTRIBUCION_NIVELES } from './config.js';
import * as Storage from './storage.js';
import * as UI from './ui.js';

// --- ESTADO INTERNO DEL JUEGO ---
let tableroLogico = [];
let juegoTerminado = false;
let modoActual = MODOS_JUEGO.EQUIPOS;
let turnoActual = 'blue';

// Variables de estado de Landmarks
let suministrosAgua = 7;
let capacidadMaximaAgua = 7;
let maldicionesLlevadas = 0;   // 💀 Contador de maldiciones activadas/recogidas
let tieneAmuleto = false;       // 🧿 Booleano que indica si la expedición tiene protección
let amuletoEncontrado = false;  // ✨ Nueva variable para el estado del marcador
let tesorosRestantesAzul = 0;
let tesorosRestantesRojo = 0;
let tesorosComunesAzul = 0;
let tesorosComunesRojo = 0;

let amuletosAzul = 0;
let amuletosRojo = 0;
let maldicionesAzul = 0;
let maldicionesRojo = 0;
let equipoQueEmpieza = 'blue'; // Guardará quién arranca para saber quién recibe el regalo

const PALABRAS_MAPA = new Map(PALABRAS_SECRETAS.map(p => [p.id, p.palabra]));

// =========================================================
// Funciones Internas de Utilidad
// =========================================================

/**
 * Función para mezclar un array (Fisher-Yates).
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Recalcula contadores y verifica el fin del juego.
 * @param {Array} tablero - El tablero lógico.
 */
function recalcularEstado() {
    let mensajeFin = "";

    // =========================================================
    // 1. EVALUACIÓN DE FIN DE JUEGO: MODO EQUIPOS
    // =========================================================
    if (modoActual === MODOS_JUEGO.EQUIPOS) {
        // Obtener conteo de cartas ocultas en el tablero
        const ocultosAzul = tableroLogico.filter(c => c.type === TIPOS_CARTA.TESORO_AZUL && !c.revealed).length;
        const ocultosRojo = tableroLogico.filter(c => c.type === TIPOS_CARTA.TESORO_ROJO && !c.revealed).length;
        const amuletoOcultoEnMapa = tableroLogico.filter(c => c.type === TIPOS_CARTA.AMULETO && !c.revealed).length;

        // Calcular tesoros Totales Conseguidos por cada bando (4 iniciales - ocultos + comunes capturados)
        const tesorosGanadosAzul = (4 - ocultosAzul) + tesorosComunesAzul;
        const tesorosGanadosRojo = (4 - ocultosRojo) + tesorosComunesRojo;

        // Calcular Maldiciones Activas REALES
        const maldicionesActivasAzul = Math.max(0, maldicionesAzul - amuletosAzul);
        const maldicionesActivasRojo = Math.max(0, maldicionesRojo - amuletosRojo);

        // =========================================================
        // EVALUACIÓN DE CONDICIONES (Prioridad: Derrota Absoluta > Victoria)
        // =========================================================

        // --- REGLA 1: Derrota automática por maldición letal indomable ---
        if (maldicionesActivasAzul > 0 && amuletoOcultoEnMapa < maldicionesActivasAzul) {
            juegoTerminado = true;
            mensajeFin = "🏆 ¡El Equipo Rojo gana! \n\nEl Equipo Azul ha sucumbido a una maldición que ya no puede ser mitigada por ningún amuleto.";
        }
        else if (maldicionesActivasRojo > 0 && amuletoOcultoEnMapa < maldicionesActivasRojo) {
            juegoTerminado = true;
            mensajeFin = "🏆 ¡El Equipo Azul gana! \n\nEl Equipo Rojo ha sucumbido a una maldición que ya no puede ser mitigada por ningún amuleto.";
        }

        // --- REGLA 2: Alcanzar los 4 Tesoros ---
        if (!juegoTerminado) {
            if (tesorosGanadosAzul >= 4) {
                juegoTerminado = true;
                if (maldicionesActivasAzul > 0) {
                    mensajeFin = "🏆 ¡El Equipo Rojo gana! \n\nEl Equipo Azul consiguió 4 tesoros pero activó una maldición sin purificar.";
                } else {
                    mensajeFin = "🏆 ¡Victoria del Equipo Azul! \n\nHan recolectado 4 tesoros con éxito de forma segura.";
                }
            }
            else if (tesorosGanadosRojo >= 4) {
                juegoTerminado = true;
                if (maldicionesActivasRojo > 0) {
                    mensajeFin = "🏆 ¡El Equipo Azul gana! \n\nEl Equipo Rojo consiguió 4 tesoros pero activó una maldición sin purificar.";
                } else {
                    mensajeFin = "🏆 ¡Victoria del Equipo Rojo! \n\nHan recolectado 4 tesoros con éxito de forma segura.";
                }
            }
        }

    }

    // =========================================================
    // 2. EVALUACIÓN DE FIN DE JUEGO: MODO COOPERATIVO
    // =========================================================

    else if (modoActual === MODOS_JUEGO.COOPERATIVO) {
        const tesorosCooperativosRestantes = tableroLogico.filter(c => c.type === TIPOS_CARTA.TESORO && !c.revealed).length;

        const totalTesorosEnMapa = tableroLogico.filter(c => c.type === TIPOS_CARTA.TESORO).length;
        const tesorosOcultos = tableroLogico.filter(c => c.type === TIPOS_CARTA.TESORO && !c.revealed).length;
        const tesorosConseguidos = totalTesorosEnMapa - tesorosOcultos;
        const salidaRevelada = tableroLogico.some(c => c.type === TIPOS_CARTA.SALIDA && c.revealed);

        // CONDICIÓN A: Acumulación de Maldiciones Letales
        if (maldicionesLlevadas >= 2) {
            juegoTerminado = true;
            mensajeFin = "💀 Derrota: La expedición ha acumulado demasiadas maldiciones antiguas.";
        }

        // CONDICIÓN B: Se ha activado y pisado la casilla de SALIDA
        else if (salidaRevelada) {
            juegoTerminado = true;
            if (maldicionesLlevadas > 0 && !tieneAmuleto) {
                mensajeFin = "🏁 💀 Fracaso: Intentaste escapar por la salida portando una maldición sin el Amuleto.";
            } else if (tesorosConseguidos === 0) {
                mensajeFin = "🏁 🫥 Derrota: Huisteis de la isla con las manos completamente vacías.";
            } else if (tesorosOcultos === 1) {
                mensajeFin = "🏁 💰 Supongo que esto cuenta como victoria..., Al menos coneguisteis 1 tesoro";
            } else if (tesorosOcultos === 2) {
                mensajeFin = "🏁 💰 ¡Resultado sólido! Escapasteis de la isla con 2 tesoros.";
            } else if (tesorosOcultos === 3) {
                mensajeFin = "🏁 💰 ¡Una gesta admirable! Escapasteis de la isla con 3 tesoros.";
            } else {
                mensajeFin = "🎉 ¡Victoria Absoluta! La expedición ha recuperado todos los tesoros de la isla.";
            }
        }

        // CONDICIÓN C: Muerte por deshidratación
        else if (suministrosAgua <= 0) {
            juegoTerminado = true;
            mensajeFin = "🏜️ Se han quedado sin agua en el desierto. Fin de la expedición.";
        }

    }

    // =========================================================
    // 3. CONSTRUCCIÓN DEL OBJETO DE DATOS PARA LA INTERFAZ
    // =========================================================
    let datosParaMarcador = {};

    if (modoActual === MODOS_JUEGO.COOPERATIVO) {
        const maldicionesOcultasTablero = tableroLogico.filter(c => c.type === TIPOS_CARTA.MALDICION && !c.revealed).length;

        datosParaMarcador = {
            agua: suministrosAgua,
            capacidadMaxima: capacidadMaximaAgua,
            aguaEncontradaTotal: tableroLogico.filter(c => c.type === TIPOS_CARTA.AGUA).length,
            aguaEncontradaOcultas: tableroLogico.filter(c => c.type === TIPOS_CARTA.AGUA && !c.revealed).length,
            tesoros: tableroLogico.filter(c => c.type === TIPOS_CARTA.TESORO && !c.revealed).length,
            trampas: tableroLogico.filter(c => c.type === TIPOS_CARTA.TRAMPA && !c.revealed).length,
            maldicionesOcultas: maldicionesOcultasTablero,
            maldicionesPisadas: tableroLogico.filter(c => c.type === TIPOS_CARTA.MALDICION && c.revealed).length,
            amuletosEncontrados: tableroLogico.filter(c => c.type === TIPOS_CARTA.AMULETO && c.revealed).length,
            salidaOculta: tableroLogico.some(c => c.type === TIPOS_CARTA.SALIDA && !c.revealed),
        };

    } else {
        datosParaMarcador = {
            tesorosAzul: tableroLogico.filter(c => c.type === TIPOS_CARTA.TESORO_AZUL && !c.revealed).length,
            tesorosRojo: tableroLogico.filter(c => c.type === TIPOS_CARTA.TESORO_ROJO && !c.revealed).length,
            tesorosComunes: tableroLogico.filter(c => c.type === TIPOS_CARTA.TESORO && !c.revealed).length,
            tesorosComunesAzul: tesorosComunesAzul,
            tesorosComunesRojo: tesorosComunesRojo,
            maldicionesAzul: maldicionesAzul,
            maldicionesRojo: maldicionesRojo,
            amuletosAzul: amuletosAzul,
            amuletosRojo: amuletosRojo,
        };
    }

    UI.actualizarMarcadorRumbos(datosParaMarcador, modoActual);

    if (juegoTerminado) {
        UI.actualizarIndicadorTurnoRumbos(turnoActual, modoActual, suministrosAgua, juegoTerminado, mensajeFin);
    }

    Storage.guardarEstadoPartida(obtenerEstadoParaGuardar());
}

/**
 * Genera el objeto de estado listo para ser guardado/cifrado.
 */
function obtenerEstadoParaGuardar() {
    return {
        b: tableroLogico.map(card => ({
            t: TIPOS_CARTA.MAPEO_CODIGO[card.type],
            w: card.word,
        })),
        m: modoActual,
        t: turnoActual,
        w: suministrosAgua,
        c: capacidadMaximaAgua, // ✨ Guardamos la capacidad máxima actual
        e: juegoTerminado,
        aa: amuletosAzul,
        ar: amuletosRojo,
        ta: tesorosComunesAzul,
        tr: tesorosComunesRojo,
        tca: tesorosComunesAzul,
        tcr: tesorosComunesRojo,
        ma: maldicionesAzul,
        mr: maldicionesRojo
    };
}


// =========================================================
// Funciones de Control de Flujo (Exportadas)
// =========================================================

/**
 * Función que encapsula toda la lógica para empezar una partida nueva.
 */
export function startNewGame(modo, startingTeam = 'blue') {
    juegoTerminado = false;
    modoActual = modo;
    turnoActual = startingTeam;
    suministrosAgua = 7;
    capacidadMaximaAgua = 7;
    maldicionesLlevadas = 0;
    maldicionesAzul = 0;
    maldicionesRojo = 0;
    tesorosComunesAzul = 0;
    tesorosComunesRojo = 0;
    tieneAmuleto = false;
    amuletoEncontrado = false;

    if (modo === MODOS_JUEGO.EQUIPOS) {
        equipoQueEmpieza = startingTeam; // Guardamos quién arranca
        if (startingTeam === 'blue') {
            amuletosAzul = 0;
            amuletosRojo = 1;  // El Rojo empieza segundo, recibe el amuleto de regalo
        } else {
            amuletosAzul = 1;  // El Azul empieza segundo, recibe el amuleto de regalo
            amuletosRojo = 0;
        }
    } else {
        amuletosAzul = 0;
        amuletosRojo = 0;
    }


    // 1. Determinar el "Núcleo Inicial" de 3 casillas juntas
    const centroInicial = Math.floor(Math.random() * 37);
    const vecinasDeBase = shuffleArray(obtenerAdyacentesHex(centroInicial));
    const casillaVecina1 = vecinasDeBase[0];
    const casillaVecina2 = vecinasDeBase[1];
    const indicesIniciales = [centroInicial, casillaVecina1, casillaVecina2];

    // 2. Filtrar las TRES casillas iniciales para que queden protegidas
    let indicesDisponibles = [...Array(37).keys()].filter(i => !indicesIniciales.includes(i));
    indicesDisponibles = shuffleArray(indicesDisponibles);

    // 3. Mapear los tipos ocultos (Tesoros, Trampas...) en los huecos verdaderamente libres
    let tipos = Array(37).fill(TIPOS_CARTA.NEUTRAL);

    // De momento usamos el nivel 'basico'. En el futuro este string podría venir por parámetro
    const nivelActual = 'basico';
    const repartoConfig = DISTRIBUCION_NIVELES[nivelActual][modo];

    // Recorremos cada tipo de carta configurado para este modo y lo asignamos
    for (const [tipoCarta, cantidad] of Object.entries(repartoConfig)) {
        for (let i = 0; i < cantidad; i++) {
            if (indicesDisponibles.length > 0) {
                tipos[indicesDisponibles.pop()] = tipoCarta;
            }
        }
    }

    // 4. Obtener las 3 palabras iniciales
    const tresPalabrasIniciales = shuffleArray([...PALABRAS_SECRETAS]).slice(0, 3);

    // 5. Construcción del tablero lógico
    tableroLogico = Array(37).fill(null).map((_, index) => {
        let palabra = "";
        let revelada = false;

        if (indicesIniciales.includes(index)) {
            // Asignamos una de las tres palabras iniciales
            palabra = tresPalabrasIniciales[indicesIniciales.indexOf(index)].palabra;
            revelada = true;
            tipos[index] = TIPOS_CARTA.INICIO;
        }

        return {
            id: palabra ? index : null,
            word: palabra,
            type: tipos[index], // Esto ahora será 'start' para las 3 iniciales
            revealed: revelada,
        };
    });

    Storage.limpiarEstadoPartida();
    UI.ocultarBotonesInicio();
    verificarEstadoAmuletoCargado();
    recalcularEstado();

    UI.actualizarIndicadorTurnoRumbos(turnoActual, modoActual, suministrosAgua, juegoTerminado);
    UI.renderizarTableroHex(tableroLogico, handleCardClick, juegoTerminado);
}

/**
 * Función principal para manejar la lógica al hacer click en una tarjeta.
 */
export function handleCardClick(event) {
    if (juegoTerminado) return;

    const cardDiv = event.currentTarget;
    const index = parseInt(cardDiv.getAttribute('data-index'));

    // --- VALIDACIÓN DE ADYACENCIA ---
    const casillasReveladas = tableroLogico
        .map((c, idx) => c.revealed ? idx : null)
        .filter(v => v !== null);

    let fronteraAdyacente = [];
    casillasReveladas.forEach(idxRevelado => {
        const vecinos = obtenerAdyacentesHex(idxRevelado);
        fronteraAdyacente.push(...vecinos);
    });

    if (!fronteraAdyacente.includes(index)) {
        alert("¡Rumbo denegado! Solo puedes expandir el camino a celdas adyacentes a CUALQUIERA de las ya descubiertas.");
        return;
    }

    // --- ASIGNACIÓN DE PALABRA (SI NO TIENE) ---
    if (!tableroLogico[index].word) {
        const palabraIntroducida = prompt("Escribe la palabra de la pista que dictó tu Capitán/Guía para este rumbo:");
        if (!palabraIntroducida || palabraIntroducida.trim() === "") {
            return;
        }
        tableroLogico[index].word = palabraIntroducida.trim().toUpperCase();
    }

    // Revelamos la casilla antes de evaluar su impacto
    tableroLogico[index].revealed = true;
    const tipoCasilla = tableroLogico[index].type;
    let forzarFinTurno = false;

    // -------------------------------------------------------------
    // LÓGICA MODO EQUIPOS (Mutación y Alertas)
    // -------------------------------------------------------------
    if (modoActual === MODOS_JUEGO.EQUIPOS) {
        // --- CASILLA NEUTRAL ---
        if (tipoCasilla === TIPOS_CARTA.NEUTRAL) {
            alert("🧭 Terreno neutral. El turno de exploración cambia de equipo.");
            forzarFinTurno = true;
        }

        // --- CASILLA MALDICIÓN ---
        else if (tipoCasilla === TIPOS_CARTA.MALDICION) {
            if (turnoActual === 'blue') {
                maldicionesAzul++;
                alert("💀🔵 ¡El Equipo Azul ha desenterrado una maldición!");
            } else {
                maldicionesRojo++;
                alert("💀🔴 ¡El Equipo Rojo ha desenterrado una maldición!");
            }
            forzarFinTurno = true;
        }

        // --- CASILLA AMULETO ---
        else if (tipoCasilla === TIPOS_CARTA.AMULETO) {
            if (turnoActual === 'blue') {
                amuletosAzul++;
                alert("🧿🔵 ¡El Equipo Azul ha encontrado el amuleto sagrado del mapa!");
            } else {
                amuletosRojo++;
                alert("🧿🔴 ¡El Equipo Rojo ha encontrado el amuleto sagrado del mapa!");
            }
        }

        // --- CASILLAS DE TESOROS ---
        else if (turnoActual === 'blue' && tipoCasilla === TIPOS_CARTA.TESORO_ROJO) {
            alert("💥 ¡Ups! Has revealed un tesoro del Equipo Rojo 🔴. Su marcador avanza y vuestro turno termina.");
            forzarFinTurno = true;
        }
        else if (turnoActual === 'red' && tipoCasilla === TIPOS_CARTA.TESORO_AZUL) {
            alert("💥 ¡Ups! Has revealed un tesoro del Equipo Azul 🔵. Su marcador avanza y vuestro turno termina.");
            forzarFinTurno = true;
        }
        else if (tipoCasilla === TIPOS_CARTA.TESORO) {
            if (turnoActual === 'blue') {
                tesorosComunesAzul++;
                alert("🪙🔵 ¡El Equipo Azul ha encontrado un tesoro común y se lo queda!");
            } else {
                tesorosComunesRojo++;
                alert("🪙🔴 ¡El Equipo Rojo ha encontrado un tesoro común y se lo queda!");
            }
        }

    }

    // -------------------------------------------------------------
    // LÓGICA MODO COOPERATIVO
    // -------------------------------------------------------------
    else if (modoActual === MODOS_JUEGO.COOPERATIVO) {
        // --- CASILLA TRAMPA ---
        if (tipoCasilla === TIPOS_CARTA.TRAMPA) {
            alert(`🪤 ¡Trampa activada en "${tableroLogico[index].word}"! Tu cantimplora se ha dañado.`);
            capacidadMaximaAgua = Math.max(0, capacidadMaximaAgua - 1);
            suministrosAgua = Math.min(suministrosAgua, capacidadMaximaAgua);
        }

        // --- CASILLA AGUA ---
        else if (tipoCasilla === TIPOS_CARTA.AGUA) {
            alert(`💧 ¡Oasis encontrado en "${tableroLogico[index].word}"! Recuperan +2 de agua.`);
            suministrosAgua = Math.min(capacidadMaximaAgua, suministrosAgua + 2);
        }

        // --- CASILLA MALDICIÓN ---
        else if (tipoCasilla === TIPOS_CARTA.MALDICION) {
            maldicionesLlevadas++;
            if (maldicionesLlevadas >= 2) {
                alert("💀 ¡Has desenterrado una segunda Maldición! Tu expedición sucumbe a la oscuridad.");
            } else {
                alert("💀 ¡Cuidado! Has activado una Maldición Antigua. Ahora la llevas cargada. Necesitas un Amuleto antes de salir.");
            }
        }

        // --- CASILLA AMULETO ---
        else if (tipoCasilla === TIPOS_CARTA.AMULETO) {
            tieneAmuleto = true;
            amuletoEncontrado = true;
            if (maldicionesLlevadas > 0) {
                maldicionesLlevadas--;
                alert("🧿 ¡Excelente! Han encontrado el Amuleto. Su poder místico absorbe la Maldición que llevaban encima y la purifica.");
            } else {
                alert("🧿 ¡Excelente! Han encontrado el Amuleto de Protección. Una de las amenazas de la isla ha sido purificada.");
            }
        }

        // --- CASILLA SALIDA ---
        else if (tipoCasilla === TIPOS_CARTA.SALIDA) {
            alert("🏁 Han alcanzado la casilla de salida. Evaluando el destino de la expedición...");
        }

        // Desgaste de agua por movimiento
        if (tipoCasilla !== TIPOS_CARTA.AGUA) {
            suministrosAgua--;
        }
    }

    forzarFinTurno = true

    recalcularEstado();

    if (!juegoTerminado && forzarFinTurno) {
        passTurn();
    } else {
        UI.renderizarTableroHex(tableroLogico, handleCardClick, juegoTerminado);
    }
}

/**
 * Cambia el turno al equipo contrario y actualiza el indicador en la interfaz.
 */
export function passTurn() {
    if (juegoTerminado) return;
    if (modoActual === MODOS_JUEGO.EQUIPOS) {
        turnoActual = (turnoActual === 'blue') ? 'red' : 'blue';
    }
    // En cooperativo el "turno" es continuo hasta que se agote el agua.

    UI.actualizarIndicadorTurnoRumbos(turnoActual, modoActual, suministrosAgua, juegoTerminado);
    UI.renderizarTableroHex(tableroLogico, handleCardClick, juegoTerminado);
    Storage.guardarEstadoPartida(obtenerEstadoParaGuardar());
}

/**
 * Verifica las condiciones de victoria o derrota.
 */
function verificarFinJuego() {
    let mensaje = '';

    // -------------------------------------------------------------------
    // 1. NUEVA VERIFICACIÓN: FIN DE PARTIDA POR TIEMPO AGOTADO GLOBAL
    // -------------------------------------------------------------------

    // 2. Verificar victoria por conteo de agentes
    if (!mensaje) {
        if (agentesAzulesRestantes === 0) {
            mensaje = '¡<span class="text-blue-400 font-bold">VICTORIA AZUL</span>! 🏆';
        } else if (agentesRojosRestantes === 0) {
            mensaje = '¡<span class="text-red-400 font-bold">VICTORIA ROJA</span>! 🏆';
        } else if (numeroDeEquipos === 3 && agentesVerdesRestantes === 0) {
            mensaje = '¡<span class="text-green-400 font-bold">VICTORIA VERDE</span>! 🏆';
        }
    }

    // 3. Verificar derrota por Asesino
    const asesinoRevelado = tableroLogico.some(card => card.type === TIPOS_CARTA.ASESINO && card.revealed);

    if (asesinoRevelado) {
        juegoTerminado = true;

        const equipoPerdedor = turnoActual;
        let equipoGanadorTexto = '';

        if (numeroDeEquipos === 2) {
            equipoGanadorTexto = (equipoPerdedor === TIPOS_CARTA.AZUL) ? 'Rojo 🔴' : 'Azul 🔵';
        } else {
            const equiposRestantes = [TIPOS_CARTA.AZUL, TIPOS_CARTA.ROJO, TIPOS_CARTA.VERDE]
                .filter(e => e !== equipoPerdedor)
                .map(e => TIPOS_CARTA.MAPEO_EMOJI[e]);

            equipoGanadorTexto = `Los equipos restantes: ${equiposRestantes.join(' y ')}`;
        }

        mensaje = `¡JUEGO TERMINADO! <span class="text-red-500 font-bold">ASESINADO</span>. Ganan: ${equipoGanadorTexto}`;
    } else if (mensaje) {
        juegoTerminado = true;
    }

    if (juegoTerminado) {
        UI.actualizarIndicadorTurno(turnoActual, juegoTerminado, mensaje);
        Storage.limpiarEstadoPartida();
        UI.renderizarTablero(tableroLogico, handleCardClick, juegoTerminado);
    }
    return juegoTerminado;
}

// =========================================================
// Funciones de Carga y Enlaces (Exportadas)
// =========================================================

/**
 * Intenta cargar una partida guardada desde el Local Storage.
 * @returns {boolean} True si se cargó una partida, false si no.
 */
export function initGame() {
    const estadoGuardado = Storage.cargarEstadoPartida();

    if (estadoGuardado) {
        // 1. Reconstruimos el array de objetos
        tableroLogico = estadoGuardado.b.map((item, index) => {
            const tipoReal = TIPOS_CARTA.MAPEO_INVERSO[item.t] || TIPOS_CARTA.NEUTRAL;
            const palabra = item.w || "";

            return {
                id: palabra !== "" ? index : null,
                word: palabra,
                type: tipoReal,
                revealed: palabra !== "",
            };
        });

        // 2. Restauramos variables de juego
        modoActual = estadoGuardado.m || MODOS_JUEGO.EQUIPOS;
        turnoActual = estadoGuardado.t || 'blue';
        suministrosAgua = estadoGuardado.w ?? 7;
        capacidadMaximaAgua = estadoGuardado.c ?? 7;

        maldicionesLlevadas = estadoGuardado.maldicionesLlevadas;
        tieneAmuleto = estadoGuardado.tieneAmuleto;
        amuletoEncontrado = estadoGuardado.amuletoEncontrado;
        tesorosRestantesAzul = estadoGuardado.tesorosRestantesAzul;
        tesorosRestantesRojo = estadoGuardado.tesorosRestantesRojo;

        tesorosComunesAzul = estadoGuardado.ta ?? 0;
        tesorosComunesRojo = estadoGuardado.tr ?? 0;
        amuletosAzul = estadoGuardado.aa ?? 0;
        amuletosRojo = estadoGuardado.ar ?? 0;
        maldicionesAzul = estadoGuardado.ma ?? 0;
        maldicionesRojo = estadoGuardado.mr ?? 0;

        juegoTerminado = estadoGuardado.e || false;


        UI.ocultarBotonesInicio();

        // ✨ Ejecutamos la comprobación para activar 'tieneAmuleto' y 'amuletoEncontrado'
        // si la tarjeta correspondiente ya está bocarriba en el tablero cargado.
        verificarEstadoAmuletoCargado();

        recalcularEstado(); // Ahora leerá correctamente los datos del amuleto y la capacidad máxima

        UI.actualizarIndicadorTurnoRumbos(turnoActual, modoActual, suministrosAgua, juegoTerminado);
        UI.renderizarTableroHex(tableroLogico, handleCardClick, juegoTerminado);
        UI.mostrarClaveEnConsola(tableroLogico);
        return true;
    }
    return false;
}

/**
 * Elimina el estado de la partida guardada y devuelve la UI al estado inicial.
 */
export function reiniciarPartida() {
    if (confirm("¿Reiniciar la expedición y volver al menú principal?")) {
        Storage.limpiarEstadoPartida();
        UI.mostrarBotonesInicio();
        UI.ocultarEstadisticas();
        UI.ocultarTablero();
    }
}

/**
 * Genera y muestra un enlace con la clave secreta cifrada para compartir.
 */
export function generarEnlaceClave() {
    const estadoCifrado = localStorage.getItem(GAME_STATE_STORAGE_KEY);
    if (estadoCifrado) {
        const urlBase = window.location.origin + window.location.pathname;
        const urlToShare = `${urlBase}?clave=${encodeURIComponent(estadoCifrado)}`;
        //console.log(urlToShare)

        // Opción 1 (Predeterminada): Mostrar Código QR
        UI.mostrarQR(urlToShare);


        // Opción 2: Usar el viejo 'prompt' (Descomentar esta línea y comentar la línea 1)
        //prompt("Copia y comparte este enlace con el Líder de Espías:", urlToShare);
    } else {
        alert("La partida no ha comenzado o es inválida.");
    }
}

/** Muestra la clave secreta descifrada desde la URL.
 * @param {string} cadenaCifrada - La cadena cifrada obtenida de la URL.
 */
export function mostrarClaveSecretaURL(cadenaCifrada) {
    const cadenaJSON = Storage.descifrarXOR(cadenaCifrada);
    if (!cadenaJSON) {
        alert("Error al cargar la clave. El formato cifrado no es válido.");
        return;
    }

    try {
        const estadoPartida = JSON.parse(cadenaJSON);
        const estadoDecodificado = estadoPartida.b;

        if (!Array.isArray(estadoDecodificado) || estadoDecodificado.length !== 37) {
            throw new Error("Formato de tablero incorrecto.");
        }

        // Reconstruir el tablero lógico, marcando todas como REVELADAS
        tableroLogico = estadoDecodificado.map((item, index) => {
            const tipoReal = TIPOS_CARTA.MAPEO_INVERSO[item.t] || TIPOS_CARTA.NEUTRAL;
            const palabra = item.w || "";

            return {
                id: palabra !== "" ? index : null,
                word: palabra,
                type: tipoReal,
                revealed: palabra !== "",
            };
        });

        verificarEstadoAmuletoCargado();

        UI.ocultarBotonesInicio();
        UI.actualizarUIModoLider(tableroLogico);

    } catch (e) {
        console.error("Error al procesar el JSON del tablero descifrado para la clave:", e);
        alert("Error interno al decodificar la clave.");
    }
}

/**
 * Intenta obtener el estado codificado del tablero desde el parámetro 'clave' de la URL.
 * @returns {string | null} La cadena codificada o null.
        */
export function obtenerEstadoCodificadoURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('clave'); // Busca el parámetro ?clave=...
}


// =========================================================
// Funciones de Acceso a UI (Exportadas)
// =========================================================

/** Obtiene el tablero lógico actual.
 * @returns {Array} El tablero lógico.
 */
export function getTableroLogico() {
    return tableroLogico;
}


// =========================================================
// Funciones de Adyacencia Hexagonal
// =========================================================

export function obtenerAdyacentesHex(index) {
    return ADYACENCIAS_TABLERO[index] || [];
}

/**
 * Verifica si el amuleto ya está revelado en el tablero actual
 * y actualiza los estados internos del juego.
 */
function verificarEstadoAmuletoCargado() {

    // 1. Contamos cuántas maldiciones totales se han descubierto en este tablero
    const maldicionesDescubiertas = tableroLogico.filter(c => c.type === TIPOS_CARTA.MALDICION && c.revealed).length;

    // 2. Buscamos si el amuleto ya fue descubierto
    const amuletoRevelado = tableroLogico.some(c => c.type === TIPOS_CARTA.AMULETO && c.revealed);

    if (amuletoRevelado) {
        tieneAmuleto = true;
        amuletoEncontrado = true;

        // Si encontramos el amuleto, restamos 1 maldición al total llevado (mínimo 0)
        maldicionesLlevadas = Math.max(0, maldicionesDescubiertas - 1);
    } else {
        tieneAmuleto = false;
        amuletoEncontrado = false;
        maldicionesLlevadas = maldicionesDescubiertas;
    }
}