import { useState } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';

const clientId: string =
  (import.meta.env.VITE_MICROSOFT_CLIENT_ID as string | undefined) ||
  '070f84a9-da4a-468f-ba93-7def125a7734';

let _msal: PublicClientApplication | null = null;

export async function getMsal(): Promise<PublicClientApplication> {
  if (!_msal) {
    _msal = new PublicClientApplication({
      auth: {
        clientId: clientId!,
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: window.location.origin,
      },
      cache: { cacheLocation: 'sessionStorage' },
    });
    await _msal.initialize();
  }
  return _msal;
}

interface Props {
  onSuccess: (idToken: string) => void;
  onError: (msg: string) => void;
}

export default function MicrosoftLoginButton({ onSuccess, onError }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const instance = await getMsal();
      const result = await instance.loginPopup({ scopes: ['openid', 'profile', 'email'] });
      if (result.idToken) {
        onSuccess(result.idToken);
      } else {
        onError('Microsoft sign-in failed. No token received.');
      }
    } catch {
      onError('Microsoft sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors text-sm font-medium text-slate-700 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="9" height="9" fill="#f25022" />
          <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
          <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
          <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
        </svg>
      )}
      {loading ? 'Signing in...' : 'Continue with Microsoft'}
    </button>
  );
}
