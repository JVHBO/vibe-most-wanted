import { NextRequest, NextResponse } from 'next/server';

// Neynar API key for posting — uses dedicated bot key (VibeFID account)
const NEYNAR_API_KEY = process.env.NEYNAR_BOT_API_KEY || process.env.NEYNAR_API_KEY!;
const BOT_SIGNER_UUID = process.env.BOT_SIGNER_UUID!;
const HAATZ = 'https://haatz.quilibrium.com/v2';

// 🚀 BANDWIDTH FIX: Rate limit bot responses per user+target window
// Prevents same user from triggering bot multiple times for same target in short window
const botCooldownKey = new Map<string, number>();
const BOT_COOLDOWN_MS = 5 * 60 * 1000; // 5 min cooldown per user+target combo

// Cache Neynar score responses per FID
const scoreCache = new Map<number, { expiresAt: number; score: number; rarity: string }>();
const SCORE_TTL = 10 * 60 * 1000; // 10 min

// Keywords that trigger the bot
const TRIGGER_KEYWORDS = [
  'neynar score',
  'neymar score',  // typo variant
  'my score',
  'check score',
  'score?',
  'what is',       // "what is @user score" pattern
  'whats',         // "whats @user score" pattern
  'score @',       // "score @user" pattern
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Neynar webhook payload
    const { data } = body;

    if (!data) {
      return NextResponse.json({ error: 'No data' }, { status: 400 });
    }

    // Extract cast info
    const cast = data.object === 'cast' ? data : data.cast;
    if (!cast) {
      return NextResponse.json({ ok: true, message: 'Not a cast' });
    }

    const authorFid = cast.author?.fid;
    const castText = cast.text?.toLowerCase() || '';
    const originalText = cast.text || '';
    const castHash = cast.hash;
    const authorUsername = cast.author?.username || 'anon';

    if (!authorFid || !castHash) {
      return NextResponse.json({ ok: true, message: 'Missing author or hash' });
    }

    // Check if message contains trigger keywords
    const shouldRespond = TRIGGER_KEYWORDS.some(keyword =>
      castText.includes(keyword.toLowerCase())
    );

    if (!shouldRespond) {
      return NextResponse.json({ ok: true, message: 'No trigger keyword' });
    }

    // Check if there's another @mention (not @vibefid) to look up their score
    const mentionRegex = /@(\w+(?:\.\w+)*)/g;
    const mentions = originalText.match(mentionRegex) || [];
    const otherMentions = mentions.filter((m: string) =>
      m.toLowerCase() !== '@vibefid' &&
      m.toLowerCase() !== '@vibefid.base.eth'
    );

    let targetFid = authorFid;
    let targetUsername = authorUsername;
    let targetDisplayName = cast.author?.display_name || authorUsername;
    let isLookingUpOther = false;

    // If there's another mention, look up that user instead
    if (otherMentions.length > 0) {
      const targetMention = otherMentions[0].substring(1); // Remove @
      try {
        // Haatz primary (free), Neynar fallback
        let lookupResponse = await fetch(
          `${HAATZ}/farcaster/user/by-username?username=${targetMention}`,
          { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(4000) }
        ).catch(() => null);
        if (!lookupResponse?.ok) {
          lookupResponse = await fetch(
            `https://api.neynar.com/v2/farcaster/user/by_username?username=${targetMention}`,
            { headers: { 'x-api-key': NEYNAR_API_KEY } }
          ).catch(() => ({ ok: false } as any));
        }
        if (lookupResponse && lookupResponse.ok) {
          const lookupData = await lookupResponse.json();
          if (lookupData.user) {
            targetFid = lookupData.user.fid;
            targetUsername = lookupData.user.username;
            targetDisplayName = lookupData.user.display_name || targetUsername;
            isLookingUpOther = true;
          }
        }
      } catch (e) {
        console.log(`Failed to lookup @${targetMention}`);
      }
    }

    console.log(`Bot triggered by @${authorUsername} for @${targetUsername} (FID: ${targetFid})`);

    // 🚀 BANDWIDTH FIX: Check cooldown for same user requesting same target
    if (!isLookingUpOther) {
      const cooldownEntry = botCooldownKey.get(`${authorFid}:${targetFid}`);
      if (cooldownEntry && Date.now() - cooldownEntry < BOT_COOLDOWN_MS) {
        console.log(`Bot cooldown: @${authorUsername} already checked @${targetUsername} recently`);
        return NextResponse.json({ ok: true, message: 'Bot cooldown, try again later' });
      }
      botCooldownKey.set(`${authorFid}:${targetFid}`, Date.now());

      // Clean old entries when map grows
      if (botCooldownKey.size > 500) {
        const cutoff = Date.now() - BOT_COOLDOWN_MS;
        for (const [key, time] of botCooldownKey.entries()) {
          if (time < cutoff) botCooldownKey.delete(key);
        }
      }
    }

    // 🚀 BANDWIDTH FIX: Use cached score if available
    const cachedScore = scoreCache.get(targetFid);
    let score = cachedScore?.score ?? 0;
    let rarity = cachedScore?.rarity ?? 'Common';

    if (cachedScore && Date.now() < cachedScore.expiresAt) {
      // Cache hit — skip Neynar call
      console.log(`[Bot] Score cache HIT for FID ${targetFid}: ${score}`);
    } else {
      // Cache miss — fetch user (Haatz primary, Neynar fallback for score)
      const ac = new AbortController();
      const timeout = setTimeout(() => ac.abort(), 5000);
      const [userResponse, rankResponse, openRankResponse] = await Promise.all([
        // Haatz primary (free), Neynar fallback for neynar_user_score
        fetch(`${HAATZ}/farcaster/user/bulk?fids=${targetFid}`, {
          headers: { accept: 'application/json' },
          signal: ac.signal,
        }).then(r => r.ok ? r : fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${targetFid}`, {
          headers: { 'x-api-key': NEYNAR_API_KEY },
        })).catch(() => fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${targetFid}`, {
          headers: { 'x-api-key': NEYNAR_API_KEY },
        })),
        // VibeFID rank from Convex
        fetch("https://scintillating-mandrill-101.convex.cloud/api/query", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: 'farcasterCards:getVibeFIDRank',
            args: { fid: targetFid },
            format: 'json',
          }),
          signal: ac.signal,
        }).catch(() => null),
        // OpenRank global rank
        fetch('https://graph.cast.k3l.io/scores/global/engagement/fids', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([targetFid]),
          signal: ac.signal,
        }).catch(() => null),
      ]);
      clearTimeout(timeout);

      if (userResponse.ok) {
        const userData = await userResponse.json();
        const user = userData.users?.[0];
        if (user) {
          score = user.experimental?.neynar_user_score || user.score || 0;
          targetDisplayName = user.display_name || targetUsername;

          if (score >= 0.99) rarity = 'Mythic';
          else if (score >= 0.90) rarity = 'Legendary';
          else if (score >= 0.79) rarity = 'Epic';
          else if (score >= 0.70) rarity = 'Rare';

          scoreCache.set(targetFid, { expiresAt: Date.now() + SCORE_TTL, score, rarity });
        }
      }

      let vibefidRank = '';
      if (rankResponse?.ok) {
        try {
          const rankData = await rankResponse.json();
          if (rankData.value?.rank) {
            vibefidRank = `#${rankData.value.rank.toLocaleString()}`;
          }
        } catch (e) {}
      }

      let globalRank = '';
      let isEstimated = false;
      if (openRankResponse?.ok) {
        try {
          const openRankData = await openRankResponse.json();
          const results = openRankData.result || openRankData;
          if (Array.isArray(results) && results.length > 0 && results[0].rank) {
            globalRank = `#${results[0].rank.toLocaleString()}`;
          }
        } catch (e) {}
      }
      // Fallback: estimate rank based on Neynar Score
      if (!globalRank && score > 0) {
        const estimatedRank = Math.max(1, Math.round(800000 * (1 - score)));
        globalRank = `~#${estimatedRank.toLocaleString()}`;
        isEstimated = true;
      }
    }

    // Build the score text with all info
    let scoreText = '';
    if (isLookingUpOther) {
      scoreText = `@${authorUsername} asked about @${targetUsername}:\n\n`;
    }
    scoreText += `${targetDisplayName} @${targetUsername}\n\n`;
    scoreText += `Neynar Score: ${score.toFixed(3)} (${rarity})\n`;
    scoreText += `\nGet your playable VibeFID card:`;

    // Share page URL (the actual page with OG image)
    const shareUrl = `https://vibemostwanted.xyz/share/score/${targetFid}`;

    // Reply directly to the user's cast
    const replyResponse = await fetch('https://api.neynar.com/v2/farcaster/cast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': NEYNAR_API_KEY,
      },
      body: JSON.stringify({
        signer_uuid: BOT_SIGNER_UUID,
        text: scoreText,
        parent: castHash,
        embeds: [
          { url: shareUrl }
        ],
      }),
    });

    if (replyResponse.ok) {
      const result = await replyResponse.json();
      console.log(`Bot replied to @${authorUsername}`);
      return NextResponse.json({ ok: true, message: 'Reply posted', cast: result.cast?.hash });
    } else {
      const error = await replyResponse.text();
      console.error('Failed to post reply:', error);
      return NextResponse.json({
        error: 'Failed to post reply',
        details: error,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Bot webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'VibeFID Bot is running',
    configured: !!BOT_SIGNER_UUID && !!NEYNAR_API_KEY,
  });
}
