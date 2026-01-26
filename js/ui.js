/**
 * UI Controller for MUS card game
 * Handles all visual rendering, animations, and user interactions
 */

import { Game } from './game.js';

/**
 * Spanish card suits with their display properties
 */
const SUITS = {
    oros: { name: 'Oros', symbol: 'O', color: '#FFD700', bgColor: '#FFF8DC' },
    copas: { name: 'Copas', symbol: 'C', color: '#DC143C', bgColor: '#FFF0F5' },
    espadas: { name: 'Espadas', symbol: 'E', color: '#4169E1', bgColor: '#F0F8FF' },
    bastos: { name: 'Bastos', symbol: 'B', color: '#228B22', bgColor: '#F0FFF0' }
};

/**
 * Card values for display
 */
const CARD_VALUES = {
    1: 'As',
    2: '2',
    3: '3',
    4: '4',
    5: '5',
    6: '6',
    7: '7',
    10: 'Sota',
    11: 'Caballo',
    12: 'Rey'
};

/**
 * UIController class - manages all UI interactions for the MUS game
 */
export class UIController {
    constructor() {
        this.game = null;
        this.selectedCards = new Set();
        this.isAnimating = false;
        this.messageTimeout = null;

        // DOM element references
        this.elements = {
            gameBoard: null,
            playerHands: {},
            scoreBoard: null,
            currentLance: null,
            currentPhase: null,
            messageArea: null,
            actionButtons: null,
            modal: null
        };

        // Responsive breakpoints
        this.breakpoints = {
            mobile: 480,
            tablet: 768,
            desktop: 1024
        };

        this.init();
    }

    /**
     * Initialize the UI controller
     */
    init() {
        this.cacheElements();
        this.injectStyles();
        this.bindEvents();
        this.setupResponsive();
    }

    /**
     * Cache DOM element references
     */
    cacheElements() {
        this.elements.gameBoard = document.getElementById('game-board');
        this.elements.scoreBoard = document.getElementById('score-board');
        this.elements.currentLance = document.getElementById('current-lance');
        this.elements.currentPhase = document.getElementById('current-phase');
        this.elements.messageArea = document.getElementById('message-area');
        this.elements.actionButtons = document.getElementById('action-buttons');
        this.elements.modal = document.getElementById('modal');

        // Player hand areas
        ['player', 'bot1', 'bot2', 'bot3'].forEach(playerId => {
            this.elements.playerHands[playerId] = document.getElementById(`${playerId}-hand`);
        });
    }

    /**
     * Inject required CSS styles for cards and animations
     */
    injectStyles() {
        const styleId = 'mus-ui-styles';
        if (document.getElementById(styleId)) return;

        const styles = document.createElement('style');
        styles.id = styleId;
        styles.textContent = `
            /* Card Base Styles */
            .card {
                position: relative;
                width: var(--card-width, 80px);
                height: var(--card-height, 120px);
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                cursor: pointer;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                display: inline-flex;
                flex-direction: column;
                justify-content: space-between;
                padding: 8px;
                box-sizing: border-box;
                margin: 0 -15px;
                background: white;
                border: 2px solid #333;
                user-select: none;
            }

            .card:hover:not(.face-down):not(.disabled) {
                transform: translateY(-10px);
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
            }

            .card.selected {
                transform: translateY(-20px);
                box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
                border-color: #4CAF50;
            }

            .card.disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            /* Face Down Card */
            .card.face-down {
                background: linear-gradient(135deg, #1a237e 0%, #283593 50%, #1a237e 100%);
                border-color: #0d1442;
                cursor: default;
            }

            .card.face-down::before {
                content: '';
                position: absolute;
                top: 10px;
                left: 10px;
                right: 10px;
                bottom: 10px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 4px;
                background: repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 5px,
                    rgba(255, 255, 255, 0.1) 5px,
                    rgba(255, 255, 255, 0.1) 10px
                );
            }

            .card.face-down::after {
                content: 'MUS';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: rgba(255, 255, 255, 0.5);
                font-weight: bold;
                font-size: 14px;
                letter-spacing: 2px;
            }

            /* Card Content */
            .card-corner {
                display: flex;
                flex-direction: column;
                align-items: center;
                font-weight: bold;
                line-height: 1;
            }

            .card-corner.bottom {
                align-self: flex-end;
                transform: rotate(180deg);
            }

            .card-value {
                font-size: calc(var(--card-width, 80px) * 0.2);
            }

            .card-suit {
                font-size: calc(var(--card-width, 80px) * 0.25);
            }

            .card-center {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: calc(var(--card-width, 80px) * 0.4);
                opacity: 0.3;
            }

            /* Suit Colors */
            .card.oros { background-color: #FFF8DC; }
            .card.oros .card-corner, .card.oros .card-center { color: #FFD700; }

            .card.copas { background-color: #FFF0F5; }
            .card.copas .card-corner, .card.copas .card-center { color: #DC143C; }

            .card.espadas { background-color: #F0F8FF; }
            .card.espadas .card-corner, .card.espadas .card-center { color: #4169E1; }

            .card.bastos { background-color: #F0FFF0; }
            .card.bastos .card-corner, .card.bastos .card-center { color: #228B22; }

            /* Player Hand Areas */
            .hand {
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
                min-height: var(--card-height, 120px);
            }

            .hand.horizontal {
                flex-direction: row;
            }

            .hand.vertical {
                flex-direction: column;
            }

            .hand.vertical .card {
                margin: -30px 0;
            }

            /* Player Highlight */
            .player-area {
                padding: 15px;
                border-radius: 10px;
                transition: background-color 0.3s ease, box-shadow 0.3s ease;
            }

            .player-area.active {
                background-color: rgba(76, 175, 80, 0.2);
                box-shadow: 0 0 20px rgba(76, 175, 80, 0.5);
            }

            .player-name {
                text-align: center;
                font-weight: bold;
                margin-bottom: 10px;
                color: #333;
            }

            .player-area.active .player-name {
                color: #4CAF50;
            }

            /* Score Board */
            .score-board {
                display: flex;
                justify-content: center;
                gap: 40px;
                padding: 20px;
                background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                border-radius: 10px;
                color: white;
                font-size: 18px;
            }

            .team-score {
                text-align: center;
            }

            .team-score .score-value {
                font-size: 36px;
                font-weight: bold;
            }

            .team-score.team1 .score-value { color: #3498db; }
            .team-score.team2 .score-value { color: #e74c3c; }

            /* Current Phase/Lance Display */
            .game-info {
                display: flex;
                justify-content: center;
                gap: 30px;
                padding: 15px;
                background: #f5f5f5;
                border-radius: 8px;
                margin: 10px 0;
            }

            .info-item {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .info-label {
                color: #666;
                font-size: 14px;
            }

            .info-value {
                font-weight: bold;
                color: #333;
                font-size: 16px;
            }

            /* Action Buttons */
            .action-buttons {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 10px;
                padding: 20px;
            }

            .action-btn {
                padding: 12px 24px;
                font-size: 16px;
                font-weight: bold;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .action-btn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }

            .action-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .action-btn.mus { background: #4CAF50; color: white; }
            .action-btn.cortar { background: #f44336; color: white; }
            .action-btn.paso { background: #9E9E9E; color: white; }
            .action-btn.envido { background: #FF9800; color: white; }
            .action-btn.ordago { background: #9C27B0; color: white; }
            .action-btn.confirm { background: #2196F3; color: white; }
            .action-btn.quiero { background: #4CAF50; color: white; }
            .action-btn.no-quiero { background: #f44336; color: white; }

            /* Message Area */
            .message-area {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: none;
            }

            .message-area.visible {
                opacity: 1;
            }

            .message {
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 15px 30px;
                border-radius: 8px;
                font-size: 18px;
                text-align: center;
                max-width: 400px;
            }

            /* Modal */
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 2000;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }

            .modal-overlay.visible {
                opacity: 1;
                visibility: visible;
            }

            .modal-content {
                background: white;
                border-radius: 12px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }

            .modal-overlay.visible .modal-content {
                transform: scale(1);
            }

            .modal-title {
                font-size: 24px;
                font-weight: bold;
                color: #333;
                margin-bottom: 15px;
            }

            .modal-message {
                font-size: 16px;
                color: #666;
                margin-bottom: 25px;
                line-height: 1.5;
            }

            .modal-buttons {
                display: flex;
                justify-content: center;
                gap: 15px;
            }

            /* Animations */
            @keyframes dealCard {
                0% {
                    transform: translate(-50%, -200%) rotate(-180deg) scale(0.5);
                    opacity: 0;
                }
                100% {
                    transform: translate(0, 0) rotate(0deg) scale(1);
                    opacity: 1;
                }
            }

            @keyframes collectCard {
                0% {
                    transform: translate(0, 0) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -200%) scale(0.5);
                    opacity: 0;
                }
            }

            @keyframes enviteAnimation {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }

            @keyframes celebrationBounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-20px); }
            }

            @keyframes celebrationGlow {
                0%, 100% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.5); }
                50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.8); }
            }

            @keyframes confetti {
                0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
                100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }

            .card.dealing {
                animation: dealCard 0.5s ease-out forwards;
            }

            .card.collecting {
                animation: collectCard 0.4s ease-in forwards;
            }

            .envite-animation {
                animation: enviteAnimation 0.5s ease-in-out;
            }

            .celebration .card {
                animation: celebrationBounce 0.5s ease-in-out infinite;
            }

            .celebration-glow {
                animation: celebrationGlow 1s ease-in-out infinite;
            }

            .confetti-piece {
                position: fixed;
                width: 10px;
                height: 10px;
                top: -10px;
                animation: confetti 3s ease-in-out forwards;
            }

            /* Responsive Styles */
            @media (max-width: 768px) {
                :root {
                    --card-width: 60px;
                    --card-height: 90px;
                }

                .card {
                    margin: 0 -10px;
                    padding: 5px;
                }

                .hand.vertical .card {
                    margin: -20px 0;
                }

                .action-btn {
                    padding: 10px 16px;
                    font-size: 14px;
                }

                .score-board {
                    gap: 20px;
                    padding: 15px;
                    font-size: 14px;
                }

                .team-score .score-value {
                    font-size: 28px;
                }

                .game-info {
                    flex-direction: column;
                    gap: 10px;
                }
            }

            @media (max-width: 480px) {
                :root {
                    --card-width: 50px;
                    --card-height: 75px;
                }

                .card {
                    margin: 0 -8px;
                    padding: 4px;
                    border-radius: 5px;
                }

                .hand.vertical .card {
                    margin: -15px 0;
                }

                .action-buttons {
                    padding: 10px;
                    gap: 8px;
                }

                .action-btn {
                    padding: 8px 12px;
                    font-size: 12px;
                }

                .modal-content {
                    padding: 20px;
                }

                .modal-title {
                    font-size: 20px;
                }

                .modal-message {
                    font-size: 14px;
                }
            }

            /* Desktop Layout */
            @media (min-width: 1024px) {
                :root {
                    --card-width: 90px;
                    --card-height: 135px;
                }

                .game-board {
                    display: grid;
                    grid-template-areas:
                        ". top ."
                        "left center right"
                        ". bottom .";
                    grid-template-columns: 1fr 2fr 1fr;
                    grid-template-rows: auto 1fr auto;
                    min-height: 80vh;
                    gap: 20px;
                    padding: 20px;
                }

                .player-area.top { grid-area: top; }
                .player-area.bottom { grid-area: bottom; }
                .player-area.left { grid-area: left; }
                .player-area.right { grid-area: right; }
                .game-center { grid-area: center; }

                .player-area.left .hand,
                .player-area.right .hand {
                    flex-direction: column;
                }

                .player-area.left .card,
                .player-area.right .card {
                    margin: -30px 0;
                }
            }
        `;

        document.head.appendChild(styles);
    }

    /**
     * Bind DOM events
     */
    bindEvents() {
        // Card selection events - delegated
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.card:not(.face-down):not(.disabled)');
            if (card && card.closest('#player-hand')) {
                this.handleCardClick(card);
            }
        });

        // Action button events - delegated
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.action-btn');
            if (btn && !btn.disabled) {
                this.handleActionClick(btn);
            }
        });

        // Modal close on overlay click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.hideModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
    }

    /**
     * Setup responsive behavior
     */
    setupResponsive() {
        const updateLayout = () => {
            const width = window.innerWidth;
            const root = document.documentElement;

            if (width <= this.breakpoints.mobile) {
                root.style.setProperty('--card-width', '50px');
                root.style.setProperty('--card-height', '75px');
            } else if (width <= this.breakpoints.tablet) {
                root.style.setProperty('--card-width', '60px');
                root.style.setProperty('--card-height', '90px');
            } else {
                root.style.setProperty('--card-width', '90px');
                root.style.setProperty('--card-height', '135px');
            }
        };

        window.addEventListener('resize', updateLayout);
        updateLayout();
    }

    /**
     * Connect to a Game instance
     * @param {Game} game - The game instance to connect
     */
    connectGame(game) {
        this.game = game;

        // Subscribe to game events if the game supports it
        if (this.game.on) {
            this.game.on('stateChange', (state) => this.onGameStateChange(state));
            this.game.on('cardsDealt', (data) => this.dealAnimation(data));
            this.game.on('lance', (lance) => this.showCurrentLance(lance));
            this.game.on('phase', (phase) => this.showCurrentPhase(phase));
            this.game.on('turnChange', (player) => this.highlightCurrentPlayer(player));
            this.game.on('envite', (data) => this.showEnvite(data));
            this.game.on('gameEnd', (winner) => this.showVictoryAnimation(winner));
        }
    }

    /**
     * Handle game state changes
     * @param {Object} state - New game state
     */
    onGameStateChange(state) {
        if (state.players) {
            state.players.forEach(player => {
                const faceUp = player.id === 'player' || state.revealCards;
                this.updatePlayerHand(player.id, player.cards, faceUp);
            });
        }

        if (state.scores) {
            this.updateScore(state.scores.team1, state.scores.team2);
        }

        if (state.currentLance) {
            this.showCurrentLance(state.currentLance);
        }

        if (state.currentPhase) {
            this.showCurrentPhase(state.currentPhase);
        }

        if (state.currentPlayer) {
            this.highlightCurrentPlayer(state.currentPlayer);
        }
    }

    // ==================== Card Rendering ====================

    /**
     * Create a card element
     * @param {Object} card - Card data {value, suit}
     * @param {boolean} faceUp - Whether card is face up
     * @returns {HTMLElement} Card element
     */
    createCardElement(card, faceUp = true) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.dataset.value = card.value;
        cardEl.dataset.suit = card.suit;

        if (!faceUp) {
            cardEl.classList.add('face-down');
            return cardEl;
        }

        const suitInfo = SUITS[card.suit];
        const displayValue = CARD_VALUES[card.value] || card.value;

        cardEl.classList.add(card.suit);

        cardEl.innerHTML = `
            <div class="card-corner top">
                <span class="card-value">${displayValue}</span>
                <span class="card-suit">${suitInfo.symbol}</span>
            </div>
            <div class="card-center">${suitInfo.symbol}</div>
            <div class="card-corner bottom">
                <span class="card-value">${displayValue}</span>
                <span class="card-suit">${suitInfo.symbol}</span>
            </div>
        `;

        return cardEl;
    }

    /**
     * Update a player's hand display
     * @param {string} playerId - Player identifier
     * @param {Array} cards - Array of card objects
     * @param {boolean} faceUp - Whether cards are face up
     */
    updatePlayerHand(playerId, cards, faceUp = true) {
        const handEl = this.elements.playerHands[playerId];
        if (!handEl) return;

        handEl.innerHTML = '';

        cards.forEach((card, index) => {
            const cardEl = this.createCardElement(card, faceUp);
            cardEl.dataset.index = index;
            cardEl.style.animationDelay = `${index * 0.1}s`;
            handEl.appendChild(cardEl);
        });
    }

    /**
     * Update score display
     * @param {number} team1Score - Team 1 score
     * @param {number} team2Score - Team 2 score
     */
    updateScore(team1Score, team2Score) {
        const scoreBoard = this.elements.scoreBoard;
        if (!scoreBoard) return;

        scoreBoard.innerHTML = `
            <div class="team-score team1">
                <div class="team-name">Equipo 1</div>
                <div class="score-value">${team1Score}</div>
            </div>
            <div class="team-score team2">
                <div class="team-name">Equipo 2</div>
                <div class="score-value">${team2Score}</div>
            </div>
        `;
    }

    /**
     * Show current lance
     * @param {string} lance - Current lance name
     */
    showCurrentLance(lance) {
        const lanceEl = this.elements.currentLance;
        if (!lanceEl) return;

        const lanceNames = {
            grande: 'Grande',
            chica: 'Chica',
            pares: 'Pares',
            juego: 'Juego',
            punto: 'Punto'
        };

        lanceEl.innerHTML = `
            <span class="info-label">Lance:</span>
            <span class="info-value">${lanceNames[lance] || lance}</span>
        `;

        lanceEl.classList.add('envite-animation');
        setTimeout(() => lanceEl.classList.remove('envite-animation'), 500);
    }

    /**
     * Show current phase
     * @param {string} phase - Current phase name
     */
    showCurrentPhase(phase) {
        const phaseEl = this.elements.currentPhase;
        if (!phaseEl) return;

        const phaseNames = {
            mus: 'Mus',
            descarte: 'Descarte',
            lances: 'Lances',
            conteo: 'Conteo'
        };

        phaseEl.innerHTML = `
            <span class="info-label">Fase:</span>
            <span class="info-value">${phaseNames[phase] || phase}</span>
        `;
    }

    /**
     * Highlight the current player
     * @param {string} playerId - Player to highlight
     */
    highlightCurrentPlayer(playerId) {
        // Remove active class from all players
        document.querySelectorAll('.player-area').forEach(area => {
            area.classList.remove('active');
        });

        // Add active class to current player
        const playerArea = document.querySelector(`#${playerId}-area, [data-player="${playerId}"]`);
        if (playerArea) {
            playerArea.classList.add('active');
        }
    }

    /**
     * Show a message to the user
     * @param {string} text - Message text
     * @param {number} duration - Duration in ms (0 for permanent)
     */
    showMessage(text, duration = 3000) {
        let messageArea = this.elements.messageArea;

        if (!messageArea) {
            messageArea = document.createElement('div');
            messageArea.id = 'message-area';
            messageArea.className = 'message-area';
            document.body.appendChild(messageArea);
            this.elements.messageArea = messageArea;
        }

        messageArea.innerHTML = `<div class="message">${text}</div>`;
        messageArea.classList.add('visible');

        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }

        if (duration > 0) {
            this.messageTimeout = setTimeout(() => {
                messageArea.classList.remove('visible');
            }, duration);
        }
    }

    // ==================== User Interactions ====================

    /**
     * Handle card click for selection
     * @param {HTMLElement} cardEl - Clicked card element
     */
    handleCardClick(cardEl) {
        const index = parseInt(cardEl.dataset.index);

        if (this.selectedCards.has(index)) {
            this.selectedCards.delete(index);
            cardEl.classList.remove('selected');
        } else {
            this.selectedCards.add(index);
            cardEl.classList.add('selected');
        }

        // Emit selection change event
        this.emitEvent('cardSelectionChange', Array.from(this.selectedCards));
    }

    /**
     * Handle action button click
     * @param {HTMLElement} btn - Clicked button
     */
    handleActionClick(btn) {
        const action = btn.dataset.action;

        switch (action) {
            case 'mus':
                this.onMusAction();
                break;
            case 'cortar':
                this.onCortarAction();
                break;
            case 'paso':
                this.onPasoAction();
                break;
            case 'envido':
                this.onEnvidoAction(btn.dataset.amount);
                break;
            case 'ordago':
                this.onOrdagoAction();
                break;
            case 'confirm-discard':
                this.onConfirmDiscard();
                break;
            case 'quiero':
                this.onQuieroAction();
                break;
            case 'no-quiero':
                this.onNoQuieroAction();
                break;
        }
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyboard(e) {
        // Number keys 1-4 to toggle card selection
        if (e.key >= '1' && e.key <= '4') {
            const index = parseInt(e.key) - 1;
            const card = document.querySelector(`#player-hand .card[data-index="${index}"]`);
            if (card && !card.classList.contains('face-down') && !card.classList.contains('disabled')) {
                this.handleCardClick(card);
            }
        }

        // Enter to confirm
        if (e.key === 'Enter') {
            const confirmBtn = document.querySelector('.action-btn.confirm:not(:disabled)');
            if (confirmBtn) {
                confirmBtn.click();
            }
        }

        // Escape to cancel/close modal
        if (e.key === 'Escape') {
            this.hideModal();
            this.clearCardSelection();
        }
    }

    /**
     * Clear all selected cards
     */
    clearCardSelection() {
        this.selectedCards.clear();
        document.querySelectorAll('.card.selected').forEach(card => {
            card.classList.remove('selected');
        });
    }

    /**
     * Get currently selected card indices
     * @returns {Array} Array of selected indices
     */
    getSelectedCards() {
        return Array.from(this.selectedCards);
    }

    // ==================== Action Handlers ====================

    onMusAction() {
        if (this.game && this.game.sayMus) {
            this.game.sayMus('player');
        }
        this.emitEvent('action', { type: 'mus' });
    }

    onCortarAction() {
        if (this.game && this.game.cortarMus) {
            this.game.cortarMus('player');
        }
        this.emitEvent('action', { type: 'cortar' });
    }

    onPasoAction() {
        if (this.game && this.game.paso) {
            this.game.paso('player');
        }
        this.emitEvent('action', { type: 'paso' });
    }

    onEnvidoAction(amount) {
        if (this.game && this.game.envido) {
            this.game.envido('player', parseInt(amount) || 2);
        }
        this.emitEvent('action', { type: 'envido', amount: parseInt(amount) || 2 });
    }

    onOrdagoAction() {
        if (this.game && this.game.ordago) {
            this.game.ordago('player');
        }
        this.emitEvent('action', { type: 'ordago' });
    }

    onConfirmDiscard() {
        const selected = this.getSelectedCards();
        if (selected.length === 0) {
            this.showMessage('Selecciona al menos una carta para descartar');
            return;
        }

        if (this.game && this.game.discard) {
            this.game.discard('player', selected);
        }
        this.emitEvent('action', { type: 'discard', cards: selected });
        this.clearCardSelection();
    }

    onQuieroAction() {
        if (this.game && this.game.quiero) {
            this.game.quiero('player');
        }
        this.emitEvent('action', { type: 'quiero' });
    }

    onNoQuieroAction() {
        if (this.game && this.game.noQuiero) {
            this.game.noQuiero('player');
        }
        this.emitEvent('action', { type: 'no-quiero' });
    }

    // ==================== Action Buttons ====================

    /**
     * Show action buttons for mus phase
     */
    showMusButtons() {
        this.setActionButtons([
            { action: 'mus', label: 'Mus', class: 'mus' },
            { action: 'cortar', label: 'Cortar', class: 'cortar' }
        ]);
    }

    /**
     * Show action buttons for discard phase
     */
    showDiscardButtons() {
        this.setActionButtons([
            { action: 'confirm-discard', label: 'Confirmar Descarte', class: 'confirm' }
        ]);
    }

    /**
     * Show action buttons for lance/envite phase
     * @param {boolean} canEnvido - Whether envido is allowed
     */
    showLanceButtons(canEnvido = true) {
        const buttons = [
            { action: 'paso', label: 'Paso', class: 'paso' }
        ];

        if (canEnvido) {
            buttons.push(
                { action: 'envido', label: 'Envido 2', class: 'envido', amount: 2 },
                { action: 'envido', label: 'Envido 5', class: 'envido', amount: 5 },
                { action: 'ordago', label: 'Ordago', class: 'ordago' }
            );
        }

        this.setActionButtons(buttons);
    }

    /**
     * Show action buttons for responding to envite
     */
    showEnviteResponseButtons() {
        this.setActionButtons([
            { action: 'quiero', label: 'Quiero', class: 'quiero' },
            { action: 'no-quiero', label: 'No Quiero', class: 'no-quiero' },
            { action: 'ordago', label: 'Ordago', class: 'ordago' }
        ]);
    }

    /**
     * Set action buttons
     * @param {Array} buttons - Array of button configs
     */
    setActionButtons(buttons) {
        let container = this.elements.actionButtons;

        if (!container) {
            container = document.createElement('div');
            container.id = 'action-buttons';
            container.className = 'action-buttons';
            document.body.appendChild(container);
            this.elements.actionButtons = container;
        }

        container.innerHTML = buttons.map(btn => `
            <button class="action-btn ${btn.class}" data-action="${btn.action}"
                    ${btn.amount ? `data-amount="${btn.amount}"` : ''}>
                ${btn.label}
            </button>
        `).join('');
    }

    /**
     * Disable all action buttons
     */
    disableActionButtons() {
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.disabled = true;
        });
    }

    /**
     * Enable all action buttons
     */
    enableActionButtons() {
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.disabled = false;
        });
    }

    /**
     * Hide action buttons
     */
    hideActionButtons() {
        if (this.elements.actionButtons) {
            this.elements.actionButtons.innerHTML = '';
        }
    }

    // ==================== Animations ====================

    /**
     * Deal cards animation
     * @param {Object} data - Deal data {players: [{id, cards}]}
     */
    async dealAnimation(data) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        const players = data.players || [];

        for (const playerData of players) {
            const handEl = this.elements.playerHands[playerData.id];
            if (!handEl) continue;

            handEl.innerHTML = '';
            const faceUp = playerData.id === 'player';

            for (let i = 0; i < playerData.cards.length; i++) {
                const card = playerData.cards[i];
                const cardEl = this.createCardElement(card, faceUp);
                cardEl.dataset.index = i;
                cardEl.classList.add('dealing');
                cardEl.style.animationDelay = `${i * 0.15}s`;
                handEl.appendChild(cardEl);

                await this.delay(100);
            }
        }

        // Remove animation class after completion
        await this.delay(500);
        document.querySelectorAll('.card.dealing').forEach(card => {
            card.classList.remove('dealing');
        });

        this.isAnimating = false;
    }

    /**
     * Collect cards animation
     * @param {Array} playerIds - Player IDs whose cards to collect
     */
    async collectCardsAnimation(playerIds = ['player', 'bot1', 'bot2', 'bot3']) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        for (const playerId of playerIds) {
            const handEl = this.elements.playerHands[playerId];
            if (!handEl) continue;

            const cards = handEl.querySelectorAll('.card');
            cards.forEach((card, i) => {
                card.classList.add('collecting');
                card.style.animationDelay = `${i * 0.1}s`;
            });
        }

        await this.delay(600);

        // Clear hands
        for (const playerId of playerIds) {
            const handEl = this.elements.playerHands[playerId];
            if (handEl) handEl.innerHTML = '';
        }

        this.isAnimating = false;
    }

    /**
     * Show envite animation
     * @param {Object} data - Envite data {player, type, amount}
     */
    showEnvite(data) {
        const message = data.type === 'ordago'
            ? `${data.player} dice: ORDAGO!`
            : `${data.player} envida ${data.amount}`;

        this.showMessage(message, 2000);

        // Animate the lance display
        const lanceEl = this.elements.currentLance;
        if (lanceEl) {
            lanceEl.classList.add('envite-animation');
            setTimeout(() => lanceEl.classList.remove('envite-animation'), 500);
        }
    }

    /**
     * Show victory animation
     * @param {Object} winner - Winner data {team, players}
     */
    async showVictoryAnimation(winner) {
        // Add celebration class to winning players
        const winningPlayers = winner.players || [];
        winningPlayers.forEach(playerId => {
            const handEl = this.elements.playerHands[playerId];
            if (handEl) {
                handEl.parentElement.classList.add('celebration', 'celebration-glow');
            }
        });

        // Create confetti
        this.createConfetti();

        // Show modal
        this.showModal(
            'Victoria!',
            `El ${winner.team} ha ganado la partida!`,
            [{ label: 'Nueva Partida', action: 'new-game', class: 'confirm' }]
        );
    }

    /**
     * Create confetti effect
     */
    createConfetti() {
        const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
                       '#2196f3', '#00bcd4', '#009688', '#4caf50', '#ffeb3b', '#ff9800'];

        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = `${Math.random() * 100}vw`;
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = `${Math.random() * 2}s`;
            confetti.style.animationDuration = `${2 + Math.random() * 2}s`;
            document.body.appendChild(confetti);

            // Remove after animation
            setTimeout(() => confetti.remove(), 5000);
        }
    }

    // ==================== Modal ====================

    /**
     * Show modal dialog
     * @param {string} title - Modal title
     * @param {string} message - Modal message
     * @param {Array} buttons - Array of button configs
     */
    showModal(title, message, buttons = []) {
        let modal = this.elements.modal;

        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modal';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
            this.elements.modal = modal;
        }

        const buttonsHtml = buttons.map(btn => `
            <button class="action-btn ${btn.class || ''}" data-action="${btn.action}">
                ${btn.label}
            </button>
        `).join('');

        modal.innerHTML = `
            <div class="modal-content">
                <h2 class="modal-title">${title}</h2>
                <p class="modal-message">${message}</p>
                <div class="modal-buttons">
                    ${buttonsHtml}
                </div>
            </div>
        `;

        // Bind button events
        modal.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.hideModal();
                this.emitEvent('modalAction', { action });

                if (action === 'new-game' && this.game && this.game.restart) {
                    this.game.restart();
                }
            });
        });

        // Show modal
        requestAnimationFrame(() => {
            modal.classList.add('visible');
        });
    }

    /**
     * Hide modal dialog
     */
    hideModal() {
        if (this.elements.modal) {
            this.elements.modal.classList.remove('visible');
        }
    }

    // ==================== Utilities ====================

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {Object} data - Event data
     */
    emitEvent(eventName, data) {
        const event = new CustomEvent(`mus:${eventName}`, { detail: data });
        document.dispatchEvent(event);
    }

    /**
     * Delay helper
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Reveal bot cards
     * @param {string} playerId - Bot player ID
     */
    revealCards(playerId) {
        const handEl = this.elements.playerHands[playerId];
        if (!handEl) return;

        const cards = handEl.querySelectorAll('.card.face-down');
        cards.forEach(cardEl => {
            const value = cardEl.dataset.value;
            const suit = cardEl.dataset.suit;

            if (value && suit) {
                const newCard = this.createCardElement({ value, suit }, true);
                newCard.dataset.index = cardEl.dataset.index;
                cardEl.replaceWith(newCard);
            }
        });
    }

    /**
     * Enable/disable card selection
     * @param {boolean} enabled - Whether selection is enabled
     */
    setCardSelectionEnabled(enabled) {
        const cards = document.querySelectorAll('#player-hand .card');
        cards.forEach(card => {
            if (enabled) {
                card.classList.remove('disabled');
            } else {
                card.classList.add('disabled');
            }
        });
    }
}

// ==================== Initialization ====================

let uiController = null;
let gameInstance = null;

/**
 * Initialize the game when DOM is ready
 */
function initializeGame() {
    // Create UI controller
    uiController = new UIController();

    // Create game instance
    try {
        gameInstance = new Game();
        uiController.connectGame(gameInstance);

        // Start the game
        if (gameInstance.start) {
            gameInstance.start();
        }
    } catch (e) {
        console.warn('Game module not loaded or error initializing:', e);
        // UI controller will work standalone for testing
    }

    // Listen for custom UI events
    document.addEventListener('mus:action', (e) => {
        console.log('UI Action:', e.detail);
    });

    document.addEventListener('mus:cardSelectionChange', (e) => {
        console.log('Selected cards:', e.detail);
    });

    document.addEventListener('mus:modalAction', (e) => {
        console.log('Modal action:', e.detail);
    });

    // Expose for debugging
    window.musUI = uiController;
    window.musGame = gameInstance;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}

// Export for module usage
export { uiController, gameInstance, initializeGame };
