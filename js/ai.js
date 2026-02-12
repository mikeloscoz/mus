/**
 * IA MEJORADA para el MUS — Sistema experto heurístico v2
 *
 * MEJORAS PRINCIPALES:
 * 1. Evaluación de Grande/Chica por comparación carta a carta (como en MUS real)
 * 2. Posición (mano/postre) afecta decisiones críticas
 * 3. Umbrales ajustados: par de ases NUNCA se quiere
 * 4. Modelado básico del rival por sus acciones
 * 5. Mejor lógica de corte/mus
 */

const LANCE = {
    GRANDE: 'grande',
    CHICA: 'chica',
    PARES: 'pares',
    JUEGO: 'juego',
    PUNTO: 'punto'
};

const ACCION = {
    PASO: 'paso',
    ENVIDO: 'envido',
    QUIERO: 'quiero',
    NO_QUIERO: 'no_quiero',
    ORDAGO: 'ordago'
};

// Compatibilidad
const DIFICULTAD = {
    FACIL: 'facil',
    MEDIO: 'medio',
    DIFICIL: 'dificil'
};

// ============================================
// CONSTANTES DE EVALUACIÓN
// ============================================

// Orden de cartas para Grande (de mejor a peor)
// Rey/3 = 8, Caballo = 7, Sota = 6, 7 = 5, 6 = 4, 5 = 3, 4 = 2, As/2 = 1
const ORDEN_GRANDE = {
    'K': 8, '3': 8,
    'Q': 7,
    'J': 6,
    '7': 5,
    '6': 4,
    '5': 3,
    '4': 2,
    'A': 1, '2': 1, '1': 1
};

// Valor en puntos para Juego/Punto
const VALOR_PUNTOS = {
    'K': 10, '3': 10,
    'Q': 10,
    'J': 10,
    '7': 7,
    '6': 6,
    '5': 5,
    '4': 4,
    'A': 1, '2': 1, '1': 1
};

// Fuerza del juego (31 es el mejor, luego 32, 40, etc.)
const FUERZA_JUEGO = {
    31: 100,  // Imbatible de mano
    32: 85,
    40: 70,
    37: 55,
    36: 45,
    35: 35,
    34: 25,
    33: 15
};

// ============================================
// CLASE PRINCIPAL
// ============================================

export class AIPlayer {
    constructor(_dificultad) {
        // Ignorado - un único jugador competente
    }

    // ============================================
    // UTILIDADES DE CARTAS
    // ============================================

    /**
     * Normaliza rank: 3→K, 2→A, 1→A
     */
    _getMusRank(card) {
        const rank = card.rank;
        if (rank === '3') return 'K';
        if (rank === '2' || rank === '1') return 'A';
        return rank;
    }

    /**
     * Orden para Grande (mayor = mejor)
     */
    _getOrdenGrande(card) {
        return ORDEN_GRANDE[this._getMusRank(card)] || 0;
    }

    /**
     * Valor en puntos de una carta
     */
    _getValorPuntos(card) {
        return VALOR_PUNTOS[this._getMusRank(card)] || 0;
    }

    /**
     * Suma total de puntos de la mano
     */
    _calcularPuntos(hand) {
        return hand.reduce((sum, c) => sum + this._getValorPuntos(c), 0);
    }

    /**
     * ¿Tiene juego (≥31)?
     */
    _tieneJuego(hand) {
        return this._calcularPuntos(hand) >= 31;
    }

    // ============================================
    // EVALUACIÓN DE GRANDE (MEJORADA)
    // ============================================

    /**
     * En MUS, Grande se compara carta a carta (ordenadas de mayor a menor).
     * Esta función devuelve un array ordenado para comparación.
     */
    _getCartasOrdenadas(hand, paraChica = false) {
        const valores = hand.map(c => this._getOrdenGrande(c));
        if (paraChica) {
            return valores.sort((a, b) => a - b); // Menor primero para chica
        }
        return valores.sort((a, b) => b - a); // Mayor primero para grande
    }

    /**
     * Compara dos manos carta a carta.
     * @returns 1 si hand1 gana, -1 si hand2 gana, 0 si empate
     */
    _compararManos(hand1, hand2, paraChica = false) {
        const c1 = this._getCartasOrdenadas(hand1, paraChica);
        const c2 = this._getCartasOrdenadas(hand2, paraChica);
        
        for (let i = 0; i < 4; i++) {
            if (paraChica) {
                if (c1[i] < c2[i]) return 1;  // Menor gana en chica
                if (c1[i] > c2[i]) return -1;
            } else {
                if (c1[i] > c2[i]) return 1;  // Mayor gana en grande
                if (c1[i] < c2[i]) return -1;
            }
        }
        return 0; // Empate
    }

    /**
     * Evalúa fuerza de Grande (0-100).
     * 
     * CLAVE: La primera carta es dominante. R-R-x-x es casi imbatible.
     * Usamos una escala que refleja la probabilidad de ganar.
     */
    _evaluarGrande(hand) {
        const cartas = this._getCartasOrdenadas(hand, false);
        
        // Escala basada en cartas reales del MUS:
        // RRRR = 100 (imbatible)
        // RRRC = 98
        // RRRS = 95
        // RRCA = 90 (dos reyes + caballo = muy fuerte)
        // RRxx = 80-90 (dos reyes)
        // RCxx = 65-75 (rey + caballo = mínimo para querer)
        // RSxx = 55-65 (rey + sota)
        // Cxxx = 40-55 (caballo como mejor carta)
        // Sin rey ni caballo = <40 (mala grande)

        const primera = cartas[0];
        const segunda = cartas[1];
        const tercera = cartas[2];
        const cuarta = cartas[3];

        // Base por primera carta
        let fuerza = 0;
        
        if (primera === 8) { // Rey/3
            fuerza = 70;
            // Bonus por segunda carta
            if (segunda === 8) fuerza += 20;      // Dos reyes: 90+
            else if (segunda === 7) fuerza += 12; // Rey+Caballo: 82
            else if (segunda === 6) fuerza += 8;  // Rey+Sota: 78
            else if (segunda === 5) fuerza += 5;  // Rey+7: 75
            else fuerza += segunda;               // Rey+x: 70-74
        } else if (primera === 7) { // Caballo (sin rey)
            fuerza = 50;
            if (segunda === 7) fuerza += 15;      // Dos caballos: 65
            else if (segunda === 6) fuerza += 10; // Caballo+Sota: 60
            else fuerza += segunda;
        } else if (primera === 6) { // Sota (sin rey ni caballo)
            fuerza = 35;
            fuerza += segunda;
        } else {
            // Sin figuras = mala grande
            fuerza = primera * 4 + segunda * 2;
        }

        // Ajuste fino por tercera y cuarta carta
        fuerza += (tercera + cuarta) * 0.5;

        return Math.min(100, Math.max(0, Math.round(fuerza)));
    }

    /**
     * Evalúa fuerza de Chica (0-100).
     * 
     * CLAVE: As-As-x-x es casi imbatible. As-4 es el mínimo para querer.
     */
    _evaluarChica(hand) {
        const cartas = this._getCartasOrdenadas(hand, true); // Menor primero
        
        const primera = cartas[0]; // La más baja
        const segunda = cartas[1];
        const tercera = cartas[2];
        const cuarta = cartas[3];

        let fuerza = 0;

        if (primera === 1) { // As/2
            fuerza = 70;
            if (segunda === 1) fuerza += 20;      // Dos ases: 90+
            else if (segunda === 2) fuerza += 15; // As+4: 85 (mínimo bueno)
            else if (segunda === 3) fuerza += 10; // As+5: 80
            else if (segunda === 4) fuerza += 5;  // As+6: 75
            else fuerza -= (segunda - 4) * 3;     // As+7+: penalizar
        } else if (primera === 2) { // 4 (sin as)
            fuerza = 45;
            if (segunda === 2) fuerza += 15;      // Dos 4s: 60
            else if (segunda === 3) fuerza += 8;  // 4+5: 53
            else fuerza -= (segunda - 3) * 2;
        } else {
            // Sin ases ni 4s = mala chica
            fuerza = 30 - (primera - 1) * 5;
        }

        // Penalizar cartas altas
        fuerza -= (tercera + cuarta - 2) * 0.5;

        return Math.min(100, Math.max(0, Math.round(fuerza)));
    }

    // ============================================
    // EVALUACIÓN DE PARES (MEJORADA)
    // ============================================

    /**
     * Detecta y evalúa pares.
     * 
     * IMPORTANTE según las reglas:
     * - Par de ases: NUNCA querer (fuerza muy baja)
     * - Par de reyes: mínimo para querer
     * - Medias: casi siempre ganan
     * - Duples: tienes las de ganar
     */
    _detectarPares(hand) {
        const conteo = {};
        hand.forEach(c => {
            const rank = this._getMusRank(c);
            conteo[rank] = (conteo[rank] || 0) + 1;
        });

        const grupos = Object.entries(conteo).filter(([_, n]) => n >= 2);
        
        if (grupos.length === 0) {
            return { tipo: null, fuerza: 0, ranks: [] };
        }

        // Orden de valor de pares
        const ordenPar = { 'K': 8, 'Q': 7, 'J': 6, '7': 5, '6': 4, '5': 3, '4': 2, 'A': 1 };

        // Duples (4 iguales)
        const cuatro = grupos.find(([_, n]) => n === 4);
        if (cuatro) {
            const valor = ordenPar[cuatro[0]] || 1;
            // Duples de reyes = 100, duples de ases = 75
            const fuerza = 70 + valor * 3.5;
            return { tipo: 'duples', fuerza: Math.min(100, fuerza), ranks: [cuatro[0]] };
        }

        // Medias (3 iguales o 2 parejas distintas)
        const tres = grupos.find(([_, n]) => n === 3);
        if (tres) {
            const valor = ordenPar[tres[0]] || 1;
            // Medias de reyes = 85, medias de ases = 55
            const fuerza = 50 + valor * 4;
            return { tipo: 'medias', fuerza: Math.min(95, fuerza), ranks: [tres[0]] };
        }

        // Dos parejas = medias
        if (grupos.length === 2) {
            const ranks = grupos.map(([r]) => r).sort((a, b) => (ordenPar[b] || 0) - (ordenPar[a] || 0));
            const valor1 = ordenPar[ranks[0]] || 1;
            const valor2 = ordenPar[ranks[1]] || 1;
            // RR+CC = 90, AA+44 = 50
            const fuerza = 40 + valor1 * 4 + valor2 * 2;
            return { tipo: 'medias', fuerza: Math.min(95, fuerza), ranks };
        }

        // Pareja simple
        const par = grupos[0];
        const valor = ordenPar[par[0]] || 1;
        
        // CRÍTICO: Par de ases = NUNCA querer
        // Par de ases: fuerza 5-10 (muy baja)
        // Par de 4s: fuerza 15
        // Par de reyes: fuerza 40 (mínimo aceptable)
        let fuerza;
        if (par[0] === 'A') {
            fuerza = 8; // Par de ases: casi inútil
        } else if (par[0] === '4') {
            fuerza = 15; // Par de 4s: muy malo
        } else if (par[0] === '5') {
            fuerza = 20;
        } else if (par[0] === '6') {
            fuerza = 25;
        } else if (par[0] === '7') {
            fuerza = 30;
        } else if (par[0] === 'J') {
            fuerza = 35; // Par de sotas: aún insuficiente
        } else if (par[0] === 'Q') {
            fuerza = 38; // Par de caballos: límite
        } else { // K (reyes)
            fuerza = 42; // Par de reyes: mínimo para querer
        }

        return { tipo: 'pareja', fuerza, ranks: [par[0]] };
    }

    /**
     * Fuerza de pares (0-100).
     */
    _evaluarPares(hand) {
        const pares = this._detectarPares(hand);
        return pares.fuerza;
    }

    // ============================================
    // EVALUACIÓN DE JUEGO/PUNTO
    // ============================================

    /**
     * Fuerza de Juego (0-100).
     * 31 de mano = imbatible.
     */
    _evaluarJuego(hand) {
        const puntos = this._calcularPuntos(hand);
        if (puntos < 31) return 0;

        // Normalizar puntos > 40
        let puntosNorm = puntos;
        if (puntos > 40) {
            puntosNorm = 33; // Juegos > 40 son como 33 (el peor)
        }

        return FUERZA_JUEGO[puntosNorm] || 15;
    }

    /**
     * Fuerza de Punto (0-100).
     * 30 = mejor, 4 = peor.
     */
    _evaluarPunto(hand) {
        const puntos = this._calcularPuntos(hand);
        if (puntos >= 31) return 0;

        // 30 = 100, 26 = ~80 (mínimo para querer), 4 = 0
        // Escala: (puntos - 4) / 26 * 100
        const fuerza = ((puntos - 4) / 26) * 100;
        return Math.round(fuerza);
    }

    /**
     * Fuerza para un lance específico.
     */
    _evaluarFuerzaLance(hand, lance) {
        switch (lance) {
            case LANCE.GRANDE: return this._evaluarGrande(hand);
            case LANCE.CHICA:  return this._evaluarChica(hand);
            case LANCE.PARES:  return this._evaluarPares(hand);
            case LANCE.JUEGO:  return this._evaluarJuego(hand);
            case LANCE.PUNTO:  return this._evaluarPunto(hand);
            default: return 50;
        }
    }

    // ============================================
    // EVALUACIÓN GENERAL DE MANO
    // ============================================

    _evaluarManoGeneral(hand) {
        const grande = this._evaluarGrande(hand);
        const chica = this._evaluarChica(hand);
        const pares = this._evaluarPares(hand);
        const tieneJuego = this._tieneJuego(hand);
        const juegoOPunto = tieneJuego ? this._evaluarJuego(hand) : this._evaluarPunto(hand);

        // Pesos: pares y juego son los más importantes
        let puntuacion = grande * 0.15 + chica * 0.15 + pares * 0.40 + juegoOPunto * 0.30;
        
        // Bonus por tener juego
        if (tieneJuego) puntuacion += 8;
        
        // Bonus por tener pares (cualquier tipo)
        if (pares > 0) puntuacion += 5;

        return Math.min(100, Math.round(puntuacion));
    }

    // ============================================
    // DECISIÓN DE MUS (MEJORADA)
    // ============================================

    /**
     * Decide si pedir mus o cortar.
     * 
     * REGLA CLAVE: Se corta cuando hay pares + juego, o mano muy buena a algo.
     */
    decideMus(hand) {
        const pares = this._detectarPares(hand);
        const tieneJuego = this._tieneJuego(hand);
        const puntos = this._calcularPuntos(hand);
        const grande = this._evaluarGrande(hand);
        const chica = this._evaluarChica(hand);

        // 1. Duples: SIEMPRE cortar (mano de élite)
        if (pares.tipo === 'duples') {
            return false; // No mus = cortar
        }

        // 2. 31: SIEMPRE cortar (mejor juego)
        if (puntos === 31) {
            return false;
        }

        // 3. Pares + Juego: la razón típica para cortar
        if (pares.tipo && tieneJuego) {
            // Buenos pares (medias, o par de reyes+) + cualquier juego: cortar
            if (pares.fuerza >= 40) {
                return Math.random() < 0.05; // 95% cortar
            }
            // Pares malos (ases, 4s) + mal juego (33): probablemente mus
            if (pares.fuerza < 25 && this._evaluarJuego(hand) < 30) {
                return Math.random() < 0.70; // 70% mus
            }
            // Caso intermedio
            return Math.random() < 0.20; // 80% cortar
        }

        // 4. Medias sin juego pero buenas: cortar
        if (pares.tipo === 'medias' && pares.fuerza >= 70) {
            return Math.random() < 0.15; // 85% cortar
        }

        // 5. Muy buena grande (RRRX o similar): cortar
        if (grande >= 92) {
            return Math.random() < 0.10;
        }

        // 6. Muy buena chica (AAAX o similar): cortar
        if (chica >= 92) {
            return Math.random() < 0.10;
        }

        // 7. Mano general fuerte
        const fuerzaGeneral = this._evaluarManoGeneral(hand);
        if (fuerzaGeneral >= 55) {
            return Math.random() < 0.25; // 75% cortar
        }

        // 8. Mano débil: mus
        if (fuerzaGeneral < 25) {
            return true;
        }

        // 9. Zona intermedia: probabilístico
        const probMus = (55 - fuerzaGeneral) / 55;
        return Math.random() < probMus;
    }

    // ============================================
    // SELECCIÓN DE DESCARTE (MEJORADA)
    // ============================================

    selectDiscard(hand) {
        const pares = this._detectarPares(hand);
        const puntos = this._calcularPuntos(hand);

        // Nunca descartar con duples, medias buenas o 31
        if (pares.tipo === 'duples') return [];
        if (pares.tipo === 'medias' && pares.fuerza >= 60) return [];
        if (puntos === 31) return [];

        // Identificar cartas que son parte de pares
        const conteo = {};
        hand.forEach(c => {
            const rank = this._getMusRank(c);
            conteo[rank] = (conteo[rank] || 0) + 1;
        });

        const analisis = hand.map(card => {
            const musRank = this._getMusRank(card);
            const esPar = conteo[musRank] >= 2;
            const valorGrande = this._getOrdenGrande(card);
            const valorPuntos = this._getValorPuntos(card);
            
            // Calcular valor de la carta
            let valor = 0;
            
            // Si es parte de un par, muy valioso
            if (esPar) valor += 30;
            
            // Valor para grande
            valor += valorGrande * 2;
            
            // Reyes son muy valiosos (grande + pares potenciales)
            if (musRank === 'K') valor += 10;
            
            // Ases son valiosos (chica + pares potenciales)
            if (musRank === 'A') valor += 8;
            
            // Si cerca de juego, cartas altas son buenas
            if (puntos >= 25 && puntos < 31 && valorPuntos >= 7) valor += 8;
            
            // Figuras contribuyen a juego
            if (valorPuntos === 10) valor += 5;
            
            // Cartas medias sueltas (5, 6, 7) son las peores
            if (!esPar && valorGrande >= 3 && valorGrande <= 5) valor -= 5;

            return { card, musRank, esPar, valor };
        });

        // Ordenar por valor (menor = descartar primero)
        analisis.sort((a, b) => a.valor - b.valor);

        // Decidir cuántas descartar
        const fuerzaMano = this._evaluarManoGeneral(hand);
        let numDescartar = 0;
        if (fuerzaMano < 20) numDescartar = 3;
        else if (fuerzaMano < 30) numDescartar = 2;
        else if (fuerzaMano < 45) numDescartar = 1;

        // No descartar cartas de pares
        const descartar = [];
        for (const a of analisis) {
            if (descartar.length >= numDescartar) break;
            if (!a.esPar) {
                descartar.push(a.card);
            }
        }

        return descartar;
    }

    // ============================================
    // DECISIÓN DE ENVITE (MEJORADA)
    // ============================================

    /**
     * Decide la acción de envite.
     * 
     * MEJORAS:
     * - Posición (mano/postre) afecta umbrales
     * - Modelado del rival por acciones previas
     * - Par de ases NUNCA quiere
     */
    decideEnvite(hand, lance, currentBet = 0, gameState = {}) {
        const fuerza = this._evaluarFuerzaLance(hand, lance);
        const ctx = this._buildContext(gameState, lance, fuerza, hand);

        // Órdago activo: decidir si aceptar
        if (ctx.ordagoActivo) {
            return this._decidirRespuestaOrdago(fuerza, lance, ctx, hand);
        }

        // Apertura
        if (currentBet === 0) {
            return this._decidirApertura(fuerza, lance, ctx, hand);
        }

        // Respuesta a envite
        return this._decidirRespuesta(fuerza, currentBet, lance, ctx, hand);
    }

    /**
     * Construye contexto de decisión.
     */
    _buildContext(gameState, lance, fuerza, hand) {
        const {
            marcadorPropio = 0,
            marcadorRival = 0,
            ordagoActivo = false,
            posicion = 'mano',
            parejaYaEnvido = false,
            parejaPaso = false,
            declaracionesPares = {},
            declaracionesJuego = {},
            equipoRival = [],
            piedrasRestantes = 40,
            apuestaRival = 0,
            historialLances = []
        } = gameState;

        const diferencia = marcadorRival - marcadorPropio;
        const piedrasParaGanar = 40 - marcadorPropio;
        const esMano = posicion === 'mano';

        // Inferir fuerza del rival por su acción
        let fuerzaInferidaRival = 50; // Por defecto, media
        if (apuestaRival >= 10) fuerzaInferidaRival = 80;
        else if (apuestaRival >= 5) fuerzaInferidaRival = 70;
        else if (apuestaRival >= 2) fuerzaInferidaRival = 55;
        else if (parejaPaso) fuerzaInferidaRival = 40;

        // Bonus por información de declaraciones
        const infoBonus = this._getInfoBonus(lance, declaracionesPares, declaracionesJuego, equipoRival);

        // Memoria entre lances
        const ajusteLanceMemoria = this._inferirDesdeHistorial(historialLances, lance, equipoRival);

        return {
            ordagoActivo,
            esMano,
            esPostre: !esMano,
            parejaAposto: parejaYaEnvido,
            parejaPaso,
            zonaAdentro: piedrasParaGanar <= 5,
            zonaDesesperada: diferencia > 15,
            piedrasRestantes,
            infoBonus,
            infoVentaja: infoBonus >= 10,
            fuerzaInferidaRival,
            apuestaRival,
            ajusteLanceMemoria,
            marcadorPropio
        };
    }

    /**
     * Bonus/penalización por información de declaraciones.
     */
    _getInfoBonus(lance, declPares, declJuego, rivales) {
        if (rivales.length === 0) return 0;

        if (lance === LANCE.PARES) {
            if (rivales.every(id => declPares[id] === 'no')) return 15;
            if (rivales.some(id => declPares[id] === 'si')) return -10;
        }

        if (lance === LANCE.JUEGO) {
            if (rivales.every(id => declJuego[id] === 'no')) return 15;
            if (rivales.some(id => declJuego[id] === 'si')) return -5;
        }

        return 0;
    }

    /**
     * Infiere ajustes desde el historial de lances anteriores en esta ronda.
     * Negativo = rival parece débil = apostar más agresivo.
     * Positivo = rival parece fuerte = ser más cauto.
     */
    _inferirDesdeHistorial(historial, lanceActual, rivales) {
        if (!historial || historial.length === 0) return 0;

        let ajuste = 0;

        for (const h of historial) {
            // ¿El rival apostó fuerte en este lance?
            const rivalAposto = rivales.some(r => h.respuestas[r] === 'envido' || h.respuestas[r] === 'ordago');
            const rivalPaso = rivales.every(r => h.respuestas[r] === 'paso' || !h.respuestas[r]);

            if (rivalAposto && h.apuestaFinal >= 3) {
                // Rival apostó fuerte en Grande → probablemente tiene reyes → chica débil
                if (h.lance === 'grande' && lanceActual === 'chica') ajuste -= 10;
                // Rival apostó fuerte en Chica → probablemente tiene ases → grande débil
                if (h.lance === 'chica' && lanceActual === 'grande') ajuste -= 10;
                // Rival apostó fuerte en Pares → puede tener juego también
                if (h.lance === 'pares' && (lanceActual === 'juego' || lanceActual === 'punto')) ajuste += 5;
            }

            if (rivalPaso) {
                ajuste -= 3;
            }
        }

        return Math.max(-20, Math.min(20, ajuste));
    }

    // ============================================
    // UMBRALES POR LANCE
    // ============================================

    /**
     * Umbrales mínimos para cada lance.
     * Ajustados según las pautas del MUS.
     */
    _getUmbrales(lance, esMano) {
        const umbrales = {
            [LANCE.GRANDE]: {
                apostar: 70,      // Rey + Caballo mínimo
                querer: 65,       // Rey + Sota mínimo
                quererMano: 60    // De mano empatas, puedes arriesgar más
            },
            [LANCE.CHICA]: {
                apostar: 70,      // As + 4 mínimo
                querer: 65,       // As + 5 aceptable
                quererMano: 60
            },
            [LANCE.PARES]: {
                apostar: 42,      // Par de reyes mínimo
                querer: 40,       // Par de reyes mínimo
                quererMano: 38,
                minAbsoluto: 20   // Par de ases (8) NUNCA quiere
            },
            [LANCE.JUEGO]: {
                apostar: 30,      // Cualquier juego
                querer: 25,       // 34+ de postre
                quererMano: 15    // De mano solo pierdes con 31 (si tienes 32)
            },
            [LANCE.PUNTO]: {
                apostar: 80,      // 26 puntos mínimo
                querer: 75,       // 25 puntos
                quererMano: 70
            }
        };

        const u = umbrales[lance] || { apostar: 50, querer: 45, quererMano: 40 };
        return {
            apostar: u.apostar,
            querer: esMano ? u.quererMano : u.querer,
            minAbsoluto: u.minAbsoluto || 0
        };
    }

    // ============================================
    // BLUFFING ESTRATÉGICO
    // ============================================

    /**
     * Calcula si debe farolear y con cuánto.
     * @returns {object|null} null si no farol, {amount} si farol
     */
    _calcularFarol(lance, ctx) {
        // Nunca farol en zona adentro
        if (ctx.zonaAdentro) return null;

        // Tasa base por lance
        const tasaBase = {
            [LANCE.GRANDE]: 0.08,
            [LANCE.CHICA]: 0.08,
            [LANCE.JUEGO]: 0.05,
            [LANCE.PARES]: 0.03,
            [LANCE.PUNTO]: 0.02
        };

        let tasa = tasaBase[lance] || 0.03;

        // Ajustes
        if (ctx.esPostre) tasa += 0.03;
        if (ctx.ajusteLanceMemoria < -5) tasa += 0.02;
        if (ctx.parejaAposto) tasa += 0.02;
        if (ctx.zonaDesesperada) tasa += 0.05;

        if (Math.random() >= tasa) return null;

        // Sizing del farol
        const r = Math.random();
        let amount;
        if (r < 0.70) amount = 2;
        else if (r < 0.95) amount = 3;
        else amount = 4 + Math.floor(Math.random() * 2);

        return { amount };
    }

    // ============================================
    // BET SIZING
    // ============================================

    /**
     * Calcula la apuesta proporcional al margen y contexto.
     */
    _calcularApuesta(margen, ctx) {
        let amount;
        if (margen >= 25) amount = 5;
        else if (margen >= 15) amount = 4;
        else if (margen >= 8) amount = 3;
        else amount = 2;

        // Caps por contexto
        if (ctx.piedrasRestantes <= 10 && amount > 3) amount = 3;
        if (ctx.zonaAdentro && amount > 2) amount = 2;
        if (ctx.zonaDesesperada && margen >= 15) amount += 1;

        return amount;
    }

    // ============================================
    // ÓRDAGO
    // ============================================

    _getUmbralOrdago(lance) {
        return {
            [LANCE.GRANDE]: { apertura: 95, aceptar: 88 },
            [LANCE.CHICA]:  { apertura: 95, aceptar: 88 },
            [LANCE.PARES]:  { apertura: 90, aceptar: 82 },
            [LANCE.JUEGO]:  { apertura: 92, aceptar: 85 },
            [LANCE.PUNTO]:  { apertura: 95, aceptar: 88 }
        }[lance] || { apertura: 95, aceptar: 85 };
    }

    _decidirRespuestaOrdago(fuerza, lance, ctx, hand) {
        // Caso especial: 31 de mano en juego = SIEMPRE aceptar
        if (lance === LANCE.JUEGO && fuerza === 100 && ctx.esMano) {
            return { action: ACCION.QUIERO, amount: 0 };
        }

        // Caso especial: par de ases en pares = NUNCA aceptar
        if (lance === LANCE.PARES) {
            const pares = this._detectarPares(hand);
            if (pares.tipo === 'pareja' && pares.ranks[0] === 'A') {
                return { action: ACCION.NO_QUIERO, amount: 0 };
            }
        }

        const umbrales = this._getUmbralOrdago(lance);
        let umbralAceptar = umbrales.aceptar;

        // Ajustes por contexto
        if (ctx.zonaAdentro) umbralAceptar += 5;
        if (ctx.zonaDesesperada) umbralAceptar -= 8;
        if (ctx.infoVentaja) umbralAceptar -= 5;
        if (ctx.esMano && (lance === LANCE.GRANDE || lance === LANCE.JUEGO)) {
            umbralAceptar -= 3; // Ventaja de empate
        }

        // Mejora 2: fuerzaInferidaRival
        if (ctx.fuerzaInferidaRival >= 80) umbralAceptar += 3;

        // Mejora 4: coordinación con compañero
        if (ctx.parejaAposto) umbralAceptar -= 3;
        if (ctx.parejaPaso) umbralAceptar += 2;

        if (fuerza >= umbralAceptar) {
            return { action: ACCION.QUIERO, amount: 0 };
        }
        return { action: ACCION.NO_QUIERO, amount: 0 };
    }

    // ============================================
    // APERTURA DE ENVITE
    // ============================================

    _decidirApertura(fuerza, lance, ctx, hand) {
        const umbrales = this._getUmbrales(lance, ctx.esMano);

        // Piso absoluto (ej: par de ases nunca apuesta)
        if (fuerza < umbrales.minAbsoluto) {
            return { action: ACCION.PASO, amount: 0 };
        }

        // Mejora 3: ajuste por memoria entre lances
        let umbralApostar = umbrales.apostar;
        umbralApostar += ctx.ajusteLanceMemoria;

        // Mejora 4: coordinación con compañero
        if (ctx.parejaAposto) umbralApostar -= 5;
        if (ctx.parejaPaso && fuerza < umbralApostar + 10) umbralApostar += 2;

        // Por debajo del mínimo: paso (o farol)
        if (fuerza < umbralApostar) {
            // Mejora 5: bluffing estratégico
            if (fuerza > 25) {
                const farol = this._calcularFarol(lance, ctx);
                if (farol) {
                    return { action: ACCION.ENVIDO, amount: farol.amount };
                }
            }
            return { action: ACCION.PASO, amount: 0 };
        }

        // ¿Órdago?
        const umbralOrd = this._getUmbralOrdago(lance);
        if (fuerza >= umbralOrd.apertura && !ctx.zonaAdentro) {
            // 31 de mano: órdago más agresivo
            if (lance === LANCE.JUEGO && fuerza === 100 && ctx.esMano) {
                if (Math.random() < 0.35) {
                    return { action: ACCION.ORDAGO, amount: ctx.piedrasRestantes };
                }
            }
            // Otros casos
            if (Math.random() < 0.20) {
                return { action: ACCION.ORDAGO, amount: ctx.piedrasRestantes };
            }
        }

        // Trap de mano: con mano muy fuerte, paso para cazar
        if (ctx.esMano && fuerza >= 93 && Math.random() < 0.30) {
            return { action: ACCION.PASO, amount: 0 };
        }

        // Mejora 6: bet sizing
        const margen = fuerza - umbralApostar;

        // Zona adentro: conservador
        if (ctx.zonaAdentro) {
            return { action: ACCION.ENVIDO, amount: 2 };
        }

        const amount = this._calcularApuesta(margen, ctx);
        return { action: ACCION.ENVIDO, amount };
    }

    // ============================================
    // RESPUESTA A ENVITE
    // ============================================

    _decidirRespuesta(fuerza, currentBet, lance, ctx, hand) {
        const umbrales = this._getUmbrales(lance, ctx.esMano);

        // Piso absoluto: NUNCA aceptar
        if (fuerza < umbrales.minAbsoluto) {
            return { action: ACCION.NO_QUIERO, amount: 0 };
        }

        // Caso especial: par de ases en pares = NUNCA querer
        if (lance === LANCE.PARES) {
            const pares = this._detectarPares(hand);
            if (pares.tipo === 'pareja' && pares.ranks[0] === 'A') {
                return { action: ACCION.NO_QUIERO, amount: 0 };
            }
        }

        // Calcular umbral de querer con ajustes
        let umbralQuerer = umbrales.querer;

        // Mejora 2: fuerzaInferidaRival
        if (ctx.fuerzaInferidaRival >= 70) umbralQuerer += 5;
        else if (ctx.fuerzaInferidaRival >= 55) umbralQuerer += 2;

        // Mejora 3: memoria entre lances
        umbralQuerer += ctx.ajusteLanceMemoria;

        // Mejora 4: coordinación con compañero
        if (ctx.parejaPaso) umbralQuerer += 3;
        if (ctx.parejaAposto) umbralQuerer -= 3;

        // Por debajo del mínimo para querer
        if (fuerza < umbralQuerer) {
            // Apuesta pequeña con fuerza cercana: a veces querer
            if (currentBet <= 2 && fuerza >= umbralQuerer - 5) {
                if (Math.random() < 0.3) {
                    return { action: ACCION.QUIERO, amount: currentBet };
                }
            }
            return { action: ACCION.NO_QUIERO, amount: 0 };
        }

        // Margen sobre el mínimo
        const margen = fuerza - umbralQuerer;

        // Apuestas altas: ser más selectivo
        if (currentBet >= 8) {
            // Solo aceptar con mano muy fuerte
            if (margen >= 25) {
                return { action: ACCION.QUIERO, amount: currentBet };
            }
            if (margen >= 15 && Math.random() < 0.5) {
                return { action: ACCION.QUIERO, amount: currentBet };
            }
            return { action: ACCION.NO_QUIERO, amount: 0 };
        }

        // Zona adentro: conservador
        if (ctx.zonaAdentro) {
            if (margen >= 10) {
                return { action: ACCION.QUIERO, amount: currentBet };
            }
            if (currentBet <= 3 && margen >= 0) {
                return { action: ACCION.QUIERO, amount: currentBet };
            }
            return { action: ACCION.NO_QUIERO, amount: 0 };
        }

        // ¿Contra-subir?
        const umbralOrd = this._getUmbralOrdago(lance);
        if (fuerza >= umbralOrd.apertura && currentBet >= 4 && Math.random() < 0.20) {
            return { action: ACCION.ORDAGO, amount: ctx.piedrasRestantes };
        }

        // Mejora 6: subir con bet sizing
        if (margen >= 30 && Math.random() < 0.40) {
            const raise = this._calcularApuesta(margen, ctx);
            return { action: ACCION.ENVIDO, amount: Math.min(currentBet + raise, ctx.piedrasRestantes) };
        }
        if (margen >= 20 && Math.random() < 0.25) {
            const raise = this._calcularApuesta(margen, ctx);
            return { action: ACCION.ENVIDO, amount: Math.min(currentBet + raise, ctx.piedrasRestantes) };
        }

        // Aceptar
        return { action: ACCION.QUIERO, amount: currentBet };
    }

    // ============================================
    // MÉTODOS PÚBLICOS
    // ============================================

    tienePares(hand) { return this._detectarPares(hand).tipo !== null; }
    tieneJuego(hand) { return this._tieneJuego(hand); }
    getTipoPares(hand) { return this._detectarPares(hand).tipo; }
    getPuntos(hand) { return this._calcularPuntos(hand); }
    evaluarLance(hand, lance) { return this._evaluarFuerzaLance(hand, lance); }
    setDificultad(_d) {} // No-op para compatibilidad
}

export { LANCE, ACCION, DIFICULTAD };
export default AIPlayer;