// U4 and U22: the peak count and the word always appear together, so colour is never the only signal.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DifficultySymbol } from '@/components/ui/difficulty-symbol';

const render = (level: 'easy' | 'medium' | 'difficult') =>
  renderToStaticMarkup(createElement(DifficultySymbol, { level }));

const peaks = (markup: string) => markup.split('▲').length - 1;

describe('[U4] DifficultySymbol', () => {
  it('shows one peak and the word Easy', () => {
    const markup = render('easy');
    expect(peaks(markup)).toBe(1);
    expect(markup).toContain('Easy');
  });

  it('shows two peaks and the word Medium', () => {
    const markup = render('medium');
    expect(peaks(markup)).toBe(2);
    expect(markup).toContain('Medium');
  });

  it('shows three peaks and the word Difficult', () => {
    const markup = render('difficult');
    expect(peaks(markup)).toBe(3);
    expect(markup).toContain('Difficult');
  });

  it('hides the decorative peaks from assistive technology, leaving the word', () => {
    expect(render('difficult')).toMatch(/aria-hidden="true"[^>]*>▲▲▲</);
  });
});
