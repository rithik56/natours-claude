import 'server-only';

/** plan.md 1.1: the four roles, from least to most access. */
export const ROLES = ['user', 'guide', 'lead-guide', 'admin'] as const;

export type Role = (typeof ROLES)[number];
