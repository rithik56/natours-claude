import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Reads the seed files directly, with no database, so a licence obligation (U27)
// cannot silently drop from the content the app ships with.
const root = path.resolve(import.meta.dirname, '../..');

type Credit = {
  file: string;
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  alt: string;
};

type SeedTour = {
  name: string;
  imageCover: string;
  images: string[];
  photoCredits: Credit[];
};

const tours = JSON.parse(
  readFileSync(path.join(root, 'seed/data/tours.json'), 'utf8'),
) as SeedTour[];

const creditsMarkdown = readFileSync(
  path.join(root, 'seed/CREDITS.md'),
  'utf8',
);

/** Each photo file in seed/CREDITS.md's tables, mapped to its author cell. */
function authorsInCreditsTable(markdown: string): Map<string, string> {
  const authors = new Map<string, string>();
  for (const line of markdown.split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim());
    const file = /^`([^`]+)`$/.exec(cells[1] ?? '');
    if (!file || cells.length < 5) continue;
    authors.set(file[1]!, cells[3]!);
  }
  return authors;
}

const creditsTableAuthors = authorsInCreditsTable(creditsMarkdown);

describe('seed photo credits', () => {
  it('[U27] every tour credits exactly its cover and gallery photos, no more and no fewer', () => {
    for (const tour of tours) {
      const expected = [tour.imageCover, ...tour.images].sort();
      const credited = tour.photoCredits.map((credit) => credit.file).sort();

      expect(credited, tour.name).toEqual(expected);
    }
  });

  it('[U27] every credit has a title, author, licence, licence link, source link and alt', () => {
    for (const tour of tours) {
      for (const credit of tour.photoCredits) {
        for (const field of [
          'title',
          'author',
          'license',
          'licenseUrl',
          'sourceUrl',
        ] as const) {
          expect(credit[field].trim(), `${credit.file} ${field}`).not.toBe('');
        }
      }
    }
  });

  it('[U27] every credit has an alt of 1 to 125 characters that does not open with Photo, Image or Picture', () => {
    for (const tour of tours) {
      for (const credit of tour.photoCredits) {
        expect(credit.alt.length, credit.file).toBeGreaterThanOrEqual(1);
        expect(credit.alt.length, credit.file).toBeLessThanOrEqual(125);
        expect(credit.alt, credit.file).not.toMatch(/^(Photo|Image|Picture)\b/);
      }
    }
  });

  it('[U27] no photo author is longer than 60 characters', () => {
    for (const tour of tours) {
      for (const credit of tour.photoCredits) {
        expect(credit.author.length, credit.file).toBeLessThanOrEqual(60);
      }
    }
  });

  it('[U27] seed/CREDITS.md lists every tour photo, and gives each the same author as tours.json', () => {
    const tourAuthors = new Map<string, string>();
    for (const tour of tours) {
      for (const credit of tour.photoCredits) {
        tourAuthors.set(credit.file, credit.author);
      }
    }

    expect([...creditsTableAuthors.keys()].sort()).toEqual(
      [...tourAuthors.keys()].sort(),
    );
    for (const [file, author] of tourAuthors) {
      expect(creditsTableAuthors.get(file), file).toBe(author);
    }
  });
});
