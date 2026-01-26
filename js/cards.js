/**
 * Lógica de cartas para el MUS español
 * Baraja española de 40 cartas (sin 8 ni 9)
 */

// Constantes
export const PALOS = ['oros', 'copas', 'espadas', 'bastos'];
export const VALORES = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]; // Sin 8 ni 9

/**
 * Clase Card - Representa una carta de la baraja española
 */
export class Card {
    constructor(palo, valor) {
        if (!PALOS.includes(palo)) {
            throw new Error(`Palo inválido: ${palo}`);
        }
        if (!VALORES.includes(valor)) {
            throw new Error(`Valor inválido: ${valor}`);
        }
        this.palo = palo;
        this.valor = valor;
    }

    /**
     * Obtiene el valor para comparaciones en Grande/Chica
     * Los 3 valen como Reyes (12), los 2 valen como Ases (1)
     */
    getValorComparacion() {
        if (this.valor === 3) return 12; // 3 vale como Rey
        if (this.valor === 2) return 1;  // 2 vale como As
        return this.valor;
    }

    /**
     * Obtiene el valor para Juego/Punto
     * Figuras (10,11,12) y 3 = 10 puntos
     * 2 = 1 punto (vale como as)
     * Resto = su valor numérico
     */
    getValorJuego() {
        if (this.valor === 3 || this.valor >= 10) return 10;
        if (this.valor === 2) return 1;
        return this.valor;
    }

    /**
     * Obtiene el nombre legible de la carta
     */
    getNombre() {
        const nombres = {
            1: 'As',
            2: 'Dos',
            3: 'Tres',
            4: 'Cuatro',
            5: 'Cinco',
            6: 'Seis',
            7: 'Siete',
            10: 'Sota',
            11: 'Caballo',
            12: 'Rey'
        };
        return `${nombres[this.valor]} de ${this.palo}`;
    }

    /**
     * Representación corta de la carta
     */
    toString() {
        const paloAbrev = {
            'oros': 'O',
            'copas': 'C',
            'espadas': 'E',
            'bastos': 'B'
        };
        return `${this.valor}${paloAbrev[this.palo]}`;
    }

    /**
     * Compara si dos cartas son iguales
     */
    equals(other) {
        return this.palo === other.palo && this.valor === other.valor;
    }
}

/**
 * Clase Deck - Representa la baraja completa
 */
export class Deck {
    constructor() {
        this.cards = [];
        this.reset();
    }

    /**
     * Reinicia la baraja con las 40 cartas
     */
    reset() {
        this.cards = [];
        for (const palo of PALOS) {
            for (const valor of VALORES) {
                this.cards.push(new Card(palo, valor));
            }
        }
        return this;
    }

    /**
     * Baraja las cartas usando Fisher-Yates
     */
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
        return this;
    }

    /**
     * Reparte n cartas del mazo
     */
    deal(n) {
        if (n > this.cards.length) {
            throw new Error(`No hay suficientes cartas. Quedan ${this.cards.length}`);
        }
        return this.cards.splice(0, n);
    }

    /**
     * Devuelve cartas al mazo (al final)
     */
    returnCards(cards) {
        this.cards.push(...cards);
        return this;
    }

    /**
     * Cantidad de cartas restantes
     */
    get remaining() {
        return this.cards.length;
    }
}

/**
 * Tipos de pares en el MUS
 */
export const TIPOS_PARES = {
    NADA: 0,      // Sin pares
    PAR: 1,       // Un par (dos cartas iguales)
    MEDIAS: 2,    // Tres cartas iguales
    DUPLES: 3     // Dos pares
};

/**
 * Clase Hand - Representa una mano de 4 cartas
 */
export class Hand {
    constructor(cards = []) {
        this.cards = cards;
    }

    /**
     * Añade cartas a la mano
     */
    addCards(cards) {
        this.cards.push(...cards);
        return this;
    }

    /**
     * Establece las cartas de la mano
     */
    setCards(cards) {
        this.cards = [...cards];
        return this;
    }

    /**
     * Obtiene los valores de comparación ordenados de mayor a menor
     */
    getValoresOrdenados() {
        return this.cards
            .map(c => c.getValorComparacion())
            .sort((a, b) => b - a);
    }

    /**
     * Calcula el valor para Grande (cartas más altas ganan)
     * Retorna array ordenado de mayor a menor para comparación
     */
    getValorGrande() {
        return this.getValoresOrdenados();
    }

    /**
     * Calcula el valor para Chica (cartas más bajas ganan)
     * Retorna array ordenado de menor a mayor para comparación
     */
    getValorChica() {
        return this.cards
            .map(c => c.getValorComparacion())
            .sort((a, b) => a - b);
    }

    /**
     * Cuenta las ocurrencias de cada valor de comparación
     */
    contarValores() {
        const conteo = {};
        for (const card of this.cards) {
            const val = card.getValorComparacion();
            conteo[val] = (conteo[val] || 0) + 1;
        }
        return conteo;
    }

    /**
     * Detecta el tipo de pares en la mano
     * Retorna { tipo, valores, descripcion }
     */
    getPares() {
        const conteo = this.contarValores();
        const pares = [];
        const trios = [];

        for (const [valor, cantidad] of Object.entries(conteo)) {
            if (cantidad === 2) pares.push(parseInt(valor));
            if (cantidad === 3) trios.push(parseInt(valor));
            if (cantidad === 4) {
                // Cuatro iguales = duples del mismo valor
                return {
                    tipo: TIPOS_PARES.DUPLES,
                    valores: [parseInt(valor), parseInt(valor)],
                    descripcion: 'Duples'
                };
            }
        }

        if (trios.length === 1) {
            return {
                tipo: TIPOS_PARES.MEDIAS,
                valores: trios,
                descripcion: 'Medias'
            };
        }

        if (pares.length === 2) {
            pares.sort((a, b) => b - a); // Mayor primero
            return {
                tipo: TIPOS_PARES.DUPLES,
                valores: pares,
                descripcion: 'Duples'
            };
        }

        if (pares.length === 1) {
            return {
                tipo: TIPOS_PARES.PAR,
                valores: pares,
                descripcion: 'Par'
            };
        }

        return {
            tipo: TIPOS_PARES.NADA,
            valores: [],
            descripcion: 'Nada'
        };
    }

    /**
     * Calcula la suma de puntos para Juego/Punto
     */
    getSumaPuntos() {
        return this.cards.reduce((sum, card) => sum + card.getValorJuego(), 0);
    }

    /**
     * Determina si tiene Juego (31 o más) y retorna info
     */
    getJuego() {
        const suma = this.getSumaPuntos();
        const tieneJuego = suma >= 31;

        return {
            tieneJuego,
            valor: suma,
            descripcion: tieneJuego ? `Juego de ${suma}` : `Punto de ${suma}`
        };
    }

    /**
     * Alias para obtener el Punto (cuando no hay juego)
     */
    getPunto() {
        return this.getSumaPuntos();
    }

    /**
     * Descarta cartas en las posiciones indicadas
     * @param {number[]} indices - Índices de las cartas a descartar (0-3)
     * @returns {Card[]} - Cartas descartadas
     */
    descartar(indices) {
        // Ordenar índices de mayor a menor para no afectar posiciones
        const sortedIndices = [...indices].sort((a, b) => b - a);
        const descartadas = [];

        for (const idx of sortedIndices) {
            if (idx >= 0 && idx < this.cards.length) {
                descartadas.unshift(...this.cards.splice(idx, 1));
            }
        }

        return descartadas;
    }

    /**
     * Recibe nuevas cartas
     */
    recibirCartas(cards) {
        this.cards.push(...cards);
        return this;
    }

    /**
     * Limpia la mano
     */
    clear() {
        const cards = this.cards;
        this.cards = [];
        return cards;
    }

    /**
     * Representación de la mano
     */
    toString() {
        return this.cards.map(c => c.toString()).join(' ');
    }
}

// ============================================
// FUNCIONES DE COMPARACIÓN ENTRE MANOS
// ============================================

/**
 * Compara dos manos para Grande
 * @returns {number} 1 si gana mano1, -1 si gana mano2, 0 si empate
 */
export function compararGrande(mano1, mano2) {
    const v1 = mano1.getValorGrande();
    const v2 = mano2.getValorGrande();

    for (let i = 0; i < 4; i++) {
        if (v1[i] > v2[i]) return 1;
        if (v1[i] < v2[i]) return -1;
    }
    return 0; // Empate
}

/**
 * Compara dos manos para Chica
 * @returns {number} 1 si gana mano1, -1 si gana mano2, 0 si empate
 */
export function compararChica(mano1, mano2) {
    const v1 = mano1.getValorChica();
    const v2 = mano2.getValorChica();

    for (let i = 0; i < 4; i++) {
        if (v1[i] < v2[i]) return 1;  // En chica, menor gana
        if (v1[i] > v2[i]) return -1;
    }
    return 0; // Empate
}

/**
 * Compara dos manos para Pares
 * @returns {number} 1 si gana mano1, -1 si gana mano2, 0 si empate
 */
export function compararPares(mano1, mano2) {
    const p1 = mano1.getPares();
    const p2 = mano2.getPares();

    // Primero comparar tipo de pares
    if (p1.tipo > p2.tipo) return 1;
    if (p1.tipo < p2.tipo) return -1;

    // Si mismo tipo, comparar valores
    if (p1.tipo === TIPOS_PARES.NADA) return 0;

    // Comparar valores de los pares
    for (let i = 0; i < p1.valores.length; i++) {
        if (p1.valores[i] > p2.valores[i]) return 1;
        if (p1.valores[i] < p2.valores[i]) return -1;
    }

    return 0; // Empate
}

/**
 * Compara dos manos para Juego
 * Valores especiales: 31 (la mejor jugada llamada "31"), luego 32, 40, 37, 36, 35, 34, 33
 * @returns {number} 1 si gana mano1, -1 si gana mano2, 0 si empate
 */
export function compararJuego(mano1, mano2) {
    const j1 = mano1.getJuego();
    const j2 = mano2.getJuego();

    // Si ninguno tiene juego, no se compara juego
    if (!j1.tieneJuego && !j2.tieneJuego) return 0;

    // Si solo uno tiene juego, ese gana
    if (j1.tieneJuego && !j2.tieneJuego) return 1;
    if (!j1.tieneJuego && j2.tieneJuego) return -1;

    // Ambos tienen juego - orden especial: 31 > 32 > 40 > 37 > 36 > 35 > 34 > 33
    const ordenJuego = (valor) => {
        if (valor === 31) return 100;
        if (valor === 32) return 99;
        if (valor === 40) return 98;
        return valor; // 33-37 en orden natural
    };

    const orden1 = ordenJuego(j1.valor);
    const orden2 = ordenJuego(j2.valor);

    if (orden1 > orden2) return 1;
    if (orden1 < orden2) return -1;
    return 0;
}

/**
 * Compara dos manos para Punto (cuando no hay juego)
 * @returns {number} 1 si gana mano1, -1 si gana mano2, 0 si empate
 */
export function compararPunto(mano1, mano2) {
    const p1 = mano1.getPunto();
    const p2 = mano2.getPunto();

    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
    return 0;
}

/**
 * Verifica si una mano tiene pares
 */
export function tienePares(mano) {
    return mano.getPares().tipo !== TIPOS_PARES.NADA;
}

/**
 * Verifica si una mano tiene juego
 */
export function tieneJuego(mano) {
    return mano.getJuego().tieneJuego;
}

// Exportación por defecto con todo
export default {
    Card,
    Deck,
    Hand,
    PALOS,
    VALORES,
    TIPOS_PARES,
    compararGrande,
    compararChica,
    compararPares,
    compararJuego,
    compararPunto,
    tienePares,
    tieneJuego
};
