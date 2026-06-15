type BaseNotificationResult = {
  walletAddress: string;
  sent: boolean;
  failureReason?: string;
};

export type SendBaseNotificationsResponse = {
  success: boolean;
  results: BaseNotificationResult[];
  sentCount: number;
  failedCount: number;
};

export function getBaseNotificationsAppUrl(): string {
  return (
    process.env.BASE_NOTIFICATIONS_APP_URL ||
    process.env.NEXT_PUBLIC_URL ||
    "https://vibemostwanted.xyz"
  );
}

export async function sendBaseNotifications(params: {
  walletAddresses: string[];
  title: string;
  message: string;
  targetPath?: string;
}): Promise<SendBaseNotificationsResponse> {
  const walletAddresses = [...new Set(params.walletAddresses.map((w) => w.toLowerCase()))].slice(0, 1000);

  return {
    success: true,
    results: walletAddresses.map((walletAddress) => ({
      walletAddress,
      sent: false,
      failureReason: "notifications disabled",
    })),
    sentCount: 0,
    failedCount: 0,
  };
}

export async function listBaseNotificationUsers(_params?: {
  notificationsEnabled?: boolean;
  limit?: number;
}): Promise<string[]> {
  return [];
}
