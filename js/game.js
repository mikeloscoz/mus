/**
 * MUS - Juego de cartas tradicional vasco
 * Logica principal del juego
 */

import { Deck, Card, Hand } from './cards.js';

// Constantes del juego
const LANCES = {
    GRANDE: 'grande',
    CHICA: 'chica',
    PARES: 'pares',
    JUEGO: 'juego',
    PUNTO: 'punto'
};

const FASES = {
    MUS: 'mus',
    DESCARTE: 'descarte',
    ENVITE: 'envite',
    RESOLUCION: 'resolucion'
};

const ACCIONES_ENVITE = {
    PASO: 'paso',
    ENVIDO: 'envido',
    ORDAGO: 'ordago',
    QUIERO: 'quiero',
    NO_QUIERO: 'no_quiero'
};

const PIEDRAS_PARA_GANAR = 40;

// Orden de jugada ANTIHORARIO (visto desde arriba)
// player (abajo) -> rival2 (derecha) -> partner (arriba) -> rival1 (izquierda)
const TURN_ORDER = ['player', 'rival2', 'partner', 'rival1'];

/**
 * Clase principal del juego MUS
 */
class Game {
    constructor() {
        this.deck = null;
        this.players = {
            player: { name: 'Jugador', hand: [], team: 'equipo1' },
            partner: { name: 'Companero', hand: [], team: 'equipo1' },
            rival1: { name: 'Rival 1', hand: [], team: 'equipo2' },
            rival2: { name: 'Rival 2', hand: [], team: 'equipo2' }
        };

        // Orden de jugada ANTIHORARIO (visto desde arriba):
        // player (abajo) -> rival2 (derecha) -> partner (arriba) -> rival1 (izquierda)
        this.turnOrder = TURN_ORDER;

        // Puntuacion
        this.piedras = {
            equipo1: 0,
            equipo2: 0
        };

        // Estado de la ronda
        this.lanceActual = null;
        this.faseActual = null;
        this.manoIndex = 0; // Indice en turnOrder de quien es mano (rota cada ronda)
        this.postre = 3; // Ultimo en hablar
        this.currentTurnIndex = 0; // Turno actual relativo a la mano (0-3)

        // Estado del mus
        this.musResponses = {};
        this.musTurnIndex = 0; // Turno actual en la fase de mus (relativo a la mano)

        // Estado del descarte
        this.descarteTurnIndex = 0; // Turno actual en la fase de descarte
        this.descarteResponses = {}; // Respuestas de descarte de cada jugador

        // Estado del envite actual
        this.enviteActual = {
            lance: null,
            apuesta: 0,
            equipoApostador: null,
            ultimaAccion: null,
            respuestas: {},
            pasaron: [],
            turnoIndex: 0, // Turno actual en el envite
            esperandoRespuesta: false, // Si estamos esperando respuesta del equipo contrario
            equipoDebeResponder: null // Equipo que debe responder al envite
        };

        // Puntos pendientes de la ronda (se suman al final)
        this.puntosPendientes = {
            equipo1: 0,
            equipo2: 0
        };

        // Ordago activo
        this.ordagoActivo = false;

        // Listeners de eventos
        this.eventListeners = {};
    }

    /**
     * Sistema de eventos personalizado
     */
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    off(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(data));
        }
        // Tambien emitir como CustomEvent para la UI
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(`mus:${event}`, { detail: data }));
        }
    }

    /**
     * Obtiene el jugador actual en el turno
     * @returns {string} - ID del jugador actual
     */
    getCurrentTurnPlayer() {
        const absoluteIndex = (this.manoIndex + this.currentTurnIndex) % 4;
        return this.turnOrder[absoluteIndex];
    }

    /**
     * Obtiene el jugador que es mano
     * @returns {string} - ID del jugador mano
     */
    getMano() {
        return this.turnOrder[this.manoIndex];
    }

    /**
     * Avanza al siguiente turno
     * @returns {string} - ID del siguiente jugador
     */
    advanceTurn() {
        this.currentTurnIndex = (this.currentTurnIndex + 1) % 4;
        const nextPlayer = this.getCurrentTurnPlayer();

        this.emit('turnChanged', {
            player: nextPlayer,
            turnoIndex: this.currentTurnIndex,
            mano: this.getMano()
        });

        return nextPlayer;
    }

    /**
     * Reinicia el turno al jugador mano
     */
    resetTurnToMano() {
        this.currentTurnIndex = 0;
        const mano = this.getMano();

        this.emit('turnChanged', {
            player: mano,
            turnoIndex: 0,
            mano: mano
        });
    }

    /**
     * Inicia una nueva partida
     */
    startGame() {
        this.piedras = { equipo1: 0, equipo2: 0 };
        this.manoIndex = 0;
        this.ordagoActivo = false;

        this.emit('gameStarted', {
            players: this.players,
            piedras: this.piedras
        });

        this.startRound();
    }

    /**
     * Inicia una nueva ronda
     */
    startRound() {
        this.puntosPendientes = { equipo1: 0, equipo2: 0 };
        this.lanceActual = null;
        this.ordagoActivo = false;
        this.currentTurnIndex = 0;

        // Actualizar postre (anterior a mano)
        this.postre = (this.manoIndex + 3) % 4;

        const manoPlayer = this.getMano();

        // Emitir evento de quien es mano
        this.emit('manoChanged', {
            mano: manoPlayer,
            manoIndex: this.manoIndex
        });

        this.emit('roundStarted', {
            mano: manoPlayer,
            postre: this.turnOrder[this.postre]
        });

        this.dealCards();
        this.startMusPhase();
    }

    /**
     * Reparte 4 cartas a cada jugador
     */
    dealCards() {
        this.deck = new Deck();
        this.deck.shuffle();

        // Limpiar manos
        for (const playerId in this.players) {
            this.players[playerId].hand = [];
        }

        // Repartir 4 cartas a cada jugador en orden desde la mano
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const playerIndex = (this.manoIndex + j) % 4;
                const playerId = this.turnOrder[playerIndex];
                const cards = this.deck.deal(1);
                if (cards.length > 0) {
                    this.players[playerId].hand.push(cards[0]);
                }
            }
        }

        this.emit('cardsDealt', {
            players: this.players
        });
    }

    /**
     * Inicia la fase de MUS con turnos secuenciales
     */
    startMusPhase() {
        this.faseActual = FASES.MUS;
        this.musResponses = {};
        this.musTurnIndex = 0;
        this.currentTurnIndex = 0;

        const manoPlayer = this.getMano();

        this.emit('phaseChanged', {
            fase: FASES.MUS,
            mensaje: 'Fase de Mus - Los jugadores deciden si quieren mus'
        });

        this.emit('musPhaseStarted', {
            mano: manoPlayer,
            turno: manoPlayer
        });

        // Emitir turno inicial
        this.emit('turnChanged', {
            player: manoPlayer,
            turnoIndex: 0,
            mano: manoPlayer,
            fase: FASES.MUS
        });
    }

    /**
     * Obtiene el jugador actual en la fase de mus
     * @returns {string} - ID del jugador que debe hablar
     */
    getMusTurnPlayer() {
        const absoluteIndex = (this.manoIndex + this.musTurnIndex) % 4;
        return this.turnOrder[absoluteIndex];
    }

    /**
     * Maneja la decision de un jugador sobre el mus (con turnos secuenciales)
     * @param {string} playerId - ID del jugador
     * @param {boolean} wantsMus - true si quiere mus, false si corta
     */
    handleMus(playerId, wantsMus) {
        if (this.faseActual !== FASES.MUS) {
            this.emit('error', { mensaje: 'No estamos en fase de mus' });
            return false;
        }

        // Verificar que es el turno del jugador
        const expectedPlayer = this.getMusTurnPlayer();
        if (playerId !== expectedPlayer) {
            this.emit('error', {
                mensaje: `No es tu turno. Turno de: ${expectedPlayer}`,
                expected: expectedPlayer,
                received: playerId
            });
            return false;
        }

        this.musResponses[playerId] = wantsMus;

        this.emit('musResponse', {
            player: playerId,
            wantsMus: wantsMus
        });

        // Si alguien corta, empezamos los lances
        if (!wantsMus) {
            this.emit('musCortado', {
                player: playerId
            });
            this.startLances();
            return true;
        }

        // Avanzar al siguiente turno en mus
        this.musTurnIndex++;
        this.currentTurnIndex = this.musTurnIndex;

        // Verificar si todos han dicho mus
        if (this.musTurnIndex >= 4) {
            // Todos quieren mus, fase de descarte
            this.startDescartePhase();
        } else {
            // Emitir turno del siguiente jugador
            const nextPlayer = this.getMusTurnPlayer();
            this.emit('turnChanged', {
                player: nextPlayer,
                turnoIndex: this.musTurnIndex,
                mano: this.getMano(),
                fase: FASES.MUS
            });
        }

        return true;
    }

    /**
     * Inicia la fase de descarte con turnos secuenciales
     */
    startDescartePhase() {
        this.faseActual = FASES.DESCARTE;
        this.descarteTurnIndex = 0;
        this.descarteResponses = {};
        this.currentTurnIndex = 0;

        const manoPlayer = this.getMano();

        this.emit('phaseChanged', {
            fase: FASES.DESCARTE,
            mensaje: 'Fase de Descarte - Los jugadores pueden cambiar cartas'
        });

        this.emit('descartePhaseStarted', {
            mano: manoPlayer,
            turno: manoPlayer
        });

        // Emitir turno inicial
        this.emit('turnChanged', {
            player: manoPlayer,
            turnoIndex: 0,
            mano: manoPlayer,
            fase: FASES.DESCARTE
        });
    }

    /**
     * Obtiene el jugador actual en la fase de descarte
     * @returns {string} - ID del jugador que debe descartar
     */
    getDescarteTurnPlayer() {
        const absoluteIndex = (this.manoIndex + this.descarteTurnIndex) % 4;
        return this.turnOrder[absoluteIndex];
    }

    /**
     * Maneja el descarte de cartas de un jugador (con turnos secuenciales)
     * @param {string} playerId - ID del jugador
     * @param {number[]} cardIndices - Indices de las cartas a descartar (puede ser vacio)
     */
    handleDescarte(playerId, cardIndices) {
        if (this.faseActual !== FASES.DESCARTE) {
            this.emit('error', { mensaje: 'No estamos en fase de descarte' });
            return false;
        }

        // Verificar que es el turno del jugador
        const expectedPlayer = this.getDescarteTurnPlayer();
        if (playerId !== expectedPlayer) {
            this.emit('error', {
                mensaje: `No es tu turno. Turno de: ${expectedPlayer}`,
                expected: expectedPlayer,
                received: playerId
            });
            return false;
        }

        const player = this.players[playerId];
        if (!player) {
            this.emit('error', { mensaje: 'Jugador no encontrado' });
            return false;
        }

        // Descartar cartas (de mayor a menor indice para no afectar indices)
        const sortedIndices = [...cardIndices].sort((a, b) => b - a);
        const descartadas = [];

        for (const index of sortedIndices) {
            if (index >= 0 && index < player.hand.length) {
                descartadas.push(player.hand.splice(index, 1)[0]);
            }
        }

        // Robar nuevas cartas
        for (let i = 0; i < descartadas.length; i++) {
            if (this.deck.remaining < 1) {
                // Si no hay cartas, barajar las descartadas
                this.deck.returnCards(descartadas);
                this.deck.shuffle();
            }
            const newCards = this.deck.deal(1);
            if (newCards.length > 0) {
                player.hand.push(newCards[0]);
            }
        }

        this.descarteResponses[playerId] = cardIndices.length;

        this.emit('cardsDiscarded', {
            player: playerId,
            count: descartadas.length
        });

        // Avanzar al siguiente turno en descarte
        this.descarteTurnIndex++;
        this.currentTurnIndex = this.descarteTurnIndex;

        // Verificar si todos han descartado
        if (this.descarteTurnIndex >= 4) {
            // Todos han descartado, volver a fase de mus
            this.finishDescarte();
        } else {
            // Emitir turno del siguiente jugador
            const nextPlayer = this.getDescarteTurnPlayer();
            this.emit('turnChanged', {
                player: nextPlayer,
                turnoIndex: this.descarteTurnIndex,
                mano: this.getMano(),
                fase: FASES.DESCARTE
            });
        }

        return true;
    }

    /**
     * Finaliza la fase de descarte y vuelve al mus
     */
    finishDescarte() {
        this.emit('descarteFinished', {
            descartes: this.descarteResponses
        });

        // Emitir cartas actualizadas
        this.emit('cardsDealt', {
            players: this.players
        });

        this.startMusPhase();
    }

    /**
     * Inicia los lances despues de que alguien corte el mus
     */
    startLances() {
        this.faseActual = FASES.ENVITE;
        this.lanceActual = LANCES.GRANDE;
        this.currentTurnIndex = 0;

        this.emit('lancesStarted', {
            mano: this.getMano()
        });
        this.startEnvite(LANCES.GRANDE);
    }

    /**
     * Inicia el envite para un lance con turnos secuenciales
     * @param {string} lance - El lance actual
     */
    startEnvite(lance) {
        // Verificar si el lance aplica
        if (lance === LANCES.PARES && !this.hayPares()) {
            this.emit('lanceSkipped', { lance: LANCES.PARES, razon: 'Nadie tiene pares' });
            this.nextLance();
            return;
        }

        if (lance === LANCES.JUEGO) {
            if (!this.hayJuego()) {
                // Si nadie tiene juego, se juega punto
                this.lanceActual = LANCES.PUNTO;
                lance = LANCES.PUNTO;
            }
        }

        this.lanceActual = lance;
        this.currentTurnIndex = 0;

        this.enviteActual = {
            lance: lance,
            apuesta: 0,
            equipoApostador: null,
            ultimaAccion: null,
            respuestas: {},
            pasaron: [],
            turnoIndex: 0,
            esperandoRespuesta: false,
            equipoDebeResponder: null
        };

        const manoPlayer = this.getMano();

        this.emit('phaseChanged', {
            fase: FASES.ENVITE,
            lance: lance
        });

        this.emit('enviteStarted', {
            lance: lance,
            mano: manoPlayer,
            turno: manoPlayer
        });

        // Emitir turno inicial (mano)
        this.emit('turnChanged', {
            player: manoPlayer,
            turnoIndex: 0,
            mano: manoPlayer,
            fase: FASES.ENVITE,
            lance: lance
        });
    }

    /**
     * Obtiene el jugador actual en la fase de envite
     * @returns {string} - ID del jugador que debe hablar
     */
    getEnviteTurnPlayer() {
        const absoluteIndex = (this.manoIndex + this.enviteActual.turnoIndex) % 4;
        return this.turnOrder[absoluteIndex];
    }

    /**
     * Obtiene el siguiente jugador del equipo que debe responder
     * @param {string} equipo - Equipo que debe responder
     * @returns {string|null} - ID del siguiente jugador o null
     */
    getNextRespondingPlayer(equipo) {
        // Buscar el siguiente jugador del equipo que debe responder en orden antihorario
        for (let i = 0; i < 4; i++) {
            const absoluteIndex = (this.manoIndex + i) % 4;
            const playerId = this.turnOrder[absoluteIndex];
            const player = this.players[playerId];

            if (player.team === equipo && !this.enviteActual.respuestas[playerId]) {
                return playerId;
            }
        }
        return null;
    }

    /**
     * Maneja una accion de envite con turnos secuenciales
     * @param {string} playerId - ID del jugador
     * @param {string} action - Accion (paso, envido, ordago, quiero, no_quiero)
     * @param {number} amount - Cantidad apostada (para envido)
     */
    handleEnvite(playerId, action, amount = 2) {
        if (this.faseActual !== FASES.ENVITE) {
            this.emit('error', { mensaje: 'No estamos en fase de envite' });
            return false;
        }

        const player = this.players[playerId];
        if (!player) {
            this.emit('error', { mensaje: 'Jugador no encontrado' });
            return false;
        }

        // Verificar turno
        if (this.enviteActual.esperandoRespuesta) {
            // Estamos esperando respuesta del equipo contrario
            if (player.team !== this.enviteActual.equipoDebeResponder) {
                this.emit('error', {
                    mensaje: `Debe responder el equipo ${this.enviteActual.equipoDebeResponder}`
                });
                return false;
            }
        } else {
            // Turno normal secuencial
            const expectedPlayer = this.getEnviteTurnPlayer();
            if (playerId !== expectedPlayer) {
                this.emit('error', {
                    mensaje: `No es tu turno. Turno de: ${expectedPlayer}`,
                    expected: expectedPlayer,
                    received: playerId
                });
                return false;
            }
        }

        const equipoJugador = player.team;

        switch (action) {
            case ACCIONES_ENVITE.PASO:
                return this._handlePaso(playerId, equipoJugador);

            case ACCIONES_ENVITE.ENVIDO:
                return this._handleEnvido(playerId, equipoJugador, amount);

            case ACCIONES_ENVITE.ORDAGO:
                return this._handleOrdago(playerId, equipoJugador);

            case ACCIONES_ENVITE.QUIERO:
                return this._handleQuiero(playerId, equipoJugador);

            case ACCIONES_ENVITE.NO_QUIERO:
                return this._handleNoQuiero(playerId, equipoJugador);

            default:
                this.emit('error', { mensaje: `Accion no valida: ${action}` });
                return false;
        }
    }

    /**
     * Maneja la accion PASO
     */
    _handlePaso(playerId, equipoJugador) {
        this.enviteActual.respuestas[playerId] = 'paso';
        this.enviteActual.pasaron.push(playerId);

        this.emit('enviteAction', {
            player: playerId,
            action: 'paso'
        });

        // Si estabamos esperando respuesta y pasa, el otro del equipo debe responder
        if (this.enviteActual.esperandoRespuesta) {
            const nextResponder = this.getNextRespondingPlayer(this.enviteActual.equipoDebeResponder);
            if (nextResponder) {
                this.emit('turnChanged', {
                    player: nextResponder,
                    turnoIndex: this.enviteActual.turnoIndex,
                    mano: this.getMano(),
                    fase: FASES.ENVITE,
                    lance: this.lanceActual,
                    esperandoRespuesta: true
                });
                return true;
            } else {
                // Nadie del equipo quiere, es como no_quiero
                return this._handleNoQuiero(playerId, equipoJugador);
            }
        }

        // Avanzar turno normal
        this.enviteActual.turnoIndex++;
        this.currentTurnIndex = this.enviteActual.turnoIndex;

        // Verificar si todos pasaron
        if (this.enviteActual.pasaron.length >= 4) {
            this.resolveLance(this.lanceActual);
            return true;
        }

        // Emitir siguiente turno
        if (this.enviteActual.turnoIndex < 4) {
            const nextPlayer = this.getEnviteTurnPlayer();
            this.emit('turnChanged', {
                player: nextPlayer,
                turnoIndex: this.enviteActual.turnoIndex,
                mano: this.getMano(),
                fase: FASES.ENVITE,
                lance: this.lanceActual
            });
        } else {
            // Todos han hablado sin envidar, resolver
            this.resolveLance(this.lanceActual);
        }

        return true;
    }

    /**
     * Maneja la accion ENVIDO
     */
    _handleEnvido(playerId, equipoJugador, amount) {
        if (this.enviteActual.apuesta === 0) {
            this.enviteActual.apuesta = amount || 2;
        } else {
            this.enviteActual.apuesta += amount || 2;
        }
        this.enviteActual.equipoApostador = equipoJugador;
        this.enviteActual.ultimaAccion = 'envido';
        this.enviteActual.respuestas[playerId] = 'envido';
        this.enviteActual.pasaron = []; // Reset pasaron

        // Ahora el equipo contrario debe responder
        const equipoContrario = equipoJugador === 'equipo1' ? 'equipo2' : 'equipo1';
        this.enviteActual.esperandoRespuesta = true;
        this.enviteActual.equipoDebeResponder = equipoContrario;

        this.emit('enviteAction', {
            player: playerId,
            action: 'envido',
            apuesta: this.enviteActual.apuesta
        });

        // Buscar siguiente jugador del equipo contrario que debe responder
        const nextResponder = this.getNextRespondingPlayer(equipoContrario);
        if (nextResponder) {
            this.emit('turnChanged', {
                player: nextResponder,
                turnoIndex: this.enviteActual.turnoIndex,
                mano: this.getMano(),
                fase: FASES.ENVITE,
                lance: this.lanceActual,
                esperandoRespuesta: true,
                equipoDebeResponder: equipoContrario
            });
        }

        return true;
    }

    /**
     * Maneja la accion ORDAGO
     */
    _handleOrdago(playerId, equipoJugador) {
        this.enviteActual.apuesta = PIEDRAS_PARA_GANAR;
        this.enviteActual.equipoApostador = equipoJugador;
        this.enviteActual.ultimaAccion = 'ordago';
        this.enviteActual.respuestas[playerId] = 'ordago';
        this.ordagoActivo = true;

        // El equipo contrario debe responder
        const equipoContrario = equipoJugador === 'equipo1' ? 'equipo2' : 'equipo1';
        this.enviteActual.esperandoRespuesta = true;
        this.enviteActual.equipoDebeResponder = equipoContrario;

        this.emit('enviteAction', {
            player: playerId,
            action: 'ordago'
        });

        // Buscar siguiente jugador del equipo contrario
        const nextResponder = this.getNextRespondingPlayer(equipoContrario);
        if (nextResponder) {
            this.emit('turnChanged', {
                player: nextResponder,
                turnoIndex: this.enviteActual.turnoIndex,
                mano: this.getMano(),
                fase: FASES.ENVITE,
                lance: this.lanceActual,
                esperandoRespuesta: true,
                equipoDebeResponder: equipoContrario,
                ordago: true
            });
        }

        return true;
    }

    /**
     * Maneja la accion QUIERO
     */
    _handleQuiero(playerId, equipoJugador) {
        this.enviteActual.respuestas[playerId] = 'quiero';
        this.enviteActual.esperandoRespuesta = false;

        this.emit('enviteAction', {
            player: playerId,
            action: 'quiero',
            apuesta: this.enviteActual.apuesta
        });

        // Resolver el lance con la apuesta aceptada
        this.resolveLance(this.lanceActual);
        return true;
    }

    /**
     * Maneja la accion NO_QUIERO
     */
    _handleNoQuiero(playerId, equipoJugador) {
        this.enviteActual.respuestas[playerId] = 'no_quiero';
        this.enviteActual.esperandoRespuesta = false;

        this.emit('enviteAction', {
            player: playerId,
            action: 'no_quiero'
        });

        // El equipo apostador gana lo que habia antes del ultimo envite
        const puntos = Math.max(1, this.enviteActual.apuesta - 2);
        const equipoGanador = this.enviteActual.equipoApostador;
        this.puntosPendientes[equipoGanador] += puntos;

        this.emit('lanceResolved', {
            lance: this.lanceActual,
            ganador: equipoGanador,
            puntos: puntos,
            razon: 'no_quiero'
        });

        this.nextLance();
        return true;
    }

    /**
     * Verifica si todos los jugadores pasaron
     */
    todosPasaron() {
        return this.enviteActual.pasaron.length === 4;
    }

    /**
     * Resuelve un lance y determina el ganador
     * @param {string} lance - El lance a resolver
     */
    resolveLance(lance) {
        this.faseActual = FASES.RESOLUCION;

        let ganador = null;
        let puntos = 0;

        switch (lance) {
            case LANCES.GRANDE:
                ganador = this.resolverGrande();
                puntos = this.enviteActual.apuesta > 0 ? this.enviteActual.apuesta : 1;
                break;

            case LANCES.CHICA:
                ganador = this.resolverChica();
                puntos = this.enviteActual.apuesta > 0 ? this.enviteActual.apuesta : 1;
                break;

            case LANCES.PARES:
                const resultadoPares = this.resolverPares();
                ganador = resultadoPares.ganador;
                // Pares: 1 par, 2 medias, 3 duples + envites
                puntos = resultadoPares.puntosPares;
                if (this.enviteActual.apuesta > 0) {
                    puntos += this.enviteActual.apuesta;
                }
                break;

            case LANCES.JUEGO:
                ganador = this.resolverJuego();
                // Juego: 2 piedras base + envites
                puntos = 2;
                if (this.enviteActual.apuesta > 0) {
                    puntos += this.enviteActual.apuesta;
                }
                break;

            case LANCES.PUNTO:
                ganador = this.resolverPunto();
                // Punto: 1 piedra base + envites
                puntos = 1;
                if (this.enviteActual.apuesta > 0) {
                    puntos += this.enviteActual.apuesta;
                }
                break;
        }

        if (ganador) {
            this.puntosPendientes[ganador] += puntos;
        }

        this.emit('lanceResolved', {
            lance: lance,
            ganador: ganador,
            puntos: puntos
        });

        // Si hay ordago y se acepto, terminar la ronda
        if (this.ordagoActivo && this.enviteActual.ultimaAccion === 'ordago') {
            this.finishRoundWithOrdago(ganador);
            return;
        }

        this.nextLance();
    }

    /**
     * Pasa al siguiente lance
     */
    nextLance() {
        const lanceOrder = [LANCES.GRANDE, LANCES.CHICA, LANCES.PARES, LANCES.JUEGO];
        const currentIndex = lanceOrder.indexOf(this.lanceActual);

        // Si estamos en punto, era el ultimo
        if (this.lanceActual === LANCES.PUNTO) {
            this.finishRound();
            return;
        }

        if (currentIndex < lanceOrder.length - 1) {
            const nextLance = lanceOrder[currentIndex + 1];
            this.startEnvite(nextLance);
        } else {
            this.finishRound();
        }
    }

    /**
     * Finaliza la ronda y suma puntos
     */
    finishRound() {
        // Sumar puntos pendientes
        this.piedras.equipo1 += this.puntosPendientes.equipo1;
        this.piedras.equipo2 += this.puntosPendientes.equipo2;

        this.emit('roundFinished', {
            puntosPendientes: this.puntosPendientes,
            piedras: this.piedras
        });

        // Verificar ganador
        const ganador = this.checkWinner();
        if (ganador) {
            this.emit('gameOver', {
                ganador: ganador,
                piedras: this.piedras
            });
            return;
        }

        // Rotar mano al siguiente jugador en orden antihorario
        this.manoIndex = (this.manoIndex + 1) % 4;

        // Nueva ronda
        this.startRound();
    }

    /**
     * Finaliza la ronda por ordago
     * @param {string} ganador - Equipo ganador del ordago
     */
    finishRoundWithOrdago(ganador) {
        this.piedras[ganador] = PIEDRAS_PARA_GANAR;

        this.emit('ordagoResolved', {
            ganador: ganador
        });

        this.emit('gameOver', {
            ganador: ganador,
            piedras: this.piedras,
            ordago: true
        });
    }

    /**
     * Verifica si hay un ganador
     * @returns {string|null} - Equipo ganador o null
     */
    checkWinner() {
        if (this.piedras.equipo1 >= PIEDRAS_PARA_GANAR) {
            return 'equipo1';
        }
        if (this.piedras.equipo2 >= PIEDRAS_PARA_GANAR) {
            return 'equipo2';
        }
        return null;
    }

    // ==================== RESOLUCION DE LANCES ====================

    /**
     * Convierte el valor de una carta para comparaciones en el MUS
     * El 3 vale como Rey (12) y el 2 vale como As (1)
     * @param {number} value - Valor original de la carta
     * @returns {number} - Valor convertido para comparacion
     */
    getValorMusComparacion(value) {
        if (value === 3) return 12; // El 3 vale como Rey
        if (value === 2) return 1;  // El 2 vale como As
        return value;
    }

    /**
     * Calcula el valor de una mano para GRANDE (carta mas alta gana)
     * Considera que 3=Rey y 2=As para comparacion
     * @param {Card[]} hand - Mano del jugador
     * @returns {number[]} - Array de valores ordenados de mayor a menor
     */
    getGrandeValues(hand) {
        return hand.map(card => this.getValorMusComparacion(card.value)).sort((a, b) => b - a);
    }

    /**
     * Calcula el valor de una mano para CHICA (carta mas baja gana)
     * Considera que 3=Rey y 2=As para comparacion
     * @param {Card[]} hand - Mano del jugador
     * @returns {number[]} - Array de valores ordenados de menor a mayor
     */
    getChicaValues(hand) {
        return hand.map(card => this.getValorMusComparacion(card.value)).sort((a, b) => a - b);
    }

    /**
     * Compara dos arrays de valores
     * @returns {number} - 1 si a gana, -1 si b gana, 0 si empate
     */
    compareValues(valuesA, valuesB) {
        for (let i = 0; i < Math.min(valuesA.length, valuesB.length); i++) {
            if (valuesA[i] > valuesB[i]) return 1;
            if (valuesA[i] < valuesB[i]) return -1;
        }
        return 0;
    }

    /**
     * Resuelve el lance GRANDE
     * @returns {string} - Equipo ganador
     */
    resolverGrande() {
        let mejorJugador = null;
        let mejorValores = null;
        let mejorPosicion = -1;

        // Empezamos desde la mano
        for (let i = 0; i < 4; i++) {
            const posicion = (this.manoIndex + i) % 4;
            const playerId = this.turnOrder[posicion];
            const player = this.players[playerId];
            const valores = this.getGrandeValues(player.hand);

            if (!mejorValores) {
                mejorJugador = playerId;
                mejorValores = valores;
                mejorPosicion = posicion;
            } else {
                const comparacion = this.compareValues(valores, mejorValores);
                if (comparacion > 0) {
                    mejorJugador = playerId;
                    mejorValores = valores;
                    mejorPosicion = posicion;
                }
                // En empate, gana quien esta mas cerca de la mano (ya lo tenemos)
            }
        }

        return this.players[mejorJugador].team;
    }

    /**
     * Resuelve el lance CHICA
     * @returns {string} - Equipo ganador
     */
    resolverChica() {
        let mejorJugador = null;
        let mejorValores = null;

        for (let i = 0; i < 4; i++) {
            const posicion = (this.manoIndex + i) % 4;
            const playerId = this.turnOrder[posicion];
            const player = this.players[playerId];
            const valores = this.getChicaValues(player.hand);

            if (!mejorValores) {
                mejorJugador = playerId;
                mejorValores = valores;
            } else {
                // Para chica, menor es mejor
                const comparacion = this.compareValues(mejorValores, valores);
                if (comparacion > 0) {
                    mejorJugador = playerId;
                    mejorValores = valores;
                }
            }
        }

        return this.players[mejorJugador].team;
    }

    /**
     * Detecta los pares en una mano
     * Considera que 3=Rey (12) y 2=As (1) para comparacion de valores
     * @param {Card[]} hand - Mano del jugador
     * @returns {object} - { tipo: 'duples'|'medias'|'par'|null, valores: number[], puntos: number }
     */
    detectarPares(hand) {
        // Convertir valores para comparacion MUS (3=Rey, 2=As)
        const valoresConvertidos = hand.map(card => this.getValorMusComparacion(card.value));
        const conteo = {};

        for (const valor of valoresConvertidos) {
            conteo[valor] = (conteo[valor] || 0) + 1;
        }

        const parejas = Object.entries(conteo).filter(([v, c]) => c >= 2);

        if (parejas.length === 0) {
            return { tipo: null, valores: [], puntos: 0 };
        }

        // Duples: 4 cartas iguales
        const cuatro = parejas.find(([v, c]) => c === 4);
        if (cuatro) {
            return { tipo: 'duples', valores: [parseInt(cuatro[0])], puntos: 3 };
        }

        // Medias: 3 cartas iguales
        const tres = parejas.find(([v, c]) => c === 3);
        if (tres) {
            return { tipo: 'medias', valores: [parseInt(tres[0])], puntos: 2 };
        }

        // Duples tambien puede ser 2 pares diferentes
        if (parejas.length >= 2) {
            const valoresPares = parejas.map(([v, c]) => parseInt(v)).sort((a, b) => b - a);
            return { tipo: 'duples', valores: valoresPares, puntos: 3 };
        }

        // Par simple
        const par = parejas[0];
        return { tipo: 'par', valores: [parseInt(par[0])], puntos: 1 };
    }

    /**
     * Verifica si un jugador tiene pares (alias para compatibilidad)
     * @param {Card[]} hand - Mano del jugador
     * @returns {object} - { tipo: 'duples'|'medias'|'par'|null, valor: number, puntos: number }
     */
    getPares(hand) {
        const resultado = this.detectarPares(hand);
        return {
            tipo: resultado.tipo,
            valor: resultado.valores.length > 0 ? resultado.valores[0] : 0,
            valores: resultado.valores,
            puntos: resultado.puntos
        };
    }

    /**
     * Verifica si ALGUN jugador tiene pares
     * Emite un evento con la lista de jugadores que tienen pares
     * @returns {boolean} - true si al menos un jugador tiene pares
     */
    hayPares() {
        const jugadoresConPares = [];

        for (const playerId in this.players) {
            const pares = this.detectarPares(this.players[playerId].hand);
            if (pares.tipo) {
                jugadoresConPares.push({
                    playerId: playerId,
                    tipo: pares.tipo,
                    valores: pares.valores,
                    puntos: pares.puntos
                });
            }
        }

        const hayPares = jugadoresConPares.length > 0;

        // Emitir evento con informacion de quien tiene pares
        this.emit('paresDetectados', {
            hayPares: hayPares,
            jugadores: jugadoresConPares
        });

        return hayPares;
    }

    /**
     * Compara dos resultados de pares para determinar cual gana
     * @param {object} paresA - Resultado de detectarPares
     * @param {object} paresB - Resultado de detectarPares
     * @returns {number} - 1 si A gana, -1 si B gana, 0 si empate
     */
    compararPares(paresA, paresB) {
        const jerarquia = { duples: 3, medias: 2, par: 1 };
        const jerarquiaA = jerarquia[paresA.tipo] || 0;
        const jerarquiaB = jerarquia[paresB.tipo] || 0;

        // Primero comparar por tipo (duples > medias > par)
        if (jerarquiaA > jerarquiaB) return 1;
        if (jerarquiaA < jerarquiaB) return -1;

        // Mismo tipo, comparar por valor del par mas alto
        const valorA = paresA.valores[0] || 0;
        const valorB = paresB.valores[0] || 0;

        if (valorA > valorB) return 1;
        if (valorA < valorB) return -1;

        // Si son duples con 2 pares, comparar el segundo par
        if (paresA.tipo === 'duples' && paresA.valores.length > 1 && paresB.valores.length > 1) {
            const segundoA = paresA.valores[1] || 0;
            const segundoB = paresB.valores[1] || 0;
            if (segundoA > segundoB) return 1;
            if (segundoA < segundoB) return -1;
        }

        return 0; // Empate
    }

    /**
     * Resuelve el lance PARES
     * Los valores ya estan convertidos (3=Rey, 2=As) por detectarPares
     * @returns {object} - { ganador: string, puntosPares: number }
     */
    resolverPares() {
        let mejorJugador = null;
        let mejorPares = { tipo: null, valores: [], puntos: 0 };

        for (let i = 0; i < 4; i++) {
            const posicion = (this.manoIndex + i) % 4;
            const playerId = this.turnOrder[posicion];
            const player = this.players[playerId];
            const pares = this.detectarPares(player.hand);

            if (!pares.tipo) continue;

            if (!mejorPares.tipo) {
                mejorJugador = playerId;
                mejorPares = pares;
            } else {
                const comparacion = this.compararPares(pares, mejorPares);
                if (comparacion > 0) {
                    mejorJugador = playerId;
                    mejorPares = pares;
                }
                // En empate, gana quien esta mas cerca de la mano (ya lo tenemos)
            }
        }

        return {
            ganador: mejorJugador ? this.players[mejorJugador].team : null,
            puntosPares: mejorPares.puntos || 0
        };
    }

    /**
     * Calcula el valor de juego/punto de una mano
     * Reglas de puntuacion para JUEGO:
     * - Figuras (Rey=12, Caballo=11, Sota=10) valen 10 puntos
     * - El 3 vale 10 puntos (como las figuras)
     * - El 2 vale 1 punto (como el As)
     * - El resto de cartas valen su valor nominal
     * @param {Card[]} hand - Mano del jugador
     * @returns {number} - Valor total de la mano
     */
    getValorJuego(hand) {
        let total = 0;
        for (const card of hand) {
            if (card.value >= 10) {
                // Figuras (Rey=12, Caballo=11, Sota=10) valen 10 puntos
                total += 10;
            } else if (card.value === 3) {
                // El 3 vale 10 puntos (como las figuras)
                total += 10;
            } else if (card.value === 2) {
                // El 2 vale 1 punto (como el As)
                total += 1;
            } else {
                // Resto de cartas (1, 4, 5, 6, 7) valen su valor nominal
                total += card.value;
            }
        }
        return total;
    }

    /**
     * Calcula el juego de una mano
     * @param {Card[]} hand - Mano del jugador
     * @returns {object} - { tieneJuego: boolean, valor: number }
     */
    calcularJuego(hand) {
        const valor = this.getValorJuego(hand);
        return {
            tieneJuego: valor >= 31,
            valor: valor
        };
    }

    /**
     * Verifica si ALGUN jugador tiene juego (suma >= 31)
     * Emite un evento indicando si se juega JUEGO o PUNTO
     * @returns {boolean} - true si al menos un jugador tiene juego
     */
    hayJuego() {
        const jugadoresConJuego = [];

        for (const playerId in this.players) {
            const resultado = this.calcularJuego(this.players[playerId].hand);
            if (resultado.tieneJuego) {
                jugadoresConJuego.push({
                    playerId: playerId,
                    valor: resultado.valor
                });
            }
        }

        const hayJuego = jugadoresConJuego.length > 0;

        // Emitir evento indicando si es lance de JUEGO o PUNTO
        this.emit('juegoDetectado', {
            hayJuego: hayJuego,
            lanceResultante: hayJuego ? LANCES.JUEGO : LANCES.PUNTO,
            jugadores: jugadoresConJuego
        });

        return hayJuego;
    }

    /**
     * Resuelve el lance JUEGO
     * @returns {string} - Equipo ganador
     */
    resolverJuego() {
        // Jerarquia especial: 31 es el mejor, luego 32, 40, 37, 36, 35, 34, 33
        const jerarquiaJuego = [31, 32, 40, 37, 36, 35, 34, 33];

        let mejorJugador = null;
        let mejorValor = -1;
        let mejorJerarquia = -1;

        for (let i = 0; i < 4; i++) {
            const posicion = (this.manoIndex + i) % 4;
            const playerId = this.turnOrder[posicion];
            const player = this.players[playerId];
            const valor = this.getValorJuego(player.hand);

            if (valor < 31) continue;

            const jerarquiaIndex = jerarquiaJuego.indexOf(valor);
            const jerarquia = jerarquiaIndex >= 0 ? jerarquiaJuego.length - jerarquiaIndex : -valor;

            if (jerarquia > mejorJerarquia || (jerarquia === mejorJerarquia && !mejorJugador)) {
                mejorJugador = playerId;
                mejorValor = valor;
                mejorJerarquia = jerarquia;
            }
        }

        return mejorJugador ? this.players[mejorJugador].team : null;
    }

    /**
     * Resuelve el lance PUNTO (cuando nadie tiene juego)
     * @returns {string} - Equipo ganador
     */
    resolverPunto() {
        let mejorJugador = null;
        let mejorValor = -1;

        for (let i = 0; i < 4; i++) {
            const posicion = (this.manoIndex + i) % 4;
            const playerId = this.turnOrder[posicion];
            const player = this.players[playerId];
            const valor = this.getValorJuego(player.hand);

            if (valor > mejorValor) {
                mejorJugador = playerId;
                mejorValor = valor;
            }
        }

        return mejorJugador ? this.players[mejorJugador].team : null;
    }

    // ==================== UTILIDADES ====================

    /**
     * Obtiene el estado actual del juego
     * @returns {object} - Estado completo del juego
     */
    getState() {
        return {
            players: this.players,
            piedras: this.piedras,
            lanceActual: this.lanceActual,
            faseActual: this.faseActual,
            mano: this.getMano(),
            manoIndex: this.manoIndex,
            postre: this.turnOrder[this.postre],
            currentTurnPlayer: this.getCurrentTurnPlayer(),
            currentTurnIndex: this.currentTurnIndex,
            enviteActual: this.enviteActual,
            puntosPendientes: this.puntosPendientes,
            turnOrder: this.turnOrder
        };
    }

    /**
     * Obtiene la mano de un jugador (para la UI)
     * @param {string} playerId - ID del jugador
     * @returns {Card[]} - Cartas del jugador
     */
    getPlayerHand(playerId) {
        return this.players[playerId]?.hand || [];
    }

    /**
     * Verifica si es el turno de un jugador
     * @param {string} playerId - ID del jugador
     * @returns {boolean}
     */
    isPlayerTurn(playerId) {
        if (this.faseActual === FASES.MUS) {
            return playerId === this.getMusTurnPlayer();
        }
        if (this.faseActual === FASES.DESCARTE) {
            return playerId === this.getDescarteTurnPlayer();
        }
        if (this.faseActual === FASES.ENVITE) {
            if (this.enviteActual.esperandoRespuesta) {
                const player = this.players[playerId];
                return player && player.team === this.enviteActual.equipoDebeResponder;
            }
            return playerId === this.getEnviteTurnPlayer();
        }
        return false;
    }
}

// Exportar para uso como modulo ES6
export { Game, LANCES, FASES, ACCIONES_ENVITE, PIEDRAS_PARA_GANAR, TURN_ORDER };
