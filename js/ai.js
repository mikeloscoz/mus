/**
 * IA para el MUS — Sistema experto heuristico
 *
 * Sin niveles de dificultad. Un unico jugador competente basado en:
 *   - Evaluacion correcta de cartas (3=R, 2=As para TODO)
 *   - Umbrales de ordago muy altos por lance
 *   - Decisiones basadas en fuerza BRUTA (sin inflacion por bonuses)
 *   - Contexto (declaraciones, posicion, marcador) ajusta umbrales, NO fuerza
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

// Se mantiene por compatibilidad con main.js
const DIFICULTAD = {
    FACIL: 'facil',
    MEDIO: 'medio',
    DIFICIL: 'dificil'
};

// Umbrales de ordago por lance — solo se hace ordago con manos de elite
const ORDAGO = {
    // Para ABRIR ordago (fuerzaBruta minima)
    apertura: {
        [LANCE.GRANDE]: { umbral: 97, prob: 0.25 },
        [LANCE.CHICA]:  { umbral: 97, prob: 0.25 },
        [LANCE.PARES]:  { umbral: 93, prob: 0.20 },
        [LANCE.JUEGO]:  { umbral: 95, prob: 0.25 },
        [LANCE.PUNTO]:  { umbral: 97, prob: 0.15 }
    },
    // Para ACEPTAR ordago del rival (fuerzaBruta minima)
    aceptar: {
        [LANCE.GRANDE]: 85,
        [LANCE.CHICA]:  85,
        [LANCE.PARES]:  80,
        [LANCE.JUEGO]:  82,
        [LANCE.PUNTO]:  85
    }
};

// Umbrales minimos por lance — basados en heuristicos reales de mus
// Grande: minimo R+C para querer. Chica: minimo As+4.
// Pares: par de ases NUNCA, par de reyes minimo. Medias casi siempre ganan.
// Juego: 31 mejor (mano imbatible). 32/40 se puede querer.
// Punto: 26 puntos minimo para querer.
const UMBRALES_LANCE = {
    // Minimo para ABRIR envite (apostar)
    apostar: {
        [LANCE.GRANDE]: 65,   // R + C minimo
        [LANCE.CHICA]:  65,   // As + 4 minimo
        [LANCE.PARES]:  28,   // Par de reyes minimo (par ases = ~12, nunca)
        [LANCE.JUEGO]:  30,   // Cualquier juego
        [LANCE.PUNTO]:  85    // 26 puntos minimo
    },
    // Minimo ABSOLUTO para ACEPTAR envite (quiero) — por debajo: siempre no quiero
    quiero: {
        [LANCE.GRANDE]: 60,   // R + C o cerca
        [LANCE.CHICA]:  60,   // As + 4 o cerca
        [LANCE.PARES]:  25,   // Par de reyes minimo
        [LANCE.JUEGO]:  25,   // Cualquier juego
        [LANCE.PUNTO]:  82    // ~25-26 puntos
    }
};

/**
 * Jugador IA para el MUS
 */
export class AIPlayer {
    /**
     * @param {string} [_dificultad] - Ignorado. Se mantiene por compatibilidad.
     */
    constructor(_dificultad) {
        // No se usa dificultad — un unico jugador competente
    }

    // ==========================================
    // VALORES DE CARTA
    // ==========================================

    /**
     * Valor numerico para juego/punto.
     * En mus: figuras (R,C,S) y 3 = 10 puntos. 2 y As = 1.
     */
    _getCardValue(card) {
        const rank = card.rank;
        if (rank === 'K' || rank === '3') return 10;
        if (rank === 'Q') return 10;  // Caballo = 10 puntos
        if (rank === 'J') return 10;  // Sota = 10 puntos
        if (rank === '2' || rank === 'A' || rank === '1') return 1;
        return parseInt(rank) || 0;
    }

    /**
     * Orden para GRANDE (mayor gana).
     * R/3 > C > S > 7 > 6 > 5 > 4 > 2/As
     * En mus el 2 cuenta como As.
     */
    _getGrandeOrder(card) {
        const rank = card.rank;
        if (rank === 'K' || rank === '3') return 10;
        if (rank === 'Q') return 9;
        if (rank === 'J') return 8;
        if (rank === '7') return 7;
        if (rank === '6') return 6;
        if (rank === '5') return 5;
        if (rank === '4') return 4;
        // 2 = As en mus
        if (rank === '2' || rank === 'A' || rank === '1') return 1;
        return parseInt(rank) || 0;
    }

    /**
     * Orden para CHICA (menor gana). Inverso de grande.
     */
    _getChicaOrder(card) {
        return 11 - this._getGrandeOrder(card);
    }

    /**
     * Normaliza rank para agrupacion de pares: 3→K, 2→A
     */
    _getMusRank(card) {
        const rank = card.rank;
        if (rank === '3') return 'K';
        if (rank === '2') return 'A';
        if (rank === '1') return 'A';
        return rank;
    }

    // ==========================================
    // EVALUACION DE MANO
    // ==========================================

    /**
     * Fuerza para GRANDE (0-100). Peso ponderado de cartas ordenadas desc.
     */
    _evaluarGrande(hand) {
        const valores = hand.map(c => this._getGrandeOrder(c)).sort((a, b) => b - a);
        const peso = valores[0] * 4 + valores[1] * 3 + valores[2] * 2 + valores[3];
        const maxPeso = 10 * 4 + 10 * 3 + 10 * 2 + 10; // 100
        const minPeso = 1 * 4 + 1 * 3 + 1 * 2 + 1;     // 10
        return Math.round(((peso - minPeso) / (maxPeso - minPeso)) * 100);
    }

    /**
     * Fuerza para CHICA (0-100). Menor es mejor.
     */
    _evaluarChica(hand) {
        const valores = hand.map(c => this._getGrandeOrder(c)).sort((a, b) => a - b);
        const peso = valores[0] * 4 + valores[1] * 3 + valores[2] * 2 + valores[3];
        const maxPeso = 10 * 4 + 10 * 3 + 10 * 2 + 10;
        const minPeso = 1 * 4 + 1 * 3 + 1 * 2 + 1;
        return Math.round(((maxPeso - peso) / (maxPeso - minPeso)) * 100);
    }

    /**
     * Detecta pares en una mano.
     * Agrupa 3→K y 2→A correctamente.
     * @returns {{tipo: string|null, rank?: string, ranks?: string[], fuerza: number}}
     */
    _detectarPares(hand) {
        const conteo = {};
        hand.forEach(card => {
            const rank = this._getMusRank(card);
            conteo[rank] = (conteo[rank] || 0) + 1;
        });

        const pares = Object.entries(conteo).filter(([_, count]) => count >= 2);

        if (pares.length === 0) {
            return { tipo: null, fuerza: 0 };
        }

        const ordenPares = { 'K': 10, 'Q': 9, 'J': 8, '7': 7, '6': 6, '5': 5, '4': 4, 'A': 1 };

        // Duples: 4 iguales
        const cuatro = pares.find(([_, count]) => count === 4);
        if (cuatro) {
            const fuerza = 70 + (ordenPares[cuatro[0]] || 0) * 3;
            return { tipo: 'duples', rank: cuatro[0], fuerza };
        }

        // Dos parejas distintas = medias
        if (pares.length === 2 && pares.every(([_, count]) => count === 2)) {
            const ranks = pares.map(([rank]) => rank).sort((a, b) => (ordenPares[b] || 0) - (ordenPares[a] || 0));
            const fuerza = 40 + (ordenPares[ranks[0]] || 0) * 3 + (ordenPares[ranks[1]] || 0);
            return { tipo: 'medias', ranks, fuerza };
        }

        // Trio (par + una extra del mismo valor en mano de 4 = medias en mus)
        const trio = pares.find(([_, count]) => count === 3);
        if (trio) {
            const fuerza = 50 + (ordenPares[trio[0]] || 0) * 3;
            return { tipo: 'medias', rank: trio[0], fuerza };
        }

        // Par simple
        const par = pares[0];
        const fuerza = 10 + (ordenPares[par[0]] || 0) * 2;
        return { tipo: 'pareja', rank: par[0], fuerza };
    }

    /**
     * Fuerza de PARES (0-100). 0 si no tiene pares.
     */
    _evaluarPares(hand) {
        const pares = this._detectarPares(hand);
        if (!pares.tipo) return 0;
        return Math.min(100, pares.fuerza);
    }

    /**
     * Suma de puntos de la mano (para juego/punto).
     */
    _calcularPuntos(hand) {
        return hand.reduce((sum, card) => sum + this._getCardValue(card), 0);
    }

    /**
     * ¿Tiene juego (>= 31)?
     */
    _tieneJuego(hand) {
        return this._calcularPuntos(hand) >= 31;
    }

    /**
     * Fuerza del JUEGO (0-100). Jerarquia: 31 > 32 > 40 > 37 > 36 > 35 > 34 > 33
     */
    _evaluarJuego(hand) {
        const puntos = this._calcularPuntos(hand);
        if (puntos < 31) return 0;

        const fuerzaJuego = {
            31: 100, 32: 90, 40: 80, 37: 70, 36: 60, 35: 50, 34: 40, 33: 30
        };

        if (puntos > 40) {
            return Math.max(10, 80 - (puntos - 40) * 5);
        }

        return fuerzaJuego[puntos] || 30;
    }

    /**
     * Fuerza del PUNTO (0-100). Solo si no tiene juego. 30 = max.
     */
    _evaluarPunto(hand) {
        const puntos = this._calcularPuntos(hand);
        if (puntos >= 31) return 0;
        return Math.round(((puntos - 4) / (30 - 4)) * 100);
    }

    /**
     * Fuerza general de la mano (para decidir mus/descarte).
     */
    _evaluarManoGeneral(hand) {
        const grande = this._evaluarGrande(hand);
        const chica = this._evaluarChica(hand);
        const pares = this._evaluarPares(hand);
        const tieneJuego = this._tieneJuego(hand);
        const juegoOPunto = tieneJuego ? this._evaluarJuego(hand) : this._evaluarPunto(hand);

        let puntuacion = (grande * 0.2) + (chica * 0.2) + (pares * 0.35) + (juegoOPunto * 0.25);
        if (tieneJuego) puntuacion += 10;
        if (pares > 0) puntuacion += 5;

        return Math.min(100, puntuacion);
    }

    /**
     * Fuerza para un lance especifico.
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

    // ==========================================
    // DECISION DE MUS
    // ==========================================

    /**
     * Decide si pedir mus o cortar.
     * @returns {boolean} true = quiere mus
     */
    decideMus(hand) {
        const fuerzaMano = this._evaluarManoGeneral(hand);
        const pares = this._detectarPares(hand);
        const tieneJuego = this._tieneJuego(hand);
        const puntos = this._calcularPuntos(hand);
        const fuerzaPares = this._evaluarPares(hand);
        const fuerzaJuego = tieneJuego ? this._evaluarJuego(hand) : 0;

        // Duples: cortar siempre (jugada de elite)
        if (pares.tipo === 'duples') return Math.random() < 0.03;

        // 31 (mejor juego): cortar
        if (puntos === 31) return Math.random() < 0.08;

        // Pares + juego: la razon tipica para cortar, PERO depende de la calidad.
        // Con malos pares (ases) y mal juego (33) sin estar de mano → mus.
        if (pares.tipo && tieneJuego) {
            // Buenos pares (par reyes+ o medias) + buen juego (40, 32, 31)
            if (fuerzaPares >= 30 && fuerzaJuego >= 70) {
                return Math.random() < 0.08; // 92% cortar
            }
            // Pares decentes + juego aceptable
            if (fuerzaPares >= 25 && fuerzaJuego >= 40) {
                return Math.random() < 0.25; // 75% cortar
            }
            // Malos pares (ases/4s) o mal juego (33): mus la mayoria
            if (fuerzaPares < 20 || fuerzaJuego < 40) {
                return Math.random() < 0.65; // 65% mus
            }
            // Intermedio
            return Math.random() < 0.35; // 65% cortar
        }

        // Medias fuertes sin juego: cortar
        if (pares.tipo === 'medias' && fuerzaPares > 60) return Math.random() < 0.10;

        // Mano fuerte general: cortar
        if (fuerzaMano >= 45) return false;

        // Mano debil: pedir mus
        if (fuerzaMano < 25) return true;

        // Zona intermedia: probabilistico
        const probMus = (45 - fuerzaMano) / 45;
        return Math.random() < probMus;
    }

    // ==========================================
    // SELECCION DE DESCARTE
    // ==========================================

    /**
     * Selecciona cartas a descartar.
     * @returns {Array} Cartas a descartar
     */
    selectDiscard(hand) {
        const pares = this._detectarPares(hand);
        const puntos = this._calcularPuntos(hand);
        const tieneJuego = this._tieneJuego(hand);

        // Nunca descartar con duples, medias buenas o 31
        if (pares.tipo === 'duples' || (pares.tipo === 'medias' && pares.fuerza > 50)) return [];
        if (puntos === 31) return [];

        // Marcar cartas de pares
        const analisis = hand.map((card, index) => {
            const musRank = this._getMusRank(card);
            return {
                card, index, musRank,
                valorGrande: this._getGrandeOrder(card),
                valorPuntos: this._getCardValue(card),
                esPar: false
            };
        });

        const conteo = {};
        analisis.forEach((a, idx) => {
            if (!conteo[a.musRank]) conteo[a.musRank] = [];
            conteo[a.musRank].push(idx);
        });
        Object.values(conteo).forEach(indices => {
            if (indices.length >= 2) indices.forEach(idx => { analisis[idx].esPar = true; });
        });

        // Si tiene par + cerca de juego (27-30), descartar carta que no aporta
        if (pares.tipo && puntos >= 27 && puntos <= 30) {
            const noPar = analisis.filter(a => !a.esPar);
            const candidatas = noPar.filter(a => puntos - a.valorPuntos + 10 >= 31);
            if (candidatas.length > 0) {
                candidatas.sort((a, b) => a.valorPuntos - b.valorPuntos);
                return [candidatas[0].card];
            }
        }

        // Mano de ases (buena para chica): no descartar
        const numAses = hand.filter(c => {
            const r = this._getMusRank(c);
            return r === 'A';
        }).length;
        if (numAses >= 3) return [];

        // Evaluar valor de cada carta
        analisis.forEach(a => {
            let valor = 0;
            valor += a.valorGrande * 2;       // Grande
            if (a.esPar) valor += 25;          // Parte de par
            if (!tieneJuego && a.valorPuntos >= 7) valor += 10; // Contribuye a juego
            // Penalizar cartas medias sueltas
            if (a.valorGrande >= 4 && a.valorGrande <= 7 && !a.esPar) valor -= 10;
            // Ases valiosos (chica)
            if (a.musRank === 'A') valor += 8;
            a.valorTotal = valor;
        });

        const ordenadas = [...analisis].sort((a, b) => a.valorTotal - b.valorTotal);
        const fuerzaMano = this._evaluarManoGeneral(hand);

        let numDescartar = 0;
        if (fuerzaMano < 20) numDescartar = 3;
        else if (fuerzaMano < 35) numDescartar = 2;
        else if (fuerzaMano < 50) numDescartar = 1;

        const descartar = [];
        for (let i = 0; i < numDescartar && i < ordenadas.length; i++) {
            if (!ordenadas[i].esPar) descartar.push(ordenadas[i].card);
        }
        return descartar;
    }

    // ==========================================
    // DECISION DE ENVITE
    // ==========================================

    /**
     * Decide la accion de envite para un lance.
     * La fuerza bruta se usa para ordagos (sin inflacion).
     * El contexto ajusta UMBRALES de apuesta, no la fuerza.
     */
    decideEnvite(hand, lance, currentBet = 0, gameState = {}) {
        const fuerza = this._evaluarFuerzaLance(hand, lance);
        const ctx = this._buildContext(gameState, lance, fuerza);

        // Ordago activo: aceptar o rechazar
        if (ctx.ordagoActivo) {
            return this._decidirRespuestaOrdago(fuerza, lance, ctx);
        }

        // Apertura (sin apuesta previa)
        if (currentBet === 0) {
            return this._decidirApertura(fuerza, lance, ctx);
        }

        // Respuesta a apuesta existente
        return this._decidirRespuesta(fuerza, currentBet, lance, ctx);
    }

    /**
     * Construye el contexto de la decision a partir del gameState.
     */
    _buildContext(gameState, lance, fuerza) {
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
            piedrasRestantes = 40
        } = gameState;

        const diferencia = marcadorRival - marcadorPropio;
        const piedrasParaGanar = 40 - marcadorPropio;

        const infoBonus = this._getInfoBonus(lance, declaracionesPares, declaracionesJuego, equipoRival);

        return {
            ordagoActivo,
            esPostre: posicion === 'postre',
            parejaAposto: parejaYaEnvido,
            parejaPaso,
            zonaAdentro: piedrasParaGanar <= 5,
            zonaDesesperada: diferencia > 15,
            piedrasRestantes,
            infoBonus,
            infoVentaja: infoBonus >= 10
        };
    }

    /**
     * Bonus informacional por declaraciones de rivales.
     * Se usa para ajustar umbrales, no para inflar fuerza.
     * @returns {number} 0-15
     */
    _getInfoBonus(lance, declPares, declJuego, rivales) {
        if (rivales.length === 0) return 0;

        if (lance === LANCE.PARES) {
            if (rivales.every(id => declPares[id] === 'no')) return 15;
            if (rivales.some(id => declPares[id] === 'si')) return -5;
        }

        if (lance === LANCE.JUEGO) {
            if (rivales.every(id => declJuego[id] === 'no')) return 15;
            if (rivales.some(id => declJuego[id] === 'si')) return -5;
        }

        if (lance === LANCE.GRANDE || lance === LANCE.CHICA) {
            if (rivales.every(id => declPares[id] === 'no')) return 3;
        }

        return 0;
    }

    // ==========================================
    // ORDAGO — Decisiones separadas y conservadoras
    // ==========================================

    /**
     * ¿Debemos ABRIR ordago?
     * Usa fuerza BRUTA — ningun bonus puede hacer que una mano mala haga ordago.
     */
    _debeOrdagoApertura(fuerza, lance, ctx) {
        // Nunca ordago en zona adentro (cerca de ganar)
        if (ctx.zonaAdentro) return false;

        // Caso especial: 31 de mano en juego = nadie te gana, ordago mas agresivo
        if (lance === LANCE.JUEGO && fuerza === 100 && !ctx.esPostre) {
            return Math.random() < 0.40;
        }

        const config = ORDAGO.apertura[lance];
        if (!config) return false;

        let umbral = config.umbral;
        let prob = config.prob;

        // Zona desesperada: bajar umbral -5
        if (ctx.zonaDesesperada) {
            umbral -= 5;
            prob += 0.10;
        }

        // Info ventaja: bajar umbral -3
        if (ctx.infoVentaja) {
            umbral -= 3;
        }

        if (fuerza < umbral) return false;
        return Math.random() < prob;
    }

    /**
     * ¿Debemos aceptar un ordago?
     * Solo con manos genuinamente fuertes.
     */
    _decidirRespuestaOrdago(fuerza, lance, ctx) {
        // Caso especial: 31 de mano en juego = imbatible, siempre quiero
        if (lance === LANCE.JUEGO && fuerza === 100 && !ctx.esPostre) {
            return { action: ACCION.QUIERO, amount: 0 };
        }

        // Piso absoluto del lance — por debajo, nunca aceptar ordago
        const minQuiero = UMBRALES_LANCE.quiero[lance] || 40;
        if (fuerza < minQuiero) {
            return { action: ACCION.NO_QUIERO, amount: 0 };
        }

        let umbral = ORDAGO.aceptar[lance] || 85;

        // Zona adentro: mas conservador (+5)
        if (ctx.zonaAdentro) umbral += 5;

        // Zona desesperada: mas agresivo (-5)
        if (ctx.zonaDesesperada) umbral -= 5;

        // Info ventaja: algo mas agresivo (-5)
        if (ctx.infoVentaja) umbral -= 5;

        if (fuerza >= umbral) {
            return { action: ACCION.QUIERO, amount: 0 };
        }
        return { action: ACCION.NO_QUIERO, amount: 0 };
    }

    // ==========================================
    // APERTURA DE ENVITE
    // ==========================================

    /**
     * Decide apuesta de apertura (sin apuesta previa).
     * Contexto ajusta umbrales de apuesta, fuerza bruta decide ordago.
     */
    _decidirApertura(fuerza, lance, ctx) {
        const minApostar = UMBRALES_LANCE.apostar[lance] || 50;

        // 1. Por debajo del minimo del lance: siempre paso (farol raro)
        if (fuerza < minApostar) {
            // Farol: raro, apuesta pequeña, NUNCA ordago
            if (fuerza > 15 && Math.random() < 0.04) {
                return { action: ACCION.ENVIDO, amount: 2 };
            }
            return { action: ACCION.PASO, amount: 0 };
        }

        // 2. ¿Ordago? (usa fuerza bruta, no inflada)
        if (this._debeOrdagoApertura(fuerza, lance, ctx)) {
            return { action: ACCION.ORDAGO, amount: ctx.piedrasRestantes };
        }

        // 3. Trap de mano: con mano muy fuerte, paso para cazar
        if (!ctx.esPostre && fuerza > 95 && Math.random() < 0.25) {
            return { action: ACCION.PASO, amount: 0 };
        }

        // 4. Contexto ajusta umbrales de apuesta (no ordago)
        let ajuste = 0;
        if (ctx.infoVentaja) ajuste += 5;
        if (ctx.esPostre) ajuste += 3;
        if (ctx.parejaAposto) ajuste += 3;
        if (ctx.parejaPaso && fuerza < 50) ajuste -= 5;

        const f = fuerza + ajuste;

        // 5. Zona adentro: conservador
        if (ctx.zonaAdentro) {
            if (f >= minApostar) return { action: ACCION.ENVIDO, amount: 2 };
            return { action: ACCION.PASO, amount: 0 };
        }

        // 6. Apuesta proporcional al margen sobre el minimo
        const margen = f - minApostar;
        if (margen >= 25) return { action: ACCION.ENVIDO, amount: 5 };
        if (margen >= 15) return { action: ACCION.ENVIDO, amount: 3 };
        if (margen >= 5)  return { action: ACCION.ENVIDO, amount: 2 };

        // Justo en el minimo: envido 2 con probabilidad
        if (Math.random() < 0.6) return { action: ACCION.ENVIDO, amount: 2 };
        return { action: ACCION.PASO, amount: 0 };
    }

    // ==========================================
    // RESPUESTA A ENVITE
    // ==========================================

    /**
     * Decide respuesta a apuesta existente.
     */
    _decidirRespuesta(fuerza, currentBet, lance, ctx) {
        const minQuiero = UMBRALES_LANCE.quiero[lance] || 40;

        // Piso absoluto del lance: por debajo NUNCA aceptar
        if (fuerza < minQuiero) {
            return { action: ACCION.NO_QUIERO, amount: 0 };
        }

        // Contexto ajusta umbrales (no fuerza de ordago)
        let ajuste = 0;
        if (ctx.infoVentaja) ajuste += 5;
        if (ctx.esPostre) ajuste += 3;
        if (ctx.parejaAposto) ajuste += 3;
        if (ctx.parejaPaso && fuerza < 50) ajuste -= 5;

        const f = fuerza + ajuste;

        // Zona adentro: conservador, nunca ordago
        if (ctx.zonaAdentro) {
            if (f >= minQuiero + 10) return { action: ACCION.QUIERO, amount: currentBet };
            if (currentBet <= 2) return { action: ACCION.QUIERO, amount: currentBet };
            return { action: ACCION.NO_QUIERO, amount: 0 };
        }

        // Margen sobre el minimo del lance
        const margen = f - minQuiero;

        // Apuestas altas (>= 10): ser mas selectivo, tender a aceptar o fold
        if (currentBet >= 10) {
            if (fuerza >= (ORDAGO.aceptar[lance] || 85)) {
                return { action: ACCION.QUIERO, amount: currentBet };
            }
            if (margen >= 20) {
                if (Math.random() < 0.6) return { action: ACCION.QUIERO, amount: currentBet };
                return { action: ACCION.NO_QUIERO, amount: 0 };
            }
            return { action: ACCION.NO_QUIERO, amount: 0 };
        }

        // Escalar aceptacion por tamaño de apuesta: mayor apuesta = mas margen necesario
        const margenNecesario = Math.min(currentBet * 3, 30);

        if (margen < margenNecesario) {
            // No suficiente margen para esta apuesta
            if (currentBet <= 2 && margen >= 0) return { action: ACCION.QUIERO, amount: currentBet };
            if (currentBet <= 4 && margen >= 5) return { action: ACCION.QUIERO, amount: currentBet };
            return { action: ACCION.NO_QUIERO, amount: 0 };
        }

        // Contra-ordago: solo con mano de elite y apuesta ya alta
        if (fuerza >= (ORDAGO.apertura[lance]?.umbral || 97) && currentBet >= 5 && !ctx.zonaAdentro) {
            if (Math.random() < 0.25) {
                return { action: ACCION.ORDAGO, amount: ctx.piedrasRestantes };
            }
        }

        // Suficiente margen: decidir entre aceptar y subir
        if (margen >= 30 && Math.random() < 0.45) {
            return { action: ACCION.ENVIDO, amount: Math.min(currentBet + 4, ctx.piedrasRestantes) };
        }
        if (margen >= 15 && Math.random() < 0.30) {
            return { action: ACCION.ENVIDO, amount: Math.min(currentBet + 2, ctx.piedrasRestantes) };
        }

        // Por defecto: aceptar (no siempre subir, para evitar bucles infinitos)
        return { action: ACCION.QUIERO, amount: currentBet };
    }

    // ==========================================
    // METODOS PUBLICOS
    // ==========================================

    tienePares(hand) { return this._detectarPares(hand).tipo !== null; }
    tieneJuego(hand) { return this._tieneJuego(hand); }
    getTipoPares(hand) { return this._detectarPares(hand).tipo; }
    getPuntos(hand) { return this._calcularPuntos(hand); }
    evaluarLance(hand, lance) { return this._evaluarFuerzaLance(hand, lance); }

    /** No-op. Se mantiene por compatibilidad. */
    setDificultad(_d) {}
}

export { LANCE, ACCION, DIFICULTAD };
export default AIPlayer;
