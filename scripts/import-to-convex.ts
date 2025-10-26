/**
 * 📥 IMPORT FIREBASE BACKUP TO CONVEX
 *
 * Reads backup.json and imports all data into Convex
 *
 * Usage:
 * 1. First deploy your Convex schema: npx convex deploy
 * 2. Then run: npx tsx scripts/import-to-convex.ts
 */

import { ConvexHttpClient } from "convex/browser";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { api } from "../convex/_generated/api.js";

// Load .env.local
dotenv.config({ path: ".env.local" });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ NEXT_PUBLIC_CONVEX_URL not found in .env.local");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

interface FirebaseBackup {
  playerMatches?: Record<string, Record<string, any>>;
  profiles?: Record<string, any>;
  usernames?: Record<string, string>;
  rooms?: Record<string, any>;
  matchmaking?: Record<string, any>;
  notificationTokens?: Record<string, any>;
}

async function importData() {
  console.log("📥 CONVEX IMPORT STARTING");
  console.log("=".repeat(60));
  console.log("");

  // Read backup
  const backupPath = path.join(__dirname, "../backup.json");
  console.log(`📂 Reading backup from: ${backupPath}`);

  if (!fs.existsSync(backupPath)) {
    console.error("❌ backup.json not found!");
    console.error(`   Expected at: ${backupPath}`);
    process.exit(1);
  }

  const backupData: FirebaseBackup = JSON.parse(
    fs.readFileSync(backupPath, "utf-8")
  );

  // Import Profiles
  console.log("\n👤 Importing profiles...");
  let profileCount = 0;

  if (backupData.profiles) {
    for (const [address, profile] of Object.entries(backupData.profiles)) {
      try {
        // Import using upsertProfile mutation
        await client.mutation(api.profiles.upsertProfile, {
          address: profile.address || address,
          username: profile.username || `user_${address.slice(2, 8)}`,
          stats: profile.stats || {
            totalPower: 0,
            totalCards: 0,
            openedCards: 0,
            unopenedCards: 0,
            pveWins: 0,
            pveLosses: 0,
            pvpWins: 0,
            pvpLosses: 0,
            attackWins: 0,
            attackLosses: 0,
            defenseWins: 0,
            defenseLosses: 0,
          },
          defenseDeck: profile.defenseDeck,
          twitter: profile.twitter,
          twitterHandle: profile.twitterHandle,
        });

        // Update attack tracking if present
        if (profile.attacksToday || profile.lastAttackDate) {
          await client.mutation(api.profiles.updateAttacks, {
            address: profile.address || address,
            attacksToday: profile.attacksToday || 0,
            lastAttackDate: profile.lastAttackDate || new Date().toISOString().split("T")[0],
          });
        }

        profileCount++;
        console.log(`   ✅ ${profile.username || address}`);
      } catch (error) {
        console.error(`   ❌ Failed to import ${address}:`, error);
      }
    }
  }
  console.log(`\n   Total: ${profileCount} profiles imported`);

  // Import Matches
  console.log("\n⚔️  Importing matches...");
  let matchCount = 0;

  if (backupData.playerMatches) {
    for (const [playerAddress, matches] of Object.entries(
      backupData.playerMatches
    )) {
      for (const [matchId, match] of Object.entries(matches)) {
        try {
          await client.mutation(api.matches.recordMatch, {
            playerAddress: match.playerAddress || playerAddress,
            type: match.type || "pvp",
            result: match.result === "draw" ? "tie" : (match.result || "tie"),
            playerPower: match.playerPower || 0,
            opponentPower: match.opponentPower || 0,
            playerCards: match.playerCards || [],
            opponentCards: match.opponentCards || [],
            opponentAddress: match.opponentAddress,
            opponentUsername: match.opponentUsername,
          });

          matchCount++;
        } catch (error) {
          console.error(`   ❌ Failed to import match ${matchId}:`, error);
        }
      }
    }
  }
  console.log(`   ✅ ${matchCount} matches imported`);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("✅ IMPORT COMPLETE!");
  console.log("=".repeat(60));
  console.log(`📊 Summary:`);
  console.log(`   - Profiles: ${profileCount}`);
  console.log(`   - Matches: ${matchCount}`);
  console.log("");
  console.log("🎯 Next steps:");
  console.log("   1. Verify data in Convex dashboard");
  console.log("   2. Update frontend to use Convex queries");
  console.log("   3. Test the app!");
  console.log("=".repeat(60));
}

// Run import
importData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Import failed:", error);
    process.exit(1);
  });
