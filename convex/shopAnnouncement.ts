import { internalMutation } from "./_generated/server";

export const sendShopAnnouncement = internalMutation({
  args: {},
  handler: async () => ({
    success: true,
    notificationsSent: 0,
    totalCoinsDistributed: 0,
    notificationsDisabled: true,
    rewardsDisabled: true,
  }),
});
