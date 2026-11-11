import { Anek_Latin } from 'next/font/google';

// U6: one family, set narrow for display through the width axis. latin-ext carries ₹ (U+20B9).
// Anek Devanagari is added only when Hindi ships.
export const anekLatin = Anek_Latin({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
  variable: '--font-anek-latin',
  display: 'swap',
});
