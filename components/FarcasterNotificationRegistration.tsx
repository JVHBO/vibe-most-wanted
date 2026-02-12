'use client';

import { useEffect } from 'react';

/**
 * Component to prompt user to add miniapp and enable notifications
 * Runs automatically when user opens the app in Farcaster
 *
 * NOTE: Tokens are managed by Neynar via webhook (configured in farcaster.json)
 * We don't need to save tokens ourselves - just call addMiniApp() to prompt user
 */
export function FarcasterNotificationRegistration() {
  useEffect(() => {
    async function promptAddMiniApp() {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');

        const context = await sdk.context;
        if (!context?.user?.fid) return;

        const fid = context.user.fid.toString();

        // Skip if already processed this session
        const sessionKey = `vbms_miniapp_${fid}`;
        if (sessionStorage.getItem(sessionKey)) return;

        // Request to add miniapp (includes notification permission)
        // Neynar receives the token via webhook configured in farcaster.json
        const result = await sdk.actions.addMiniApp();
        console.log('[FarcasterNotification] addMiniApp result:', result);

        if (result?.notificationDetails) {
          console.log('[FarcasterNotification] Notifications enabled for FID:', fid, '(token managed by Neynar)');
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
