import { describe, it, expect, beforeEach } from 'vitest';
import { AIPlayer, LANCE, ACCION, DIFICULTAD } from '../js/ai.js';

// ==========================================
// CONSTRUCTOR
// ==========================================

describe('AIPlayer - Constructor', () => {
    it('should create without arguments', () => {
        const ai = new AIPlayer();
        expect(ai).toBeInstanceOf(AIPlayer);
    });

    it('should accept difficulty parameter for compatibility (ignored)', () => {
        const ai = new AIPlayer(DIFICULTAD.DIFICIL);
        expect(ai).toBeInstanceOf(AIPlayer);
    });

    it('should export DIFICULTAD for compatibility', () => {
        expect(DIFICULTAD.FACIL).toBe('facil');
        expect(DIFICULTAD.MEDIO).toBe('medio');
        expect(DIFICULTAD.DIFICIL).toBe('dificil');
    });

    it('setDificultad should be a no-op', () => {
        const ai = new AIPlayer();
        expect(() => ai.setDificultad(DIFICULTAD.FACIL)).not.toThrow();
    });
});

// ==========================================
// CARD VALUES (bug fixes: Q=10, J=10, 2=As)
// ==========================================

describe('AIPlayer - Card Values', () => {
    let ai;
    beforeEach(() => { ai = new AIPlayer(); });

    it('should value Q (Caballo) as 10 points for juego', () => {
        expect(ai._getCardValue({ rank: 'Q', suit: 'oros' })).toBe(10);
    });

    it('should value J (Sota) as 10 points for juego', () => {
        expect(ai._getCardValue({ rank: 'J', suit: 'oros' })).toBe(10);
    });

    it('should value K (Rey) as 10 points', () => {
        expect(ai._getCardValue({ rank: 'K', suit: 'oros' })).toBe(10);
    });

    it('should value 3 as 10 points (3=Rey in mus)', () => {
        expect(ai._getCardValue({ rank: '3', suit: 'oros' })).toBe(10);
    });

    it('should value 2 as 1 point (2=As in mus)', () => {
        expect(ai._getCardValue({ rank: '2', suit: 'oros' })).toBe(1);
    });

    it('should value A as 1 point', () => {
        expect(ai._getCardValue({ rank: 'A', suit: 'oros' })).toBe(1);
    });

    it('should value numbered cards at face value', () => {
        expect(ai._getCardValue({ rank: '7', suit: 'oros' })).toBe(7);
        expect(ai._getCardValue({ rank: '6', suit: 'oros' })).toBe(6);
        expect(ai._getCardValue({ rank: '5', suit: 'oros' })).toBe(5);
        expect(ai._getCardValue({ rank: '4', suit: 'oros' })).toBe(4);
    });
});

describe('AIPlayer - _getMusRank', () => {
    let ai;
    beforeEach(() => { ai = new AIPlayer(); });

    it('should map 3 to K (3=Rey)', () => {
        expect(ai._getMusRank({ rank: '3', suit: 'oros' })).toBe('K');
    });

    it('should map 2 to A (2=As)', () => {
        expect(ai._getMusRank({ rank: '2', suit: 'oros' })).toBe('A');
    });

    it('should map 1 to A', () => {
        expect(ai._getMusRank({ rank: '1', suit: 'oros' })).toBe('A');
    });

    it('should leave other ranks unchanged', () => {
        expect(ai._getMusRank({ rank: 'K', suit: 'oros' })).toBe('K');
        expect(ai._getMusRank({ rank: 'Q', suit: 'oros' })).toBe('Q');
        expect(ai._getMusRank({ rank: 'J', suit: 'oros' })).toBe('J');
        expect(ai._getMusRank({ rank: '7', suit: 'oros' })).toBe('7');
    });
});

describe('AIPlayer - Grande Order', () => {
    let ai;
    beforeEach(() => { ai = new AIPlayer(); });

    it('should treat 2 as ace (lowest) for grande', () => {
        expect(ai._getGrandeOrder({ rank: '2', suit: 'oros' })).toBe(1);
        expect(ai._getGrandeOrder({ rank: 'A', suit: 'oros' })).toBe(1);
    });

    it('should treat 3 as K (highest) for grande', () => {
        expect(ai._getGrandeOrder({ rank: '3', suit: 'oros' })).toBe(10);
        expect(ai._getGrandeOrder({ rank: 'K', suit: 'oros' })).toBe(10);
    });
});

// ==========================================
// HAND EVALUATION
// ==========================================

describe('AIPlayer - Hand Evaluation', () => {
    let ai;
    beforeEach(() => { ai = new AIPlayer(); });

    it('should evaluate Grande - 4 Kings is max', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'K', suit: 'bastos' }
        ];
        expect(ai._evaluarGrande(hand)).toBe(100);
    });

    it('should evaluate Grande - 4 Aces is min', () => {
        const hand = [
            { rank: 'A', suit: 'oros' },
            { rank: 'A', suit: 'copas' },
            { rank: 'A', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        expect(ai._evaluarGrande(hand)).toBe(0);
    });

    it('should evaluate Grande - 4 twos is also min (2=As)', () => {
        const hand = [
            { rank: '2', suit: 'oros' },
            { rank: '2', suit: 'copas' },
            { rank: '2', suit: 'espadas' },
            { rank: '2', suit: 'bastos' }
        ];
        expect(ai._evaluarGrande(hand)).toBe(0);
    });

    it('should evaluate Chica - 4 Aces is max', () => {
        const hand = [
            { rank: 'A', suit: 'oros' },
            { rank: 'A', suit: 'copas' },
            { rank: 'A', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        expect(ai._evaluarChica(hand)).toBe(100);
    });

    it('should evaluate Chica - 4 Kings is min', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'K', suit: 'bastos' }
        ];
        expect(ai._evaluarChica(hand)).toBe(0);
    });

    it('should detect pairs', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: '7', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        const pares = ai._detectarPares(hand);
        expect(pares.tipo).toBe('pareja');
    });

    it('should detect no pairs', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'Q', suit: 'copas' },
            { rank: '7', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        const pares = ai._detectarPares(hand);
        expect(pares.tipo).toBeNull();
    });

    it('should detect pair of 2+A (2=As in mus)', () => {
        const hand = [
            { rank: '2', suit: 'oros' },
            { rank: 'A', suit: 'copas' },
            { rank: '7', suit: 'espadas' },
            { rank: '6', suit: 'bastos' }
        ];
        const pares = ai._detectarPares(hand);
        expect(pares.tipo).toBe('pareja');
        expect(pares.rank).toBe('A');
    });

    it('should detect pair of 3+K (3=Rey in mus)', () => {
        const hand = [
            { rank: '3', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: '7', suit: 'espadas' },
            { rank: '6', suit: 'bastos' }
        ];
        const pares = ai._detectarPares(hand);
        expect(pares.tipo).toBe('pareja');
        expect(pares.rank).toBe('K');
    });

    it('should detect duples (4 of same mus rank)', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: '3', suit: 'espadas' },
            { rank: '3', suit: 'bastos' }
        ];
        const pares = ai._detectarPares(hand);
        expect(pares.tipo).toBe('duples');
    });

    it('should detect medias (two different pairs)', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: '7', suit: 'espadas' },
            { rank: '7', suit: 'bastos' }
        ];
        const pares = ai._detectarPares(hand);
        expect(pares.tipo).toBe('medias');
    });

    it('should calculate Q,Q,J,A as 31 points (juego!)', () => {
        // This was the critical bug: Q was 9, J was 8 → 28, not juego
        // Now: Q=10, J=10 → 10+10+10+1 = 31 = best juego
        const hand = [
            { rank: 'Q', suit: 'oros' },
            { rank: 'Q', suit: 'copas' },
            { rank: 'J', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        expect(ai._calcularPuntos(hand)).toBe(31);
        expect(ai._tieneJuego(hand)).toBe(true);
    });

    it('should calculate K,K,K,A as 31 points', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        expect(ai._calcularPuntos(hand)).toBe(31);
    });

    it('should detect no juego when < 31', () => {
        const hand = [
            { rank: 'A', suit: 'oros' },
            { rank: '4', suit: 'copas' },
            { rank: '5', suit: 'espadas' },
            { rank: '6', suit: 'bastos' }
        ];
        expect(ai._tieneJuego(hand)).toBe(false);
    });

    it('should evaluate juego 31 as fuerza 100', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        expect(ai._evaluarJuego(hand)).toBe(100);
    });

    it('should evaluate punto correctly (max is 30)', () => {
        // 7+7+7+7 = 28 (no juego, good punto)
        const hand = [
            { rank: '7', suit: 'oros' },
            { rank: '7', suit: 'copas' },
            { rank: '7', suit: 'espadas' },
            { rank: '7', suit: 'bastos' }
        ];
        const fuerza = ai._evaluarPunto(hand);
        expect(fuerza).toBeGreaterThan(80);
    });
});

// ==========================================
// MUS DECISION
// ==========================================

describe('AIPlayer - Mus Decision', () => {
    let ai;
    beforeEach(() => { ai = new AIPlayer(); });

    it('should usually cut with duples', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'K', suit: 'bastos' }
        ];
        let cuts = 0;
        for (let i = 0; i < 50; i++) {
            if (!ai.decideMus(hand)) cuts++;
        }
        expect(cuts).toBeGreaterThan(40);
    });

    it('should sometimes want mus with weak hand', () => {
        const hand = [
            { rank: 'A', suit: 'oros' },
            { rank: '4', suit: 'copas' },
            { rank: '5', suit: 'espadas' },
            { rank: '6', suit: 'bastos' }
        ];
        let wantsMus = 0;
        for (let i = 0; i < 100; i++) {
            if (ai.decideMus(hand)) wantsMus++;
        }
        expect(wantsMus).toBeGreaterThan(5);
    });

    it('should usually cut with 31 (best juego)', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        let cuts = 0;
        for (let i = 0; i < 50; i++) {
            if (!ai.decideMus(hand)) cuts++;
        }
        expect(cuts).toBeGreaterThan(35);
    });
});

// ==========================================
// ENVITE DECISION
// ==========================================

describe('AIPlayer - Envite Decision', () => {
    let ai;
    beforeEach(() => { ai = new AIPlayer(); });

    it('should return valid action for Grande', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: '7', suit: 'espadas' },
            { rank: '5', suit: 'bastos' }
        ];
        const decision = ai.decideEnvite(hand, LANCE.GRANDE, 0);
        expect([ACCION.PASO, ACCION.ENVIDO, ACCION.ORDAGO]).toContain(decision.action);
    });

    it('should return valid response to existing bet', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'K', suit: 'bastos' }
        ];
        const decision = ai.decideEnvite(hand, LANCE.GRANDE, 4);
        expect([ACCION.QUIERO, ACCION.NO_QUIERO, ACCION.ENVIDO, ACCION.ORDAGO]).toContain(decision.action);
    });

    it('should usually paso with weak hand in Pares (no pairs)', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'Q', suit: 'copas' },
            { rank: '7', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        let pasos = 0;
        for (let i = 0; i < 30; i++) {
            const decision = ai.decideEnvite(hand, LANCE.PARES, 0);
            if (decision.action === ACCION.PASO) pasos++;
        }
        expect(pasos).toBeGreaterThan(15);
    });

    it('should be more aggressive with strong juego hand (31)', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        let envites = 0;
        for (let i = 0; i < 30; i++) {
            const decision = ai.decideEnvite(hand, LANCE.JUEGO, 0);
            if (decision.action !== ACCION.PASO) envites++;
        }
        expect(envites).toBeGreaterThan(15);
    });
});

// ==========================================
// ORDAGO PREVENTION
// ==========================================

describe('AIPlayer - Ordago Prevention', () => {
    it('AI with fuerza < 30 should NEVER return ordago (100 iterations)', () => {
        const ai = new AIPlayer();
        // Weak hand for Grande: all aces = fuerza 0
        const weakHand = [
            { rank: 'A', suit: 'oros' },
            { rank: 'A', suit: 'copas' },
            { rank: 'A', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];

        for (let i = 0; i < 100; i++) {
            const decision = ai.decideEnvite(weakHand, LANCE.GRANDE, 0);
            expect(decision.action).not.toBe(ACCION.ORDAGO);
        }
    });

    it('AI with fuerza < 30 should NEVER ordago as response', () => {
        const ai = new AIPlayer();
        const weakHand = [
            { rank: 'A', suit: 'oros' },
            { rank: 'A', suit: 'copas' },
            { rank: 'A', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];

        for (let i = 0; i < 100; i++) {
            const decision = ai.decideEnvite(weakHand, LANCE.GRANDE, 4);
            expect(decision.action).not.toBe(ACCION.ORDAGO);
        }
    });

    it('should NEVER ordago with medium hand on Grande (fuerza ~65)', () => {
        const ai = new AIPlayer();
        // K, Q, 7, 5 → grande order: 10, 9, 7, 5 → roughly medium
        const mediumHand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'Q', suit: 'copas' },
            { rank: '7', suit: 'espadas' },
            { rank: '5', suit: 'bastos' }
        ];

        for (let i = 0; i < 200; i++) {
            const decision = ai.decideEnvite(mediumHand, LANCE.GRANDE, 0);
            expect(decision.action).not.toBe(ACCION.ORDAGO);
        }
    });

    it('should only ordago on grande with truly elite hands (fuerza >= 97)', () => {
        const ai = new AIPlayer();
        // 4 Kings = fuerza 100
        const eliteHand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'K', suit: 'bastos' }
        ];

        let ordagos = 0;
        for (let i = 0; i < 200; i++) {
            const decision = ai.decideEnvite(eliteHand, LANCE.GRANDE, 0);
            if (decision.action === ACCION.ORDAGO) ordagos++;
        }
        // Should ordago sometimes with fuerza 100 (prob 0.25)
        expect(ordagos).toBeGreaterThan(10);
        expect(ordagos).toBeLessThan(120);
    });
});

// ==========================================
// INFORMATION BONUS
// ==========================================

describe('AIPlayer - Information Bonus', () => {
    let ai;
    beforeEach(() => { ai = new AIPlayer(); });

    it('should return +15 when all rivals have no pares in pares lance', () => {
        const bonus = ai._getInfoBonus(LANCE.PARES, { rival1: 'no', rival2: 'no' }, {}, ['rival1', 'rival2']);
        expect(bonus).toBe(15);
    });

    it('should return -5 when a rival has pares in pares lance', () => {
        const bonus = ai._getInfoBonus(LANCE.PARES, { rival1: 'si', rival2: 'no' }, {}, ['rival1', 'rival2']);
        expect(bonus).toBe(-5);
    });

    it('should return +15 when all rivals have no juego in juego lance', () => {
        const bonus = ai._getInfoBonus(LANCE.JUEGO, {}, { rival1: 'no', rival2: 'no' }, ['rival1', 'rival2']);
        expect(bonus).toBe(15);
    });

    it('should return -5 when a rival has juego in juego lance', () => {
        const bonus = ai._getInfoBonus(LANCE.JUEGO, {}, { rival1: 'si', rival2: 'no' }, ['rival1', 'rival2']);
        expect(bonus).toBe(-5);
    });

    it('should return small bonus for grande when rivals have no pares', () => {
        const bonus = ai._getInfoBonus(LANCE.GRANDE, { rival1: 'no', rival2: 'no' }, {}, ['rival1', 'rival2']);
        expect(bonus).toBe(3);
    });

    it('should return 0 when no rival info available', () => {
        const bonus = ai._getInfoBonus(LANCE.GRANDE, {}, {}, []);
        expect(bonus).toBe(0);
    });

    it('should bet more aggressively on pares when rivals declared no pares', () => {
        const ai = new AIPlayer();
        // Hand with pares (pair of kings)
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: '7', suit: 'espadas' },
            { rank: '5', suit: 'bastos' }
        ];

        const gameStateNoRivalPares = {
            marcadorPropio: 10,
            marcadorRival: 10,
            ordagoActivo: false,
            posicion: 'mano',
            declaracionesPares: { rival1: 'no', rival2: 'no' },
            declaracionesJuego: {},
            equipoRival: ['rival1', 'rival2'],
            piedrasRestantes: 20
        };

        const gameStateRivalHasPares = {
            marcadorPropio: 10,
            marcadorRival: 10,
            ordagoActivo: false,
            posicion: 'mano',
            declaracionesPares: { rival1: 'si', rival2: 'no' },
            declaracionesJuego: {},
            equipoRival: ['rival1', 'rival2'],
            piedrasRestantes: 20
        };

        let envitesNoRival = 0;
        let envitesWithRival = 0;
        const iterations = 100;

        for (let i = 0; i < iterations; i++) {
            const decNoRival = ai.decideEnvite(hand, LANCE.PARES, 0, gameStateNoRivalPares);
            if (decNoRival.action !== ACCION.PASO) envitesNoRival++;

            const decWithRival = ai.decideEnvite(hand, LANCE.PARES, 0, gameStateRivalHasPares);
            if (decWithRival.action !== ACCION.PASO) envitesWithRival++;
        }

        // Should bet more when rivals have no pares
        expect(envitesNoRival).toBeGreaterThan(envitesWithRival);
    });
});

// ==========================================
// SCORE-AWARE BEHAVIOR
// ==========================================

describe('AIPlayer - Score-Aware Behavior', () => {
    it('should never ordago when close to winning (adentro zone)', () => {
        const ai = new AIPlayer();
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'K', suit: 'bastos' }
        ];

        const gameState = {
            marcadorPropio: 37, // Only 3 piedras from winning
            marcadorRival: 10,
            ordagoActivo: false,
            piedrasRestantes: 30
        };

        for (let i = 0; i < 100; i++) {
            const decision = ai.decideEnvite(hand, LANCE.GRANDE, 0, gameState);
            expect(decision.action).not.toBe(ACCION.ORDAGO);
        }
    });

    it('should never ordago in response when in adentro zone', () => {
        const ai = new AIPlayer();
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'K', suit: 'bastos' }
        ];

        const gameState = {
            marcadorPropio: 36, // 4 piedras from winning
            marcadorRival: 10,
            ordagoActivo: false,
            piedrasRestantes: 30
        };

        for (let i = 0; i < 100; i++) {
            const decision = ai.decideEnvite(hand, LANCE.GRANDE, 4, gameState);
            expect(decision.action).not.toBe(ACCION.ORDAGO);
        }
    });

    it('should be more willing to ordago when far behind (desperate zone)', () => {
        const ai = new AIPlayer();
        // Strong hand for grande
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'Q', suit: 'bastos' }
        ];

        const gameStateNormal = {
            marcadorPropio: 15,
            marcadorRival: 15,
            ordagoActivo: false,
            posicion: 'postre',
            piedrasRestantes: 10
        };

        const gameStateDesperate = {
            marcadorPropio: 5,
            marcadorRival: 30, // 25 points behind
            ordagoActivo: false,
            posicion: 'postre',
            piedrasRestantes: 5
        };

        let ordagosNormal = 0;
        let ordagosDesperate = 0;
        const iterations = 500;

        for (let i = 0; i < iterations; i++) {
            const decNormal = ai.decideEnvite(hand, LANCE.GRANDE, 0, gameStateNormal);
            if (decNormal.action === ACCION.ORDAGO) ordagosNormal++;

            const decDesp = ai.decideEnvite(hand, LANCE.GRANDE, 0, gameStateDesperate);
            if (decDesp.action === ACCION.ORDAGO) ordagosDesperate++;
        }

        // Should ordago more when desperate (lower threshold)
        expect(ordagosDesperate).toBeGreaterThan(ordagosNormal);
    });

    it('should reject ordago with weak hand even in normal play', () => {
        const ai = new AIPlayer();
        const weakHand = [
            { rank: 'A', suit: 'oros' },
            { rank: '4', suit: 'copas' },
            { rank: '5', suit: 'espadas' },
            { rank: '6', suit: 'bastos' }
        ];

        const gameState = {
            marcadorPropio: 10,
            marcadorRival: 10,
            ordagoActivo: true,
            piedrasRestantes: 20
        };

        for (let i = 0; i < 50; i++) {
            const decision = ai.decideEnvite(weakHand, LANCE.GRANDE, 0, gameState);
            expect(decision.action).toBe(ACCION.NO_QUIERO);
        }
    });

    it('should accept ordago with elite hand', () => {
        const ai = new AIPlayer();
        const eliteHand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'K', suit: 'bastos' }
        ];

        const gameState = {
            marcadorPropio: 10,
            marcadorRival: 10,
            ordagoActivo: true,
            piedrasRestantes: 20
        };

        const decision = ai.decideEnvite(eliteHand, LANCE.GRANDE, 0, gameState);
        expect(decision.action).toBe(ACCION.QUIERO);
    });
});

// ==========================================
// DISCARD LOGIC
// ==========================================

describe('AIPlayer - Discard', () => {
    let ai;
    beforeEach(() => { ai = new AIPlayer(); });

    it('should not discard with duples', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'K', suit: 'bastos' }
        ];
        expect(ai.selectDiscard(hand)).toHaveLength(0);
    });

    it('should not discard with 31 juego', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        expect(ai.selectDiscard(hand)).toHaveLength(0);
    });

    it('should not discard with 3+ aces (chica hand)', () => {
        const hand = [
            { rank: 'A', suit: 'oros' },
            { rank: 'A', suit: 'copas' },
            { rank: 'A', suit: 'espadas' },
            { rank: '7', suit: 'bastos' }
        ];
        expect(ai.selectDiscard(hand)).toHaveLength(0);
    });

    it('should never discard cards that are part of a pair', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: '5', suit: 'espadas' },
            { rank: '4', suit: 'bastos' }
        ];
        const discards = ai.selectDiscard(hand);
        const discardRanks = discards.map(c => ai._getMusRank(c));
        expect(discardRanks).not.toContain('K');
    });
});

// ==========================================
// PUBLIC METHODS
// ==========================================

describe('AIPlayer - Public Methods', () => {
    let ai;
    beforeEach(() => { ai = new AIPlayer(); });

    it('tienePares should return true when hand has pairs', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: '7', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        expect(ai.tienePares(hand)).toBe(true);
    });

    it('tienePares should return false when hand has no pairs', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'Q', suit: 'copas' },
            { rank: '7', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        expect(ai.tienePares(hand)).toBe(false);
    });

    it('tieneJuego should work correctly', () => {
        const juegoHand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        const noJuegoHand = [
            { rank: 'A', suit: 'oros' },
            { rank: '4', suit: 'copas' },
            { rank: '5', suit: 'espadas' },
            { rank: '6', suit: 'bastos' }
        ];
        expect(ai.tieneJuego(juegoHand)).toBe(true);
        expect(ai.tieneJuego(noJuegoHand)).toBe(false);
    });

    it('getPuntos should calculate correctly', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'Q', suit: 'copas' },
            { rank: 'J', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        expect(ai.getPuntos(hand)).toBe(31);
    });

    it('evaluarLance should dispatch to correct evaluator', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'K', suit: 'bastos' }
        ];
        expect(ai.evaluarLance(hand, LANCE.GRANDE)).toBe(100);
        expect(ai.evaluarLance(hand, LANCE.CHICA)).toBe(0);
    });
});
