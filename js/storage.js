import { ENCRYPTION_KEY, GAME_STATE_STORAGE_KEY, USADAS_STORAGE_KEY } from './config.js';

// =========================================================
// Funciones de Cifrado XOR
// =========================================================

/**
 * Cifra una cadena de texto utilizando el cifrado XOR con una clave secreta.
 * @param {string} text - La cadena a cifrar/descifrar.
 * @returns {string} La cadena cifrada/descifrada.
 */
export function cifrarXOR(text) {
    let output = '';
    for (let i = 0; i < text.length; i++) {
        // Obtiene el código de carácter de la clave, repitiéndose
        const keyChar = ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
        // Aplica la operación XOR y convierte de nuevo a carácter
        const cipherChar = text.charCodeAt(i) ^ keyChar;
        output += String.fromCharCode(cipherChar);
    }
    // Codifica el resultado binario en Base64 para hacerlo seguro
    return btoa(output);
}

/**
 * Descifra una cadena Base64 cifrada con XOR.
 * @param {string} base64String - La cadena cifrada en Base64.
 * @returns {string} La cadena de texto original.
 */
export function descifrarXOR(base64String) {
    try {
        // Decodifica de Base64 para obtener el string binario cifrado
        const cipherText = atob(base64String);
        let output = '';
        for (let i = 0; i < cipherText.length; i++) {
            // Repite el proceso XOR, ya que es simétrico (A XOR K = C, C XOR K = A)
            const keyChar = ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
            const originalChar = cipherText.charCodeAt(i) ^ keyChar;
            output += String.fromCharCode(originalChar);
        }
        return output;
    } catch (e) {
        console.error("Error al descifrar la cadena.", e);
        return null;
    }
}

// =========================================================
// Funciones de Local Storage
// =========================================================

/**
 * Guarda el estado actual de la partida en el almacenamiento local.
 * @param {Object} estadoPartida - El estado de la partida a guardar.
 */
export function guardarEstadoPartida(estadoPartida) {
    const cadenaJSON = JSON.stringify(estadoPartida);
    const estadoCifrado = cifrarXOR(cadenaJSON);
    if (estadoCifrado) {
        localStorage.setItem(GAME_STATE_STORAGE_KEY, estadoCifrado);
        console.log("Partida guardada automáticamente.");
    }
}

/**
 * Carga el estado de la partida desde el almacenamiento local.
 * @returns {Object|null} El estado de la partida o null si no existe o hay un error.
 */
export function cargarEstadoPartida() {
    const estadoCifrado = localStorage.getItem(GAME_STATE_STORAGE_KEY);
    if (!estadoCifrado) return null;

    const cadenaJSON = descifrarXOR(estadoCifrado);
    if (!cadenaJSON) return null;

    try {
        const estadoPartida = JSON.parse(cadenaJSON);
        if (!Array.isArray(estadoPartida.b) || estadoPartida.b.length !== 37) {
            throw new Error("Formato de tablero incorrecto.");
        }
        return estadoPartida;
    } catch (e) {
        console.error("Error al procesar el JSON del tablero descifrado:", e);
        limpiarEstadoPartida();
        return null;
    }
}

/**
 * Elimina el estado de la partida guardada al finalizar el juego o al reiniciar manualmente.
 */
export function limpiarEstadoPartida() {
    localStorage.removeItem(GAME_STATE_STORAGE_KEY);
    console.log("Estado guardado borrado.");
}

/**
 * Guarda un valor de configuración simple en localStorage.
 * @param {string} key - La clave de almacenamiento (p.ej., LAST_SELECTED_MODE_KEY).
 * @param {string} value - El valor a guardar.
 */
export function guardarConfiguracion(key, value) {
    localStorage.setItem(key, value);
}

/**
 * Carga un valor de configuración simple de localStorage.
 * @param {string} key - La clave de almacenamiento.
 * @param {string} defaultValue - Valor por defecto si no se encuentra.
 * @returns {string} El valor cargado o el valor por defecto.
 */
export function cargarConfiguracion(key, defaultValue) {
    return localStorage.getItem(key) || defaultValue;
}

// =========================================================
// Funciones de Palabras Usadas
// =========================================================

/**
 * Carga el conjunto de IDs de palabras usadas desde el almacenamiento local.
 * @returns {Set<number>} Un conjunto de IDs de palabras usadas.
 */
export function cargarIdsUsados() {
    const data = localStorage.getItem(USADAS_STORAGE_KEY);
    if (data) {
        const lista = JSON.parse(data);
        const ids = lista.map(item => item.id);
        return new Set(ids);
    }
    return new Set();
}

/**
 * Guarda nuevos IDs de palabras usadas en el almacenamiento local, evitando duplicados.
 * @param {number[]} nuevosIds - Array de nuevos IDs de palabras a guardar.
 */
export function guardarNuevosIds(nuevosIds) {
    const idsAnteriores = localStorage.getItem(USADAS_STORAGE_KEY);
    let listaCompleta = idsAnteriores ? JSON.parse(idsAnteriores) : [];
    const fechaActual = new Date().toISOString().slice(0, 10);
    const nuevosItems = nuevosIds.map(id => ({ id: id, fecha: fechaActual }));

    const mapaIds = new Map();
    listaCompleta.forEach(item => mapaIds.set(item.id, item));
    nuevosItems.forEach(item => mapaIds.set(item.id, item));

    localStorage.setItem(USADAS_STORAGE_KEY, JSON.stringify(Array.from(mapaIds.values())));
}

// =========================================================
// Funciones de Limpieza
// =========================================================

/**
 * Elimina IDs específicos del registro de palabras usadas.
 * @param {number[]} idsATramitar - Array de IDs de palabras a eliminar.
 */
export function limpiarIdsUsados(idsATramitar) {
    if (idsATramitar.length === 0) return;

    const idsABorrarSet = new Set(idsATramitar);
    const idsAnteriores = localStorage.getItem(USADAS_STORAGE_KEY);
    let listaCompleta = idsAnteriores ? JSON.parse(idsAnteriores) : [];

    // Filtra la lista completa, manteniendo solo los IDs que NO están en el set de IDs a borrar
    const listaActualizada = listaCompleta.filter(item => !idsABorrarSet.has(item.id));

    localStorage.setItem(USADAS_STORAGE_KEY, JSON.stringify(listaActualizada));
    console.log(`🧹 Se han limpiado ${idsATramitar.length} IDs del historial de palabras usadas.`);
}

/**
 * Elimina todas las variables de estado del juego y palabras usadas del almacenamiento local.
 */
export function limpiarTodasVariables() {
    localStorage.removeItem(GAME_STATE_STORAGE_KEY);
    localStorage.removeItem(USADAS_STORAGE_KEY);
    localStorage.removeItem(RULE_TURN_PASS_KEY);
    localStorage.removeItem(RULE_TOGGLE_IMG_WORD_KEY);
    localStorage.removeItem(RULE_IMG_COLOR_KEY);
    localStorage.removeItem(LAST_SELECTED_MODE_KEY);
    localStorage.removeItem(LAST_SELECTED_TIMER_KEY);
    console.log("✅ Todas las variables de juego han sido borradas");
}