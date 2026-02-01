/**
 * Integration tests for MUS game
 * Simulates complete game flows from start to finish
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game, LANCES, FASES, ACCIONES_ENVITE, PIEDRAS_PARA_GANAR } from '../js/game.js';
import { Card } from '../js/cards.js';

/**
 * Helper: Set specific hands for all players
 */
function setHands(game, hands) {
    game.players.player.hand = hands.player;
    game.players.partner.hand = hands.partner;
    game.players.rival1.hand = hands.rival1;
    game.players.rival2.hand = hands.rival2;
}

/**
 * Helper: Get the turn order starting from mano
 */
function getTurnOrder(game) {
    const order = [];
    for (let i = 0; i < 4; i++) {
        const idx = (game.manoIndex + i) % 4;
        order.push(game.turnOrder[idx]);
    }
    return order;
}

/**
 * Helper: All players say MUS, then cortar (simulate mus phase ending with cortar)
 */
function cortarMus(game) {
    const mano = game.getMano();
    game.handleMus(mano, false); // Mano corta
}

/**
 * Helper: All players pass envite for current lance
 */
function allPassEnvite(game) {
    const order = getTurnOrder(game);
    for (const playerId of order) {
        if (game.faseActual !== FASES.ENVITE) break;
        game.handleEnvite(playerId, ACCIONES_ENVITE.PASO);
    }
}

/**
 * Helper: One player envida and the opponent says no_quiero
 */
function envidoYNoQuiero(game, apostador) {
    game.handleEnvite(apostador, ACCIONES_ENVITE.ENVIDO, 2);
    // Find first opponent to respond
    const apostadorTeam = game.players[apostador].team;
    const order = getTurnOrder(game);
    for (const p of order) {
        if (game.players[p].team !== apostadorTeam) {
            game.handleEnvite(p, ACCIONES_ENVITE.NO_QUIERO);
            return;
        }
    }
}

/**
 * Helper: One player envida and the opponent says quiero
 */
function envidoYQuiero(game, apostador) {
    game.handleEnvite(apostador, ACCIONES_ENVITE.ENVIDO, 2);
    const apostadorTeam = game.players[apostador].team;
    const order = getTurnOrder(game);
    for (const p of order) {
        if (game.players[p].team !== apostadorTeam) {
            game.handleEnvite(p, ACCIONES_ENVITE.QUIERO);
            return;
        }
    }
}


describe('Integration - Full Round with All Passes', () => {
    let game;
    let events;

    beforeEach(() => {
        game = new Game();
        events = [];

        // Track all events
        const eventNames = [
            'gameStarted', 'roundStarted', 'cardsDealt', 'phaseChanged',
            'musPhaseStarted', 'musCortado', 'enviteStarted', 'enviteAction',
            'lanceResolved', 'lanceSkipped', 'roundFinished', 'gameOver'
        ];
        eventNames.forEach(name => {
            game.on(name, (data) => events.push({ event: name, data }));
        });
    });

    it('should complete a full round with all passes through all lances', () => {
        game.startGame();

        // Set controlled hands - no pares, no juego
        setHands(game, {
            player: [new Card('oros', 12), new Card('copas', 7), new Card('espadas', 5), new Card('bastos', 1)],
            partner: [new Card('oros', 11), new Card('copas', 6), new Card('espadas', 4), new Card('bastos', 1)],
            rival1: [new Card('oros', 10), new Card('copas', 7), new Card('espadas', 4), new Card('bastos', 1)],
            rival2: [new Card('oros', 12), new Card('copas', 6), new Card('espadas', 5), new Card('bastos', 1)]
        });

        // Cortar mus
        cortarMus(game);
        expect(game.faseActual).toBe(FASES.ENVITE);
        expect(game.lanceActual).toBe(LANCES.GRANDE);

        // GRANDE - all pass
        allPassEnvite(game);
        expect(game.faseActual).toBe(FASES.RESOLUCION);

        // Advance to next lance
        game.nextLance();
        expect(game.lanceActual).toBe(LANCES.CHICA);

        // CHICA - all pass
        allPassEnvite(game);
        game.nextLance();

        // PARES - should be skipped (nobody has pares)
        // startEnvite checks hayPares() and emits lanceSkipped
        // After skip, we need to manually advance
        const paresSkipped = events.find(e => e.event === 'lanceSkipped' && e.data.lance === LANCES.PARES);
        expect(paresSkipped).toBeTruthy();

        game.nextLance();

        // JUEGO - nobody has juego, so it becomes PUNTO
        expect(game.lanceActual).toBe(LANCES.PUNTO);

        // PUNTO - all pass
        allPassEnvite(game);
        game.nextLance();

        // Round should be finished
        const roundFinished = events.find(e => e.event === 'roundFinished');
        expect(roundFinished).toBeTruthy();

        // Check scoring: Grande(1) + Chica(1) + Punto(1) = 3 for the winners
        // Actual winners depend on hands
        const totalPendientes = roundFinished.data.puntosPendientes;
        expect(totalPendientes.equipo1 + totalPendientes.equipo2).toBeGreaterThanOrEqual(3);
    });

    it('should correctly resolve Grande and Chica to different teams', () => {
        game.startGame();

        // player(equipo1) has best grande, partner(equipo1) has best chica
        setHands(game, {
            player: [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 12)], // Best grande
            partner: [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)], // Best chica
            rival1: [new Card('oros', 7), new Card('copas', 7), new Card('espadas', 7), new Card('bastos', 7)],
            rival2: [new Card('oros', 5), new Card('copas', 5), new Card('espadas', 5), new Card('bastos', 5)]
        });

        cortarMus(game);

        // GRANDE
        allPassEnvite(game);
        const grandeResolved = events.filter(e => e.event === 'lanceResolved' && e.data.lance === LANCES.GRANDE);
        expect(grandeResolved.length).toBe(1);
        expect(grandeResolved[0].data.ganador).toBe('equipo1'); // player has 4 kings
        expect(grandeResolved[0].data.puntos).toBe(1); // paso = 1 piedra

        game.nextLance();

        // CHICA
        allPassEnvite(game);
        const chicaResolved = events.filter(e => e.event === 'lanceResolved' && e.data.lance === LANCES.CHICA);
        expect(chicaResolved.length).toBe(1);
        expect(chicaResolved[0].data.ganador).toBe('equipo1'); // partner has 4 aces (best chica)
        expect(chicaResolved[0].data.puntos).toBe(1);
    });
});


describe('Integration - Envido Flow', () => {
    let game;
    let events;

    beforeEach(() => {
        game = new Game();
        events = [];
        ['enviteStarted', 'enviteAction', 'lanceResolved', 'lanceSkipped', 'roundFinished'].forEach(name => {
            game.on(name, (data) => events.push({ event: name, data }));
        });
    });

    it('should handle envido + quiero correctly', () => {
        game.startGame();
        setHands(game, {
            player: [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 12)],
            partner: [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)],
            rival1: [new Card('oros', 7), new Card('copas', 7), new Card('espadas', 7), new Card('bastos', 7)],
            rival2: [new Card('oros', 5), new Card('copas', 5), new Card('espadas', 5), new Card('bastos', 5)]
        });

        cortarMus(game);
        expect(game.lanceActual).toBe(LANCES.GRANDE);

        // Mano (player) envida
        const mano = game.getMano();
        game.handleEnvite(mano, ACCIONES_ENVITE.ENVIDO, 2);
        expect(game.enviteActual.apuesta).toBe(2);
        expect(game.enviteActual.esperandoRespuesta).toBe(true);

        // Rival quiere
        game.handleEnvite('rival2', ACCIONES_ENVITE.QUIERO);

        // Lance should be resolved
        expect(game.faseActual).toBe(FASES.RESOLUCION);
        const resolved = events.find(e => e.event === 'lanceResolved' && e.data.lance === LANCES.GRANDE);
        expect(resolved).toBeTruthy();
        // player has 4 kings, wins Grande. Envite was 2, so puntos = 1 (base) + 2 = ... wait
        // Actually Grande paso = 1, but with envido accepted: apuesta(2)
        // resolveLance: puntos = this.enviteActual.apuesta > 0 ? this.enviteActual.apuesta : 1
        expect(resolved.data.puntos).toBe(2); // apuesta = 2
        expect(resolved.data.ganador).toBe('equipo1');
    });

    it('should handle envido + no_quiero (deje = 1 piedra)', () => {
        game.startGame();
        setHands(game, {
            player: [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 12)],
            partner: [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)],
            rival1: [new Card('oros', 7), new Card('copas', 7), new Card('espadas', 7), new Card('bastos', 7)],
            rival2: [new Card('oros', 5), new Card('copas', 5), new Card('espadas', 5), new Card('bastos', 5)]
        });

        cortarMus(game);

        // Mano envida
        game.handleEnvite('player', ACCIONES_ENVITE.ENVIDO, 5);

        // Rivales no quieren (ambos deben rechazar)
        game.handleEnvite('rival2', ACCIONES_ENVITE.NO_QUIERO);
        game.handleEnvite('rival1', ACCIONES_ENVITE.NO_QUIERO);

        // Deje = 1 piedra always
        expect(game.puntosPendientes.equipo1).toBe(1);
    });

    it('should handle ordago + quiero', () => {
        game.startGame();
        setHands(game, {
            player: [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 12)],
            partner: [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)],
            rival1: [new Card('oros', 7), new Card('copas', 7), new Card('espadas', 7), new Card('bastos', 7)],
            rival2: [new Card('oros', 5), new Card('copas', 5), new Card('espadas', 5), new Card('bastos', 5)]
        });

        cortarMus(game);

        // Mano goes ordago
        game.handleEnvite('player', ACCIONES_ENVITE.ORDAGO);
        expect(game.ordagoActivo).toBe(true);

        // Rival accepts
        game.handleEnvite('rival2', ACCIONES_ENVITE.QUIERO);

        // Game should be over
        const gameOver = events.find(e => e.event === 'lanceResolved' && e.data.ordagoAceptado);
        expect(gameOver).toBeTruthy();
        expect(game.piedras.equipo1).toBe(PIEDRAS_PARA_GANAR);
    });

    it('should handle ordago + no_quiero (deje = 1)', () => {
        game.startGame();
        setHands(game, {
            player: [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 12)],
            partner: [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)],
            rival1: [new Card('oros', 7), new Card('copas', 7), new Card('espadas', 7), new Card('bastos', 7)],
            rival2: [new Card('oros', 5), new Card('copas', 5), new Card('espadas', 5), new Card('bastos', 5)]
        });

        cortarMus(game);

        game.handleEnvite('player', ACCIONES_ENVITE.ORDAGO);
        game.handleEnvite('rival2', ACCIONES_ENVITE.NO_QUIERO);
        game.handleEnvite('rival1', ACCIONES_ENVITE.NO_QUIERO);

        // Deje = 1 piedra, ordago deactivated
        expect(game.puntosPendientes.equipo1).toBe(1);
        expect(game.ordagoActivo).toBe(false);
    });
});


describe('Integration - Pares Lance', () => {
    let game;
    let events;

    beforeEach(() => {
        game = new Game();
        events = [];
        ['enviteStarted', 'lanceResolved', 'lanceSkipped', 'paresDetectados'].forEach(name => {
            game.on(name, (data) => events.push({ event: name, data }));
        });
    });

    it('should skip pares lance when nobody has pares', () => {
        game.startGame();
        setHands(game, {
            player: [new Card('oros', 12), new Card('copas', 7), new Card('espadas', 5), new Card('bastos', 1)],
            partner: [new Card('oros', 11), new Card('copas', 6), new Card('espadas', 4), new Card('bastos', 1)],
            rival1: [new Card('oros', 10), new Card('copas', 7), new Card('espadas', 4), new Card('bastos', 1)],
            rival2: [new Card('oros', 12), new Card('copas', 6), new Card('espadas', 5), new Card('bastos', 1)]
        });

        cortarMus(game);

        // Pass Grande
        allPassEnvite(game);
        game.nextLance();

        // Pass Chica
        allPassEnvite(game);
        game.nextLance();

        // Pares should be skipped
        const skipped = events.find(e => e.event === 'lanceSkipped' && e.data.lance === LANCES.PARES);
        expect(skipped).toBeTruthy();
    });

    it('should play pares lance when players have pares', () => {
        game.startGame();
        setHands(game, {
            player: [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 7), new Card('bastos', 7)], // duples
            partner: [new Card('oros', 11), new Card('copas', 11), new Card('espadas', 5), new Card('bastos', 1)], // par
            rival1: [new Card('oros', 10), new Card('copas', 10), new Card('espadas', 4), new Card('bastos', 1)], // par
            rival2: [new Card('oros', 6), new Card('copas', 5), new Card('espadas', 4), new Card('bastos', 1)] // nada
        });

        cortarMus(game);

        // Pass Grande
        allPassEnvite(game);
        game.nextLance();

        // Pass Chica
        allPassEnvite(game);
        game.nextLance();

        // Pares should NOT be skipped
        const skipped = events.find(e => e.event === 'lanceSkipped' && e.data.lance === LANCES.PARES);
        expect(skipped).toBeFalsy();

        // Pares envite started
        const enviteStarted = events.find(e => e.event === 'enviteStarted' && e.data.lance === LANCES.PARES);
        expect(enviteStarted).toBeTruthy();

        // All pass pares
        allPassEnvite(game);

        // equipo1 wins: player(duples=3) + partner(par=1) = 4
        const paresResolved = events.find(e => e.event === 'lanceResolved' && e.data.lance === LANCES.PARES);
        expect(paresResolved).toBeTruthy();
        expect(paresResolved.data.ganador).toBe('equipo1');
        expect(paresResolved.data.puntos).toBe(4); // duples(3) + par(1) = 4
    });

    it('should correctly score medias (2 pts)', () => {
        game.startGame();
        setHands(game, {
            player: [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 1)], // medias
            partner: [new Card('oros', 6), new Card('copas', 5), new Card('espadas', 4), new Card('bastos', 1)], // nada
            rival1: [new Card('oros', 7), new Card('copas', 7), new Card('espadas', 4), new Card('bastos', 1)], // par
            rival2: [new Card('oros', 6), new Card('copas', 5), new Card('espadas', 4), new Card('bastos', 1)] // nada
        });

        cortarMus(game);
        allPassEnvite(game); game.nextLance(); // Grande
        allPassEnvite(game); game.nextLance(); // Chica

        // Pares
        allPassEnvite(game);
        const paresResolved = events.find(e => e.event === 'lanceResolved' && e.data.lance === LANCES.PARES);
        expect(paresResolved.data.ganador).toBe('equipo1'); // medias > par
        expect(paresResolved.data.puntos).toBe(2); // player medias(2) + partner(0) = 2
    });
});


describe('Integration - Juego and Punto Lances', () => {
    let game;
    let events;

    beforeEach(() => {
        game = new Game();
        events = [];
        ['enviteStarted', 'lanceResolved', 'lanceSkipped', 'juegoDetectado', 'roundFinished'].forEach(name => {
            game.on(name, (data) => events.push({ event: name, data }));
        });
    });

    it('should play JUEGO when someone has >= 31', () => {
        game.startGame();
        setHands(game, {
            player: [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 1)], // 31
            partner: [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)], // 4
            rival1: [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 5), new Card('bastos', 7)], // 32
            rival2: [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)] // 4
        });

        cortarMus(game);
        allPassEnvite(game); game.nextLance(); // Grande
        allPassEnvite(game); game.nextLance(); // Chica

        // Skip pares (no pairs in these hands... wait, player has 3 reyes = medias)
        // Actually player has 3 cards of valor 12 = medias, rival1 has 2 cards of valor 12 = par
        // So pares will be played
        allPassEnvite(game); game.nextLance(); // Pares

        // JUEGO should start
        const juegoStarted = events.find(e => e.event === 'enviteStarted' && e.data.lance === LANCES.JUEGO);
        expect(juegoStarted).toBeTruthy();

        // All pass juego
        allPassEnvite(game);

        // 31 beats 32, equipo1 wins, juego de 31 = 3 piedras
        const juegoResolved = events.find(e => e.event === 'lanceResolved' && e.data.lance === LANCES.JUEGO);
        expect(juegoResolved).toBeTruthy();
        expect(juegoResolved.data.ganador).toBe('equipo1');
        expect(juegoResolved.data.puntos).toBe(3); // Juego de 31 = 3
    });

    it('should play PUNTO when nobody has juego', () => {
        game.startGame();
        setHands(game, {
            player: [new Card('oros', 7), new Card('copas', 7), new Card('espadas', 7), new Card('bastos', 7)], // 28
            partner: [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)], // 4
            rival1: [new Card('oros', 5), new Card('copas', 5), new Card('espadas', 5), new Card('bastos', 5)], // 20
            rival2: [new Card('oros', 4), new Card('copas', 4), new Card('espadas', 4), new Card('bastos', 4)] // 16
        });

        cortarMus(game);
        allPassEnvite(game); game.nextLance(); // Grande
        allPassEnvite(game); game.nextLance(); // Chica

        // Pares: player has 4x7 = duples, rival1 has 4x5 = duples, rival2 has 4x4 = duples
        allPassEnvite(game); game.nextLance(); // Pares

        // Nobody has juego (max is 28), so it becomes PUNTO
        expect(game.lanceActual).toBe(LANCES.PUNTO);

        const puntoStarted = events.find(e => e.event === 'enviteStarted' && e.data.lance === LANCES.PUNTO);
        expect(puntoStarted).toBeTruthy();

        allPassEnvite(game);
        const puntoResolved = events.find(e => e.event === 'lanceResolved' && e.data.lance === LANCES.PUNTO);
        expect(puntoResolved.data.ganador).toBe('equipo1'); // player has 28, best punto
        expect(puntoResolved.data.puntos).toBe(1); // Punto paso = 1
    });

    it('Juego de 32 should score 2 piedras (not 3)', () => {
        game.startGame();
        setHands(game, {
            player: [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)], // 4
            partner: [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)], // 4
            rival1: [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 5), new Card('bastos', 7)], // 32
            rival2: [new Card('oros', 1), new Card('copas', 4), new Card('espadas', 5), new Card('bastos', 6)] // 16
        });

        cortarMus(game);
        allPassEnvite(game); game.nextLance(); // Grande
        allPassEnvite(game); game.nextLance(); // Chica

        // Pares: rival1 has par (2 reyes)
        // Check if pares is skipped or not
        if (game.faseActual === FASES.ENVITE && game.lanceActual === LANCES.PARES) {
            allPassEnvite(game); game.nextLance();
        } else {
            game.nextLance();
        }

        // Juego
        allPassEnvite(game);
        const juegoResolved = events.find(e => e.event === 'lanceResolved' && e.data.lance === LANCES.JUEGO);
        expect(juegoResolved).toBeTruthy();
        expect(juegoResolved.data.ganador).toBe('equipo2'); // rival1 has 32
        expect(juegoResolved.data.puntos).toBe(2); // Juego != 31, so 2 piedras
    });
});


describe('Integration - Complete Game to Victory', () => {
    let game;
    let events;

    beforeEach(() => {
        game = new Game();
        events = [];
        ['roundFinished', 'gameOver'].forEach(name => {
            game.on(name, (data) => events.push({ event: name, data }));
        });
    });

    it('should accumulate piedras across multiple rounds', () => {
        game.startGame();

        // Round 1
        setHands(game, {
            player: [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 12)],
            partner: [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)],
            rival1: [new Card('oros', 7), new Card('copas', 6), new Card('espadas', 5), new Card('bastos', 4)],
            rival2: [new Card('oros', 7), new Card('copas', 6), new Card('espadas', 5), new Card('bastos', 4)]
        });
        cortarMus(game);

        // Grande - equipo1 wins (4 kings) = 1
        allPassEnvite(game); game.nextLance();
        // Chica - equipo1 wins (4 aces) = 1
        allPassEnvite(game); game.nextLance();
        // Pares - player has duples(3), skip or resolve
        if (game.faseActual === FASES.ENVITE) {
            allPassEnvite(game); game.nextLance();
        } else {
            game.nextLance();
        }
        // Juego/Punto
        if (game.faseActual === FASES.ENVITE) {
            allPassEnvite(game); game.nextLance();
        } else if (game.lanceActual !== null) {
            game.nextLance();
        }

        const round1 = events.find(e => e.event === 'roundFinished');
        expect(round1).toBeTruthy();
        expect(game.piedras.equipo1).toBeGreaterThan(0);
    });

    it('should end game when a team reaches 40 piedras via ordago', () => {
        game.startGame();
        setHands(game, {
            player: [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 12)],
            partner: [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)],
            rival1: [new Card('oros', 7), new Card('copas', 7), new Card('espadas', 7), new Card('bastos', 7)],
            rival2: [new Card('oros', 5), new Card('copas', 5), new Card('espadas', 5), new Card('bastos', 5)]
        });

        cortarMus(game);

        // Player ordago in Grande
        game.handleEnvite('player', ACCIONES_ENVITE.ORDAGO);
        game.handleEnvite('rival2', ACCIONES_ENVITE.QUIERO);

        // Game should be over
        const gameOver = events.find(e => e.event === 'gameOver');
        expect(gameOver).toBeTruthy();
        expect(gameOver.data.ganador).toBe('equipo1');
        expect(game.piedras.equipo1).toBe(40);
    });
});


describe('Integration - Turn Order and Mano Rotation', () => {
    let game;

    beforeEach(() => {
        game = new Game();
    });

    it('should rotate mano after each round', () => {
        game.startGame();
        expect(game.getMano()).toBe('player'); // manoIndex 0

        // Complete a quick round
        setHands(game, {
            player: [new Card('oros', 12), new Card('copas', 7), new Card('espadas', 5), new Card('bastos', 1)],
            partner: [new Card('oros', 11), new Card('copas', 6), new Card('espadas', 4), new Card('bastos', 1)],
            rival1: [new Card('oros', 10), new Card('copas', 6), new Card('espadas', 4), new Card('bastos', 1)],
            rival2: [new Card('oros', 12), new Card('copas', 7), new Card('espadas', 5), new Card('bastos', 1)]
        });

        cortarMus(game);

        // Pass through all lances quickly
        allPassEnvite(game); game.nextLance(); // Grande
        allPassEnvite(game); game.nextLance(); // Chica
        // Pares skipped (no pairs)
        game.nextLance(); // After skip
        // Punto
        allPassEnvite(game); game.nextLance(); // Finish round

        // UI calls continueAfterRound to rotate mano and start next round
        game.continueAfterRound();

        // New round starts, mano should rotate
        expect(game.getMano()).toBe('rival2'); // manoIndex 1
    });

    it('should enforce mus turn order from mano', () => {
        game.startGame();
        const mano = game.getMano(); // player (index 0)

        // Wrong player tries to talk first
        const wrongResult = game.handleMus('rival1', true);
        expect(wrongResult).toBe(false);

        // Correct player (mano)
        const correctResult = game.handleMus(mano, true);
        expect(correctResult).toBe(true);

        // Next should be rival2 (index 1 in turn order from mano)
        const next = game.getMusTurnPlayer();
        expect(next).toBe('rival2');
    });
});


describe('Integration - Envite Response Chain', () => {
    let game;
    let events;

    beforeEach(() => {
        game = new Game();
        events = [];
        ['enviteAction', 'lanceResolved', 'turnChanged'].forEach(name => {
            game.on(name, (data) => events.push({ event: name, data }));
        });
    });

    it('should require opposing team to respond to envido', () => {
        game.startGame();
        setHands(game, {
            player: [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 12)],
            partner: [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)],
            rival1: [new Card('oros', 7), new Card('copas', 7), new Card('espadas', 7), new Card('bastos', 7)],
            rival2: [new Card('oros', 5), new Card('copas', 5), new Card('espadas', 5), new Card('bastos', 5)]
        });

        cortarMus(game);

        // Player (equipo1) envida
        game.handleEnvite('player', ACCIONES_ENVITE.ENVIDO, 2);
        expect(game.enviteActual.esperandoRespuesta).toBe(true);
        expect(game.enviteActual.equipoDebeResponder).toBe('equipo2');

        // equipo1 player can't respond to their own envido
        const wrongTeam = game.handleEnvite('partner', ACCIONES_ENVITE.QUIERO);
        expect(wrongTeam).toBe(false);

        // equipo2 player responds
        const correctTeam = game.handleEnvite('rival2', ACCIONES_ENVITE.QUIERO);
        expect(correctTeam).toBe(true);
    });

    it('should allow re-raise (envido on top of envido)', () => {
        game.startGame();
        setHands(game, {
            player: [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 12)],
            partner: [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)],
            rival1: [new Card('oros', 7), new Card('copas', 7), new Card('espadas', 7), new Card('bastos', 7)],
            rival2: [new Card('oros', 5), new Card('copas', 5), new Card('espadas', 5), new Card('bastos', 5)]
        });

        cortarMus(game);

        // Player envida 2
        game.handleEnvite('player', ACCIONES_ENVITE.ENVIDO, 2);
        expect(game.enviteActual.apuesta).toBe(2);

        // Rival re-raises with envido 2 more
        game.handleEnvite('rival2', ACCIONES_ENVITE.ENVIDO, 2);
        expect(game.enviteActual.apuesta).toBe(4); // 2 + 2
        expect(game.enviteActual.equipoDebeResponder).toBe('equipo1');

        // Player accepts
        game.handleEnvite('player', ACCIONES_ENVITE.QUIERO);

        // Resolved with 4 piedras
        const resolved = events.find(e => e.event === 'lanceResolved');
        expect(resolved).toBeTruthy();
        expect(resolved.data.puntos).toBe(4);
    });
});


describe('Integration - Phase Transitions', () => {
    let game;
    let events;

    beforeEach(() => {
        game = new Game();
        events = [];
        ['phaseChanged', 'enviteStarted', 'lanceResolved', 'lanceSkipped'].forEach(name => {
            game.on(name, (data) => events.push({ event: name, data }));
        });
    });

    it('should transition phases correctly: MUS -> ENVITE -> RESOLUCION', () => {
        game.startGame();
        expect(game.faseActual).toBe(FASES.MUS);

        cortarMus(game);
        expect(game.faseActual).toBe(FASES.ENVITE);

        // All pass Grande
        allPassEnvite(game);
        expect(game.faseActual).toBe(FASES.RESOLUCION);
    });

    it('should set faseActual to RESOLUCION on no_quiero (prevents race conditions)', () => {
        game.startGame();
        setHands(game, {
            player: [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 12)],
            partner: [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)],
            rival1: [new Card('oros', 7), new Card('copas', 7), new Card('espadas', 7), new Card('bastos', 7)],
            rival2: [new Card('oros', 5), new Card('copas', 5), new Card('espadas', 5), new Card('bastos', 5)]
        });

        cortarMus(game);
        expect(game.faseActual).toBe(FASES.ENVITE);

        game.handleEnvite('player', ACCIONES_ENVITE.ENVIDO, 2);
        game.handleEnvite('rival2', ACCIONES_ENVITE.NO_QUIERO);
        game.handleEnvite('rival1', ACCIONES_ENVITE.NO_QUIERO);

        // Critical: faseActual must be RESOLUCION, not ENVITE
        // This prevents stale AI timeouts from executing
        expect(game.faseActual).toBe(FASES.RESOLUCION);
    });

    it('should not allow envite actions after lance resolved', () => {
        game.startGame();
        cortarMus(game);

        // Resolve Grande by all passing
        allPassEnvite(game);
        expect(game.faseActual).toBe(FASES.RESOLUCION);

        // Trying to envite after resolution should fail
        const result = game.handleEnvite('player', ACCIONES_ENVITE.ENVIDO, 2);
        expect(result).toBe(false);
    });
});


describe('Integration - Juego Hierarchy', () => {
    let game;

    beforeEach(() => {
        game = new Game();
        game.manoIndex = 0;
    });

    it('31 beats 32', () => {
        game.players.player.hand = [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 1)]; // 31
        game.players.partner.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)];
        game.players.rival1.hand = [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 5), new Card('bastos', 7)]; // 32
        game.players.rival2.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)];
        expect(game.resolverJuego()).toBe('equipo1');
    });

    it('31 beats 40 (la Real)', () => {
        game.players.player.hand = [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 1)]; // 31
        game.players.partner.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)];
        game.players.rival1.hand = [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 12)]; // 40
        game.players.rival2.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)];
        expect(game.resolverJuego()).toBe('equipo1');
    });

    it('32 beats 40', () => {
        game.players.player.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)];
        game.players.partner.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)];
        game.players.rival1.hand = [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 5), new Card('bastos', 7)]; // 32
        game.players.rival2.hand = [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 12)]; // 40
        expect(game.resolverJuego()).toBe('equipo2'); // rival1 has 32 which beats rival2's 40
    });

    it('40 beats 37', () => {
        game.players.player.hand = [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 12)]; // 40
        game.players.partner.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)];
        game.players.rival1.hand = [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 7)]; // 37
        game.players.rival2.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)];
        expect(game.resolverJuego()).toBe('equipo1');
    });

    it('mano wins ties', () => {
        // Both have same juego value, mano wins
        game.players.player.hand = [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 1)]; // 31
        game.players.partner.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)];
        game.players.rival1.hand = [new Card('oros', 3), new Card('copas', 3), new Card('espadas', 3), new Card('bastos', 1)]; // 31 (3=10pts each)
        game.players.rival2.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)];
        // player is mano (index 0), so equipo1 wins tie
        expect(game.resolverJuego()).toBe('equipo1');
    });
});


describe('Integration - 3 and 2 Card Equivalences', () => {
    let game;

    beforeEach(() => {
        game = new Game();
        game.manoIndex = 0;
    });

    it('3 should count as Rey (12) for Grande/Chica/Pares', () => {
        game.players.player.hand = [new Card('oros', 3), new Card('copas', 12), new Card('espadas', 7), new Card('bastos', 1)];
        const grandeValues = game.getGrandeValues(game.players.player.hand);
        expect(grandeValues[0]).toBe(12); // 3 counts as 12
        expect(grandeValues[1]).toBe(12); // Rey
    });

    it('2 should count as As (1) for Grande/Chica/Pares', () => {
        game.players.player.hand = [new Card('oros', 2), new Card('copas', 12), new Card('espadas', 7), new Card('bastos', 5)];
        const chicaValues = game.getChicaValues(game.players.player.hand);
        expect(chicaValues[0]).toBe(1); // 2 counts as 1 (As)
    });

    it('3 should count as 10 points for Juego', () => {
        game.players.player.hand = [new Card('oros', 3), new Card('copas', 3), new Card('espadas', 3), new Card('bastos', 1)];
        const valor = game.getValorJuego(game.players.player.hand);
        expect(valor).toBe(31); // 10+10+10+1 = 31
    });

    it('2 should count as 1 point for Juego', () => {
        game.players.player.hand = [new Card('oros', 2), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 12)];
        const valor = game.getValorJuego(game.players.player.hand);
        expect(valor).toBe(31); // 1+10+10+10 = 31
    });

    it('3+Rey should form a par (both = 12)', () => {
        game.players.player.hand = [new Card('oros', 3), new Card('copas', 12), new Card('espadas', 7), new Card('bastos', 5)];
        const pares = game.detectarPares(game.players.player.hand);
        expect(pares.tipo).toBe('par');
        expect(pares.valores).toContain(12);
    });

    it('2+As should form a par (both = 1)', () => {
        game.players.player.hand = [new Card('oros', 2), new Card('copas', 1), new Card('espadas', 7), new Card('bastos', 5)];
        const pares = game.detectarPares(game.players.player.hand);
        expect(pares.tipo).toBe('par');
        expect(pares.valores).toContain(1);
    });
});


describe('Integration - Multiple Rounds Scoring', () => {
    let game;
    let events;

    beforeEach(() => {
        game = new Game();
        events = [];
        ['roundFinished', 'gameOver'].forEach(name => {
            game.on(name, (data) => events.push({ event: name, data }));
        });
    });

    it('should correctly accumulate piedras across rounds without resetting', () => {
        game.startGame();

        // Round 1: equipo1 wins Grande and Chica with passes (2 piedras)
        setHands(game, {
            player: [new Card('oros', 12), new Card('copas', 7), new Card('espadas', 5), new Card('bastos', 1)],
            partner: [new Card('oros', 1), new Card('copas', 6), new Card('espadas', 4), new Card('bastos', 7)],
            rival1: [new Card('oros', 11), new Card('copas', 6), new Card('espadas', 4), new Card('bastos', 1)],
            rival2: [new Card('oros', 10), new Card('copas', 5), new Card('espadas', 4), new Card('bastos', 1)]
        });

        cortarMus(game);
        // Grande
        allPassEnvite(game); game.nextLance();
        // Chica
        allPassEnvite(game); game.nextLance();
        // Pares skipped
        game.nextLance();
        // Punto
        allPassEnvite(game); game.nextLance();

        const round1Piedras = { ...game.piedras };
        expect(round1Piedras.equipo1 + round1Piedras.equipo2).toBeGreaterThan(0);

        // UI calls continueAfterRound to rotate mano and start next round
        game.continueAfterRound();

        // Round 2: set new hands
        setHands(game, {
            player: [new Card('oros', 12), new Card('copas', 7), new Card('espadas', 5), new Card('bastos', 1)],
            partner: [new Card('oros', 1), new Card('copas', 6), new Card('espadas', 4), new Card('bastos', 7)],
            rival1: [new Card('oros', 11), new Card('copas', 6), new Card('espadas', 4), new Card('bastos', 1)],
            rival2: [new Card('oros', 10), new Card('copas', 5), new Card('espadas', 4), new Card('bastos', 1)]
        });

        cortarMus(game);
        allPassEnvite(game); game.nextLance(); // Grande
        allPassEnvite(game); game.nextLance(); // Chica
        game.nextLance(); // Pares skipped
        allPassEnvite(game); game.nextLance(); // Punto

        // Piedras should be accumulated
        expect(game.piedras.equipo1 + game.piedras.equipo2).toBeGreaterThan(
            round1Piedras.equipo1 + round1Piedras.equipo2
        );
    });
});
