/**
 * MUS - Punto de entrada principal
 * Integra todos los módulos y gestiona el flujo del juego
 */

import { Deck, Card, Hand, PALOS, VALORES } from './cards.js';
import { Game, LANCES, FASES, ACCIONES_ENVITE } from './game.js';
import AIPlayer, { LANCE, ACCION, DIFICULTAD } from './ai.js';

/**
 * Controlador principal del juego MUS
 */
class MusController {
    constructor() {
        this.game = null;
        this.aiPlayers = {};
        this.selectedCards = new Set();
        this.waitingForHuman = false;
        this.elements = {};

        // Control de turnos
        this.currentTurn = null;
        this.manoActual = null;
        this.turnQueue = [];
        this.processingTurn = false;

        // Generation counter: increments on each lance transition to invalidate stale setTimeout callbacks
        this.lanceGeneration = 0;

        // Accumulated lance results for end-of-round summary
        this.lanceResults = [];

        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.createGame();
        this.createAIPlayers();

        // Iniciar el juego
        setTimeout(() => this.startGame(), 500);
    }

    cacheElements() {
        this.elements = {
            // Manos de jugadores (IDs con guion)
            manoJugador: document.getElementById('mano-jugador'),
            manoPareja: document.getElementById('mano-pareja'),
            manoRival1: document.getElementById('mano-rival1'),
            manoRival2: document.getElementById('mano-rival2'),

            // Areas de jugadores
            areaJugador: document.querySelector('.player-area--jugador'),
            areaPareja: document.querySelector('.player-area--pareja'),
            areaRival1: document.querySelector('.player-area--rival1'),
            areaRival2: document.querySelector('.player-area--rival2'),

            // Nombres de jugadores
            nombreJugador: document.querySelector('.player-area--jugador .player-name'),
            nombrePareja: document.querySelector('.player-area--pareja .player-name'),
            nombreRival1: document.querySelector('.player-area--rival1 .player-name'),
            nombreRival2: document.querySelector('.player-area--rival2 .player-name'),

            // Marcador
            piedrasNosotros: document.getElementById('piedras-nosotros'),
            piedrasEllos: document.getElementById('piedras-ellos'),
            barNosotros: document.getElementById('bar-nosotros'),
            barEllos: document.getElementById('bar-ellos'),

            // Estado del juego
            lanceActual: document.getElementById('lance-actual'),
            indicadorTurno: document.getElementById('indicador-turno'),
            valorEnvite: document.getElementById('valor-envite'),

            // Botones
            btnMus: document.getElementById('btn-mus'),
            btnCortar: document.getElementById('btn-cortar'),
            btnPaso: document.getElementById('btn-paso'),
            btnEnvido: document.getElementById('btn-envido'),
            btnOrdago: document.getElementById('btn-ordago'),
            btnQuiero: document.getElementById('btn-quiero'),
            btnNoQuiero: document.getElementById('btn-no-quiero'),

            // Status de jugadores
            statusJugador: document.getElementById('status-jugador'),
            statusPareja: document.getElementById('status-pareja'),
            statusRival1: document.getElementById('status-rival1'),
            statusRival2: document.getElementById('status-rival2'),

            // Modales
            modal: document.getElementById('modal'),
            modalTitle: document.getElementById('modal-title'),
            modalBody: document.getElementById('modal-body'),
            modalAccept: document.getElementById('modal-accept'),
            modalResultado: document.getElementById('modal-resultado'),
            resultadoGanador: document.getElementById('resultado-ganador'),
            resultadoNosotros: document.getElementById('resultado-nosotros'),
            resultadoEllos: document.getElementById('resultado-ellos'),
            btnNuevaPartida: document.getElementById('btn-nueva-partida'),

            // Grupos de controles
            grupoMus: document.querySelector('.controls-group--mus'),
            grupoEnvite: document.querySelector('.controls-group--envite'),
            grupoExtra: document.querySelector('.controls-group--extra'),

            // Modal de resumen de ronda
            modalResumen: document.getElementById('modal-resumen'),
            resumenBody: document.getElementById('resumen-body'),
            resumenFooter: document.getElementById('resumen-footer'),
            btnContinuar: document.getElementById('btn-continuar')
        };
    }

    bindEvents() {
        // Botones de MUS
        this.elements.btnMus?.addEventListener('click', () => this.onMusClick());
        this.elements.btnCortar?.addEventListener('click', () => this.onCortarClick());

        // Botones de envite
        this.elements.btnPaso?.addEventListener('click', () => this.onPasoClick());
        this.elements.btnEnvido?.addEventListener('click', () => this.onEnvidoClick());
        this.elements.btnOrdago?.addEventListener('click', () => this.onOrdagoClick());
        this.elements.btnQuiero?.addEventListener('click', () => this.onQuieroClick());
        this.elements.btnNoQuiero?.addEventListener('click', () => this.onNoQuieroClick());

        // Modal
        this.elements.modalAccept?.addEventListener('click', () => this.hideModal());
        this.elements.btnNuevaPartida?.addEventListener('click', () => this.restartGame());

        // Resumen de ronda
        this.elements.btnContinuar?.addEventListener('click', () => this.onContinuarClick());
    }

    createGame() {
        this.game = new Game();

        // Suscribirse a eventos del juego
        this.game.on('gameStarted', (data) => this.onGameStarted(data));
        this.game.on('roundStarted', (data) => this.onRoundStarted(data));
        this.game.on('cardsDealt', (data) => this.onCardsDealt(data));
        this.game.on('phaseChanged', (data) => this.onPhaseChanged(data));
        this.game.on('musPhaseStarted', (data) => this.onMusPhaseStarted(data));
        this.game.on('musResponse', (data) => this.onMusResponse(data));
        this.game.on('musCortado', (data) => this.onMusCortado(data));
        this.game.on('descartePhaseStarted', (data) => this.onDescartePhaseStarted(data));
        this.game.on('enviteStarted', (data) => this.onEnviteStarted(data));
        this.game.on('enviteAction', (data) => this.onEnviteAction(data));
        this.game.on('lanceResolved', (data) => this.onLanceResolved(data));
        this.game.on('lanceSkipped', (data) => this.onLanceSkipped(data));
        this.game.on('roundFinished', (data) => this.onRoundFinished(data));
        this.game.on('gameOver', (data) => this.onGameOver(data));

        // Nuevos eventos para turnos y deteccion
        this.game.on('turnChanged', (data) => this.onTurnChanged(data));
        this.game.on('paresDetectados', (data) => this.onParesDetectados(data));
        this.game.on('juegoDetectado', (data) => this.onJuegoDetectado(data));
    }

    createAIPlayers() {
        this.aiPlayers = {
            partner: new AIPlayer(DIFICULTAD.MEDIO),
            rival1: new AIPlayer(DIFICULTAD.MEDIO),
            rival2: new AIPlayer(DIFICULTAD.MEDIO)
        };
    }

    startGame() {
        console.log('[MUS] Comenzando partida');
        this.game.startGame();
    }

    restartGame() {
        this.hideResultModal();
        this.game.piedras = { equipo1: 0, equipo2: 0 };
        this.game.manoIndex = 0;
        this.updateScore();
        this.startGame();
    }

    // ==================== CONTROL DE TURNOS ====================

    getPlayerName(playerId) {
        const names = {
            'player': 'Jugador',
            'partner': 'Pareja',
            'rival1': 'Rival 1',
            'rival2': 'Rival 2'
        };
        return names[playerId] || playerId;
    }

    getPlayerArea(playerId) {
        const map = {
            'player': this.elements.areaJugador,
            'partner': this.elements.areaPareja,
            'rival1': this.elements.areaRival1,
            'rival2': this.elements.areaRival2
        };
        return map[playerId];
    }

    getPlayerNameElement(playerId) {
        const map = {
            'player': this.elements.nombreJugador,
            'partner': this.elements.nombrePareja,
            'rival1': this.elements.nombreRival1,
            'rival2': this.elements.nombreRival2
        };
        return map[playerId];
    }

    setCurrentTurn(playerId) {
        this.currentTurn = playerId;

        // Quitar resaltado de todos los jugadores
        ['player', 'partner', 'rival1', 'rival2'].forEach(p => {
            const area = this.getPlayerArea(p);
            const nameEl = this.getPlayerNameElement(p);
            if (area) {
                area.classList.remove('player-area--active-turn');
            }
            if (nameEl) {
                nameEl.classList.remove('player-name--active');
            }
        });

        // Resaltar area y nombre del jugador actual
        const currentArea = this.getPlayerArea(playerId);
        const currentNameEl = this.getPlayerNameElement(playerId);
        if (currentArea) {
            currentArea.classList.add('player-area--active-turn');
        }
        if (currentNameEl) {
            currentNameEl.classList.add('player-name--active');
        }

        // NO usar indicador flotante - el resaltado del nombre es suficiente
        // Solo ocultar siempre el indicador viejo para que no tape cartas
        this.showTurnIndicator(false);

        // Habilitar/deshabilitar botones segun turno
        const isHumanTurn = playerId === 'player';
        this.setButtonsEnabled(isHumanTurn);
        this.waitingForHuman = isHumanTurn;

        console.log(`[MUS] Turno de: ${this.getPlayerName(playerId)}`);
    }

    setButtonsEnabled(enabled) {
        const buttons = [
            this.elements.btnMus,
            this.elements.btnCortar,
            this.elements.btnPaso,
            this.elements.btnEnvido,
            this.elements.btnOrdago
        ];

        buttons.forEach(btn => {
            if (btn) btn.disabled = !enabled;
        });
    }

    updateManoIndicator(manoPlayerId) {
        this.manoActual = manoPlayerId;

        // Quitar indicador de todos
        ['player', 'partner', 'rival1', 'rival2'].forEach(p => {
            const nameEl = this.getPlayerNameElement(p);
            if (nameEl) {
                // Restaurar nombre original sin indicador MANO
                const baseName = this.getPlayerName(p);
                nameEl.textContent = baseName;
                nameEl.classList.remove('player-name--mano');
            }
        });

        // Añadir indicador de mano
        const manoNameEl = this.getPlayerNameElement(manoPlayerId);
        if (manoNameEl) {
            manoNameEl.innerHTML = `${this.getPlayerName(manoPlayerId)} <span class="mano-badge">MANO</span>`;
            manoNameEl.classList.add('player-name--mano');
        }
    }

    // Delay aleatorio para simular "pensamiento" de la IA
    getAIDelay() {
        return 800 + Math.random() * 400; // 800-1200ms
    }

    // ==================== RENDERIZADO ====================

    getHandElement(playerId) {
        const map = {
            'player': this.elements.manoJugador,
            'partner': this.elements.manoPareja,
            'rival1': this.elements.manoRival1,
            'rival2': this.elements.manoRival2
        };
        return map[playerId];
    }

    getStatusElement(playerId) {
        const map = {
            'player': this.elements.statusJugador,
            'partner': this.elements.statusPareja,
            'rival1': this.elements.statusRival1,
            'rival2': this.elements.statusRival2
        };
        return map[playerId];
    }

    renderPlayerHand(playerId, cards, faceUp = false) {
        const handElement = this.getHandElement(playerId);
        if (!handElement) {
            console.warn('No se encontró elemento para', playerId);
            return;
        }

        handElement.innerHTML = '';

        cards.forEach((card, index) => {
            const cardEl = this.createCardElement(card, faceUp, index);
            if (playerId === 'player' && faceUp) {
                cardEl.addEventListener('click', () => this.onCardClick(index, cardEl));
            }
            handElement.appendChild(cardEl);
        });
    }

    createCardElement(card, faceUp, index) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.dataset.position = index;

        const img = document.createElement('img');
        img.className = 'card-img';
        img.draggable = false;

        if (!faceUp) {
            cardEl.classList.add('card--back');
            img.src = 'modelos/reverso.png';
            img.alt = 'Carta boca abajo';
        } else {
            cardEl.classList.add('card--front');
            const valorStr = card.valor.toString().padStart(2, '0');
            img.src = `modelos/${valorStr}-${card.palo}.png`;
            img.alt = `${card.valor} de ${card.palo}`;
        }

        cardEl.appendChild(img);
        return cardEl;
    }

    updateScore() {
        const piedras = this.game.piedras;

        if (this.elements.piedrasNosotros) {
            this.elements.piedrasNosotros.textContent = piedras.equipo1;
        }
        if (this.elements.piedrasEllos) {
            this.elements.piedrasEllos.textContent = piedras.equipo2;
        }
        if (this.elements.barNosotros) {
            this.elements.barNosotros.style.width = `${(piedras.equipo1 / 40) * 100}%`;
        }
        if (this.elements.barEllos) {
            this.elements.barEllos.style.width = `${(piedras.equipo2 / 40) * 100}%`;
        }
    }

    updateLanceDisplay(lance) {
        const lanceNames = {
            grande: 'GRANDE',
            chica: 'CHICA',
            pares: 'PARES',
            juego: 'JUEGO',
            punto: 'PUNTO'
        };

        if (this.elements.lanceActual) {
            this.elements.lanceActual.textContent = lanceNames[lance] || lance;
        }
    }

    showButtonGroup(group) {
        // Ocultar todos
        if (this.elements.grupoMus) this.elements.grupoMus.style.display = 'none';
        if (this.elements.grupoEnvite) this.elements.grupoEnvite.style.display = 'none';
        if (this.elements.grupoExtra) this.elements.grupoExtra.style.display = 'none';

        // Mostrar el solicitado solo si es turno del humano
        const isHumanTurn = this.currentTurn === 'player';

        switch(group) {
            case 'mus':
                if (this.elements.grupoMus && isHumanTurn) {
                    this.elements.grupoMus.style.display = 'flex';
                }
                break;
            case 'envite':
                if (this.elements.grupoEnvite && isHumanTurn) {
                    this.elements.grupoEnvite.style.display = 'flex';
                }
                break;
            case 'respuesta':
                // Los botones de respuesta se muestran cuando hay que responder a un envite
                if (this.elements.grupoExtra) {
                    this.elements.grupoExtra.style.display = 'flex';
                    if (this.elements.btnQuiero) this.elements.btnQuiero.disabled = false;
                    if (this.elements.btnNoQuiero) this.elements.btnNoQuiero.disabled = false;
                }
                // Mostrar opciones de subida (envido/ordago) salvo si hay ordago activo
                if (!this.game.ordagoActivo && isHumanTurn) {
                    if (this.elements.grupoEnvite) {
                        this.elements.grupoEnvite.style.display = 'flex';
                    }
                }
                break;
            case 'none':
                break;
        }
    }

    updatePlayerStatus(playerId, status) {
        const statusEl = this.getStatusElement(playerId);
        if (statusEl) {
            statusEl.textContent = status;
            if (status) {
                statusEl.classList.add('speech-bubble--visible');
                statusEl.classList.remove('status-animate');
                void statusEl.offsetWidth; // Trigger reflow
                statusEl.classList.add('status-animate');
            } else {
                statusEl.classList.remove('speech-bubble--visible');
                statusEl.classList.remove('status-animate');
            }
        }
    }

    clearAllStatus() {
        ['player', 'partner', 'rival1', 'rival2'].forEach(p => {
            this.updatePlayerStatus(p, '');
        });
    }

    /**
     * Sistema de HABLAR: ejecuta una secuencia de "frases" de jugadores en orden,
     * con un delay entre cada una para que se aprecie el flujo del juego.
     * @param {Array<{playerId: string, text: string}>} speeches - Lista de frases en orden
     * @param {Function} callback - Funcion a ejecutar cuando termina la secuencia
     * @param {number} delay - Delay entre frases en ms (default 800)
     */
    speakSequence(speeches, callback, delay = 1000) {
        this.clearAllStatus();
        let index = 0;
        const gen = this.lanceGeneration;

        const speakNext = () => {
            if (this.lanceGeneration !== gen) return; // Stale, bail out
            if (index >= speeches.length) {
                // Esperar un momento extra al final para que se lea la ultima frase
                setTimeout(() => {
                    if (this.lanceGeneration !== gen) return;
                    if (callback) callback();
                }, delay);
                return;
            }

            const { playerId, text } = speeches[index];

            // Resaltar el jugador que habla
            this.highlightSpeaker(playerId);
            this.updatePlayerStatus(playerId, text);

            index++;
            setTimeout(() => {
                if (this.lanceGeneration !== gen) return;
                speakNext();
            }, delay);
        };

        speakNext();
    }

    /**
     * Resalta brevemente al jugador que esta hablando
     */
    highlightSpeaker(playerId) {
        // Quitar resaltado de habla de todos
        ['player', 'partner', 'rival1', 'rival2'].forEach(p => {
            const nameEl = this.getPlayerNameElement(p);
            if (nameEl) nameEl.classList.remove('player-name--speaking');
        });

        // Resaltar al que habla
        const nameEl = this.getPlayerNameElement(playerId);
        if (nameEl) nameEl.classList.add('player-name--speaking');
    }

    clearSpeakerHighlight() {
        ['player', 'partner', 'rival1', 'rival2'].forEach(p => {
            const nameEl = this.getPlayerNameElement(p);
            if (nameEl) nameEl.classList.remove('player-name--speaking');
        });
    }

    /**
     * Obtiene el orden de turnos empezando desde la mano actual
     */
    getTurnOrderFromMano() {
        const manoIndex = this.game.manoIndex;
        const turnOrder = this.game.turnOrder;
        const order = [];
        for (let i = 0; i < 4; i++) {
            const playerIndex = (manoIndex + i) % 4;
            order.push(turnOrder[playerIndex]);
        }
        return order;
    }

    randomPhrase(phrases) {
        return phrases[Math.floor(Math.random() * phrases.length)];
    }

    showTurnIndicator(show) {
        if (this.elements.indicadorTurno) {
            this.elements.indicadorTurno.style.display = show ? 'block' : 'none';
        }
    }

    showModal(title, body) {
        if (this.elements.modalTitle) this.elements.modalTitle.textContent = title;
        if (this.elements.modalBody) this.elements.modalBody.innerHTML = body;
        if (this.elements.modal) this.elements.modal.setAttribute('aria-hidden', 'false');
    }

    hideModal() {
        if (this.elements.modal) this.elements.modal.setAttribute('aria-hidden', 'true');
    }

    showResultModal(ganador, piedras) {
        const esVictoria = ganador === 'equipo1';

        // Mostrar cartas de todos al final
        const players = this.game.players;
        this.renderPlayerHand('partner', players.partner.hand, true);
        this.renderPlayerHand('rival1', players.rival1.hand, true);
        this.renderPlayerHand('rival2', players.rival2.hand, true);

        if (this.elements.resultadoGanador) {
            this.elements.resultadoGanador.textContent = esVictoria ? '¡VICTORIA!' : 'Derrota';
        }
        if (this.elements.resultadoNosotros) {
            this.elements.resultadoNosotros.textContent = piedras.equipo1;
        }
        if (this.elements.resultadoEllos) {
            this.elements.resultadoEllos.textContent = piedras.equipo2;
        }
        if (this.elements.modalResultado) {
            this.elements.modalResultado.setAttribute('aria-hidden', 'false');
        }
    }

    hideResultModal() {
        if (this.elements.modalResultado) {
            this.elements.modalResultado.setAttribute('aria-hidden', 'true');
        }
    }

    // Mostrar informacion de deteccion (pares, juego)
    showInfoMessage(message, duration = 2500) {
        // Crear elemento de mensaje si no existe
        let infoEl = document.getElementById('info-message');
        if (!infoEl) {
            infoEl = document.createElement('div');
            infoEl.id = 'info-message';
            infoEl.className = 'info-message';
            document.querySelector('.mus-game')?.appendChild(infoEl);
        }

        infoEl.textContent = message;
        infoEl.classList.add('info-message--visible');

        setTimeout(() => {
            infoEl.classList.remove('info-message--visible');
        }, duration);
    }

    // ==================== EVENTOS DEL JUEGO ====================

    onGameStarted(data) {
        console.log('[MUS] Partida iniciada');
        this.updateScore();
    }

    onRoundStarted(data) {
        console.log('[MUS] Nueva ronda - Mano:', data.mano);
        this.lanceGeneration++; // Invalidate any stale callbacks from previous round
        this.selectedCards.clear();
        this.clearAllStatus();
        this.clearSpeakerHighlight();
        this.lanceResults = [];

        // Actualizar indicador de mano
        this.updateManoIndicator(data.mano);
    }

    onCardsDealt(data) {
        console.log('[MUS] Cartas repartidas');
        const players = data.players;

        // Jugador humano - cartas boca arriba
        this.renderPlayerHand('player', players.player.hand, true);

        // IA - cartas SIEMPRE boca abajo durante el juego
        this.renderPlayerHand('partner', players.partner.hand, false);
        this.renderPlayerHand('rival1', players.rival1.hand, false);
        this.renderPlayerHand('rival2', players.rival2.hand, false);
    }

    onPhaseChanged(data) {
        console.log('[MUS] Fase:', data.fase, data.lance || '');
        if (data.lance) {
            this.updateLanceDisplay(data.lance);
        }
    }

    onMusPhaseStarted(data) {
        console.log('[MUS] Fase de MUS iniciada - Turno:', data.turno);
        this.clearAllStatus();
        this.clearSpeakerHighlight();

        // Iniciar turno desde la mano
        this.startMusTurnSequence();
    }

    startMusTurnSequence() {
        // El orden de turnos empieza desde la mano
        const manoIndex = this.game.manoIndex;
        const turnOrder = this.game.turnOrder;

        // Crear cola de turnos
        this.turnQueue = [];
        for (let i = 0; i < 4; i++) {
            const playerIndex = (manoIndex + i) % 4;
            this.turnQueue.push(turnOrder[playerIndex]);
        }

        // Iniciar primer turno
        this.processNextMusTurn();
    }

    processNextMusTurn() {
        if (this.game.faseActual !== FASES.MUS) return;
        if (this.turnQueue.length === 0) return;

        const gen = this.lanceGeneration;
        const playerId = this.turnQueue.shift();
        this.setCurrentTurn(playerId);

        if (playerId === 'player') {
            // Turno del humano - mostrar botones
            this.showButtonGroup('mus');
            this.waitingForHuman = true;
        } else {
            // Turno de la IA - procesar con delay
            this.showButtonGroup('none');
            setTimeout(() => {
                if (this.lanceGeneration !== gen) return;
                if (this.game.faseActual !== FASES.MUS) return;

                const hand = this.convertHandForAI(this.game.players[playerId].hand);
                const wantsMus = this.aiPlayers[playerId].decideMus(hand);

                const musPhrase = wantsMus
                    ? this.randomPhrase(['Mus', 'Mus...', 'Venga, mus'])
                    : this.randomPhrase(['¡Corto!', 'No hay mus', 'Corto']);
                this.highlightSpeaker(playerId);
                this.updatePlayerStatus(playerId, musPhrase);
                this.game.handleMus(playerId, wantsMus);

                // Si no corto, continuar con el siguiente turno
                if (wantsMus && this.game.faseActual === FASES.MUS) {
                    setTimeout(() => {
                        if (this.lanceGeneration !== gen) return;
                        this.processNextMusTurn();
                    }, 1000);
                }
            }, this.getAIDelay());
        }
    }

    onMusResponse(data) {
        const status = data.wantsMus ? 'Mus' : '¡Corto!';
        this.updatePlayerStatus(data.player, status);
    }

    onMusCortado(data) {
        console.log('[MUS] Cortado por:', data.player);
        this.showTurnIndicator(false);
        this.showButtonGroup('none');
        this.turnQueue = [];
    }

    onDescartePhaseStarted(data) {
        console.log('[MUS] Fase de descarte');
        // TODO: Implementar descarte
        // Por ahora, procesar descarte de IA automáticamente
        setTimeout(() => {
            this.processAIDescarte();
        }, 500);
    }

    onEnviteStarted(data) {
        this.lanceGeneration++;
        const gen = this.lanceGeneration;

        console.log('[MUS] Envite iniciado:', data.lance, '(gen:', gen, ')');
        this.updateLanceDisplay(data.lance);

        if (this.elements.valorEnvite) {
            this.elements.valorEnvite.textContent = '-';
        }

        // Anunciar el lance con mensaje grande y visible
        const lanceNames = { grande: 'GRANDE', chica: 'CHICA', pares: 'PARES', juego: 'JUEGO', punto: 'PUNTO' };
        this.showInfoMessage(`--- ${lanceNames[data.lance] || data.lance} ---`, 2000);

        const startTurnSequence = () => {
            if (this.lanceGeneration !== gen) return;
            this.clearAllStatus();
            setTimeout(() => {
                if (this.lanceGeneration !== gen) return;
                this.startEnviteTurnSequence();
            }, 500);
        };

        // Pausa para que se vea el nombre del lance, luego anuncios si aplica
        setTimeout(() => {
            if (this.lanceGeneration !== gen) return;

            if (data.lance === LANCES.PARES) {
                this.detectarYMostrarPares().then(startTurnSequence);
            } else if (data.lance === LANCES.JUEGO || data.lance === LANCES.PUNTO) {
                this.detectarYMostrarJuego().then(startTurnSequence);
            } else {
                // Grande y Chica: directamente a turnos
                startTurnSequence();
            }
        }, 1500);
    }

    /**
     * Cada jugador "habla" en orden desde la mano anunciando si tiene pares o no.
     * Devuelve una Promise que se resuelve cuando toda la secuencia termina.
     */
    detectarYMostrarPares() {
        return new Promise(resolve => {
            const order = this.getTurnOrderFromMano();
            const speeches = [];

            for (const playerId of order) {
                const pares = this.game.getPares(this.game.players[playerId].hand);
                let text;
                if (!pares.tipo) {
                    text = 'No hay';
                } else if (pares.tipo === 'par') {
                    text = 'Pares';
                } else if (pares.tipo === 'medias') {
                    text = 'Medias';
                } else if (pares.tipo === 'duples') {
                    text = 'Duples';
                }
                speeches.push({ playerId, text });
            }

            this.speakSequence(speeches, () => {
                this.clearSpeakerHighlight();
                resolve();
            });
        });
    }

    /**
     * Cada jugador "habla" en orden desde la mano anunciando si tiene juego o no.
     * Devuelve una Promise que se resuelve cuando toda la secuencia termina.
     */
    detectarYMostrarJuego() {
        return new Promise(resolve => {
            const order = this.getTurnOrderFromMano();
            const speeches = [];

            for (const playerId of order) {
                const valor = this.game.getValorJuego(this.game.players[playerId].hand);
                let text;
                if (valor >= 31) {
                    text = 'Sí';
                } else {
                    text = 'No';
                }
                speeches.push({ playerId, text });
            }

            this.speakSequence(speeches, () => {
                this.clearSpeakerHighlight();
                resolve();
            });
        });
    }

    startEnviteTurnSequence() {
        if (this.game.faseActual !== FASES.ENVITE) return;

        // El orden de turnos empieza desde la mano
        const manoIndex = this.game.manoIndex;
        const turnOrder = this.game.turnOrder;

        // Crear cola de turnos
        this.turnQueue = [];
        for (let i = 0; i < 4; i++) {
            const playerIndex = (manoIndex + i) % 4;
            this.turnQueue.push(turnOrder[playerIndex]);
        }

        // Filtrar jugadores no elegibles en lances de PARES y JUEGO
        const lance = this.game.lanceActual;
        if (lance === LANCES.PARES) {
            this.turnQueue = this.turnQueue.filter(playerId =>
                this.game.getPares(this.game.players[playerId].hand).tipo !== null
            );
        } else if (lance === LANCES.JUEGO) {
            this.turnQueue = this.turnQueue.filter(playerId =>
                this.game.getValorJuego(this.game.players[playerId].hand) >= 31
            );
        }

        // Iniciar primer turno
        this.processNextEnviteTurn();
    }

    processNextEnviteTurn() {
        // Verificar que seguimos en fase de envite
        if (this.game.faseActual !== FASES.ENVITE) return;

        const gen = this.lanceGeneration;

        // Si la cola esta vacia, todos han hablado - resolver lance
        if (this.turnQueue.length === 0) {
            this.game.resolveLance(this.game.lanceActual);
            return;
        }

        const playerId = this.turnQueue[0]; // Peek, no shift aun

        // Verificar si este jugador ya paso
        if (this.game.enviteActual.pasaron.includes(playerId)) {
            this.turnQueue.shift();
            this.processNextEnviteTurn();
            return;
        }

        this.setCurrentTurn(playerId);

        // Verificar si hay apuesta pendiente del equipo contrario
        const playerTeam = this.game.players[playerId].team;
        const equipoApostador = this.game.enviteActual.equipoApostador;
        const hayApuestaPendiente = equipoApostador && equipoApostador !== playerTeam && this.game.enviteActual.apuesta > 0;

        if (playerId === 'player') {
            // Turno del humano
            this.waitingForHuman = true;

            if (hayApuestaPendiente) {
                // Mostrar botones de respuesta
                this.showButtonGroup('respuesta');
            } else {
                // Mostrar botones de envite normal
                this.showButtonGroup('envite');
            }
        } else {
            // Turno de la IA
            this.showButtonGroup('none');

            setTimeout(() => {
                if (this.lanceGeneration !== gen) return;
                if (this.game.faseActual !== FASES.ENVITE) return;

                this.processAIEnviteTurn(playerId, hayApuestaPendiente);
            }, this.getAIDelay());
        }
    }

    processAIEnviteTurn(playerId, hayApuestaPendiente) {
        // Guard: verify we're still in envite phase
        if (this.game.faseActual !== FASES.ENVITE) return;

        const gen = this.lanceGeneration;
        const lance = this.game.lanceActual;
        const currentBet = this.game.enviteActual.apuesta;

        const hand = this.convertHandForAI(this.game.players[playerId].hand);
        const decision = this.aiPlayers[playerId].decideEnvite(
            hand,
            this.convertLanceForAI(lance),
            currentBet,
            this.getGameStateForAI(playerId)
        );

        let action = this.convertAIActionToGame(decision.action);

        // Si hay ordago activo, solo quiero o no_quiero
        if (this.game.ordagoActivo) {
            if (action !== ACCIONES_ENVITE.QUIERO && action !== ACCIONES_ENVITE.NO_QUIERO) {
                // Si queria subir/ordago, probablemente quiere aceptar
                action = (action === ACCIONES_ENVITE.ENVIDO || action === ACCIONES_ENVITE.ORDAGO)
                    ? ACCIONES_ENVITE.QUIERO
                    : ACCIONES_ENVITE.NO_QUIERO;
            }
        } else if (hayApuestaPendiente) {
            // Si pasa, comprobar si hay companero que pueda responder
            if (action === ACCIONES_ENVITE.PASO) {
                const playerTeam = this.game.players[playerId].team;
                const teammateInQueue = this.turnQueue.some(
                    (pid, idx) => idx > 0 && this.game.players[pid]?.team === playerTeam
                        && !this.game.enviteActual.pasaron.includes(pid)
                );
                if (!teammateInQueue) {
                    action = ACCIONES_ENVITE.NO_QUIERO;
                }
            }
        }

        // Mostrar status de la IA - frases variadas
        let statusText = '';
        switch(action) {
            case ACCIONES_ENVITE.PASO:
                statusText = this.randomPhrase(['Paso', 'Paso...', 'Nada']);
                break;
            case ACCIONES_ENVITE.ENVIDO:
                if (this.game.enviteActual.apuesta > 0) {
                    statusText = `¡${decision.amount || 2} más!`;
                } else {
                    statusText = 'Envido';
                }
                break;
            case ACCIONES_ENVITE.ORDAGO:
                statusText = this.randomPhrase(['¡ORDAGO!', '¡Órdago va!', '¡Órdago!']);
                break;
            case ACCIONES_ENVITE.QUIERO:
                statusText = this.randomPhrase(['Quiero', '¡Quiero!', 'Va, quiero']);
                break;
            case ACCIONES_ENVITE.NO_QUIERO:
                statusText = this.randomPhrase(['No quiero', 'No...', 'Me retiro']);
                break;
        }
        this.highlightSpeaker(playerId);
        this.updatePlayerStatus(playerId, statusText);

        // For quiero/no_quiero, delay handleEnvite so the speech bubble stays visible
        // before resolveLance → clearAllStatus hides it
        if (action === ACCIONES_ENVITE.QUIERO || action === ACCIONES_ENVITE.NO_QUIERO) {
            setTimeout(() => {
                if (this.lanceGeneration !== gen) return;
                this.game.handleEnvite(playerId, action, decision.amount);
                this.turnQueue.shift();
            }, 1500);
            return;
        }

        this.game.handleEnvite(playerId, action, decision.amount);

        // Quitar de la cola y continuar (si el lance sigue activo)
        this.turnQueue.shift();

        // Si la accion fue envido u ordago, el equipo contrario debe responder
        if ((action === ACCIONES_ENVITE.ENVIDO || action === ACCIONES_ENVITE.ORDAGO) &&
            this.game.faseActual === FASES.ENVITE) {
            // Reorganizar cola para que responda el equipo contrario
            this.reorganizeTurnQueueForResponse(playerId);
        }

        // Continuar con siguiente turno despues de un delay para que se lea la frase
        if (this.game.faseActual === FASES.ENVITE) {
            setTimeout(() => {
                if (this.lanceGeneration !== gen) return;
                this.processNextEnviteTurn();
            }, 1000);
        }
    }

    reorganizeTurnQueueForResponse(apostadorId) {
        const apostadorTeam = this.game.players[apostadorId].team;

        // Ambos jugadores del equipo contrario pueden responder (en orden desde mano)
        const manoIndex = this.game.manoIndex;
        const turnOrder = this.game.turnOrder;

        this.turnQueue = [];
        for (let i = 0; i < 4; i++) {
            const playerIndex = (manoIndex + i) % 4;
            const pId = turnOrder[playerIndex];
            const pTeam = this.game.players[pId].team;

            // Añadir jugadores del equipo contrario que no hayan pasado
            if (pTeam !== apostadorTeam && !this.game.enviteActual.pasaron.includes(pId)) {
                this.turnQueue.push(pId);
            }
        }
    }

    onEnviteAction(data) {
        let status = '';
        switch(data.action) {
            case 'paso': status = 'Paso'; break;
            case 'envido': status = `Envido ${data.apuesta}`; break;
            case 'ordago': status = '¡ORDAGO!'; break;
            case 'quiero': status = 'Quiero'; break;
            case 'no_quiero': status = 'No quiero'; break;
        }
        this.updatePlayerStatus(data.player, status);

        if (data.apuesta && this.elements.valorEnvite) {
            this.elements.valorEnvite.textContent = data.apuesta;
        }
    }

    onLanceResolved(data) {
        this.lanceGeneration++;
        const gen = this.lanceGeneration;

        const ganadorNombre = data.ganador === 'equipo1' ? 'Nosotros' : 'Ellos';
        console.log(`[MUS] ${data.lance}: ${ganadorNombre} gana ${data.puntos} piedras (gen: ${gen})`);

        // Accumulate result for end-of-round summary
        this.lanceResults.push({
            lance: data.lance,
            ganador: data.ganador,
            puntos: data.puntos
        });

        this.clearAllStatus();
        this.clearSpeakerHighlight();
        this.showButtonGroup('none');

        // Si fue ordago aceptado, game.js ya maneja el fin de partida
        if (data.ordagoAceptado) return;

        // Advance to next lance after a short delay
        setTimeout(() => {
            if (this.lanceGeneration !== gen) return;
            this.game.nextLance();
        }, 1000);
    }

    onLanceSkipped(data) {
        this.lanceGeneration++;
        const gen = this.lanceGeneration;

        console.log('[MUS] Lance saltado:', data.lance, '-', data.razon, '(gen:', gen, ')');
        this.clearAllStatus();
        this.clearSpeakerHighlight();
        this.showInfoMessage(data.razon, 1800);

        // Pausa antes de avanzar al siguiente lance
        setTimeout(() => {
            if (this.lanceGeneration !== gen) return;
            this.game.nextLance();
        }, 2000);
    }

    onRoundFinished(data) {
        console.log('[MUS] Ronda terminada');
        this.updateScore();
        this.showButtonGroup('none');
        this.currentTurn = null;

        // If there's a winner (game over), don't show summary — the game over modal will show
        if (this.game.checkWinner()) return;

        // Reveal all cards face-up
        const players = this.game.players;
        this.renderPlayerHand('player', players.player.hand, true);
        this.renderPlayerHand('partner', players.partner.hand, true);
        this.renderPlayerHand('rival1', players.rival1.hand, true);
        this.renderPlayerHand('rival2', players.rival2.hand, true);

        // Build and show round summary
        this.showResumenModal(data);
    }

    showResumenModal(data) {
        const lanceNames = { grande: 'GRANDE', chica: 'CHICA', pares: 'PARES', juego: 'JUEGO', punto: 'PUNTO' };

        // Build table body
        let bodyHtml = '';
        let totalNosotros = 0;
        let totalEllos = 0;

        for (const result of this.lanceResults) {
            const lanceName = lanceNames[result.lance] || result.lance;
            const ganadorNombre = result.ganador === 'equipo1' ? 'Nosotros' : 'Ellos';
            const ganadorClass = result.ganador === 'equipo1' ? 'resumen-nosotros' : 'resumen-ellos';

            if (result.ganador === 'equipo1') {
                totalNosotros += result.puntos;
            } else {
                totalEllos += result.puntos;
            }

            bodyHtml += `<tr>
                <td>${lanceName}</td>
                <td class="${ganadorClass}">${ganadorNombre}</td>
                <td>${result.puntos}</td>
            </tr>`;
        }

        if (this.elements.resumenBody) {
            this.elements.resumenBody.innerHTML = bodyHtml;
        }

        // Build footer with totals
        if (this.elements.resumenFooter) {
            this.elements.resumenFooter.innerHTML = `
                <tr class="resumen-totals">
                    <td>TOTAL</td>
                    <td></td>
                    <td></td>
                </tr>
                <tr class="resumen-totals">
                    <td>Nosotros</td>
                    <td class="resumen-nosotros">${totalNosotros}</td>
                    <td></td>
                </tr>
                <tr class="resumen-totals">
                    <td>Ellos</td>
                    <td class="resumen-ellos">${totalEllos}</td>
                    <td></td>
                </tr>`;
        }

        if (this.elements.modalResumen) {
            this.elements.modalResumen.setAttribute('aria-hidden', 'false');
        }
    }

    hideResumenModal() {
        if (this.elements.modalResumen) {
            this.elements.modalResumen.setAttribute('aria-hidden', 'true');
        }
    }

    onContinuarClick() {
        this.hideResumenModal();
        this.game.continueAfterRound();
    }

    onGameOver(data) {
        console.log('[MUS] Fin de partida - Ganador:', data.ganador);
        this.showResultModal(data.ganador, data.piedras);
    }

    onTurnChanged(data) {
        // Evento opcional del game.js si lo implementa
        this.setCurrentTurn(data.player);
    }

    onParesDetectados(data) {
        // Se maneja ahora via detectarYMostrarPares() con speech secuencial
    }

    onJuegoDetectado(data) {
        // Se maneja ahora via detectarYMostrarJuego() con speech secuencial
    }

    // ==================== ACCIONES DEL JUGADOR ====================

    onCardClick(index, cardEl) {
        if (this.game.faseActual !== FASES.DESCARTE) return;

        if (this.selectedCards.has(index)) {
            this.selectedCards.delete(index);
            cardEl.classList.remove('card--selected');
        } else {
            this.selectedCards.add(index);
            cardEl.classList.add('card--selected');
        }
    }

    onMusClick() {
        if (!this.waitingForHuman || this.currentTurn !== 'player') return;

        this.waitingForHuman = false;
        this.highlightSpeaker('player');
        this.updatePlayerStatus('player', 'Mus');
        this.game.handleMus('player', true);

        // Continuar con el siguiente turno
        if (this.game.faseActual === FASES.MUS) {
            const gen = this.lanceGeneration;
            setTimeout(() => {
                if (this.lanceGeneration !== gen) return;
                this.processNextMusTurn();
            }, 1000);
        }
    }

    onCortarClick() {
        if (!this.waitingForHuman || this.currentTurn !== 'player') return;

        this.waitingForHuman = false;
        this.highlightSpeaker('player');
        this.updatePlayerStatus('player', '¡Corto!');
        this.game.handleMus('player', false);
    }

    onPasoClick() {
        if (!this.waitingForHuman || this.currentTurn !== 'player') return;

        this.waitingForHuman = false;
        this.showButtonGroup('none');
        this.highlightSpeaker('player');
        this.updatePlayerStatus('player', 'Paso');
        this.game.handleEnvite('player', ACCIONES_ENVITE.PASO);

        // Quitar de la cola y continuar
        this.turnQueue.shift();
        const gen = this.lanceGeneration;
        setTimeout(() => {
            if (this.lanceGeneration !== gen) return;
            this.processNextEnviteTurn();
        }, 1000);
    }

    onEnvidoClick() {
        if (!this.waitingForHuman || this.currentTurn !== 'player') return;

        this.waitingForHuman = false;
        this.showButtonGroup('none');
        this.highlightSpeaker('player');
        const currentBet = this.game.enviteActual.apuesta;
        const statusText = currentBet > 0 ? '¡2 más!' : 'Envido';
        this.updatePlayerStatus('player', statusText);
        this.game.handleEnvite('player', ACCIONES_ENVITE.ENVIDO, 2);

        // Quitar de la cola y reorganizar para respuesta
        this.turnQueue.shift();
        this.reorganizeTurnQueueForResponse('player');
        const gen = this.lanceGeneration;
        setTimeout(() => {
            if (this.lanceGeneration !== gen) return;
            this.processNextEnviteTurn();
        }, 1000);
    }

    onOrdagoClick() {
        if (!this.waitingForHuman || this.currentTurn !== 'player') return;

        this.waitingForHuman = false;
        this.showButtonGroup('none');
        this.highlightSpeaker('player');
        this.updatePlayerStatus('player', '¡ORDAGO!');
        this.game.handleEnvite('player', ACCIONES_ENVITE.ORDAGO);

        // Quitar de la cola y reorganizar para respuesta
        this.turnQueue.shift();
        this.reorganizeTurnQueueForResponse('player');
        const gen = this.lanceGeneration;
        setTimeout(() => {
            if (this.lanceGeneration !== gen) return;
            this.processNextEnviteTurn();
        }, 1000);
    }

    onQuieroClick() {
        if (!this.waitingForHuman) return;

        this.waitingForHuman = false;
        this.showButtonGroup('none');
        this.highlightSpeaker('player');
        this.updatePlayerStatus('player', '¡Quiero!');
        this.game.handleEnvite('player', ACCIONES_ENVITE.QUIERO);
    }

    onNoQuieroClick() {
        if (!this.waitingForHuman) return;

        this.waitingForHuman = false;
        this.showButtonGroup('none');
        this.highlightSpeaker('player');
        this.updatePlayerStatus('player', 'No quiero');
        this.game.handleEnvite('player', ACCIONES_ENVITE.NO_QUIERO);
    }

    // ==================== IA ====================

    processAIDescarte() {
        // Por ahora, la IA no descarta y vuelve al mus
        setTimeout(() => {
            this.game.finishDescarte();
        }, 500);
    }

    convertHandForAI(hand) {
        return hand.map(card => ({
            rank: this.getAIRank(card.valor),
            suit: card.palo
        }));
    }

    getAIRank(valor) {
        const map = {
            1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
            10: 'J', 11: 'Q', 12: 'K'
        };
        return map[valor] || valor.toString();
    }

    convertLanceForAI(lance) {
        return lance; // Ya usan los mismos nombres
    }

    getGameStateForAI(playerId) {
        const team = this.game.players[playerId].team;
        return {
            marcadorPropio: team === 'equipo1' ? this.game.piedras.equipo1 : this.game.piedras.equipo2,
            marcadorRival: team === 'equipo1' ? this.game.piedras.equipo2 : this.game.piedras.equipo1,
            ordagoActivo: this.game.ordagoActivo
        };
    }

    convertAIActionToGame(action) {
        const map = {
            'paso': ACCIONES_ENVITE.PASO,
            'envido': ACCIONES_ENVITE.ENVIDO,
            'ordago': ACCIONES_ENVITE.ORDAGO,
            'quiero': ACCIONES_ENVITE.QUIERO,
            'no_quiero': ACCIONES_ENVITE.NO_QUIERO
        };
        return map[action] || action;
    }
}

// ==================== ESTILOS INLINE ====================

function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Cartas con imagenes */
        #mano-jugador .card,
        #mano-pareja .card,
        #mano-rival1 .card,
        #mano-rival2 .card {
            width: 70px;
            height: 105px;
            border-radius: 8px;
            border: none;
            margin: 0 5px;
            display: inline-block;
            padding: 0;
            box-sizing: border-box;
            position: relative;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            vertical-align: top;
            overflow: hidden;
            background: transparent;
        }

        .card-img {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: cover;
            border-radius: 8px;
            pointer-events: none;
        }

        .card--front:hover {
            transform: translateY(-8px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.3);
        }

        .card--selected {
            transform: translateY(-15px) !important;
            box-shadow: 0 15px 30px rgba(0,0,0,0.4) !important;
            outline: 3px solid #4CAF50;
        }

        /* Manos de jugadores */
        .player-hand {
            display: flex;
            justify-content: center;
            align-items: center;
            flex-wrap: nowrap;
            min-height: 120px;
        }

        .player-hand--vertical {
            flex-direction: column;
        }

        .player-hand--vertical .card {
            margin: -20px 0;
        }

        /* Speech bubble styles are in css/style.css */
        /* Override: ensure player-info allows overflow for bubbles */
        .player-info {
            position: relative;
            overflow: visible;
        }

        /* Nombre del jugador que esta hablando */
        .player-name--speaking {
            color: #FFD700 !important;
            font-weight: bold !important;
            text-shadow: 0 0 8px rgba(255, 215, 0, 0.6) !important;
        }

        /* Indicador de turno activo */
        .player-area--active-turn {
            position: relative;
        }

        .player-area--active-turn::after {
            content: '';
            position: absolute;
            top: -5px;
            left: -5px;
            right: -5px;
            bottom: -5px;
            border: 3px solid #4CAF50;
            border-radius: 10px;
            animation: turnPulse 1.5s ease-in-out infinite;
            pointer-events: none;
        }

        @keyframes turnPulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
        }

        /* Nombre del jugador activo - MUY VISIBLE */
        .player-name--active {
            color: #4CAF50 !important;
            font-size: 16px !important;
            font-weight: bold !important;
            text-shadow: 0 0 10px rgba(76, 175, 80, 0.8), 0 0 20px rgba(76, 175, 80, 0.4) !important;
            animation: nameGlow 1.5s ease-in-out infinite;
            position: relative;
            padding: 2px 10px;
            background: rgba(76, 175, 80, 0.15);
            border-radius: 12px;
            display: inline-block;
        }

        .player-name--active::before {
            content: '\u25B6';
            margin-right: 4px;
            font-size: 10px;
            vertical-align: middle;
        }

        @keyframes nameGlow {
            0%, 100% { text-shadow: 0 0 10px rgba(76, 175, 80, 0.8), 0 0 20px rgba(76, 175, 80, 0.4); }
            50% { text-shadow: 0 0 15px rgba(76, 175, 80, 1), 0 0 30px rgba(76, 175, 80, 0.6); }
        }

        /* Ocultar indicador flotante viejo */
        #indicador-turno {
            display: none !important;
        }

        /* Indicador de MANO */
        .mano-badge {
            display: inline-block;
            background: linear-gradient(135deg, #FFD700, #FFA500);
            color: #333;
            font-size: 10px;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 10px;
            margin-left: 5px;
            vertical-align: middle;
            text-shadow: none;
            animation: manoBadgePulse 2s ease-in-out infinite;
        }

        @keyframes manoBadgePulse {
            0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
            50% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.8); }
        }

        .player-name--mano {
            color: #FFD700;
        }

        /* Indicador de turno */
        #indicador-turno {
            display: none;
            position: fixed;
            bottom: 120px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(76, 175, 80, 0.95);
            color: white;
            padding: 10px 25px;
            border-radius: 25px;
            font-weight: bold;
            font-size: 16px;
            z-index: 100;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            animation: turnIndicatorPulse 1.5s ease-in-out infinite;
        }

        @keyframes turnIndicatorPulse {
            0%, 100% { transform: translateX(-50%) scale(1); }
            50% { transform: translateX(-50%) scale(1.05); }
        }

        /* Mensaje informativo - grande y visible, centrado en la mesa */
        .info-message {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            background: rgba(0, 0, 0, 0.9);
            color: #FFD700;
            padding: 16px 32px;
            border-radius: 12px;
            font-size: 20px;
            font-weight: bold;
            z-index: 200;
            opacity: 0;
            transition: opacity 0.4s, transform 0.4s;
            pointer-events: none;
            text-align: center;
            max-width: 90%;
            border: 2px solid rgba(255, 215, 0, 0.3);
            text-shadow: 1px 1px 3px rgba(0,0,0,0.5);
        }

        .info-message--visible {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }

        /* Grupos de botones */
        .controls-group {
            display: none;
            justify-content: center;
            gap: 15px;
            flex-wrap: wrap;
        }

        .controls-group--mus {
            display: flex;
        }

        /* Botones */
        .btn {
            padding: 14px 28px;
            font-size: 16px;
            font-weight: bold;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .btn:hover:not(:disabled) {
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
        }

        .btn--mus { background: #4CAF50; color: white; }
        .btn--cortar { background: #78909C; color: white; }
        .btn--paso { background: #607D8B; color: white; }
        .btn--envido { background: #FF9800; color: white; }
        .btn--ordago { background: #E53935; color: white; }
        .btn--quiero { background: #43A047; color: white; }
        .btn--no-quiero { background: #E53935; color: white; }

        /* Modales */
        .modal[aria-hidden="true"] { display: none !important; }
        .modal[aria-hidden="false"] { display: flex !important; }

        /* Responsive */
        @media (max-width: 768px) {
            .card, #mano-jugador .card, #mano-pareja .card,
            #mano-rival1 .card, #mano-rival2 .card {
                width: 55px;
                height: 82px;
                margin: 0 3px;
            }
            .btn { padding: 10px 18px; font-size: 13px; }
            .mano-badge { font-size: 8px; padding: 1px 4px; }
        }

        @media (max-width: 480px) {
            .card, #mano-jugador .card, #mano-pareja .card,
            #mano-rival1 .card, #mano-rival2 .card {
                width: 48px;
                height: 72px;
                margin: 0 2px;
            }
            .btn { padding: 8px 14px; font-size: 12px; }
        }

        /* Resumen de ronda */
        .resumen-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }

        .resumen-table th,
        .resumen-table td {
            padding: 8px 12px;
            text-align: center;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .resumen-table th {
            color: #FFD700;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .resumen-table td {
            color: #ddd;
            font-size: 14px;
        }

        .resumen-nosotros {
            color: #4CAF50 !important;
            font-weight: bold;
        }

        .resumen-ellos {
            color: #f44336 !important;
            font-weight: bold;
        }

        .resumen-totals td {
            border-top: 2px solid rgba(255, 215, 0, 0.3);
            font-weight: bold;
            color: #FFD700;
            font-size: 15px;
        }
    `;
    document.head.appendChild(style);
}

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    window.musController = new MusController();
    console.log('[MUS] Juego inicializado');
});

export { MusController };
