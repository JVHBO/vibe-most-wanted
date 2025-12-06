/**
 * Farcaster Registry utilities
 * Fetch account creation timestamps from onchain data
 */

/**
 * Fetch Farcaster account creation date by FID
 * Priority: Farcaster Hub (free) → Airstack (free) → Neynar (paid endpoint)
 */
export async function getFarcasterAccountCreationDate(fid: number): Promise<Date | null> {
  try {
    // Try Farcaster Hub first (FREE - no API key needed!)
    const hubDate = await fetchFromFarcasterHub(fid);
    if (hubDate) return hubDate;

    // Try Airstack API (free with API key)
    const airstackApiKey = process.env.AIRSTACK_API_KEY || process.env.NEXT_PUBLIC_AIRSTACK_API_KEY;

    if (airstackApiKey) {
      const airstackDate = await fetchFromAirstack(fid, airstackApiKey);
      if (airstackDate) return airstackDate;
    }

    // Fallback: Try Neynar API (may not return dates on free tier)
    const neynarApiKey = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;

    if (neynarApiKey) {
      const neynarDate = await fetchFromNeynar(fid, neynarApiKey);
      if (neynarDate) return neynarDate;
    }

    // NO APPROXIMATIONS - Return null if no real data available
    console.warn(`Could not fetch real creation date for FID ${fid}`);
    console.warn('Tried: Farcaster Hub (free), Airstack (needs key), Neynar (needs key)');
    return null;

  } catch (error) {
    console.error('Error fetching account creation date:', error);
    return null;
  }
}

/**
 * Fetch creation date from Farcaster Hub (FREE - no API key needed!)
 * Uses Pinata's free Hub endpoint to get onchain IdRegistry data
 */
async function fetchFromFarcasterHub(fid: number): Promise<Date | null> {
  try {
    // Try Pinata Hub first (most reliable free endpoint)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(
      `https://hub.pinata.cloud/v1/onChainEventsByFid?fid=${fid}&event_type=EVENT_TYPE_ID_REGISTER`,
      {
        headers: {
          'accept': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Farcaster Hub API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Extract registration timestamp from onchain event
    if (data.events && data.events.length > 0) {
      const registerEvent = data.events[0];

      if (registerEvent.blockTimestamp) {
        // blockTimestamp is in seconds since epoch
        return new Date(registerEvent.blockTimestamp * 1000);
      }
    }

    return null;
  } catch (error) {
    console.error('Farcaster Hub fetch error:', error);
    return null;
  }
}

/**
 * Fetch creation date from Airstack API (GraphQL)
 */
async function fetchFromAirstack(fid: number, apiKey: string): Promise<Date | null> {
  try {
    const query = `
      query GetFarcasterUser($fid: String!) {
        Socials(
          input: {
            filter: {
              dappName: { _eq: farcaster }
              userId: { _eq: $fid }
            }
            blockchain: ethereum
          }
        ) {
          Social {
            userId
            profileCreatedAtBlockTimestamp
            createdAtBlockTimestamp
          }
        }
      }
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch('https://api.airstack.xyz/gql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
      },
      body: JSON.stringify({
        query,
        variables: { fid: fid.toString() },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Airstack API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.data?.Socials?.Social?.[0]) {
      const social = data.data.Socials.Social[0];
      const timestamp = social.profileCreatedAtBlockTimestamp || social.createdAtBlockTimestamp;

      if (timestamp) {
        return new Date(timestamp);
      }
    }

    return null;
  } catch (error) {
    console.error('Airstack fetch error:', error);
    return null;
  }
}

/**
 * Fetch creation date from Neynar API
 * Using bulk endpoint (free tier): GET /v2/farcaster/user/bulk?fids={FID}
 */
async function fetchFromNeynar(fid: number, apiKey: string): Promise<Date | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          'accept': 'application/json',
          'api_key': apiKey,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Neynar API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.users && data.users[0]) {
      const user = data.users[0];

      // Try various possible timestamp fields
      // Note: bulk endpoint may not return creation dates (needs testing)
      if (user.registered_at) {
        return new Date(user.registered_at);
      }
      if (user.created_at) {
        return new Date(user.created_at);
      }
      if (user.timestamp) {
        return new Date(user.timestamp);
      }

      // If no date fields available, return null
      // Don't use approximations per user request
      console.warn(`No date fields found in Neynar response for FID ${fid}`);
    }

    return null;
  } catch (error) {
    console.error('Neynar fetch error:', error);
    return null;
  }
}

/**
 * Approximate account creation date based on FID
 * Lower FIDs = earlier accounts
 *
 * Real data points:
 * - FID 1 (@farcaster): Aug 13 2021 19:28 UTC
 * - FID 1-1000: Aug-Oct 2021 (founders/team)
 * - FID 1k-10k: Late 2021 - 2022 (alpha testers)
 * - FID 10k-100k: 2022-2023 (early adopters)
 * - FID 100k+: 2023+ (public growth)
 */
function approximateCreationDate(fid: number): Date {
  // FID 1-1000: Aug 2021 - Dec 2021 (5 months)
  // FID 1 = Aug 13 2021
  if (fid <= 1000) {
    const daysOffset = Math.floor((fid / 1000) * 150); // ~5 months = 150 days
    const baseDate = new Date(2021, 7, 13); // Aug 13 2021
    return new Date(baseDate.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  }

  // FID 1k-10k: Jan 2022 - Dec 2022 (12 months)
  if (fid <= 10000) {
    const monthsOffset = Math.floor(((fid - 1000) / 9000) * 12);
    return new Date(2022, monthsOffset, 1);
  }

  // FID 10k-100k: Jan 2023 - Dec 2023 (12 months)
  if (fid <= 100000) {
    const monthsOffset = Math.floor(((fid - 10000) / 90000) * 12);
    return new Date(2023, monthsOffset, 1);
  }

  // FID 100k-500k: Jan 2024 - Jun 2024 (6 months)
  if (fid <= 500000) {
    const monthsOffset = Math.floor(((fid - 100000) / 400000) * 6);
    return new Date(2024, monthsOffset, 1);
  }

  // FID 500k-1M: Jul 2024 - Dec 2024 (6 months)
  if (fid <= 1000000) {
    const monthsOffset = Math.floor(((fid - 500000) / 500000) * 6);
    return new Date(2024, 6 + monthsOffset, 1);
  }

  // FID > 1M: 2025+ (current growth)
  const monthsOffset = Math.min(Math.floor(((fid - 1000000) / 100000) * 1), 11);
  return new Date(2025, monthsOffset, 1);
}
