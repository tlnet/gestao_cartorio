type DebugPayload = Record<string, unknown>;

function isEnabled(): boolean {
  // Só roda no client; em produção o valor fica injetado no bundle.
  if (typeof window === "undefined") return false;
  return process.env.NEXT_PUBLIC_DEBUG_LOADING === "1";
}

function nowIso(): string {
  try {
    return new Date().toISOString();
  } catch {
    return String(Date.now());
  }
}

export function debugLoading(scope: string, message: string, payload?: DebugPayload) {
  if (!isEnabled()) return;

  const base = `[loading][${nowIso()}][${scope}] ${message}`;
  if (payload && Object.keys(payload).length > 0) {
    // console.log com objeto facilita inspeção no DevTools.
    // eslint-disable-next-line no-console
    console.log(base, payload);
    return;
  }
  // eslint-disable-next-line no-console
  console.log(base);
}

