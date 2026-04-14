'use client';

import { useEffect } from 'react';

/**
 * Prompt "Save app + enable notifications" only inside Farcaster iframe host.
 * Base App (RN WebView) uses Base notifications by wallet and does not need addMiniApp.
 */
export function FarcasterNotificationRegistration() {
  useEffect(() => {
    async function promptAddMiniApp() {
      try {
        const isRNWebView = typeof (window as any).ReactNativeWebView !== 'undefined';
        const isIframe = window.self !== window.top;
        if (isRNWebView || !isIframe) return;

        const { sdk } = await import('@farcaster/miniapp-sdk');

        const context = await sdk.context;
        if (!context?.user?.fid) return;

        const fid = context.user.fid.toString();

        // Skip if already processed this session
        const sessionKey = `vbms_miniapp_${fid}`;
        if (sessionStorage.getItem(sessionKey)) return;

        // Request to add miniapp (includes notification permission in Farcaster host)
        const result = await sdk.actions.addMiniApp();
        console.log('[FarcasterNotification] addMiniApp result:', result);

        if (result?.notificationDetails) {
          console.log('[FarcasterNotification] Notifications enabled for FID:', fid);
        }

        sessionStorage.setItem(sessionKey, '1');
      } catch (error) {
        console.error('Error in addMiniApp flow:', error);
      }
    }

    promptAddMiniApp();
  }, []);

  return null;
}
