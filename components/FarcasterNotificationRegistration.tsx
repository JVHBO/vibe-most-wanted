'use client';

import { useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

/**
 * Component to register Farcaster notification token
 * Runs automatically when user opens the app in Farcaster
 *
 * Also grants social achievements:
 * - "add_miniapp" when user adds the app to favorites
 * - "enable_notifications" when user enables notifications
 */
export function FarcasterNotificationRegistration() {
  const saveToken = useMutation(api.notifications.saveToken);
  const grantSocialAchievement = useMutation(api.achievements.grantSocialAchievementByFid);

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

        // If addMiniApp succeeded, user added the miniapp to favorites
        if (result) {
          // Grant "add_miniapp" achievement (1000 VBMS reward)
          try {
            const miniappResult = await grantSocialAchievement({
              fid,
              achievementId: 'add_miniapp',
            });
            if (miniappResult.success && !miniappResult.alreadyGranted) {
              console.log('[FarcasterNotification] ✅ Granted add_miniapp achievement for FID:', fid);
            }
          } catch (err) {
            console.log('[FarcasterNotification] Could not grant add_miniapp achievement:', err);
          }
        }

        if (result?.notificationDetails) {
          const { token, url } = result.notificationDetails;

          // Save to Convex
          await saveToken({
            fid,
            token,
            url,
          });
          console.log('[FarcasterNotification] ✅ Token saved for FID:', fid);

          // Grant "enable_notifications" achievement (1000 VBMS reward)
          try {
            const notifResult = await grantSocialAchievement({
              fid,
              achievementId: 'enable_notifications',
            });
            if (notifResult.success && !notifResult.alreadyGranted) {
              console.log('[FarcasterNotification] ✅ Granted enable_notifications achievement for FID:', fid);
            }
          } catch (err) {
            console.log('[FarcasterNotification] Could not grant enable_notifications achievement:', err);
          }
        }
      } catch (error) {
        console.error('Error registering notification token:', error);
      }
    }

    registerNotificationToken();
  }, [saveToken, grantSocialAchievement]);

  return null; // This component doesn't render anything
}
