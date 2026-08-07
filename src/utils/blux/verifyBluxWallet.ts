import env from '../../env';

interface BluxVerifyWalletResponse {
  result?: {
    exists?: boolean;
    user_id?: number;
    network?: string;
    wallet_type?: 'custodial' | 'external';
    auth_method?: string;
  };
}

type VerifyBluxWalletResult =
  | {
      ok: true;
      verified: boolean;
      details: {
        userId: number | null;
        network: string | null;
        walletType: 'custodial' | 'external' | null;
        authMethod: string | null;
      };
    }
  | { ok: false; reason: 'unavailable' };

const verifyBluxWallet = async (walletAddress: string): Promise<VerifyBluxWalletResult> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.BLUX_VERIFICATION_TIMEOUT_MS);

  try {
    const response = await fetch(new URL('/server/wallets/verify', env.BLUX_BASE_URL), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'blux-app-id': env.BLUX_APP_ID,
        'blux-app-secret': env.BLUX_APP_SECRET,
      },
      body: JSON.stringify({ address: walletAddress, user_id: 0 }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, reason: 'unavailable' };
    }

    const body = (await response.json()) as BluxVerifyWalletResponse;
    if (typeof body.result?.exists !== 'boolean') {
      return { ok: false, reason: 'unavailable' };
    }

    return {
      ok: true,
      verified: body.result.exists,
      details: {
        userId: typeof body.result.user_id === 'number' ? body.result.user_id : null,
        network: typeof body.result.network === 'string' ? body.result.network : null,
        walletType: body.result.wallet_type ?? null,
        authMethod: typeof body.result.auth_method === 'string' ? body.result.auth_method : null,
      },
    };
  } catch {
    return { ok: false, reason: 'unavailable' };
  } finally {
    clearTimeout(timeout);
  }
};

export default verifyBluxWallet;
export type { VerifyBluxWalletResult };
