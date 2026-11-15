// U4: the alert's role follows the urgency of its variant, and it renders the caller's words verbatim.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Alert } from '@/components/ui/alert';

const render = (props: Parameters<typeof Alert>[0]) =>
  renderToStaticMarkup(createElement(Alert, props));

describe('[U4] Alert', () => {
  it('uses role alert for an error, the one urgent variant', () => {
    expect(
      render({ variant: 'error', children: 'Check the highlighted fields and try again.' }),
    ).toContain('role="alert"');
  });

  it('uses role status for success and info', () => {
    expect(render({ variant: 'success', children: 'Your review is posted.' })).toContain(
      'role="status"',
    );
    expect(render({ variant: 'info', children: 'Prices include GST.' })).toContain(
      'role="status"',
    );
  });

  it('renders the caller message verbatim as its children', () => {
    const markup = render({
      variant: 'error',
      children: 'That email or password is not correct.',
    });
    expect(markup).toContain('That email or password is not correct.');
  });

  it('accepts a role override, so a toast can keep its polite live region', () => {
    const markup = render({ variant: 'error', role: 'status', children: 'Saved.' });
    expect(markup).toContain('role="status"');
    expect(markup).not.toContain('role="alert"');
  });
});
