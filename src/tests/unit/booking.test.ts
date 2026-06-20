import { describe, it, expect } from 'vitest';
import { calculateTotal } from '../../lib/services/pricing';

describe('pricing', () => {
  it('adds cleaning fee', () => {
    expect(calculateTotal(10000, 3)).toBe(33000);
  });
});
