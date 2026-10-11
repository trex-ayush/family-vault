import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import en from '../../../i18n/locales/en/landing.json';
import hi from '../../../i18n/locales/hi/landing.json';
import { FAQ_KEYS } from '../Landing.jsx';

/** Every "a.b.c" key in a nested translation object. */
const keys = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

describe('landing page text', () => {
  it('has every English line in Hindi too, and nothing extra', () => {
    expect(keys(hi).sort()).toEqual(keys(en).sort());
  });

  it('has a question and an answer for every FAQ entry', () => {
    for (const k of FAQ_KEYS) {
      expect(en.faq[`${k}Q`]).toBeTruthy();
      expect(en.faq[`${k}A`]).toBeTruthy();
    }
  });

  it('gives search engines the same questions the page shows', () => {
    const config = readFileSync(new URL('../../../../vite.config.js', import.meta.url), 'utf8');
    const listed = /const faqKeys = \[([^\]]*)\]/.exec(config)[1].match(/'(\w+)'/g).map((s) => s.slice(1, -1));
    expect(listed).toEqual(FAQ_KEYS);
  });
});
