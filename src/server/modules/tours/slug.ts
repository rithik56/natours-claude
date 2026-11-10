import 'server-only';

/**
 * Turns a tour name into its URL slug: lowercase ASCII letters and digits with
 * single hyphens between words. Written by hand because tour names are English
 * and a library would be a dependency for a few lines (RESEARCH A7).
 */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
