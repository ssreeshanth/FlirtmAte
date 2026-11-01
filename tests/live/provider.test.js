import { describe, expect, it } from 'vitest';

const live = Boolean(process.env.FLIRTMATE_LIVE);
describe.skipIf(!live)('live provider checks', () => {
  it('is enabled only when FLIRTMATE_LIVE is configured', () => {
    expect(live).toBe(true);
  });
});
