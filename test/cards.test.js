import { describe, it, expect } from 'vitest';
import { Card, Deck, Hand, PALOS, VALORES, compararGrande, compararChica, compararPares, compararJuego, compararPunto, tienePares, tieneJuego } from '../js/cards.js';

describe('Card', () => {
    it('should create a card with palo and valor', () => {
        const card = new Card('oros', 1);
        expect(card.palo).toBe('oros');
        expect(card.valor).toBe(1);
    });

    it('should throw on invalid palo', () => {
        expect(() => new Card('diamantes', 1)).toThrow();
    });

    it('should throw on invalid valor', () => {
        expect(() => new Card('oros', 8)).toThrow();
    });

    it('should convert 3 to 12 (Rey) for comparison', () => {
        const card = new Card('oros', 3);
        expect(card.getValorComparacion()).toBe(12);
    });

    it('should convert 2 to 1 (As) for comparison', () => {
        const card = new Card('oros', 2);
        expect(card.getValorComparacion()).toBe(1);
    });

    it('should return face value for normal cards', () => {
        const card = new Card('copas', 7);
        expect(card.getValorComparacion()).toBe(7);
    });

    it('should give 10 points for figures in juego', () => {
        expect(new Card('oros', 10).getValorJuego()).toBe(10); // Sota
        expect(new Card('oros', 11).getValorJuego()).toBe(10); // Caballo
        expect(new Card('oros', 12).getValorJuego()).toBe(10); // Rey
    });

    it('should give 10 points for 3 in juego (counts as Rey)', () => {
        expect(new Card('oros', 3).getValorJuego()).toBe(10);
    });

    it('should give 1 point for 2 in juego (counts as As)', () => {
        expect(new Card('oros', 2).getValorJuego()).toBe(1);
    });

    it('should give face value for other cards in juego', () => {
        expect(new Card('oros', 1).getValorJuego()).toBe(1);
        expect(new Card('oros', 4).getValorJuego()).toBe(4);
        expect(new Card('oros', 7).getValorJuego()).toBe(7);
    });

    it('should return readable name', () => {
        expect(new Card('oros', 12).getNombre()).toBe('Rey de oros');
        expect(new Card('copas', 1).getNombre()).toBe('As de copas');
    });

    it('should check equality', () => {
        const a = new Card('oros', 1);
        const b = new Card('oros', 1);
        const c = new Card('copas', 1);
        expect(a.equals(b)).toBe(true);
        expect(a.equals(c)).toBe(false);
    });
});

describe('Deck', () => {
    it('should have 40 cards', () => {
        const deck = new Deck();
        expect(deck.remaining).toBe(40);
    });

    it('should deal cards reducing remaining', () => {
        const deck = new Deck();
        const dealt = deck.deal(4);
        expect(dealt.length).toBe(4);
        expect(deck.remaining).toBe(36);
    });

    it('should throw when dealing more than available', () => {
        const deck = new Deck();
        expect(() => deck.deal(41)).toThrow();
    });

    it('should shuffle without losing cards', () => {
        const deck = new Deck();
        deck.shuffle();
        expect(deck.remaining).toBe(40);
    });

    it('should return cards to the deck', () => {
        const deck = new Deck();
        const dealt = deck.deal(4);
        deck.returnCards(dealt);
        expect(deck.remaining).toBe(40);
    });
});

describe('Hand', () => {
    it('should calculate Grande values (sorted desc)', () => {
        const hand = new Hand([
            new Card('oros', 1),   // As = 1
            new Card('copas', 12), // Rey = 12
            new Card('espadas', 7),// 7
            new Card('bastos', 3)  // 3 = 12 (Rey)
        ]);
        const valores = hand.getValorGrande();
        expect(valores).toEqual([12, 12, 7, 1]);
    });

    it('should calculate Chica values (sorted asc)', () => {
        const hand = new Hand([
            new Card('oros', 1),
            new Card('copas', 12),
            new Card('espadas', 7),
            new Card('bastos', 3) // 3 = 12
        ]);
        const valores = hand.getValorChica();
        expect(valores).toEqual([1, 7, 12, 12]);
    });

    it('should detect par (one pair)', () => {
        const hand = new Hand([
            new Card('oros', 12),
            new Card('copas', 12),
            new Card('espadas', 7),
            new Card('bastos', 1)
        ]);
        const pares = hand.getPares();
        expect(pares.tipo).toBe(1); // PAR
        expect(pares.valores).toContain(12);
    });

    it('should detect medias (three of a kind)', () => {
        const hand = new Hand([
            new Card('oros', 12),
            new Card('copas', 12),
            new Card('espadas', 12),
            new Card('bastos', 1)
        ]);
        const pares = hand.getPares();
        expect(pares.tipo).toBe(2); // MEDIAS
    });

    it('should detect duples (two pairs)', () => {
        const hand = new Hand([
            new Card('oros', 12),
            new Card('copas', 12),
            new Card('espadas', 7),
            new Card('bastos', 7)
        ]);
        const pares = hand.getPares();
        expect(pares.tipo).toBe(3); // DUPLES
    });

    it('should detect duples (four of a kind)', () => {
        const hand = new Hand([
            new Card('oros', 12),
            new Card('copas', 12),
            new Card('espadas', 12),
            new Card('bastos', 12)
        ]);
        const pares = hand.getPares();
        expect(pares.tipo).toBe(3); // DUPLES
    });

    it('should treat 3 as Rey for pairs (3+Rey = par)', () => {
        const hand = new Hand([
            new Card('oros', 3),   // 3 = Rey
            new Card('copas', 12), // Rey
            new Card('espadas', 7),
            new Card('bastos', 1)
        ]);
        const pares = hand.getPares();
        expect(pares.tipo).toBe(1); // PAR (de reyes)
    });

    it('should calculate juego correctly', () => {
        // Rey(10) + Rey(10) + Rey(10) + As(1) = 31
        const hand = new Hand([
            new Card('oros', 12),
            new Card('copas', 12),
            new Card('espadas', 12),
            new Card('bastos', 1)
        ]);
        const juego = hand.getJuego();
        expect(juego.tieneJuego).toBe(true);
        expect(juego.valor).toBe(31);
    });

    it('should detect no juego when sum < 31', () => {
        const hand = new Hand([
            new Card('oros', 1),
            new Card('copas', 4),
            new Card('espadas', 5),
            new Card('bastos', 6)
        ]);
        const juego = hand.getJuego();
        expect(juego.tieneJuego).toBe(false);
        expect(juego.valor).toBe(16);
    });
});

describe('compararGrande', () => {
    it('should prefer higher cards', () => {
        const mano1 = new Hand([
            new Card('oros', 12), new Card('copas', 12),
            new Card('espadas', 12), new Card('bastos', 12)
        ]);
        const mano2 = new Hand([
            new Card('oros', 1), new Card('copas', 1),
            new Card('espadas', 1), new Card('bastos', 1)
        ]);
        expect(compararGrande(mano1, mano2)).toBe(1);
    });

    it('should return 0 for equal hands', () => {
        const mano1 = new Hand([
            new Card('oros', 12), new Card('copas', 7),
            new Card('espadas', 5), new Card('bastos', 1)
        ]);
        const mano2 = new Hand([
            new Card('bastos', 12), new Card('espadas', 7),
            new Card('copas', 5), new Card('oros', 1)
        ]);
        expect(compararGrande(mano1, mano2)).toBe(0);
    });
});

describe('compararChica', () => {
    it('should prefer lower cards', () => {
        const mano1 = new Hand([
            new Card('oros', 1), new Card('copas', 1),
            new Card('espadas', 1), new Card('bastos', 1)
        ]);
        const mano2 = new Hand([
            new Card('oros', 12), new Card('copas', 12),
            new Card('espadas', 12), new Card('bastos', 12)
        ]);
        expect(compararChica(mano1, mano2)).toBe(1);
    });
});

describe('compararJuego', () => {
    it('should rank 31 as the best juego', () => {
        // 31 vs 32
        const mano31 = new Hand([
            new Card('oros', 12), new Card('copas', 12),
            new Card('espadas', 12), new Card('bastos', 1)
        ]); // 10+10+10+1 = 31
        const mano32 = new Hand([
            new Card('oros', 12), new Card('copas', 12),
            new Card('espadas', 12), new Card('bastos', 2)
        ]); // 10+10+10+2... wait, 2=1 in juego. Let me fix:
        // Need 32: 10+10+10+2 won't work since 2=1
        // 32 = 10+10+5+7
        const mano32b = new Hand([
            new Card('oros', 12), new Card('copas', 12),
            new Card('espadas', 5), new Card('bastos', 7)
        ]); // 10+10+5+7 = 32

        expect(compararJuego(mano31, mano32b)).toBe(1);
    });
});
