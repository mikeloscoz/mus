import { describe, it, expect, beforeEach } from 'vitest';
import { Game, LANCES, FASES, ACCIONES_ENVITE } from '../js/game.js';
import { Card } from '../js/cards.js';

describe('Game - Card Property Bug', () => {
    let game;

    beforeEach(() => {
        game = new Game();
    });

    it('should access card.valor not card.value in getValorMusComparacion', () => {
        const card = new Card('oros', 3);
        // game.js uses card.value but Card class has card.valor
        const result = game.getValorMusComparacion(card.valor);
        expect(result).toBe(12); // 3 counts as Rey
    });

    it('should correctly compute Grande values from actual Card objects', () => {
        game.players.player.hand = [
            new Card('oros', 12), // Rey
            new Card('copas', 3),  // 3 = Rey (12)
            new Card('espadas', 7),
            new Card('bastos', 1)  // As
        ];
        const values = game.getGrandeValues(game.players.player.hand);
        // Should be [12, 12, 7, 1] sorted desc
        expect(values).toEqual([12, 12, 7, 1]);
        // If bug exists (card.value is undefined), all values would be NaN
        expect(values.every(v => !isNaN(v))).toBe(true);
    });

    it('should correctly compute Chica values from actual Card objects', () => {
        game.players.player.hand = [
            new Card('oros', 12),
            new Card('copas', 3),
            new Card('espadas', 7),
            new Card('bastos', 1)
        ];
        const values = game.getChicaValues(game.players.player.hand);
        expect(values).toEqual([1, 7, 12, 12]);
        expect(values.every(v => !isNaN(v))).toBe(true);
    });

    it('should correctly compute Juego value from actual Card objects', () => {
        game.players.player.hand = [
            new Card('oros', 12), // 10 points
            new Card('copas', 12), // 10 points
            new Card('espadas', 12), // 10 points
            new Card('bastos', 1)  // 1 point
        ];
        const valor = game.getValorJuego(game.players.player.hand);
        expect(valor).toBe(31);
    });

    it('should correctly detect pares from actual Card objects', () => {
        game.players.player.hand = [
            new Card('oros', 12),
            new Card('copas', 12),
            new Card('espadas', 7),
            new Card('bastos', 1)
        ];
        const pares = game.detectarPares(game.players.player.hand);
        expect(pares.tipo).toBe('par');
    });

    it('should detect 3+Rey as par (both count as 12)', () => {
        game.players.player.hand = [
            new Card('oros', 3),   // 3 = Rey = 12
            new Card('copas', 12), // Rey = 12
            new Card('espadas', 7),
            new Card('bastos', 1)
        ];
        const pares = game.detectarPares(game.players.player.hand);
        expect(pares.tipo).toBe('par');
        expect(pares.valores).toContain(12);
    });
});

describe('Game - resolverGrande', () => {
    let game;

    beforeEach(() => {
        game = new Game();
        game.manoIndex = 0;
    });

    it('should resolve Grande correctly - team with higher cards wins', () => {
        game.players.player.hand = [
            new Card('oros', 12), new Card('copas', 12),
            new Card('espadas', 12), new Card('bastos', 12)
        ]; // equipo1 - 4 Reyes
        game.players.partner.hand = [
            new Card('oros', 7), new Card('copas', 6),
            new Card('espadas', 5), new Card('bastos', 4)
        ]; // equipo1
        game.players.rival1.hand = [
            new Card('oros', 1), new Card('copas', 1),
            new Card('espadas', 1), new Card('bastos', 1)
        ]; // equipo2 - 4 Ases (lowest)
        game.players.rival2.hand = [
            new Card('oros', 7), new Card('copas', 7),
            new Card('espadas', 7), new Card('bastos', 7)
        ]; // equipo2

        const ganador = game.resolverGrande();
        expect(ganador).toBe('equipo1');
    });
});

describe('Game - resolverChica', () => {
    let game;

    beforeEach(() => {
        game = new Game();
        game.manoIndex = 0;
    });

    it('should resolve Chica correctly - team with lower cards wins', () => {
        game.players.player.hand = [
            new Card('oros', 1), new Card('copas', 1),
            new Card('espadas', 1), new Card('bastos', 1)
        ]; // equipo1 - 4 Ases (best chica)
        game.players.partner.hand = [
            new Card('oros', 12), new Card('copas', 12),
            new Card('espadas', 12), new Card('bastos', 12)
        ]; // equipo1
        game.players.rival1.hand = [
            new Card('oros', 12), new Card('copas', 12),
            new Card('espadas', 12), new Card('bastos', 12)
        ]; // equipo2 - all kings
        game.players.rival2.hand = [
            new Card('oros', 7), new Card('copas', 7),
            new Card('espadas', 7), new Card('bastos', 7)
        ]; // equipo2

        const ganador = game.resolverChica();
        expect(ganador).toBe('equipo1');
    });
});

describe('Game - resolverPares', () => {
    let game;

    beforeEach(() => {
        game = new Game();
        game.manoIndex = 0;
    });

    it('should resolve Pares - duples beat par', () => {
        game.players.player.hand = [
            new Card('oros', 12), new Card('copas', 12),
            new Card('espadas', 7), new Card('bastos', 7)
        ]; // equipo1 - duples (2 pairs)
        game.players.partner.hand = [
            new Card('oros', 1), new Card('copas', 4),
            new Card('espadas', 5), new Card('bastos', 6)
        ]; // equipo1 - no pairs
        game.players.rival1.hand = [
            new Card('oros', 11), new Card('copas', 11),
            new Card('espadas', 1), new Card('bastos', 4)
        ]; // equipo2 - par only
        game.players.rival2.hand = [
            new Card('oros', 1), new Card('copas', 4),
            new Card('espadas', 5), new Card('bastos', 6)
        ]; // equipo2 - no pairs

        const resultado = game.resolverPares();
        expect(resultado.ganador).toBe('equipo1');
    });
});

describe('Game - resolverJuego', () => {
    let game;

    beforeEach(() => {
        game = new Game();
        game.manoIndex = 0;
    });

    it('should resolve Juego - 31 beats 32', () => {
        game.players.player.hand = [
            new Card('oros', 12), new Card('copas', 12),
            new Card('espadas', 12), new Card('bastos', 1)
        ]; // equipo1 - 10+10+10+1 = 31 (BEST)
        game.players.partner.hand = [
            new Card('oros', 1), new Card('copas', 1),
            new Card('espadas', 1), new Card('bastos', 1)
        ]; // equipo1 - 4 (no juego)
        game.players.rival1.hand = [
            new Card('oros', 12), new Card('copas', 12),
            new Card('espadas', 5), new Card('bastos', 7)
        ]; // equipo2 - 10+10+5+7 = 32
        game.players.rival2.hand = [
            new Card('oros', 1), new Card('copas', 1),
            new Card('espadas', 1), new Card('bastos', 1)
        ]; // equipo2 - 4 (no juego)

        const ganador = game.resolverJuego();
        expect(ganador).toBe('equipo1'); // 31 beats 32
    });
});

describe('Game - Mus Phase', () => {
    let game;

    beforeEach(() => {
        game = new Game();
    });

    it('should start in MUS phase after startGame', () => {
        game.startGame();
        expect(game.faseActual).toBe(FASES.MUS);
    });

    it('should deal 4 cards to each player', () => {
        game.startGame();
        expect(game.players.player.hand.length).toBe(4);
        expect(game.players.partner.hand.length).toBe(4);
        expect(game.players.rival1.hand.length).toBe(4);
        expect(game.players.rival2.hand.length).toBe(4);
    });

    it('should accept mus from mano player', () => {
        game.startGame();
        const mano = game.getMano();
        const result = game.handleMus(mano, true);
        expect(result).toBe(true);
    });

    it('should reject mus from wrong player', () => {
        game.startGame();
        // mano is turnOrder[0] = 'player', so rival1 is not mano
        const result = game.handleMus('rival1', true);
        expect(result).toBe(false);
    });

    it('should start lances when someone corta', () => {
        game.startGame();
        const mano = game.getMano();
        game.handleMus(mano, false); // Corta
        expect(game.faseActual).toBe(FASES.ENVITE);
        expect(game.lanceActual).toBe(LANCES.GRANDE);
    });
});

describe('Game - Envite Phase', () => {
    let game;

    beforeEach(() => {
        game = new Game();
        game.startGame();
        // Cortar para ir a envite
        const mano = game.getMano();
        game.handleMus(mano, false);
    });

    it('should start with Grande lance', () => {
        expect(game.lanceActual).toBe(LANCES.GRANDE);
    });

    it('should accept paso from current turn player', () => {
        const currentPlayer = game.getEnviteTurnPlayer();
        const result = game.handleEnvite(currentPlayer, ACCIONES_ENVITE.PASO);
        expect(result).toBe(true);
    });
});

describe('Game - hayPares', () => {
    let game;

    beforeEach(() => {
        game = new Game();
    });

    it('should detect when at least one player has pares', () => {
        game.players.player.hand = [
            new Card('oros', 12), new Card('copas', 12),
            new Card('espadas', 7), new Card('bastos', 1)
        ];
        game.players.partner.hand = [
            new Card('oros', 1), new Card('copas', 4),
            new Card('espadas', 5), new Card('bastos', 6)
        ];
        game.players.rival1.hand = [
            new Card('oros', 7), new Card('copas', 4),
            new Card('espadas', 5), new Card('bastos', 6)
        ];
        game.players.rival2.hand = [
            new Card('oros', 7), new Card('copas', 4),
            new Card('espadas', 5), new Card('bastos', 6)
        ];

        expect(game.hayPares()).toBe(true);
    });

    it('should return false when nobody has pares', () => {
        game.players.player.hand = [
            new Card('oros', 12), new Card('copas', 7),
            new Card('espadas', 5), new Card('bastos', 1)
        ];
        game.players.partner.hand = [
            new Card('oros', 11), new Card('copas', 6),
            new Card('espadas', 4), new Card('bastos', 1)
        ];
        game.players.rival1.hand = [
            new Card('oros', 10), new Card('copas', 7),
            new Card('espadas', 4), new Card('bastos', 1)
        ];
        game.players.rival2.hand = [
            new Card('oros', 12), new Card('copas', 6),
            new Card('espadas', 5), new Card('bastos', 1)
        ];

        // Note: some of these may accidentally form pairs across players
        // but hayPares checks per-player only
        expect(game.hayPares()).toBe(false);
    });
});

describe('Game - hayJuego', () => {
    let game;

    beforeEach(() => {
        game = new Game();
    });

    it('should detect when at least one player has juego (>=31)', () => {
        game.players.player.hand = [
            new Card('oros', 12), new Card('copas', 12),
            new Card('espadas', 12), new Card('bastos', 1)
        ]; // 10+10+10+1 = 31
        game.players.partner.hand = [
            new Card('oros', 1), new Card('copas', 1),
            new Card('espadas', 1), new Card('bastos', 1)
        ];
        game.players.rival1.hand = [
            new Card('oros', 1), new Card('copas', 1),
            new Card('espadas', 1), new Card('bastos', 1)
        ];
        game.players.rival2.hand = [
            new Card('oros', 1), new Card('copas', 1),
            new Card('espadas', 1), new Card('bastos', 1)
        ];

        expect(game.hayJuego()).toBe(true);
    });
});

describe('Game - Official Scoring Rules', () => {
    let game;

    beforeEach(() => {
        game = new Game();
        game.manoIndex = 0;
    });

    it('deje (no quiero) should always give exactly 1 piedra', () => {
        game.faseActual = FASES.ENVITE;
        game.lanceActual = LANCES.GRANDE;
        game.enviteActual = {
            lance: LANCES.GRANDE,
            apuesta: 10, // Even with big bet, deje = 1
            equipoApostador: 'equipo1',
            ultimaAccion: 'envido',
            respuestas: {},
            pasaron: [],
            turnoIndex: 0,
            esperandoRespuesta: true,
            equipoDebeResponder: 'equipo2'
        };

        // Give players hands for resolution
        game.players.player.hand = [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 12)];
        game.players.partner.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)];
        game.players.rival1.hand = [new Card('oros', 7), new Card('copas', 7), new Card('espadas', 7), new Card('bastos', 7)];
        game.players.rival2.hand = [new Card('oros', 5), new Card('copas', 5), new Card('espadas', 5), new Card('bastos', 5)];

        game.handleEnvite('rival1', ACCIONES_ENVITE.NO_QUIERO);

        // Deje = exactly 1 piedra, not Math.max(1, 10-2) = 8
        expect(game.puntosPendientes.equipo1).toBe(1);
    });

    it('Juego de 31 should score 3 piedras base (not 2)', () => {
        // Setup: equipo1 has juego de 31
        game.players.player.hand = [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 1)]; // 31
        game.players.partner.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)]; // 4
        game.players.rival1.hand = [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 5), new Card('bastos', 7)]; // 32
        game.players.rival2.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)]; // 4

        game.faseActual = FASES.ENVITE;
        game.lanceActual = LANCES.JUEGO;
        game.enviteActual = {
            lance: LANCES.JUEGO,
            apuesta: 0,
            equipoApostador: null,
            ultimaAccion: null,
            respuestas: {},
            pasaron: ['player', 'rival2', 'partner', 'rival1'],
            turnoIndex: 0,
            esperandoRespuesta: false,
            equipoDebeResponder: null
        };
        game.ordagoActivo = false;

        game.resolveLance(LANCES.JUEGO);

        // 31 is best juego, equipo1 wins. Juego de 31 = 3 piedras
        expect(game.puntosPendientes.equipo1).toBe(3);
    });

    it('Juego de 32 should score 2 piedras base (not 3)', () => {
        game.players.player.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)]; // 4
        game.players.partner.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)]; // 4
        game.players.rival1.hand = [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 5), new Card('bastos', 7)]; // 32
        game.players.rival2.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)]; // 4

        game.faseActual = FASES.ENVITE;
        game.lanceActual = LANCES.JUEGO;
        game.enviteActual = {
            lance: LANCES.JUEGO, apuesta: 0, equipoApostador: null,
            ultimaAccion: null, respuestas: {}, pasaron: ['player', 'rival2', 'partner', 'rival1'],
            turnoIndex: 0, esperandoRespuesta: false, equipoDebeResponder: null
        };
        game.ordagoActivo = false;

        game.resolveLance(LANCES.JUEGO);

        // 32 is not 31, so 2 piedras base
        expect(game.puntosPendientes.equipo2).toBe(2);
    });

    it('Pares scoring should include both team members pares', () => {
        // equipo1: player has duples (3 pts), partner has par (1 pt) = 4 total
        game.players.player.hand = [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 7), new Card('bastos', 7)]; // duples
        game.players.partner.hand = [new Card('oros', 11), new Card('copas', 11), new Card('espadas', 5), new Card('bastos', 1)]; // par
        game.players.rival1.hand = [new Card('oros', 10), new Card('copas', 10), new Card('espadas', 4), new Card('bastos', 1)]; // par
        game.players.rival2.hand = [new Card('oros', 6), new Card('copas', 5), new Card('espadas', 4), new Card('bastos', 1)]; // no pares

        game.faseActual = FASES.ENVITE;
        game.lanceActual = LANCES.PARES;
        game.enviteActual = {
            lance: LANCES.PARES, apuesta: 0, equipoApostador: null,
            ultimaAccion: null, respuestas: {}, pasaron: ['player', 'rival2', 'partner', 'rival1'],
            turnoIndex: 0, esperandoRespuesta: false, equipoDebeResponder: null
        };
        game.ordagoActivo = false;

        game.resolveLance(LANCES.PARES);

        // equipo1 wins: player duples(3) + partner par(1) = 4 piedras
        expect(game.puntosPendientes.equipo1).toBe(4);
    });

    it('Juego hierarchy: 31 > 32 > 40 > 37 > 36 > 35 > 34 > 33', () => {
        // Test 31 beats everything
        game.players.player.hand = [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 1)]; // 31
        game.players.partner.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)]; // 4
        game.players.rival1.hand = [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 12)]; // 40 (la Real)
        game.players.rival2.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)]; // 4

        expect(game.resolverJuego()).toBe('equipo1'); // 31 beats 40
    });

    it('Grande and Chica in paso should score 1 piedra each', () => {
        game.players.player.hand = [new Card('oros', 12), new Card('copas', 12), new Card('espadas', 12), new Card('bastos', 12)]; // Best grande
        game.players.partner.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)]; // Best chica
        game.players.rival1.hand = [new Card('oros', 7), new Card('copas', 7), new Card('espadas', 7), new Card('bastos', 7)];
        game.players.rival2.hand = [new Card('oros', 5), new Card('copas', 5), new Card('espadas', 5), new Card('bastos', 5)];

        game.faseActual = FASES.ENVITE;
        game.lanceActual = LANCES.GRANDE;
        game.enviteActual = {
            lance: LANCES.GRANDE, apuesta: 0, equipoApostador: null,
            ultimaAccion: null, respuestas: {}, pasaron: ['player', 'rival2', 'partner', 'rival1'],
            turnoIndex: 0, esperandoRespuesta: false, equipoDebeResponder: null
        };
        game.ordagoActivo = false;

        game.resolveLance(LANCES.GRANDE);
        expect(game.puntosPendientes.equipo1).toBe(1); // Grande paso = 1 piedra

        // Now chica
        game.lanceActual = LANCES.CHICA;
        game.faseActual = FASES.ENVITE;
        game.enviteActual = {
            lance: LANCES.CHICA, apuesta: 0, equipoApostador: null,
            ultimaAccion: null, respuestas: {}, pasaron: ['player', 'rival2', 'partner', 'rival1'],
            turnoIndex: 0, esperandoRespuesta: false, equipoDebeResponder: null
        };
        game.ordagoActivo = false;

        game.resolveLance(LANCES.CHICA);
        expect(game.puntosPendientes.equipo1).toBe(2); // +1 for chica
    });

    it('Punto in paso should score 1 piedra', () => {
        game.players.player.hand = [new Card('oros', 7), new Card('copas', 7), new Card('espadas', 7), new Card('bastos', 7)]; // 28 best punto
        game.players.partner.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)]; // 4
        game.players.rival1.hand = [new Card('oros', 5), new Card('copas', 5), new Card('espadas', 5), new Card('bastos', 5)]; // 20
        game.players.rival2.hand = [new Card('oros', 1), new Card('copas', 1), new Card('espadas', 1), new Card('bastos', 1)]; // 4

        game.faseActual = FASES.ENVITE;
        game.lanceActual = LANCES.PUNTO;
        game.enviteActual = {
            lance: LANCES.PUNTO, apuesta: 0, equipoApostador: null,
            ultimaAccion: null, respuestas: {}, pasaron: ['player', 'rival2', 'partner', 'rival1'],
            turnoIndex: 0, esperandoRespuesta: false, equipoDebeResponder: null
        };
        game.ordagoActivo = false;

        game.resolveLance(LANCES.PUNTO);
        expect(game.puntosPendientes.equipo1).toBe(1); // Punto paso = 1 piedra
    });
});
