const BASE_NOTIFICATIONS_API = "https://dashboard.base.org/api/v1/notifications";

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

function getBaseNotificationsApiKey(): string {
  const key =
    process.env.BASE_NOTIFICATIONS_API_KEY ||
    process.env.BASE_BUILDER_API_KEY ||
    process.env.BUILDER_API_KEY;
  if (!key) {
    throw new Error(
      "Missing Base notifications API key. Set BASE_NOTIFICATIONS_API_KEY (or BASE_BUILDER_API_KEY)."
    );
  }
  return key;
}

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
  const apiKey = getBaseNotificationsApiKey();
  const walletAddresses = [...new Set(params.walletAddresses.map((w) => w.toLowerCase()))].slice(0, 1000);

  if (walletAddresses.length === 0) {
    return { success: true, results: [], sentCount: 0, failedCount: 0 };
  }

  const payload: Record<string, unknown> = {
    app_url: getBaseNotificationsAppUrl(),
    wallet_addresses: walletAddresses,
    title: params.title.slice(0, 30),
    message: params.message.slice(0, 200),
  };

  if (params.targetPath?.startsWith("/")) {
    payload.target_path = params.targetPath.slice(0, 500);
  }

  const response = await fetch(`${BASE_NOTIFICATIONS_API}/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    throw new Error(
      `Base notifications send failed (${response.status}): ${json?.error || text || "unknown error"}`
    );
  }

  return {
    success: Boolean(json?.success),
    results: Array.isArray(json?.results) ? json.results : [],
    sentCount: Number(json?.sentCount || 0),
    failedCount: Number(json?.failedCount || 0),
  };
}

export async function listBaseNotificationUsers(params?: {
  notificationsEnabled?: boolean;
  limit?: number;
}): Promise<string[]> {
  const apiKey = getBaseNotificationsApiKey();
  const appUrl = getBaseNotificationsAppUrl();
  const limit = Math.min(Math.max(params?.limit ?? 100, 1), 100);
  const addresses: string[] = [];
  let cursor: string | undefined;

  while (true) {
    const url = new URL(`${BASE_NOTIFICATIONS_API}/app/users`);
    url.searchParams.set("app_url", appUrl);
    url.searchParams.set("limit", String(limit));
    if (params?.notificationsEnabled !== undefined) {
      url.searchParams.set("notification_enabled", String(params.notificationsEnabled));
    }
    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "x-api-key": apiKey },
    });
    const text = await response.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!response.ok) {
      throw new Error(
        `Base notifications users failed (${response.status}): ${json?.error || text || "unknown error"}`
      );
    }

    const users = Array.isArray(json?.users) ? json.users : [];
    for (const user of users) {
      if (typeof user?.address === "string" && user.address) {
        addresses.push(user.address.toLowerCase());
      }
    }

    if (!json?.nextCursor) break;
    cursor = String(json.nextCursor);
  }

  return [...new Set(addresses)];
}
