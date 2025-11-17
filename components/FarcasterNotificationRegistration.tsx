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

        // Request notification permission and get token (re-import to ensure sdk is available)
        const { sdk: sdkActions } = await import('@farcaster/miniapp-sdk');
        const notificationDetails = await sdkActions.actions.addFrame();

        if (notificationDetails?.notificationDetails) {
          const { token, url } = notificationDetails.notificationDetails;

          // Save to Convex
          await saveToken({
            fid,
            token,
            url,
          });
        }
      } catch (error) {
        console.error('Error registering notification token:', error);
      }
    }

    registerNotificationToken();
  }, [saveToken]);

  return null; // This component doesn't render anything
}
