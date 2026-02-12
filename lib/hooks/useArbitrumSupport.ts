'use client';

/**
 * @deprecated - Use isWarpcastClient(clientFid) from miniapp.ts instead.
 * This hook was removed because calling sdk.context in a separate hook
 * races with the wallet provider init and breaks Base App.
 *
 * ARB support is now derived from the Farcaster context clientFid
 * that's already loaded in page.tsx.
 */
