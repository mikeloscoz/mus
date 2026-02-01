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
        const puntos = this._calcularPuntos(hand);

        // Duples: cortar casi siempre
        if (pares.tipo === 'duples') return Math.random() < 0.05;

        // 31 (mejor juego): cortar
        if (puntos === 31) return Math.random() < 0.1;

        // Medias fuertes: cortar
        if (pares.tipo === 'medias' && pares.fuerza > 60) return Math.random() < 0.15;

        // Umbral fijo (sin dificultad)
        const umbralCorte = 45;

        if (fuerzaMano >= umbralCorte) return false;
        if (fuerzaMano < 30) return true;

        const probMus = (umbralCorte - fuerzaMano) / umbralCorte;
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
        // 1. ¿Ordago? (usa fuerza bruta, no inflada)
        if (this._debeOrdagoApertura(fuerza, lance, ctx)) {
            return { action: ACCION.ORDAGO, amount: ctx.piedrasRestantes };
        }

        // 2. Trap de mano: con mano fuerte, paso para cazar
        if (!ctx.esPostre && fuerza > 95 && Math.random() < 0.25) {
            return { action: ACCION.PASO, amount: 0 };
        }

        // 3. Calcular umbral efectivo de apuesta (contexto ajusta umbrales)
        let ajuste = 0;
        if (ctx.infoVentaja) ajuste += 5;
        if (ctx.esPostre) ajuste += 3;
        if (ctx.parejaAposto) ajuste += 3;
        if (ctx.parejaPaso && fuerza < 50) ajuste -= 5;

        const f = fuerza + ajuste; // Solo para decidir SI apostar y CUANTO (no ordago)

        // Zona adentro: apuestas conservadoras
        if (ctx.zonaAdentro) {
            if (f >= 55) return { action: ACCION.ENVIDO, amount: 2 };
            if (f >= 40 && Math.random() < 0.4) return { action: ACCION.ENVIDO, amount: 2 };
            return { action: ACCION.PASO, amount: 0 };
        }

        // 4. Apuesta estandar
        if (f >= 80) return { action: ACCION.ENVIDO, amount: 5 };
        if (f >= 65) return { action: ACCION.ENVIDO, amount: 3 };
        if (f >= 50) return { action: ACCION.ENVIDO, amount: 2 };
        if (f >= 35 && Math.random() < 0.5) return { action: ACCION.ENVIDO, amount: 2 };

        // 5. Farol: raro, apuesta pequeña, NUNCA ordago
        if (fuerza < 25 && Math.random() < 0.05) {
            return { action: ACCION.ENVIDO, amount: 2 };
        }

        return { action: ACCION.PASO, amount: 0 };
    }

    // ==========================================
    // RESPUESTA A ENVITE
    // ==========================================

    /**
     * Decide respuesta a apuesta existente.
     */
    _decidirRespuesta(fuerza, currentBet, lance, ctx) {
        // Contexto ajusta umbrales
        let ajuste = 0;
        if (ctx.infoVentaja) ajuste += 5;
        if (ctx.esPostre) ajuste += 3;
        if (ctx.parejaAposto) ajuste += 3;
        if (ctx.parejaPaso && fuerza < 50) ajuste -= 5;

        const f = fuerza + ajuste;

        // Zona adentro: conservador, nunca ordago
        if (ctx.zonaAdentro) {
            if (f >= 55) return { action: ACCION.QUIERO, amount: currentBet };
            if (f >= 35 && currentBet <= 2) return { action: ACCION.QUIERO, amount: currentBet };
            return { action: ACCION.NO_QUIERO, amount: 0 };
        }

        // Muy debil: fold
        if (f < 20) {
            return { action: ACCION.NO_QUIERO, amount: 0 };
        }

        // Debil (20-35): solo aceptar apuestas minimas
        if (f < 35) {
            if (currentBet <= 2 && Math.random() < 0.4) {
                return { action: ACCION.QUIERO, amount: currentBet };
            }
            return { action: ACCION.NO_QUIERO, amount: 0 };
        }

        // Media-baja (35-50): aceptar apuestas pequeñas
        if (f < 50) {
            if (currentBet <= 4) return { action: ACCION.QUIERO, amount: currentBet };
            if (Math.random() < 0.3) return { action: ACCION.QUIERO, amount: currentBet };
            return { action: ACCION.NO_QUIERO, amount: 0 };
        }

        // Media (50-65): aceptar, a veces subir
        if (f < 65) {
            if (Math.random() < 0.3) {
                return { action: ACCION.ENVIDO, amount: currentBet + 2 };
            }
            return { action: ACCION.QUIERO, amount: currentBet };
        }

        // Fuerte (65-80): subir
        if (f < 80) {
            return { action: ACCION.ENVIDO, amount: Math.min(currentBet + 3, ctx.piedrasRestantes) };
        }

        // Muy fuerte (80+): subir mucho, quizas contra-ordago
        // Contra-ordago solo si fuerza bruta es de elite Y apuesta ya es alta
        if (fuerza >= (ORDAGO.apertura[lance]?.umbral || 97) && currentBet >= 5) {
            if (!ctx.zonaAdentro && Math.random() < 0.30) {
                return { action: ACCION.ORDAGO, amount: ctx.piedrasRestantes };
            }
        }

        return { action: ACCION.ENVIDO, amount: Math.min(currentBet + 5, ctx.piedrasRestantes) };
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
