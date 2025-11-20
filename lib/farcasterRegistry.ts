/**
 * Farcaster Registry utilities
 * Fetch account creation timestamps from onchain data
 */

/**
 * Fetch Farcaster account creation date by FID using Airstack API
 */
export async function getFarcasterAccountCreationDate(fid: number): Promise<Date | null> {
  try {
    // Try Airstack API first (has real onchain data)
    const airstackApiKey = process.env.AIRSTACK_API_KEY || process.env.NEXT_PUBLIC_AIRSTACK_API_KEY;

    if (airstackApiKey) {
      const airstackDate = await fetchFromAirstack(fid, airstackApiKey);
      if (airstackDate) return airstackDate;
    }

    // Fallback: Try Neynar API
    const neynarApiKey = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;

    if (neynarApiKey) {
      const neynarDate = await fetchFromNeynar(fid, neynarApiKey);
      if (neynarDate) return neynarDate;
    }

    // Final fallback: approximation
    console.warn('No API keys found, using FID-based approximation');
    return approximateCreationDate(fid);

  } catch (error) {
    console.error('Error fetching account creation date:', error);
    return approximateCreationDate(fid);
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
    });

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
 */
async function fetchFromNeynar(fid: number, apiKey: string): Promise<Date | null> {
  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          'accept': 'application/json',
          'api_key': apiKey,
        },
      }
    );

    if (!response.ok) {
      console.warn(`Neynar API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.users && data.users[0]) {
      const user = data.users[0];

      if (user.registered_at) {
        return new Date(user.registered_at);
      }
      if (user.created_at) {
        return new Date(user.created_at);
      }
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
