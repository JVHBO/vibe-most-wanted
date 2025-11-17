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
        // Only run in browser
        if (typeof window === 'undefined') {
          return;
        }

        // Dynamically import SDK to avoid SSR issues
        const { sdk } = await import('@farcaster/miniapp-sdk');

        // Check if SDK is available (only in Farcaster)
        if (!sdk) {
          return;
        }

        // Check if running in Farcaster
        const context = await sdk.context;

        if (!context?.user?.fid) {
          return;
        }

        const fid = context.user.fid.toString();

        // Request notification permission and get token
        const notificationDetails = await sdk.actions.addFrame();

        if (notificationDetails?.notificationDetails) {
          const { token, url } = notificationDetails.notificationDetails;

          // Validate token and url before saving
          if (!token || !url) {
            console.log('⚠️ Missing token or url from Farcaster SDK:', { token, url });
            return;
          }

          // Save to Convex
          await saveToken({
            fid,
            token,
            url,
          });

          console.log('✅ Notification token registered successfully');
        }
      } catch (error) {
        // Silent fail if not in Farcaster - don't break the app
        // This is expected when not in Farcaster miniapp
      }
    }

    registerNotificationToken();
  }, [saveToken]);

  return null; // This component doesn't render anything
}
