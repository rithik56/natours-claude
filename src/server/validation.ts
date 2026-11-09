import 'server-only';
import { z } from 'zod';
import { messages } from '@/lib/messages';
import type { ErrorDetail } from './errors';

const { validation } = messages;

function boundMessage(issue: z.core.$ZodRawIssue, kind: 'min' | 'max'): string {
  const bound = kind === 'min' ? 'minimum' : 'maximum';
  const limit = Number((issue as unknown as Record<string, unknown>)[bound]);
  const origin = (issue as { origin?: unknown }).origin;
  if (origin === 'string') {
    if (kind === 'min' && limit <= 1) return validation.required;
    return kind === 'min'
      ? validation.tooShort(limit)
      : validation.tooLong(limit);
  }
  if (origin === 'number') {
    return kind === 'min'
      ? validation.tooSmall(limit)
      : validation.tooBig(limit);
  }
  return validation.invalidValue;
}

// DES-12: Zod's built-in English never reaches a user. Schema-level and check-level
// messages still rank above this map, so a schema can say something more specific.
z.config({
  customError: (issue) => {
    switch (issue.code) {
      case 'invalid_type':
        return issue.input === undefined
          ? validation.required
          : validation.invalidType;
      case 'too_small':
        return boundMessage(issue, 'min');
      case 'too_big':
        return boundMessage(issue, 'max');
      case 'invalid_format':
        return issue.format === 'email'
          ? validation.invalidEmail
          : validation.invalidFormat;
      case 'invalid_value':
        return validation.invalidOption;
      case 'unrecognized_keys':
        return validation.unknownField;
      default:
        return validation.invalidValue;
    }
  },
});

// Every schema imports z from here, so the map above is always installed.
export { z };

function pathOf(path: ReadonlyArray<PropertyKey>): string {
  return path.map(String).join('.');
}

/** One { path, message } per issue, with dotted paths for nested fields. */
export function issuesToDetails(error: z.ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    path: pathOf(issue.path),
    message: issue.message,
  }));
}

/** The first message per top-level field. Root-level issues, such as unknown keys, are left out. */
export function issuesToFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (field === undefined) continue;
    const key = String(field);
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
}
