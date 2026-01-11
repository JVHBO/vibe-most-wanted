'use client';

import { useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

/**
 * Component to prompt user to add miniapp and enable notifications
 * Runs automatically when user opens the app in Farcaster
 *
 * NOTE: Tokens are managed by Neynar via webhook (configured in farcaster.json)
 * We don't need to save tokens ourselves - just call addMiniApp() to prompt user
 *
 * Also grants social achievements:
 * - "add_miniapp" when user adds the app to favorites
 * - "enable_notifications" when user enables notifications
 */
export function FarcasterNotificationRegistration() {
  const grantSocialAchievement = useMutation(api.achievements.grantSocialAchievementByFid);

  useEffect(() => {
    async function promptAddMiniApp() {
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
        // Neynar receives the token via webhook configured in farcaster.json
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

        // If user enabled notifications, grant achievement
        // Token is sent to Neynar via webhook - we just track the achievement
        if (result?.notificationDetails) {
          console.log('[FarcasterNotification] ✅ Notifications enabled for FID:', fid, '(token managed by Neynar)');

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
        console.error('Error in addMiniApp flow:', error);
      }
    }

    promptAddMiniApp();
  }, [grantSocialAchievement]);

  return null; // This component doesn't render anything
}
