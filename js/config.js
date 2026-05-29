// CLAVE SECRETA DE CIFRADO
export const ENCRYPTION_KEY = 'RUMBOS';

// Constantes de almacenamiento local
export const USADAS_STORAGE_KEY = 'rumbos_palabrasUsadas';
export const GAME_STATE_STORAGE_KEY = 'rumbos_estadoActual';

// Nuevos Modos de Juego
export const MODOS_JUEGO = {
    EQUIPOS: 'equipos',
    COOPERATIVO: 'cooperativo'
};

// Mapeo de tipos de cartas y códigos de codificación
export const TIPOS_CARTA = {
    INICIO: 'start',       // Punto de inicio del juego 🚩
    NEUTRAL: 'neutral',     // Sendero normal / Terreno baldío 🧭
    TESORO: 'treasure',
    TESORO_AZUL: 'treasure_blue',  // 🔵 Nuevo
    TESORO_ROJO: 'treasure_red',   // 🔴 Nuevo
    TRAMPA: 'trap',         // Penalización menor / Trampa 🪤
    MALDICION: 'curse',     // Fin de la partida (Equivalente al asesino) 💀
    AGUA: 'water',          // Suministro / Ayuda 💧
    AMULETO: 'amulet',      // Elemento especial 🧿
    SALIDA: 'exit',         // Punto de escape final 🏁

    // Mapeo de tipos a emojis adaptados a la temática de exploración
    MAPEO_EMOJI: {
        'start': '🚩',
        'neutral': '🧭',
        'treasure': '🪙',
        'treasure_blue': '🔵', // Adaptado
        'treasure_red': '🔴',  // Adaptado
        'trap': '🪤',
        'curse': '💀',
        'water': '💧',
        'amulet': '🧿',
        'exit': '🏁'
    },

    // Mapeo de tipos a las iniciales para la codificación del QR / Enlace
    MAPEO_CODIGO: {
        'start': 'S',
        'neutral': 'N',
        'treasure': 'T',
        'treasure_blue': 'B', // Nuevo código para guardar
        'treasure_red': 'R',  // Nuevo código para guardar
        'trap': 'X',
        'curse': 'C',
        'water': 'W',
        'amulet': 'M',
        'exit': 'E'
    },

    // Mapeo inverso para descifrar la URL del Guía
    MAPEO_INVERSO: {
        'S': 'start',
        'N': 'neutral',
        'T': 'treasure',
        'B': 'treasure_blue', // Para descifrar
        'R': 'treasure_red',  // Para descifrar
        'X': 'trap',
        'C': 'curse',
        'W': 'water',
        'M': 'amulet',
        'E': 'exit'
    }
};

// Configuración de filas para un hexágono regular de 37 celdas (Radio 3 desde el centro)
// Fila 0 (4): 0-3 | Fila 1 (5): 4-8 | Fila 2 (6): 9-14 | Fila 3 (7): 15-21 [Centro: 18]
// Fila 4 (6): 22-27 | Fila 5 (5): 28-32 | Fila 6 (4): 33-36
export const CONFIG_FILAS_HEX = [4, 5, 6, 7, 6, 5, 4];

// Grafo completo de adyacencias para las 37 casillas
export const ADYACENCIAS_TABLERO = {
    0: [1, 4, 5], 1: [0, 2, 5, 6], 2: [1, 3, 6, 7], 3: [2, 7, 8],
    4: [0, 5, 9, 10], 5: [0, 1, 4, 6, 10, 11], 6: [1, 2, 5, 7, 11, 12], 7: [2, 3, 6, 8, 12, 13], 8: [3, 7, 13, 14],
    9: [4, 10, 15, 16], 10: [4, 5, 9, 11, 16, 17], 11: [5, 6, 10, 12, 17, 18], 12: [6, 7, 11, 13, 18, 19], 13: [7, 8, 12, 14, 19, 20], 14: [8, 14, 20, 21],
    15: [9, 16, 22], 16: [9, 10, 15, 17, 22, 23], 17: [10, 11, 16, 18, 23, 24],
    18: [11, 12, 17, 19, 24, 25],
    19: [12, 13, 18, 20, 25, 26], 20: [13, 14, 19, 21, 26, 27], 21: [14, 20, 27],
    22: [15, 16, 23, 28], 23: [16, 17, 22, 24, 28, 29], 24: [17, 18, 23, 25, 29, 30], 25: [18, 19, 24, 26, 30, 31], 26: [19, 20, 25, 27, 31, 32], 27: [20, 21, 26, 32],
    28: [22, 23, 29, 33], 29: [23, 24, 28, 30, 33, 34], 30: [24, 25, 29, 31, 34, 35], 31: [25, 26, 30, 32, 35, 36], 32: [26, 27, 31, 36],
    33: [28, 29, 34], 34: [29, 30, 33, 35], 35: [30, 31, 34, 36], 36: [31, 32, 35]
};

// NUEVA ESTRUCTURA PARA NIVELES Y CASILLAS
export const DISTRIBUCION_NIVELES = {
    basico: {
        [MODOS_JUEGO.COOPERATIVO]: {
            [TIPOS_CARTA.TESORO]: 3,
            [TIPOS_CARTA.AGUA]: 3,
            [TIPOS_CARTA.TRAMPA]: 4,
            [TIPOS_CARTA.MALDICION]: 3,
            [TIPOS_CARTA.AMULETO]: 1,
            [TIPOS_CARTA.SALIDA]: 1
        },
        [MODOS_JUEGO.EQUIPOS]: {
            [TIPOS_CARTA.TESORO]: 2,
            [TIPOS_CARTA.TESORO_ROJO]: 4,
            [TIPOS_CARTA.TESORO_AZUL]: 4,
            [TIPOS_CARTA.MALDICION]: 6,
            [TIPOS_CARTA.AMULETO]: 1
        }
    }
    // En el futuro podrás añadir: medio: { ... }, dificil: { ... }
};