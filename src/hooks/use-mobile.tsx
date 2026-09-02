import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/** Largura abaixo da qual o chat usa layout empilhado (lista OU conversa). */
export const CHAT_STACK_BREAKPOINT = 1024;

export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export function useIsMobile() {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}

export function useIsChatStacked() {
  return useMediaQuery(`(max-width: ${CHAT_STACK_BREAKPOINT - 1}px)`);
}
