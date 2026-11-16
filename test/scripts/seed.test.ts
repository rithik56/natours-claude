import { describe, expect, it } from 'vitest';
import { parseSeedArgs } from '../../scripts/seed.ts';
import { runSeed } from '../../scripts/seed/run.ts';
import { useTestDatabase } from '../helpers/db';
import { fakes } from '../helpers/fakes';
import { Tour } from '@/server/modules/tours/model';

describe('parseSeedArgs', () => {
  it('[D10] defaults to no reset and no --today', () => {
    expect(parseSeedArgs([])).toEqual({ reset: false, today: undefined });
  });

  it('[D10] reads --reset', () => {
    expect(parseSeedArgs(['--reset']).reset).toBe(true);
  });

  it('[D10] reads a valid --today day', () => {
    expect(parseSeedArgs(['--today=2026-11-08']).today).toBe('2026-11-08');
  });

  it('[D10] refuses a --today that is not a real calendar day', () => {
    expect(() => parseSeedArgs(['--today=2026-02-30'])).toThrow(RangeError);
  });

  it('[D10] refuses an unknown flag and names it', () => {
    expect(() => parseSeedArgs(['--bogus'])).toThrow(/--bogus/);
  });
});

describe('runSeed photos and tours', () => {
  useTestDatabase();

  it('[D10] loads the 13 tours from seed/data/tours.json', async () => {
    await runSeed({ reset: false });
    expect(await Tour.countDocuments()).toBe(13);
  });

  it('[D2] uploads the 52 seed photos under tours/<file> as image/jpeg', async () => {
    await runSeed({ reset: false });
    expect(fakes.storage.files.size).toBe(52);
    for (const [key, file] of fakes.storage.files) {
      expect(key.startsWith('tours/')).toBe(true);
      expect(file.contentType).toBe('image/jpeg');
    }
  });

  it('[D2] every tour cover is a key the storage holds', async () => {
    await runSeed({ reset: false });
    const tours = await Tour.find().lean();
    for (const tour of tours) {
      expect(fakes.storage.files.has(tour.imageCover)).toBe(true);
    }
  });
});
