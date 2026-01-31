/**
 * Inteligencia Artificial para jugadores bot del MUS
 * Implementa decisiones de mus, descarte y envite
 */

// Constantes para los lances
const LANCE = {
    GRANDE: 'grande',
    CHICA: 'chica',
    PARES: 'pares',
    JUEGO: 'juego',
    PUNTO: 'punto'
};

// Constantes para acciones de envite
const ACCION = {
    PASO: 'paso',
    ENVIDO: 'envido',
    QUIERO: 'quiero',
    NO_QUIERO: 'no_quiero',
    ORDAGO: 'ordago'
};

// Niveles de dificultad
const DIFICULTAD = {
    FACIL: 'facil',
    MEDIO: 'medio',
    DIFICIL: 'dificil'
};

/**
 * Clase principal de IA para el MUS
 */
export class AIPlayer {
    /**
     * Constructor del jugador IA
     * @param {string} dificultad - Nivel de dificultad (facil, medio, dificil)
     */
    constructor(dificultad = DIFICULTAD.MEDIO) {
        this.dificultad = dificultad;
        this.factorFarol = this._getFactorFarol();
        this.factorAgresividad = this._getFactorAgresividad();
    }

    /**
     * Obtiene el factor de farol segun dificultad
     * @returns {number}
     */
    _getFactorFarol() {
        switch (this.dificultad) {
            case DIFICULTAD.FACIL: return 0.05;
            case DIFICULTAD.MEDIO: return 0.10;
            case DIFICULTAD.DIFICIL: return 0.15;
            default: return 0.10;
        }
    }

    /**
     * Obtiene el factor de agresividad segun dificultad
     * @returns {number}
     */
    _getFactorAgresividad() {
        switch (this.dificultad) {
            case DIFICULTAD.FACIL: return 0.7;
            case DIFICULTAD.MEDIO: return 1.0;
            case DIFICULTAD.DIFICIL: return 1.3;
            default: return 1.0;
        }
    }

    // ==========================================
    // EVALUACION DE MANO
    // ==========================================

    /**
     * Obtiene el valor numerico de una carta para el mus
     * En el mus: 3 y Rey valen 10, el resto su valor facial
     * @param {Object} card - Carta con propiedad rank
     * @returns {number}
     */
    _getCardValue(card) {
        const rank = card.rank;
        if (rank === 'K' || rank === '3') return 10;
        if (rank === 'Q') return 9;  // Caballo/Dama
        if (rank === 'J') return 8;  // Sota
        if (rank === 'A' || rank === '1') return 1;
        return parseInt(rank) || 0;
    }

    /**
     * Obtiene el orden de una carta para grande (mayor es mejor)
     * Orden: R > C > S > 7 > 6 > 5 > 4 > 3 (que es como R) > 2 > A
     * En mus el 3 vale como Rey para grande/chica
     * @param {Object} card
     * @returns {number}
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
        if (rank === '2') return 2;
        if (rank === 'A' || rank === '1') return 1;
        return parseInt(rank) || 0;
    }

    /**
     * Obtiene el orden de una carta para chica (menor es mejor)
     * @param {Object} card
     * @returns {number}
     */
    _getChicaOrder(card) {
        // Para chica, invertimos: A es el mejor (valor alto), R el peor
        return 11 - this._getGrandeOrder(card);
    }

    /**
     * Evalua la fuerza de la mano para GRANDE (0-100)
     * @param {Array} hand - Array de 4 cartas
     * @returns {number}
     */
    _evaluarGrande(hand) {
        const valores = hand.map(c => this._getGrandeOrder(c)).sort((a, b) => b - a);
        // Maximo seria 10,10,10,10 = 40, minimo 1,1,1,1 = 4
        const suma = valores.reduce((a, b) => a + b, 0);
        // Normalizamos a 0-100
        // Pero damos mas peso a las cartas mas altas
        const peso = valores[0] * 4 + valores[1] * 3 + valores[2] * 2 + valores[3];
        const maxPeso = 10 * 4 + 10 * 3 + 10 * 2 + 10; // 100
        const minPeso = 1 * 4 + 1 * 3 + 1 * 2 + 1; // 10
        return Math.round(((peso - minPeso) / (maxPeso - minPeso)) * 100);
    }

    /**
     * Evalua la fuerza de la mano para CHICA (0-100)
     * @param {Array} hand
     * @returns {number}
     */
    _evaluarChica(hand) {
        const valores = hand.map(c => this._getGrandeOrder(c)).sort((a, b) => a - b);
        // Para chica queremos valores bajos
        const peso = valores[0] * 4 + valores[1] * 3 + valores[2] * 2 + valores[3];
        const maxPeso = 10 * 4 + 10 * 3 + 10 * 2 + 10;
        const minPeso = 1 * 4 + 1 * 3 + 1 * 2 + 1;
        // Invertimos porque menor es mejor en chica
        return Math.round(((maxPeso - peso) / (maxPeso - minPeso)) * 100);
    }

    /**
     * Detecta los pares en una mano
     * @param {Array} hand
     * @returns {Object} {tipo: 'duples'|'medias'|'pareja'|null, cartas: [], fuerza: number}
     */
    _detectarPares(hand) {
        const conteo = {};
        hand.forEach(card => {
            const rank = (card.rank === '3') ? 'K' : card.rank; // 3 cuenta como Rey
            conteo[rank] = (conteo[rank] || 0) + 1;
        });

        const pares = Object.entries(conteo).filter(([_, count]) => count >= 2);

        if (pares.length === 0) {
            return { tipo: null, fuerza: 0 };
        }

        // Ordenamos por valor de grande
        const ordenPares = { 'K': 10, 'Q': 9, 'J': 8, '7': 7, '6': 6, '5': 5, '4': 4, '2': 2, 'A': 1, '1': 1 };

        if (pares.length === 2 && pares.every(([_, count]) => count === 2)) {
            // Medias (dos parejas)
            const ranks = pares.map(([rank, _]) => rank).sort((a, b) => (ordenPares[b] || 0) - (ordenPares[a] || 0));
            const fuerza = 40 + (ordenPares[ranks[0]] || 0) * 3 + (ordenPares[ranks[1]] || 0);
            return { tipo: 'medias', ranks, fuerza };
        }

        const cuatro = pares.find(([_, count]) => count === 4);
        if (cuatro) {
            // Duples (4 iguales)
            const fuerza = 70 + (ordenPares[cuatro[0]] || 0) * 3;
            return { tipo: 'duples', rank: cuatro[0], fuerza };
        }

        const trio = pares.find(([_, count]) => count === 3);
        if (trio) {
            // Medias (trio + una suelta, pero en mus se considera como medias)
            // En realidad en mus solo cuentan exactamente 2 o 4 cartas iguales
            // Un trio seria pareja de 3 y una suelta... depende de la variante
            // Simplificamos: trio = medias
            const fuerza = 50 + (ordenPares[trio[0]] || 0) * 3;
            return { tipo: 'medias', rank: trio[0], fuerza };
        }

        // Par simple
        const par = pares[0];
        const fuerza = 10 + (ordenPares[par[0]] || 0) * 2;
        return { tipo: 'pareja', rank: par[0], fuerza };
    }

    /**
     * Evalua la fuerza de PARES (0-100)
     * @param {Array} hand
     * @returns {number}
     */
    _evaluarPares(hand) {
        const pares = this._detectarPares(hand);
        if (!pares.tipo) return 0;

        // Normalizamos: duples de reyes = 100, pareja de ases = ~10
        // duples: 70-100, medias: 40-70, pareja: 10-40
        return Math.min(100, pares.fuerza);
    }

    /**
     * Calcula el valor de juego/punto de una mano
     * @param {Array} hand
     * @returns {number}
     */
    _calcularPuntos(hand) {
        return hand.reduce((sum, card) => sum + this._getCardValue(card), 0);
    }

    /**
     * Verifica si la mano tiene juego (31 o mas)
     * @param {Array} hand
     * @returns {boolean}
     */
    _tieneJuego(hand) {
        return this._calcularPuntos(hand) >= 31;
    }

    /**
     * Evalua la fuerza del JUEGO (0-100)
     * Orden: 31 > 32 > 40 > 37 > 36 > 35 > 34 > 33
     * @param {Array} hand
     * @returns {number}
     */
    _evaluarJuego(hand) {
        const puntos = this._calcularPuntos(hand);

        if (puntos < 31) return 0; // No tiene juego

        // Orden de fuerza del juego
        const fuerzaJuego = {
            31: 100,
            32: 90,
            40: 80,
            37: 70,
            36: 60,
            35: 50,
            34: 40,
            33: 30
        };

        // Para valores mayores a 40 (muy raros), damos valor decreciente
        if (puntos > 40) {
            return Math.max(10, 80 - (puntos - 40) * 5);
        }

        return fuerzaJuego[puntos] || 30;
    }

    /**
     * Evalua la fuerza del PUNTO (0-100)
     * Solo aplica si no hay juego. 30 es el maximo
     * @param {Array} hand
     * @returns {number}
     */
    _evaluarPunto(hand) {
        const puntos = this._calcularPuntos(hand);

        if (puntos >= 31) return 0; // Tiene juego, no punto

        // 30 es el maximo punto, 4 seria el minimo (4 ases)
        // Normalizamos: 30 = 100, 4 = 0
        return Math.round(((puntos - 4) / (30 - 4)) * 100);
    }

    /**
     * Evalua la fuerza general de una mano para decidir mus
     * @param {Array} hand
     * @returns {number} 0-100
     */
    _evaluarManoGeneral(hand) {
        const grande = this._evaluarGrande(hand);
        const chica = this._evaluarChica(hand);
        const pares = this._evaluarPares(hand);
        const tieneJuego = this._tieneJuego(hand);
        const juegoOPunto = tieneJuego ? this._evaluarJuego(hand) : this._evaluarPunto(hand);

        // Ponderamos los lances
        // Pares y juego/punto son mas valiosos
        let puntuacion = (grande * 0.2) + (chica * 0.2) + (pares * 0.35) + (juegoOPunto * 0.25);

        // Bonus por tener juego
        if (tieneJuego) puntuacion += 10;

        // Bonus por tener pares
        if (pares > 0) puntuacion += 5;

        return Math.min(100, puntuacion);
    }

    // ==========================================
    // DECISION DE MUS
    // ==========================================

    /**
     * Decide si pedir mus o cortar
     * @param {Array} hand - Mano actual (4 cartas)
     * @returns {boolean} true = quiere mus, false = corta
     */
    decideMus(hand) {
        const fuerzaMano = this._evaluarManoGeneral(hand);
        const pares = this._detectarPares(hand);
        const tieneJuego = this._tieneJuego(hand);
        const puntos = this._calcularPuntos(hand);

        // Si tiene duples, cortar casi siempre
        if (pares.tipo === 'duples') {
            return Math.random() < 0.05; // 5% de dar mus para despistar
        }

        // Si tiene 31 (la mejor jugada de juego), cortar
        if (puntos === 31) {
            return Math.random() < 0.1;
        }

        // Si tiene medias de reyes, cortar
        if (pares.tipo === 'medias' && pares.fuerza > 60) {
            return Math.random() < 0.15;
        }

        // Umbrales segun dificultad
        let umbralCorte;
        switch (this.dificultad) {
            case DIFICULTAD.FACIL:
                umbralCorte = 55; // Corta con manos mas flojas
                break;
            case DIFICULTAD.MEDIO:
                umbralCorte = 50;
                break;
            case DIFICULTAD.DIFICIL:
                umbralCorte = 45; // Mas selectivo
                break;
            default:
                umbralCorte = 50;
        }

        // Si la mano es fuerte, cortar
        if (fuerzaMano >= umbralCorte) {
            return false; // Corta
        }

        // Si la mano es muy mala, pedir mus
        if (fuerzaMano < 30) {
            return true; // Quiere mus
        }

        // Zona intermedia: algo de aleatoriedad
        const probMus = (umbralCorte - fuerzaMano) / umbralCorte;
        return Math.random() < probMus;
    }

    // ==========================================
    // SELECCION DE DESCARTE
    // ==========================================

    /**
     * Selecciona las cartas a descartar
     * @param {Array} hand - Mano actual
     * @returns {Array} Cartas a descartar (puede estar vacio)
     */
    selectDiscard(hand) {
        const pares = this._detectarPares(hand);
        const puntos = this._calcularPuntos(hand);
        const tieneJuego = this._tieneJuego(hand);

        // Analizar cada carta
        const analisis = hand.map((card, index) => ({
            card,
            index,
            valorGrande: this._getGrandeOrder(card),
            valorPuntos: this._getCardValue(card),
            esParte_dePar: false
        }));

        // Marcar cartas que son parte de pares
        const conteo = {};
        hand.forEach((card, idx) => {
            const rank = (card.rank === '3') ? 'K' : card.rank;
            if (!conteo[rank]) conteo[rank] = [];
            conteo[rank].push(idx);
        });

        Object.values(conteo).forEach(indices => {
            if (indices.length >= 2) {
                indices.forEach(idx => {
                    analisis[idx].esParte_dePar = true;
                });
            }
        });

        // Estrategia de descarte
        const descartar = [];

        // Si tiene duples o medias buenas, no descartar
        if (pares.tipo === 'duples' || (pares.tipo === 'medias' && pares.fuerza > 50)) {
            return [];
        }

        // Si tiene 31, no descartar
        if (puntos === 31) {
            return [];
        }

        // Evaluar que cartas son prescindibles
        analisis.forEach(a => {
            // Calcular "valor" de la carta
            let valor = 0;

            // Valor por grande (reyes/3s son buenos)
            valor += a.valorGrande * 2;

            // Valor por ser parte de un par
            if (a.esParte_dePar) valor += 25;

            // Valor por contribuir a juego
            if (!tieneJuego && a.valorPuntos >= 7) valor += 10;

            // Penalizar cartas "medias" que no aportan mucho
            if (a.valorGrande >= 4 && a.valorGrande <= 7 && !a.esParte_dePar) {
                valor -= 10;
            }

            a.valorTotal = valor;
        });

        // Ordenar por valor (menor valor = mejor candidato a descartar)
        const ordenadas = [...analisis].sort((a, b) => a.valorTotal - b.valorTotal);

        // Decidir cuantas descartar
        const fuerzaMano = this._evaluarManoGeneral(hand);
        let numDescartar = 0;

        if (fuerzaMano < 20) numDescartar = 3; // Mano muy mala
        else if (fuerzaMano < 35) numDescartar = 2;
        else if (fuerzaMano < 50) numDescartar = 1;
        else numDescartar = 0; // Mano buena, no descartar

        // Seleccionar las peores cartas para descartar
        for (let i = 0; i < numDescartar && i < ordenadas.length; i++) {
            // No descartar si es parte de un par importante
            if (!ordenadas[i].esParte_dePar) {
                descartar.push(ordenadas[i].card);
            }
        }

        return descartar;
    }

    // ==========================================
    // DECISION DE ENVITE
    // ==========================================

    /**
     * Decide la accion de envite para un lance
     * @param {Array} hand - Mano actual
     * @param {string} lance - Tipo de lance (grande, chica, pares, juego, punto)
     * @param {number} currentBet - Apuesta actual (piedras en juego)
     * @param {Object} gameState - Estado del juego
     * @returns {Object} {action: string, amount: number}
     */
    decideEnvite(hand, lance, currentBet = 0, gameState = {}) {
        const fuerza = this._evaluarFuerzaLance(hand, lance);
        const {
            marcadorPropio = 0,
            marcadorRival = 0,
            parejaYaEnvido = false,
            parejaPaso = false,
            piedrasRestantes = 40,
            ordagoActivo = false
        } = gameState;

        // Factor de presion por marcador
        const diferenciaMarador = marcadorRival - marcadorPropio;
        let factorPresion = 1;
        if (diferenciaMarador > 10) factorPresion = 1.3; // Van perdiendo, mas agresivos
        else if (diferenciaMarador < -10) factorPresion = 0.8; // Van ganando, mas conservadores

        // Ajuste por coordinacion con pareja
        let factorPareja = 1;
        if (parejaYaEnvido && fuerza > 30) {
            factorPareja = 1.2; // Apoyar a la pareja
        }
        if (parejaPaso && fuerza < 50) {
            factorPareja = 0.7; // No subir si pareja paso y mano debil
        }

        // Fuerza ajustada
        const fuerzaAjustada = Math.min(100, fuerza * this.factorAgresividad * factorPresion * factorPareja);

        // Si hay ordago activo, solo podemos aceptar o rechazar
        if (ordagoActivo) {
            if (fuerzaAjustada >= 50 || Math.random() < this.factorFarol * 0.5) {
                return { action: ACCION.QUIERO, amount: 0 };
            }
            return { action: ACCION.NO_QUIERO, amount: 0 };
        }

        // Si no hay apuesta previa (somos los primeros o despues de paso)
        if (currentBet === 0) {
            return this._decidirAperturaEnvite(fuerzaAjustada, lance, piedrasRestantes);
        }

        // Si hay apuesta, decidir si ver, subir o pasar
        return this._decidirRespuestaEnvite(fuerzaAjustada, currentBet, lance, piedrasRestantes);
    }

    /**
     * Evalua la fuerza para un lance especifico
     * @param {Array} hand
     * @param {string} lance
     * @returns {number} 0-100
     */
    _evaluarFuerzaLance(hand, lance) {
        switch (lance) {
            case LANCE.GRANDE:
                return this._evaluarGrande(hand);
            case LANCE.CHICA:
                return this._evaluarChica(hand);
            case LANCE.PARES:
                return this._evaluarPares(hand);
            case LANCE.JUEGO:
                return this._evaluarJuego(hand);
            case LANCE.PUNTO:
                return this._evaluarPunto(hand);
            default:
                return 50;
        }
    }

    /**
     * Decide la apertura de envite (cuando no hay apuesta previa)
     * @param {number} fuerza
     * @param {string} lance
     * @param {number} piedrasRestantes
     * @returns {Object}
     */
    _decidirAperturaEnvite(fuerza, lance, piedrasRestantes) {
        // Farolear ocasionalmente
        if (fuerza < 30 && Math.random() < this.factorFarol) {
            // Farol: envido con mano mala
            if (Math.random() < 0.3) {
                return { action: ACCION.ORDAGO, amount: piedrasRestantes };
            }
            return { action: ACCION.ENVIDO, amount: 2 };
        }

        // Mano muy fuerte
        if (fuerza >= 85) {
            // A veces ordago directo, a veces envido para que suban
            if (Math.random() < 0.4) {
                return { action: ACCION.ORDAGO, amount: piedrasRestantes };
            }
            return { action: ACCION.ENVIDO, amount: Math.min(5, Math.floor(fuerza / 20)) };
        }

        // Mano fuerte
        if (fuerza >= 65) {
            return { action: ACCION.ENVIDO, amount: Math.min(4, Math.floor(fuerza / 25)) };
        }

        // Mano media-fuerte
        if (fuerza >= 50) {
            return { action: ACCION.ENVIDO, amount: 2 };
        }

        // Mano media
        if (fuerza >= 35) {
            // A veces envido pequeno, a veces paso
            if (Math.random() < 0.5) {
                return { action: ACCION.ENVIDO, amount: 2 };
            }
            return { action: ACCION.PASO, amount: 0 };
        }

        // Mano debil
        return { action: ACCION.PASO, amount: 0 };
    }

    /**
     * Decide la respuesta a un envite existente
     * @param {number} fuerza
     * @param {number} currentBet
     * @param {string} lance
     * @param {number} piedrasRestantes
     * @returns {Object}
     */
    _decidirRespuestaEnvite(fuerza, currentBet, lance, piedrasRestantes) {
        // Calcular "odds" - cuanto arriesgamos vs cuanto ganamos
        const riesgo = currentBet;

        // Farol muy raro con mano muy mala
        if (fuerza < 20 && Math.random() < this.factorFarol * 0.3) {
            return { action: ACCION.ORDAGO, amount: piedrasRestantes };
        }

        // Mano muy debil - no quiero (a menos que sea apuesta minima)
        if (fuerza < 25) {
            if (currentBet <= 2 && Math.random() < 0.3) {
                return { action: ACCION.QUIERO, amount: currentBet };
            }
            return { action: ACCION.NO_QUIERO, amount: 0 };
        }

        // Mano debil-media
        if (fuerza < 40) {
            if (currentBet <= 2) {
                return { action: ACCION.QUIERO, amount: currentBet };
            }
            if (currentBet <= 4 && Math.random() < 0.4) {
                return { action: ACCION.QUIERO, amount: currentBet };
            }
            return { action: ACCION.NO_QUIERO, amount: 0 };
        }

        // Mano media
        if (fuerza < 60) {
            if (currentBet >= piedrasRestantes * 0.5) {
                // Apuesta muy alta, solo ver
                return { action: ACCION.QUIERO, amount: currentBet };
            }
            // Subir un poco o ver
            if (Math.random() < 0.4) {
                return { action: ACCION.ENVIDO, amount: currentBet + 2 };
            }
            return { action: ACCION.QUIERO, amount: currentBet };
        }

        // Mano fuerte
        if (fuerza < 80) {
            // Subir
            if (currentBet >= piedrasRestantes * 0.7) {
                // Si ya es muy alta, ordago
                return { action: ACCION.ORDAGO, amount: piedrasRestantes };
            }
            return { action: ACCION.ENVIDO, amount: Math.min(currentBet + 4, piedrasRestantes) };
        }

        // Mano muy fuerte
        if (Math.random() < 0.6) {
            return { action: ACCION.ORDAGO, amount: piedrasRestantes };
        }
        return { action: ACCION.ENVIDO, amount: Math.min(currentBet + 5, piedrasRestantes) };
    }

    // ==========================================
    // METODOS AUXILIARES PUBLICOS
    // ==========================================

    /**
     * Verifica si la mano tiene pares
     * @param {Array} hand
     * @returns {boolean}
     */
    tienePares(hand) {
        return this._detectarPares(hand).tipo !== null;
    }

    /**
     * Verifica si la mano tiene juego
     * @param {Array} hand
     * @returns {boolean}
     */
    tieneJuego(hand) {
        return this._tieneJuego(hand);
    }

    /**
     * Obtiene el tipo de pares de la mano
     * @param {Array} hand
     * @returns {string|null} 'duples', 'medias', 'pareja' o null
     */
    getTipoPares(hand) {
        return this._detectarPares(hand).tipo;
    }

    /**
     * Obtiene los puntos de la mano
     * @param {Array} hand
     * @returns {number}
     */
    getPuntos(hand) {
        return this._calcularPuntos(hand);
    }

    /**
     * Evalua la fuerza de la mano para un lance especifico
     * @param {Array} hand
     * @param {string} lance
     * @returns {number} 0-100
     */
    evaluarLance(hand, lance) {
        return this._evaluarFuerzaLance(hand, lance);
    }

    /**
     * Cambia el nivel de dificultad
     * @param {string} dificultad
     */
    setDificultad(dificultad) {
        this.dificultad = dificultad;
        this.factorFarol = this._getFactorFarol();
        this.factorAgresividad = this._getFactorAgresividad();
    }
}

// Exportar constantes utiles
export { LANCE, ACCION, DIFICULTAD };

// Exportar por defecto la clase
export default AIPlayer;
