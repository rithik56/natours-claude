import { describe, expect, it } from 'vitest';
import { messages } from '@/lib/messages';
import { issuesToDetails, issuesToFieldErrors, z } from '@/server/validation';

const bookingSchema = z.strictObject({
  name: z.string(),
  email: z.email(),
  seats: z.number().min(1),
});

function messagesOf(schema: z.ZodType, input: unknown): string {
  const result = schema.safeParse(input);
  if (result.success) return '';
  return result.error.issues.map((issue) => issue.message).join(' | ');
}

describe('global error map', () => {
  it('[B9] gives schemas with no custom messages the wording from messages.ts', () => {
    const outcome = messagesOf(bookingSchema, {
      email: 'nope',
      seats: 0,
      extra: true,
    });
    const expected = [
      messages.validation.required,
      messages.validation.invalidEmail,
      messages.validation.tooSmall(1),
      messages.validation.unknownField,
    ].join(' | ');
    expect(outcome).toBe(expected);
  });

  it('[B9] never lets Zod default English reach a user', () => {
    const outcome = messagesOf(bookingSchema, {
      name: 5,
      email: 7,
      seats: 'two',
      extra: 1,
    });
    expect(/invalid input|expected|received|unrecognized/i.test(outcome)).toBe(
      false,
    );
  });

  it('[B9] reads a missing value as required and a wrong type as invalidType', () => {
    expect(messagesOf(z.object({ a: z.string() }), {})).toBe(
      messages.validation.required,
    );
    expect(messagesOf(z.object({ a: z.string() }), { a: 5 })).toBe(
      messages.validation.invalidType,
    );
  });

  it('[B9] gives string and number bounds their own wording', () => {
    expect(messagesOf(z.string().min(3), 'ab')).toBe(
      messages.validation.tooShort(3),
    );
    expect(messagesOf(z.string().max(2), 'abc')).toBe(
      messages.validation.tooLong(2),
    );
    expect(messagesOf(z.number().min(10), 4)).toBe(
      messages.validation.tooSmall(10),
    );
    expect(messagesOf(z.number().max(5), 9)).toBe(
      messages.validation.tooBig(5),
    );
  });

  it('[B9] reads an empty value for a non-empty string as required', () => {
    expect(messagesOf(z.string().min(1), '')).toBe(
      messages.validation.required,
    );
  });

  it('[B9] uses invalidFormat for a format that is not an email, and invalidOption for an enum', () => {
    expect(messagesOf(z.uuid(), 'not-an-id')).toBe(
      messages.validation.invalidFormat,
    );
    expect(messagesOf(z.enum(['user', 'guide']), 'admin')).toBe(
      messages.validation.invalidOption,
    );
  });

  it('[B9] groups numbers the Indian way in bound messages', () => {
    expect(messagesOf(z.number().max(124999), 200000)).toBe(
      'Enter a number that is at most 1,24,999.',
    );
  });

  it('[B9] lets a schema-level custom message win over the global map', () => {
    const schema = z.object({
      name: z.string({ error: 'Enter your full name.' }),
      note: z.string().min(3, { error: 'Write a little more.' }),
    });
    expect(messagesOf(schema, { note: 'a' })).toBe(
      'Enter your full name. | Write a little more.',
    );
  });
});

describe('issuesToDetails', () => {
  it('[B9] returns one path and message per issue, with dotted paths for nested fields', () => {
    const schema = z.strictObject({
      email: z.email(),
      traveller: z.strictObject({ phone: z.string() }),
      tags: z.array(z.string()),
    });
    const result = schema.safeParse({
      email: 'nope',
      traveller: {},
      tags: ['a', 4],
    });
    if (result.success)
      throw new Error('the schema should have rejected this input');
    const joined = issuesToDetails(result.error)
      .map((detail) => `${detail.path}=${detail.message}`)
      .join(' | ');
    expect(joined).toBe(
      [
        `email=${messages.validation.invalidEmail}`,
        `traveller.phone=${messages.validation.required}`,
        `tags.1=${messages.validation.invalidType}`,
      ].join(' | '),
    );
  });
});

describe('issuesToFieldErrors', () => {
  it('[B9] keeps the first message per top-level field and leaves out root-level issues', () => {
    const schema = z.strictObject({
      password: z.string().min(8).regex(/\d/),
      email: z.email(),
    });
    const result = schema.safeParse({
      password: 'abc',
      email: 'nope',
      role: 'admin',
    });
    if (result.success)
      throw new Error('the schema should have rejected this input');
    const fields = issuesToFieldErrors(result.error);
    expect(Object.keys(fields).join(',')).toBe('password,email');
    expect(fields.password).toBe(messages.validation.tooShort(8));
    expect(fields.email).toBe(messages.validation.invalidEmail);
  });

  it('[B9] groups a nested issue under its top-level field', () => {
    const schema = z.object({ traveller: z.object({ phone: z.string() }) });
    const result = schema.safeParse({ traveller: {} });
    if (result.success)
      throw new Error('the schema should have rejected this input');
    expect(issuesToFieldErrors(result.error).traveller).toBe(
      messages.validation.required,
    );
  });
});
