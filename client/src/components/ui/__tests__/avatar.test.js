import { describe, expect, it } from 'vitest';
import { letterColor } from '../Avatar.jsx';

describe('letterColor', () => {
  it('gives the same name the same colour every time, ignoring case and spaces', () => {
    expect(letterColor('Ayush Singh')).toBe(letterColor('  ayush singh '));
    expect(letterColor('Papa')).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('spreads different names over several colours', () => {
    const names = ['Asha', 'Ravi', 'Papa', 'Mummy', 'Rohan', 'Sunita', 'Ayush', 'Hemlata', 'Priya', 'Arvind'];
    expect(new Set(names.map(letterColor)).size).toBeGreaterThan(3);
  });

  it('works for Hindi names and an empty name', () => {
    expect(letterColor('पापा')).toMatch(/^#/);
    expect(letterColor('')).toMatch(/^#/);
  });
});
