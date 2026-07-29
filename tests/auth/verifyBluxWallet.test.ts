import { afterEach, describe, expect, it, vi } from 'vitest';

import env from '../../src/env';
import verifyBluxWallet from '../../src/utils/blux/verifyBluxWallet';

const WALLET = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

describe('verifyBluxWallet', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('calls the BLUX server endpoint with server-only credentials and user_id 0', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            exists: true,
            user_id: 42,
            network: 'stellar',
            wallet_type: 'external',
            auth_method: 'wallet',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(verifyBluxWallet(WALLET)).resolves.toMatchObject({
      ok: true,
      verified: true,
      details: { userId: 42, network: 'stellar', walletType: 'external' },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('/server/wallets/verify', env.BLUX_BASE_URL),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'blux-app-id': env.BLUX_APP_ID,
          'blux-app-secret': env.BLUX_APP_SECRET,
        }),
        body: JSON.stringify({ address: WALLET, user_id: 0 }),
      }),
    );
  });

  it('fails closed when BLUX is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network unavailable')));

    await expect(verifyBluxWallet(WALLET)).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });
});
