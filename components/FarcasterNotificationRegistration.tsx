'use client';

import { useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

/**
 * Component to register Farcaster notification token
 * Runs automatically when user opens the app in Farcaster
 */
export function FarcasterNotificationRegistration() {
  const saveToken = useMutation(api.notifications.saveToken);

  useEffect(() => {
    async function registerNotificationToken() {
      try {
        // Dynamic import to prevent SSR/non-Farcaster errors
        const { sdk } = await import('@farcaster/miniapp-sdk');

        // Check if running in Farcaster
        const context = await sdk.context;

        if (!context?.user?.fid) {
          return;
        }

        const fid = context.user.fid.toString();

        // Request to add miniapp (includes notification permission)
        // NOTE: addMiniApp() replaced deprecated addFrame()
        const { sdk: sdkActions } = await import('@farcaster/miniapp-sdk');
        const result = await sdkActions.actions.addMiniApp();
        console.log('[FarcasterNotification] addMiniApp result:', result);

        if (result?.notificationDetails) {
          const { token, url } = result.notificationDetails;

          // Save to Convex
          await saveToken({
            fid,
            token,
            url,
          });
          console.log('[FarcasterNotification] ✅ Token saved for FID:', fid);
        }
      } catch (error) {
        console.error('Error registering notification token:', error);
      }
    }

    registerNotificationToken();
  }, [saveToken]);

  return null; // This component doesn't render anything
}
