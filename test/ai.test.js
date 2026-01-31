import { describe, it, expect, beforeEach } from 'vitest';
import { AIPlayer, LANCE, ACCION, DIFICULTAD } from '../js/ai.js';

describe('AIPlayer - Constructor', () => {
    it('should create with default difficulty MEDIO', () => {
        const ai = new AIPlayer();
        expect(ai.dificultad).toBe(DIFICULTAD.MEDIO);
    });

    it('should create with specified difficulty', () => {
        const ai = new AIPlayer(DIFICULTAD.DIFICIL);
        expect(ai.dificultad).toBe(DIFICULTAD.DIFICIL);
    });

    it('should set appropriate farol factor by difficulty', () => {
        const easy = new AIPlayer(DIFICULTAD.FACIL);
        const hard = new AIPlayer(DIFICULTAD.DIFICIL);
        expect(easy.factorFarol).toBeLessThan(hard.factorFarol);
    });
});

describe('AIPlayer - Hand Evaluation', () => {
    let ai;

    beforeEach(() => {
        ai = new AIPlayer(DIFICULTAD.MEDIO);
    });

    it('should evaluate Grande - 4 Kings is max', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'K', suit: 'bastos' }
        ];
        const score = ai._evaluarGrande(hand);
        expect(score).toBe(100);
    });

    it('should evaluate Grande - 4 Aces is min', () => {
        const hand = [
            { rank: 'A', suit: 'oros' },
            { rank: 'A', suit: 'copas' },
            { rank: 'A', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        const score = ai._evaluarGrande(hand);
        expect(score).toBe(0);
    });

    it('should evaluate Chica - 4 Aces is max', () => {
        const hand = [
            { rank: 'A', suit: 'oros' },
            { rank: 'A', suit: 'copas' },
            { rank: 'A', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        const score = ai._evaluarChica(hand);
        expect(score).toBe(100);
    });

    it('should detect pairs', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: '7', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        const pares = ai._detectarPares(hand);
        expect(pares.tipo).not.toBeNull();
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

    it('should calculate points for juego', () => {
        // K(10) + K(10) + K(10) + A(1) = 31
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        expect(ai._calcularPuntos(hand)).toBe(31);
    });

    it('should detect juego when >= 31', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'A', suit: 'bastos' }
        ];
        expect(ai._tieneJuego(hand)).toBe(true);
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
});

describe('AIPlayer - Mus Decision', () => {
    let ai;

    beforeEach(() => {
        ai = new AIPlayer(DIFICULTAD.MEDIO);
    });

    it('should usually cut with duples', () => {
        const hand = [
            { rank: 'K', suit: 'oros' },
            { rank: 'K', suit: 'copas' },
            { rank: 'K', suit: 'espadas' },
            { rank: 'K', suit: 'bastos' }
        ];
        // With duples, should almost always cut (return false)
        let cuts = 0;
        for (let i = 0; i < 50; i++) {
            if (!ai.decideMus(hand)) cuts++;
        }
        expect(cuts).toBeGreaterThan(40); // Should cut at least 80% of the time
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
        // With a weak hand, the AI should want mus at least sometimes
        expect(wantsMus).toBeGreaterThan(5);
    });
});

describe('AIPlayer - Envite Decision', () => {
    let ai;

    beforeEach(() => {
        ai = new AIPlayer(DIFICULTAD.MEDIO);
    });

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

    it('should usually paso with weak hand in Pares', () => {
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
        // No pairs = should paso most of the time (except bluffs)
        expect(pasos).toBeGreaterThan(15);
    });

    it('should be more aggressive with strong juego hand', () => {
        // 31 = best juego
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
        expect(envites).toBeGreaterThan(20); // Should bet most of the time
    });
});

describe('AIPlayer - Difficulty Levels', () => {
    it('should have different aggression by difficulty', () => {
        const easy = new AIPlayer(DIFICULTAD.FACIL);
        const hard = new AIPlayer(DIFICULTAD.DIFICIL);
        expect(easy.factorAgresividad).toBeLessThan(hard.factorAgresividad);
    });

    it('should allow changing difficulty', () => {
        const ai = new AIPlayer(DIFICULTAD.FACIL);
        ai.setDificultad(DIFICULTAD.DIFICIL);
        expect(ai.dificultad).toBe(DIFICULTAD.DIFICIL);
        expect(ai.factorAgresividad).toBe(1.3);
    });
});
