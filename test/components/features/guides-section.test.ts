// B12: the lead guide is labelled "Lead guide" and every other guide "Guide".
import { describe, expect, it } from 'vitest';
import { guideRoleLabel } from '@/components/features/guides-section';

describe('[B12] guideRoleLabel', () => {
  it('[B12] the lead guide is labelled "Lead guide"', () => {
    expect(guideRoleLabel('lead-guide')).toBe('Lead guide');
  });

  it('[B12] any other guide is labelled "Guide"', () => {
    expect(guideRoleLabel('guide')).toBe('Guide');
  });
});
