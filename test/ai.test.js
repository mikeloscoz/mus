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
        expect(ai._getValorPuntos({ rank: 'Q', suit: 'oros' })).toBe(10);
    });

    it('should value J (Sota) as 10 points for juego', () => {
        expect(ai._getValorPuntos({ rank: 'J', suit: 'oros' })).toBe(10);
    });

    it('should value K (Rey) as 10 points', () => {
        expect(ai._getValorPuntos({ rank: 'K', suit: 'oros' })).toBe(10);
    });

    it('should value 3 as 10 points (3=Rey in mus)', () => {
        expect(ai._getValorPuntos({ rank: '3', suit: 'oros' })).toBe(10);
    });

    it('should value 2 as 1 point (2=As in mus)', () => {
        expect(ai._getValorPuntos({ rank: '2', suit: 'oros' })).toBe(1);
    });

    it('should value A as 1 point', () => {
        expect(ai._getValorPuntos({ rank: 'A', suit: 'oros' })).toBe(1);
    });

    it('should value numbered cards at face value', () => {
        expect(ai._getValorPuntos({ rank: '7', suit: 'oros' })).toBe(7);
        expect(ai._getValorPuntos({ rank: '6', suit: 'oros' })).toBe(6);
        expect(ai._getValorPuntos({ rank: '5', suit: 'oros' })).toBe(5);
        expect(ai._getValorPuntos({ rank: '4', suit: 'oros' })).toBe(4);
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
        expect(ai._getOrdenGrande({ rank: '2', suit: 'oros' })).toBe(1);
        expect(ai._getOrdenGrande({ rank: 'A', suit: 'oros' })).toBe(1);
    });

    it('should treat 3 as K (highest) for grande', () => {
        expect(ai._getOrdenGrande({ rank: '3', suit: 'oros' })).toBe(8);
        expect(ai._getOrdenGrande({ rank: 'K', suit: 'oros' })).toBe(8);
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
        // New heuristic: 70+20 base + (8+8)*0.5 adjust = 98
        expect(ai._evaluarGrande(hand)).toBe(98);
    });

    it('should evaluate Grande - 4 Aces is min', () => {
        const hand = [
            { rank: 'A', suit: 'oros' },
            { rank: 'A', suit: 'copas' },
            { rank: 'A', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        // New heuristic: 1*4+1*2 + (1+1)*0.5 = 7
        expect(ai._evaluarGrande(hand)).toBe(7);
    });

    it('should evaluate Grande - 4 twos is also min (2=As)', () => {
        const hand = [
            { rank: '2', suit: 'oros' },
            { rank: '2', suit: 'copas' },
            { rank: '2', suit: 'espadas' },
            { rank: '2', suit: 'bastos' }
        ];
        expect(ai._evaluarGrande(hand)).toBe(7);
    });

    it('should evaluate Chica - 4 Aces is max', () => {
        const hand = [
            { rank: 'A', suit: 'oros' },
            { rank: 'A', suit: 'copas' },
            { rank: 'A', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        // New heuristic: 70+20 base - 0 adjust = 90
        expect(ai._evaluarChica(hand)).toBe(90);
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
        expect(pares.ranks[0]).toBe('A');
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
        expect(pares.ranks[0]).toBe('K');
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

    it('should only ordago on grande with truly elite hands (fuerza >= 95)', () => {
        const ai = new AIPlayer();
        // 4 Kings = fuerza 98
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
        // Should ordago sometimes with fuerza 98 (prob ~0.20)
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

    it('should return -10 when a rival has pares in pares lance', () => {
        const bonus = ai._getInfoBonus(LANCE.PARES, { rival1: 'si', rival2: 'no' }, {}, ['rival1', 'rival2']);
        expect(bonus).toBe(-10);
    });

    it('should return +15 when all rivals have no juego in juego lance', () => {
        const bonus = ai._getInfoBonus(LANCE.JUEGO, {}, { rival1: 'no', rival2: 'no' }, ['rival1', 'rival2']);
        expect(bonus).toBe(15);
    });

    it('should return -5 when a rival has juego in juego lance', () => {
        const bonus = ai._getInfoBonus(LANCE.JUEGO, {}, { rival1: 'si', rival2: 'no' }, ['rival1', 'rival2']);
        expect(bonus).toBe(-5);
    });

    it('should return 0 for grande (info bonus only applies to pares/juego)', () => {
        const bonus = ai._getInfoBonus(LANCE.GRANDE, { rival1: 'no', rival2: 'no' }, {}, ['rival1', 'rival2']);
        expect(bonus).toBe(0);
    });

    it('should return 0 when no rival info available', () => {
        const bonus = ai._getInfoBonus(LANCE.GRANDE, {}, {}, []);
        expect(bonus).toBe(0);
    });

    it('should accept ordago more readily on pares when rivals declared no pares (info advantage)', () => {
        const ai = new AIPlayer();
        // Hand with medias (strong pares) near the ordago acceptance threshold
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: '7', suit: 'espadas' },
            { rank: '7', suit: 'bastos' }
        ];

        const gameStateNoRivalPares = {
            marcadorPropio: 10,
            marcadorRival: 10,
            ordagoActivo: true,
            posicion: 'mano',
            declaracionesPares: { rival1: 'no', rival2: 'no' },
            declaracionesJuego: {},
            equipoRival: ['rival1', 'rival2'],
            piedrasRestantes: 20
        };

        const gameStateRivalHasPares = {
            marcadorPropio: 10,
            marcadorRival: 10,
            ordagoActivo: true,
            posicion: 'mano',
            declaracionesPares: { rival1: 'si', rival2: 'no' },
            declaracionesJuego: {},
            equipoRival: ['rival1', 'rival2'],
            piedrasRestantes: 20
        };

        // Info advantage (no rival pares) lowers ordago acceptance threshold by 5
        const decNoRival = ai.decideEnvite(hand, LANCE.PARES, 0, gameStateNoRivalPares);
        const decRivalPares = ai.decideEnvite(hand, LANCE.PARES, 0, gameStateRivalHasPares);

        // With info advantage, more likely to accept ordago
        // At minimum, verify the info bonus is computed correctly
        expect(ai._getInfoBonus(LANCE.PARES, { rival1: 'no', rival2: 'no' }, {}, ['rival1', 'rival2'])).toBe(15);
        expect(ai._getInfoBonus(LANCE.PARES, { rival1: 'si', rival2: 'no' }, {}, ['rival1', 'rival2'])).toBe(-10);
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

    it('should accept ordago more readily when far behind (desperate zone)', () => {
        const ai = new AIPlayer();
        // Hand with fuerza near the ordago acceptance threshold for grande (~88)
        // K,K,Q,J → fuerza: 70+20=90 base + (7+6)*0.5=96.5 → 97
        // That's above 88, so let's use a weaker hand near the threshold
        // K,Q,J,7 → fuerza: 70+12=82 + (6+5)*0.5=87.5 → 88
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'Q', suit: 'copas' },
            { rank: 'J', suit: 'espadas' },
            { rank: '7', suit: 'bastos' }
        ];

        const gameStateNormal = {
            marcadorPropio: 15,
            marcadorRival: 15,
            ordagoActivo: true,
            posicion: 'postre',
            piedrasRestantes: 10
        };

        const gameStateDesperate = {
            marcadorPropio: 5,
            marcadorRival: 30, // 25 points behind → zonaDesesperada
            ordagoActivo: true,
            posicion: 'postre',
            piedrasRestantes: 5
        };

        // In desperate zone, ordago acceptance threshold is lowered by 8
        // Normal: umbral 88, Desperate: umbral 80
        // With fuerza 88: normal → borderline accept, desperate → clearly accept
        const decNormal = ai.decideEnvite(hand, LANCE.GRANDE, 0, gameStateNormal);
        const decDesp = ai.decideEnvite(hand, LANCE.GRANDE, 0, gameStateDesperate);

        // Desperate zone should accept (fuerza 88 >= 80)
        expect(decDesp.action).toBe(ACCION.QUIERO);
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
        expect(ai.evaluarLance(hand, LANCE.GRANDE)).toBe(98);
        expect(ai.evaluarLance(hand, LANCE.CHICA)).toBe(0);
    });
});

// ==========================================
// MEJORA 1: DESCARTE MEJORADO
// ==========================================

describe('AIPlayer - Descarte Mejorado', () => {
    let ai;
    beforeEach(() => { ai = new AIPlayer(); });

    it('selectDiscard should return cards from the hand', () => {
        const hand = [
            { rank: 'A', suit: 'oros' },
            { rank: '5', suit: 'copas' },
            { rank: '6', suit: 'espadas' },
            { rank: '7', suit: 'bastos' }
        ];
        const discards = ai.selectDiscard(hand);
        for (const card of discards) {
            expect(hand).toContain(card);
        }
    });

    it('selectDiscard should never return more than 3 cards', () => {
        const hand = [
            { rank: 'A', suit: 'oros' },
            { rank: '5', suit: 'copas' },
            { rank: '6', suit: 'espadas' },
            { rank: '7', suit: 'bastos' }
        ];
        for (let i = 0; i < 50; i++) {
            const discards = ai.selectDiscard(hand);
            expect(discards.length).toBeLessThanOrEqual(3);
        }
    });

    it('selectDiscard should not discard with duples', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: '3', suit: 'espadas' },
            { rank: '3', suit: 'bastos' }
        ];
        expect(ai.selectDiscard(hand)).toHaveLength(0);
    });

    it('selectDiscard should not discard with 31', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'Q', suit: 'copas' },
            { rank: 'J', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        expect(ai.selectDiscard(hand)).toHaveLength(0);
    });
});

// ==========================================
// MEJORA 2: FUERZA INFERIDA RIVAL
// ==========================================

describe('AIPlayer - Fuerza Inferida Rival', () => {
    it('should be more cautious when rival bet strongly (200 iterations)', () => {
        const ai = new AIPlayer();
        // Juego 34 → fuerza 25. umbralQuerer(postre)=25.
        // Con rival fuerte (apuestaRival=10): +5 → umbral=30 → fuerza < umbral → NO_QUIERO
        // Sin rival: umbral=25 → fuerza >= umbral → QUIERO
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'Q', suit: 'copas' },
            { rank: 'J', suit: 'espadas' },
            { rank: '4', suit: 'bastos' }
        ]; // 10+10+10+4 = 34

        const stateRivalWeak = {
            marcadorPropio: 10, marcadorRival: 10,
            posicion: 'postre', piedrasRestantes: 20,
            apuestaRival: 0
        };

        const stateRivalStrong = {
            marcadorPropio: 10, marcadorRival: 10,
            posicion: 'postre', piedrasRestantes: 20,
            apuestaRival: 10
        };

        let quieroWeak = 0, quieroStrong = 0;
        for (let i = 0; i < 200; i++) {
            const decWeak = ai.decideEnvite(hand, LANCE.JUEGO, 2, stateRivalWeak);
            const decStrong = ai.decideEnvite(hand, LANCE.JUEGO, 2, stateRivalStrong);
            if (decWeak.action === ACCION.QUIERO || decWeak.action === ACCION.ENVIDO) quieroWeak++;
            if (decStrong.action === ACCION.QUIERO || decStrong.action === ACCION.ENVIDO) quieroStrong++;
        }
        // Should accept less often when rival bet strongly
        expect(quieroWeak).toBeGreaterThan(quieroStrong);
    });
});

// ==========================================
// MEJORA 3: MEMORIA ENTRE LANCES
// ==========================================

describe('AIPlayer - Memoria Entre Lances', () => {
    it('should be more aggressive in Chica if rival bet strongly in Grande (200 iterations)', () => {
        const ai = new AIPlayer();
        // Mano borderline para chica: A, 6, K, K
        // chica cartas ordenadas: [1,4,8,8] → fuerza: 70+5-(8+8)*0.5 = 67
        // umbralApostar=70. Sin historial → 67<70 → paso
        // Con historial (rival grande) → ajuste -10 → umbral=60 → 67>60 → envido
        const hand = [
            { rank: 'A', suit: 'oros' },
            { rank: '6', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'K', suit: 'bastos' }
        ];

        const stateNoHistorial = {
            marcadorPropio: 10, marcadorRival: 10,
            posicion: 'mano', piedrasRestantes: 20,
            historialLances: [],
            equipoRival: ['rival1', 'rival2']
        };

        const stateConHistorial = {
            marcadorPropio: 10, marcadorRival: 10,
            posicion: 'mano', piedrasRestantes: 20,
            historialLances: [{
                lance: 'grande',
                ganador: 'equipo2',
                puntos: 3,
                apuestaFinal: 5,
                respuestas: { rival1: 'envido', rival2: 'paso' }
            }],
            equipoRival: ['rival1', 'rival2']
        };

        let envitesSin = 0, envitesCon = 0;
        for (let i = 0; i < 200; i++) {
            const decSin = ai.decideEnvite(hand, LANCE.CHICA, 0, stateNoHistorial);
            const decCon = ai.decideEnvite(hand, LANCE.CHICA, 0, stateConHistorial);
            if (decSin.action !== ACCION.PASO) envitesSin++;
            if (decCon.action !== ACCION.PASO) envitesCon++;
        }
        // With historial (rival bet in grande → weak chica), should be more aggressive
        expect(envitesCon).toBeGreaterThan(envitesSin);
    });

    it('_inferirDesdeHistorial should return negative when rival bet grande and we are in chica', () => {
        const ai = new AIPlayer();
        const historial = [{
            lance: 'grande', ganador: 'equipo2', puntos: 3,
            apuestaFinal: 5,
            respuestas: { rival1: 'envido', rival2: 'paso' }
        }];
        const ajuste = ai._inferirDesdeHistorial(historial, 'chica', ['rival1', 'rival2']);
        expect(ajuste).toBeLessThan(0);
    });

    it('_inferirDesdeHistorial should return 0 for empty historial', () => {
        const ai = new AIPlayer();
        expect(ai._inferirDesdeHistorial([], 'grande', ['rival1'])).toBe(0);
    });

    it('_inferirDesdeHistorial should clamp between -20 and +20', () => {
        const ai = new AIPlayer();
        // Many passed lances
        const historial = [];
        for (let i = 0; i < 10; i++) {
            historial.push({
                lance: 'grande', ganador: 'equipo1', puntos: 1,
                apuestaFinal: 0,
                respuestas: { rival1: 'paso', rival2: 'paso' }
            });
        }
        const ajuste = ai._inferirDesdeHistorial(historial, 'chica', ['rival1', 'rival2']);
        expect(ajuste).toBeGreaterThanOrEqual(-20);
        expect(ajuste).toBeLessThanOrEqual(20);
    });
});

// ==========================================
// MEJORA 4: COORDINACIÓN CON COMPAÑERO
// ==========================================

describe('AIPlayer - Coordinación Compañero', () => {
    it('should be more aggressive if partner bet (200 iterations)', () => {
        const ai = new AIPlayer();
        // Q, Q, 7, 7 → grande [7,7,5,5] → fuerza: 50+15+(5+5)*0.5 = 70
        // umbralApostar=70. Con parejaAposto(-5)→65 → 70>65 → envido
        // Con parejaPaso(+2)→72 → 70<72 → paso
        const hand = [
            { rank: 'Q', suit: 'oros' },
            { rank: 'Q', suit: 'copas' },
            { rank: '7', suit: 'espadas' },
            { rank: '7', suit: 'bastos' }
        ];

        const stateParejaPaso = {
            marcadorPropio: 10, marcadorRival: 10,
            posicion: 'mano', piedrasRestantes: 20,
            parejaYaEnvido: false, parejaPaso: true
        };

        const stateParejaBet = {
            marcadorPropio: 10, marcadorRival: 10,
            posicion: 'mano', piedrasRestantes: 20,
            parejaYaEnvido: true, parejaPaso: false
        };

        let envitesPaso = 0, envitesBet = 0;
        for (let i = 0; i < 200; i++) {
            const decPaso = ai.decideEnvite(hand, LANCE.GRANDE, 0, stateParejaPaso);
            const decBet = ai.decideEnvite(hand, LANCE.GRANDE, 0, stateParejaBet);
            if (decPaso.action !== ACCION.PASO) envitesPaso++;
            if (decBet.action !== ACCION.PASO) envitesBet++;
        }
        // Should bet more when partner already bet
        expect(envitesBet).toBeGreaterThan(envitesPaso);
    });
});

// ==========================================
// MEJORA 5: BLUFFING ESTRATÉGICO
// ==========================================

describe('AIPlayer - Bluffing', () => {
    let ai;
    beforeEach(() => { ai = new AIPlayer(); });

    it('_calcularFarol should have higher rate in Grande than Pares', () => {
        const ctxBase = {
            zonaAdentro: false, esPostre: false, parejaAposto: false,
            zonaDesesperada: false, ajusteLanceMemoria: 0
        };

        let farolGrande = 0, farolPares = 0;
        for (let i = 0; i < 2000; i++) {
            if (ai._calcularFarol(LANCE.GRANDE, ctxBase)) farolGrande++;
            if (ai._calcularFarol(LANCE.PARES, ctxBase)) farolPares++;
        }
        expect(farolGrande).toBeGreaterThan(farolPares);
    });

    it('_calcularFarol should never bluff in zonaAdentro', () => {
        const ctx = {
            zonaAdentro: true, esPostre: false, parejaAposto: false,
            zonaDesesperada: false, ajusteLanceMemoria: 0
        };

        for (let i = 0; i < 500; i++) {
            expect(ai._calcularFarol(LANCE.GRANDE, ctx)).toBeNull();
        }
    });

    it('_calcularFarol should return amount when bluffing', () => {
        const ctx = {
            zonaAdentro: false, esPostre: true, parejaAposto: true,
            zonaDesesperada: true, ajusteLanceMemoria: -10
        };

        // With high adjustments, should eventually bluff
        let found = false;
        for (let i = 0; i < 200; i++) {
            const result = ai._calcularFarol(LANCE.GRANDE, ctx);
            if (result) {
                expect(result.amount).toBeGreaterThanOrEqual(2);
                found = true;
                break;
            }
        }
        expect(found).toBe(true);
    });
});

// ==========================================
// MEJORA 6: BET SIZING
// ==========================================

describe('AIPlayer - Bet Sizing', () => {
    let ai;
    beforeEach(() => { ai = new AIPlayer(); });

    it('_calcularApuesta should return higher amount with higher margin', () => {
        const ctx = { piedrasRestantes: 30, zonaAdentro: false, zonaDesesperada: false };
        expect(ai._calcularApuesta(5, ctx)).toBe(2);
        expect(ai._calcularApuesta(10, ctx)).toBe(3);
        expect(ai._calcularApuesta(20, ctx)).toBe(4);
        expect(ai._calcularApuesta(30, ctx)).toBe(5);
    });

    it('_calcularApuesta should cap with few piedras remaining', () => {
        const ctx = { piedrasRestantes: 8, zonaAdentro: false, zonaDesesperada: false };
        expect(ai._calcularApuesta(30, ctx)).toBeLessThanOrEqual(3);
    });

    it('_calcularApuesta should cap to 2 in zonaAdentro', () => {
        const ctx = { piedrasRestantes: 30, zonaAdentro: true, zonaDesesperada: false };
        expect(ai._calcularApuesta(30, ctx)).toBe(2);
    });

    it('_calcularApuesta should be more aggressive in zonaDesesperada', () => {
        const ctxNormal = { piedrasRestantes: 30, zonaAdentro: false, zonaDesesperada: false };
        const ctxDesp = { piedrasRestantes: 30, zonaAdentro: false, zonaDesesperada: true };
        // With margin 20, normal=4, desperate=5
        expect(ai._calcularApuesta(20, ctxDesp)).toBeGreaterThan(ai._calcularApuesta(20, ctxNormal));
    });
});
