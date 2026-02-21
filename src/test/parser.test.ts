import { describe, it, expect } from 'vitest';
import { parseUniComp, resizeGrid, symbolToCoords, coordsToSymbolIndices } from '@/lib/unicomp-parser';

describe('UniComp Parser', () => {
  describe('Grid specifications', () => {
    it('should parse square grid (N)', () => {
      const result = parseUniComp('(5):F12-12');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.gridWidth).toBe(5);
        expect(result.spec.gridHeight).toBe(5);
      }
    });

    it('should parse rectangular grid (W×H)', () => {
      const result = parseUniComp('(10×3):F5-17');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.gridWidth).toBe(10);
        expect(result.spec.gridHeight).toBe(3);
      }
    });

    it('should parse rectangular grid with lowercase x', () => {
      const result = parseUniComp('(8x4):A15-17');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.gridWidth).toBe(8);
        expect(result.spec.gridHeight).toBe(4);
      }
    });

    it('should validate index bounds for rectangular grids', () => {
      const valid = parseUniComp('(10×3):F0-29');
      expect(valid.success).toBe(true);
      
      const invalid = parseUniComp('(10×3):F0-30');
      expect(invalid.success).toBe(false);
    });
  });

  describe('Symbol parsing', () => {
    it('should parse quoted digits', () => {
      const result = parseUniComp('(6):"2"4-4');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.symbols[0].char).toBe('2');
      }
    });

    it('should parse multiple symbols', () => {
      const result = parseUniComp('(5):F12-12;→2-4');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.symbols.length).toBe(2);
      }
    });

    it('should parse color parameter', () => {
      const result = parseUniComp('(5):F[c=red]12-12');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.symbols[0].color).toBe('red');
      }
    });

    it('should parse rotation parameter', () => {
      const result = parseUniComp('(6):→[r=90]14-14');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.symbols[0].rotate).toBe(90);
      }
    });
  });

  describe('Grid resize', () => {
    it('should convert symbol to coords and back', () => {
      // Symbol at start=5, end=8 on a 10-wide grid
      // start(5) => x=5, y=0; end(8) => x=8, y=0 => w=4, h=1
      const coords = symbolToCoords({ char: 'A', start: 5, end: 8 }, 10);
      expect(coords).toEqual({ x: 5, y: 0, w: 4, h: 1 });

      // Convert back to same grid
      const indices = coordsToSymbolIndices(coords, 10);
      expect(indices).toEqual({ start: 5, end: 8 });
    });

    it('should convert 2D symbol to coords', () => {
      // start=12, end=24 on 10-wide grid
      // start(12) => x=2, y=1; end(24) => x=4, y=2 => w=3, h=2
      const coords = symbolToCoords({ char: 'B', start: 12, end: 24 }, 10);
      expect(coords).toEqual({ x: 2, y: 1, w: 3, h: 2 });
    });

    it('should resize grid preserving element positions', () => {
      // Simple: A at position 5-8 on 10-wide grid (x=5,y=0,w=4,h=1)
      // Resize to 20-wide: same x,y => start=5, end=8
      const resized = resizeGrid('(10):A5-8', 20, 10);
      const result = parseUniComp(resized);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.gridWidth).toBe(20);
        expect(result.spec.gridHeight).toBe(10);
        expect(result.spec.symbols[0].start).toBe(5);
        expect(result.spec.symbols[0].end).toBe(8);
      }
    });

    it('should resize grid and recalculate indices for different width', () => {
      // A at start=15, end=17 on 10-wide grid
      // x=5, y=1, w=3, h=1
      // On 20-wide grid: start=25, end=27
      const resized = resizeGrid('(10):A15-17', 20, 10);
      const result = parseUniComp(resized);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.symbols[0].start).toBe(25);
        expect(result.spec.symbols[0].end).toBe(27);
      }
    });

    it('should clamp elements that fall outside new smaller grid', () => {
      // A at x=8, y=0, w=2, h=1 on 10-wide grid (start=8, end=9)
      // Resize to 5-wide: x clamped to min(8, 4)=4, endX clamped to min(9, 4)=4
      // start=4, end=4
      const resized = resizeGrid('(10):A8-9', 5, 5);
      const result = parseUniComp(resized);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.symbols[0].start).toBe(4);
        expect(result.spec.symbols[0].end).toBe(4);
      }
    });

    it('should preserve symbol parameters during resize', () => {
      const resized = resizeGrid('(10):A[r=90;c=red]5-8', 20, 10);
      const result = parseUniComp(resized);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.spec.symbols[0].rotate).toBe(90);
        expect(result.spec.symbols[0].color).toBe('red');
      }
    });
  });
});
