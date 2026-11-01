// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App.jsx';

const api = vi.hoisted(() => ({
  generateReplies: vi.fn(), getHistory: vi.fn(), getFavorites: vi.fn(), setStarred: vi.fn(), removeReply: vi.fn(), clearHistory: vi.fn(), logout: vi.fn()
}));
vi.mock('../../src/api.js', () => api);

const replies = [
  { id: 1, vibe: 'cute', reply: 'A gentle first reply', starred: false },
  { id: 2, vibe: 'playful', reply: 'A playful second reply', starred: false }
];

async function enterApp() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByLabelText('English'));
  await user.click(screen.getByRole('button', { name: 'Start FlirtMate' }));
  return user;
}

describe('FlirtMate frontend', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); api.getHistory.mockResolvedValue({ batches: [], nextCursor: null }); api.getFavorites.mockResolvedValue({ favorites: [] }); api.setStarred.mockResolvedValue({ ok: true }); });
  afterEach(() => cleanup());

  it('starts on the welcome screen and requires a language', () => {
    render(<App />);
    expect(screen.getByTestId('welcome-screen')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start FlirtMate' }).disabled).toBe(true);
  });

  it('does not request an empty message', async () => {
    const user = await enterApp();
    expect(screen.getByRole('button', { name: 'Generate All Vibes' }).disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Generate All Vibes' }));
    expect(api.generateReplies).not.toHaveBeenCalled();
  });

  it('copies only the selected reply card', async () => {
    api.generateReplies.mockResolvedValue({ replies });
    const user = await enterApp();
    await user.type(screen.getByLabelText('What did they say?'), 'Their message');
    await user.click(screen.getByRole('button', { name: 'Generate All Vibes' }));
    await screen.findByText('A gentle first reply');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const cards = screen.getAllByRole('article');
    await user.click(within(cards[1]).getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith('A playful second reply');
    expect(screen.getByText('Copied')).toBeTruthy();
  });

  it('does not persist an identity in browser storage', async () => {
    await enterApp();
    expect(Object.keys(localStorage)).toEqual([]);
  });

  it('remembers the reply marked as sent and includes it in the next generation', async () => {
    api.generateReplies.mockResolvedValue({ replies });
    const user = await enterApp();
    await user.type(screen.getByLabelText('What did they say?'), 'Want to get coffee?');
    await user.click(screen.getByRole('button', { name: 'Generate All Vibes' }));
    await screen.findByText('A gentle first reply');
    await user.click(within(screen.getAllByRole('article')[1]).getByRole('button', { name: 'I sent this' }));
    expect(JSON.parse(sessionStorage.getItem('flirtmate-conversation'))).toEqual([
      { role: 'user', content: 'Want to get coffee?' }, { role: 'assistant', content: 'A playful second reply' }
    ]);
    await user.type(screen.getByLabelText('What did they say next?'), 'What about tomorrow?');
    await user.click(screen.getByRole('button', { name: 'Generate follow-up replies' }));
    expect(api.generateReplies).toHaveBeenLastCalledWith('What about tomorrow?', 'english', 'balanced', expect.any(AbortSignal), [
      { role: 'user', content: 'Want to get coffee?' }, { role: 'assistant', content: 'A playful second reply' }
    ]);
    await user.click(screen.getAllByRole('button', { name: 'New conversation' })[0]);
    expect(sessionStorage.getItem('flirtmate-conversation')).toBeNull();
  });
});
