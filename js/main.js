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
            grupoExtra: document.querySelector('.controls-group--extra')
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

        if (!faceUp) {
            cardEl.classList.add('card--back');
            cardEl.innerHTML = '<span class="card-back-text">MUS</span>';
            return cardEl;
        }

        // Carta boca arriba
        cardEl.classList.add(`card--${card.palo}`);
        cardEl.classList.add('card--front');

        const valorDisplay = this.getValorDisplay(card.valor);
        const paloSvg = this.getPaloSymbol(card.palo);
        const paloSmall = this.getPaloSymbolSmall(card.palo);
        const figuraDisplay = this.getFiguraDisplay(card.valor);

        cardEl.innerHTML = `
            <div class="card-corner card-corner--top">
                <span class="card-value">${valorDisplay}</span>
                <span class="card-suit-small">${paloSmall}</span>
            </div>
            <div class="card-center">${figuraDisplay || paloSvg}</div>
            <div class="card-corner card-corner--bottom">
                <span class="card-value">${valorDisplay}</span>
                <span class="card-suit-small">${paloSmall}</span>
            </div>
        `;

        return cardEl;
    }

    getValorDisplay(valor) {
        const displays = { 1: 'As', 10: 'S', 11: 'C', 12: 'R' };
        return displays[valor] || valor.toString();
    }

    getFiguraDisplay(valor) {
        // Devuelve representacion especial para figuras, o null para cartas normales
        const figuras = {
            10: `<span class="card-figura">S</span><span class="card-figura-label">Sota</span>`,
            11: `<span class="card-figura">C</span><span class="card-figura-label">Caballo</span>`,
            12: `<span class="card-figura">R</span><span class="card-figura-label">Rey</span>`
        };
        return figuras[valor] || null;
    }

    getPaloSymbol(palo) {
        // SVGs de la baraja espanola
        const svgs = {
            oros: `<svg viewBox="0 0 24 24" class="suit-icon suit-icon--oros"><circle cx="12" cy="12" r="9" fill="#DAA520" stroke="#B8860B" stroke-width="1.5"/><circle cx="12" cy="12" r="5" fill="#FFD700" stroke="#DAA520" stroke-width="1"/><circle cx="12" cy="12" r="1.5" fill="#B8860B"/></svg>`,
            copas: `<svg viewBox="0 0 24 24" class="suit-icon suit-icon--copas"><path d="M7 4 C7 4 5 4 5 8 C5 12 8 13 8 13 L8 17 L6 17 L6 19 L18 19 L18 17 L16 17 L16 13 C16 13 19 12 19 8 C19 4 17 4 17 4 Z" fill="#C41E3A" stroke="#8B0000" stroke-width="0.8"/><ellipse cx="12" cy="8" rx="5" ry="4" fill="#E8384F" opacity="0.4"/></svg>`,
            espadas: `<svg viewBox="0 0 24 24" class="suit-icon suit-icon--espadas"><path d="M12 2 L12 16 M9 18 L15 18 M12 16 L12 20 M12 2 C12 2 6 6 6 10 C6 13 9 14 12 16 C15 14 18 13 18 10 C18 6 12 2 12 2Z" fill="#2F4F8F" stroke="#1a2a4f" stroke-width="0.8"/><line x1="8" y1="6" x2="16" y2="6" stroke="#4a6faf" stroke-width="1.2"/></svg>`,
            bastos: `<svg viewBox="0 0 24 24" class="suit-icon suit-icon--bastos"><rect x="10" y="2" width="4" height="18" rx="2" fill="#228B22" stroke="#145214" stroke-width="0.8"/><ellipse cx="12" cy="4" rx="3.5" ry="2.5" fill="#2EA82E" stroke="#145214" stroke-width="0.6"/><line x1="10" y1="8" x2="14" y2="8" stroke="#145214" stroke-width="0.6"/><line x1="10" y1="12" x2="14" y2="12" stroke="#145214" stroke-width="0.6"/></svg>`
        };
        return svgs[palo] || palo[0].toUpperCase();
    }

    getPaloSymbolSmall(palo) {
        // Simbolos Unicode simplificados para las esquinas
        const symbols = {
            oros: '\u2B24',    // circulo negro (moneda)
            copas: '\u2615',   // taza (copa)
            espadas: '\u2694', // espadas cruzadas
            bastos: '\u2663'   // trebol (garrote)
        };
        return symbols[palo] || palo[0].toUpperCase();
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
                break;
            case 'none':
                break;
        }
    }

    updatePlayerStatus(playerId, status) {
        const statusEl = this.getStatusElement(playerId);
        if (statusEl) {
            statusEl.textContent = status;
            // Animar el status
            statusEl.classList.remove('status-animate');
            void statusEl.offsetWidth; // Trigger reflow
            statusEl.classList.add('status-animate');
        }
    }

    clearAllStatus() {
        ['player', 'partner', 'rival1', 'rival2'].forEach(p => {
            this.updatePlayerStatus(p, '');
        });
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
        this.selectedCards.clear();
        this.clearAllStatus();

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
                if (this.game.faseActual !== FASES.MUS) return;

                const hand = this.convertHandForAI(this.game.players[playerId].hand);
                const wantsMus = this.aiPlayers[playerId].decideMus(hand);

                this.updatePlayerStatus(playerId, wantsMus ? 'Mus' : '¡Corto!');
                this.game.handleMus(playerId, wantsMus);

                // Si no corto, continuar con el siguiente turno
                if (wantsMus && this.game.faseActual === FASES.MUS) {
                    setTimeout(() => this.processNextMusTurn(), 500);
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
        console.log('[MUS] Envite iniciado:', data.lance);
        this.updateLanceDisplay(data.lance);
        this.clearAllStatus();

        if (this.elements.valorEnvite) {
            this.elements.valorEnvite.textContent = '-';
        }

        // Detectar y mostrar quien tiene pares/juego antes del lance
        if (data.lance === LANCES.PARES) {
            this.detectarYMostrarPares();
        } else if (data.lance === LANCES.JUEGO || data.lance === LANCES.PUNTO) {
            this.detectarYMostrarJuego();
        }

        // Iniciar secuencia de turnos para envite
        setTimeout(() => this.startEnviteTurnSequence(), data.lance === LANCES.GRANDE ? 500 : 2000);
    }

    detectarYMostrarPares() {
        const jugadoresConPares = [];

        for (const playerId of ['player', 'partner', 'rival1', 'rival2']) {
            const pares = this.game.getPares(this.game.players[playerId].hand);
            if (pares.tipo) {
                jugadoresConPares.push(this.getPlayerName(playerId));
            }
        }

        if (jugadoresConPares.length > 0) {
            this.showInfoMessage(`Tienen pares: ${jugadoresConPares.join(', ')}`);
        } else {
            this.showInfoMessage('Nadie tiene pares');
        }
    }

    detectarYMostrarJuego() {
        const jugadoresConJuego = [];

        for (const playerId of ['player', 'partner', 'rival1', 'rival2']) {
            const valor = this.game.getValorJuego(this.game.players[playerId].hand);
            if (valor >= 31) {
                jugadoresConJuego.push(`${this.getPlayerName(playerId)} (${valor})`);
            }
        }

        if (jugadoresConJuego.length > 0) {
            this.showInfoMessage(`Tienen juego: ${jugadoresConJuego.join(', ')}`);
        } else {
            this.showInfoMessage('Nadie tiene juego - Se juega a PUNTO');
        }
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

        // Iniciar primer turno
        this.processNextEnviteTurn();
    }

    processNextEnviteTurn() {
        if (this.game.faseActual !== FASES.ENVITE) return;
        if (this.turnQueue.length === 0) {
            // Todos pasaron, resolver lance
            if (this.game.enviteActual.pasaron.length === 4) {
                this.game.resolveLance(this.game.lanceActual);
            }
            return;
        }

        const playerId = this.turnQueue[0]; // Peek, no shift aun
        this.setCurrentTurn(playerId);

        // Verificar si este jugador ya paso
        if (this.game.enviteActual.pasaron.includes(playerId)) {
            this.turnQueue.shift();
            this.processNextEnviteTurn();
            return;
        }

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
                if (this.game.faseActual !== FASES.ENVITE) return;

                this.processAIEnviteTurn(playerId, hayApuestaPendiente);
            }, this.getAIDelay());
        }
    }

    processAIEnviteTurn(playerId, hayApuestaPendiente) {
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

        // Si hay apuesta pendiente, la IA debe responder
        if (hayApuestaPendiente) {
            // La IA solo puede querer, no querer, o subir
            if (action === ACCIONES_ENVITE.PASO) {
                action = ACCIONES_ENVITE.NO_QUIERO;
            }
        }

        // Mostrar status de la IA
        let statusText = '';
        switch(action) {
            case ACCIONES_ENVITE.PASO: statusText = 'Paso'; break;
            case ACCIONES_ENVITE.ENVIDO: statusText = `Envido ${decision.amount || 2}`; break;
            case ACCIONES_ENVITE.ORDAGO: statusText = '¡ORDAGO!'; break;
            case ACCIONES_ENVITE.QUIERO: statusText = 'Quiero'; break;
            case ACCIONES_ENVITE.NO_QUIERO: statusText = 'No quiero'; break;
        }
        this.updatePlayerStatus(playerId, statusText);

        this.game.handleEnvite(playerId, action, decision.amount);

        // Quitar de la cola y continuar (si el lance sigue activo)
        this.turnQueue.shift();

        // Si la accion fue envido u ordago, el equipo contrario debe responder
        if ((action === ACCIONES_ENVITE.ENVIDO || action === ACCIONES_ENVITE.ORDAGO) &&
            this.game.faseActual === FASES.ENVITE) {
            // Reorganizar cola para que responda el equipo contrario
            this.reorganizeTurnQueueForResponse(playerId);
        }

        // Continuar con siguiente turno despues de un breve delay
        if (this.game.faseActual === FASES.ENVITE) {
            setTimeout(() => this.processNextEnviteTurn(), 500);
        }
    }

    reorganizeTurnQueueForResponse(apostadorId) {
        const apostadorTeam = this.game.players[apostadorId].team;

        // El primer jugador del equipo contrario (en orden desde mano) debe responder
        const manoIndex = this.game.manoIndex;
        const turnOrder = this.game.turnOrder;

        this.turnQueue = [];
        for (let i = 0; i < 4; i++) {
            const playerIndex = (manoIndex + i) % 4;
            const pId = turnOrder[playerIndex];
            const pTeam = this.game.players[pId].team;

            // Solo añadir jugadores del equipo contrario que no hayan pasado
            if (pTeam !== apostadorTeam && !this.game.enviteActual.pasaron.includes(pId)) {
                this.turnQueue.push(pId);
                break; // Solo necesitamos uno para responder
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
        const ganadorNombre = data.ganador === 'equipo1' ? 'Nosotros' : 'Ellos';
        console.log(`[MUS] ${data.lance}: ${ganadorNombre} gana ${data.puntos} piedras`);

        // NO mostrar las cartas de la IA - solo mostrar mensaje
        this.showInfoMessage(`${data.lance.toUpperCase()}: ${ganadorNombre} +${data.puntos}`, 2000);
    }

    onLanceSkipped(data) {
        console.log('[MUS] Lance saltado:', data.lance, '-', data.razon);
        this.showInfoMessage(data.razon, 2000);
    }

    onRoundFinished(data) {
        console.log('[MUS] Ronda terminada');
        this.updateScore();
        this.showButtonGroup('none');
        this.currentTurn = null;
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
        // Evento opcional del game.js
        if (data.jugadores && data.jugadores.length > 0) {
            const nombres = data.jugadores.map(p => this.getPlayerName(p));
            this.showInfoMessage(`Tienen pares: ${nombres.join(', ')}`);
        } else {
            this.showInfoMessage('Nadie tiene pares');
        }
    }

    onJuegoDetectado(data) {
        // Evento opcional del game.js
        if (data.jugadores && data.jugadores.length > 0) {
            this.showInfoMessage(`Tienen juego: ${data.jugadores.map(p => this.getPlayerName(p)).join(', ')}`);
        } else {
            this.showInfoMessage('Nadie tiene juego - Se juega a PUNTO');
        }
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
        this.updatePlayerStatus('player', 'Mus');
        this.game.handleMus('player', true);

        // Continuar con el siguiente turno
        if (this.game.faseActual === FASES.MUS) {
            setTimeout(() => this.processNextMusTurn(), 500);
        }
    }

    onCortarClick() {
        if (!this.waitingForHuman || this.currentTurn !== 'player') return;

        this.waitingForHuman = false;
        this.updatePlayerStatus('player', '¡Corto!');
        this.game.handleMus('player', false);
    }

    onPasoClick() {
        if (!this.waitingForHuman || this.currentTurn !== 'player') return;

        this.waitingForHuman = false;
        this.showButtonGroup('none');
        this.game.handleEnvite('player', ACCIONES_ENVITE.PASO);

        // Quitar de la cola y continuar
        this.turnQueue.shift();
        setTimeout(() => this.processNextEnviteTurn(), 500);
    }

    onEnvidoClick() {
        if (!this.waitingForHuman || this.currentTurn !== 'player') return;

        this.waitingForHuman = false;
        this.showButtonGroup('none');
        this.game.handleEnvite('player', ACCIONES_ENVITE.ENVIDO, 2);

        // Quitar de la cola y reorganizar para respuesta
        this.turnQueue.shift();
        this.reorganizeTurnQueueForResponse('player');
        setTimeout(() => this.processNextEnviteTurn(), 500);
    }

    onOrdagoClick() {
        if (!this.waitingForHuman || this.currentTurn !== 'player') return;

        this.waitingForHuman = false;
        this.showButtonGroup('none');
        this.game.handleEnvite('player', ACCIONES_ENVITE.ORDAGO);

        // Quitar de la cola y reorganizar para respuesta
        this.turnQueue.shift();
        this.reorganizeTurnQueueForResponse('player');
        setTimeout(() => this.processNextEnviteTurn(), 500);
    }

    onQuieroClick() {
        if (!this.waitingForHuman) return;

        this.waitingForHuman = false;
        this.showButtonGroup('none');
        this.game.handleEnvite('player', ACCIONES_ENVITE.QUIERO);
    }

    onNoQuieroClick() {
        if (!this.waitingForHuman) return;

        this.waitingForHuman = false;
        this.showButtonGroup('none');
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
            marcadorRival: team === 'equipo1' ? this.game.piedras.equipo2 : this.game.piedras.equipo1
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
        /* Reset cartas del HTML */
        #mano-jugador .card,
        #mano-pareja .card,
        #mano-rival1 .card,
        #mano-rival2 .card {
            width: 70px;
            height: 105px;
            border-radius: 8px;
            border: 2px solid #333;
            margin: 0 5px;
            display: inline-flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 5px;
            box-sizing: border-box;
            position: relative;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            font-family: 'Georgia', serif;
            vertical-align: top;
        }

        /* Carta boca abajo */
        .card--back {
            background: linear-gradient(135deg, #1a3a5c 0%, #2a5a8c 50%, #1a3a5c 100%);
            border-color: #0d2040;
            color: rgba(255,255,255,0.3);
            justify-content: center;
            align-items: center;
        }

        .card-back-text {
            font-size: 14px;
            font-weight: bold;
            letter-spacing: 2px;
        }

        /* Carta boca arriba */
        .card--front {
            background: #fffef5;
        }

        .card--front:hover {
            transform: translateY(-8px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.3);
        }

        .card--selected {
            transform: translateY(-15px) !important;
            box-shadow: 0 15px 30px rgba(0,0,0,0.4) !important;
            border-color: #4CAF50 !important;
        }

        /* Colores por palo - Baraja Espanola */
        .card--oros { background: linear-gradient(135deg, #fffef0 0%, #fff8d0 100%); }
        .card--oros .card-corner, .card--oros .card-suit-small { color: #DAA520; }

        .card--copas { background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%); }
        .card--copas .card-corner, .card--copas .card-suit-small { color: #C41E3A; }

        .card--espadas { background: linear-gradient(135deg, #f8f8ff 0%, #e8e8ff 100%); }
        .card--espadas .card-corner, .card--espadas .card-suit-small { color: #2F4F8F; }

        .card--bastos { background: linear-gradient(135deg, #f5fff5 0%, #e0ffe0 100%); }
        .card--bastos .card-corner, .card--bastos .card-suit-small { color: #228B22; }

        /* SVG suit icons */
        .suit-icon {
            width: 100%;
            height: 100%;
        }

        .card-suit-small {
            font-size: 12px;
            line-height: 1;
        }

        /* Figuras (Sota, Caballo, Rey) */
        .card-figura {
            font-size: 24px;
            font-weight: bold;
            display: block;
            line-height: 1;
        }
        .card-figura-label {
            font-size: 8px;
            display: block;
            opacity: 0.6;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .card--oros .card-figura { color: #B8860B; }
        .card--copas .card-figura { color: #8B0000; }
        .card--espadas .card-figura { color: #1a2a4f; }
        .card--bastos .card-figura { color: #145214; }

        .card--oros .card-figura-label { color: #DAA520; }
        .card--copas .card-figura-label { color: #C41E3A; }
        .card--espadas .card-figura-label { color: #2F4F8F; }
        .card--bastos .card-figura-label { color: #228B22; }

        /* Esquinas de carta */
        .card-corner {
            display: flex;
            flex-direction: column;
            align-items: center;
            line-height: 1;
        }

        .card-corner--top {
            align-self: flex-start;
        }

        .card-corner--bottom {
            align-self: flex-end;
            transform: rotate(180deg);
        }

        .card-value {
            font-size: 18px;
            font-weight: bold;
        }

        .card-suit {
            font-size: 16px;
        }

        .card-center {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 28px;
            width: 36px;
            height: 36px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
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

        /* Status de jugadores */
        .player-status {
            display: block;
            min-height: 20px;
            font-size: 14px;
            font-weight: bold;
            color: #FFD700;
            text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
            text-align: center;
            margin-top: 5px;
        }

        .status-animate {
            animation: statusPop 0.3s ease-out;
        }

        @keyframes statusPop {
            0% { transform: scale(0.8); opacity: 0; }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
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

        /* Mensaje informativo */
        .info-message {
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%) translateY(-20px);
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            z-index: 200;
            opacity: 0;
            transition: opacity 0.3s, transform 0.3s;
            pointer-events: none;
            text-align: center;
            max-width: 90%;
        }

        .info-message--visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
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
            .card-value { font-size: 14px; }
            .card-suit { font-size: 12px; }
            .card-center { font-size: 20px; }
            .btn { padding: 10px 18px; font-size: 13px; }
            .mano-badge { font-size: 8px; padding: 1px 4px; }
        }

        @media (max-width: 480px) {
            .card, #mano-jugador .card, #mano-pareja .card,
            #mano-rival1 .card, #mano-rival2 .card {
                width: 48px;
                height: 72px;
                margin: 0 2px;
                padding: 3px;
            }
            .card-value { font-size: 12px; }
            .card-suit { font-size: 10px; }
            .card-center { font-size: 16px; }
            .btn { padding: 8px 14px; font-size: 12px; }
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
