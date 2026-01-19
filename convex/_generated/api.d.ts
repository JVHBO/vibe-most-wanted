/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accessAnalytics from "../accessAnalytics.js";
import type * as achievementDefinitions from "../achievementDefinitions.js";
import type * as achievements from "../achievements.js";
import type * as admin from "../admin.js";
import type * as apiStats from "../apiStats.js";
import type * as arenaCardsData from "../arenaCardsData.js";
import type * as auth from "../auth.js";
import type * as baccarat from "../baccarat.js";
import type * as backup from "../backup.js";
import type * as bettingCredits from "../bettingCredits.js";
import type * as blacklist from "../blacklist.js";
import type * as blockchainVerify from "../blockchainVerify.js";
import type * as cardPacks from "../cardPacks.js";
import type * as cardSchema from "../cardSchema.js";
import type * as cardValidation from "../cardValidation.js";
import type * as cardVotes from "../cardVotes.js";
import type * as castAuctions from "../castAuctions.js";
import type * as coinAudit from "../coinAudit.js";
import type * as coinsInbox from "../coinsInbox.js";
import type * as crons from "../crons.js";
import type * as cryptoActions from "../cryptoActions.js";
import type * as economy from "../economy.js";
import type * as economyVBMS from "../economyVBMS.js";
import type * as emergencyRestore from "../emergencyRestore.js";
import type * as farcasterCards from "../farcasterCards.js";
import type * as farcasterCardsAdmin from "../farcasterCardsAdmin.js";
import type * as featuredCasts from "../featuredCasts.js";
import type * as fixAuctionTimer from "../fixAuctionTimer.js";
import type * as importData from "../importData.js";
import type * as languageBoost from "../languageBoost.js";
import type * as matches from "../matches.js";
import type * as missions from "../missions.js";
import type * as mostWanted from "../mostWanted.js";
import type * as neynarScore from "../neynarScore.js";
import type * as nftCache from "../nftCache.js";
import type * as nftCollections from "../nftCollections.js";
import type * as nftGifts from "../nftGifts.js";
import type * as notifications from "../notifications.js";
import type * as notificationsHelpers from "../notificationsHelpers.js";
import type * as pokerBattle from "../pokerBattle.js";
import type * as pokerChat from "../pokerChat.js";
import type * as pokerCpu from "../pokerCpu.js";
import type * as priceSnapshots from "../priceSnapshots.js";
import type * as profiles from "../profiles.js";
import type * as pvp from "../pvp.js";
import type * as quests from "../quests.js";
import type * as raidBoss from "../raidBoss.js";
import type * as rewardsChoice from "../rewardsChoice.js";
import type * as rooms from "../rooms.js";
import type * as roulette from "../roulette.js";
import type * as roundBetting from "../roundBetting.js";
import type * as scheduledTips from "../scheduledTips.js";
import type * as sessions from "../sessions.js";
import type * as shopAnnouncement from "../shopAnnouncement.js";
import type * as socialQuests from "../socialQuests.js";
import type * as stats from "../stats.js";
import type * as utils from "../utils.js";
import type * as vbmsClaim from "../vbmsClaim.js";
import type * as voiceChat from "../voiceChat.js";
import type * as welcomePack from "../welcomePack.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accessAnalytics: typeof accessAnalytics;
  achievementDefinitions: typeof achievementDefinitions;
  achievements: typeof achievements;
  admin: typeof admin;
  apiStats: typeof apiStats;
  arenaCardsData: typeof arenaCardsData;
  auth: typeof auth;
  baccarat: typeof baccarat;
  backup: typeof backup;
  bettingCredits: typeof bettingCredits;
  blacklist: typeof blacklist;
  blockchainVerify: typeof blockchainVerify;
  cardPacks: typeof cardPacks;
  cardSchema: typeof cardSchema;
  cardValidation: typeof cardValidation;
  cardVotes: typeof cardVotes;
  castAuctions: typeof castAuctions;
  coinAudit: typeof coinAudit;
  coinsInbox: typeof coinsInbox;
  crons: typeof crons;
  cryptoActions: typeof cryptoActions;
  economy: typeof economy;
  economyVBMS: typeof economyVBMS;
  emergencyRestore: typeof emergencyRestore;
  farcasterCards: typeof farcasterCards;
  farcasterCardsAdmin: typeof farcasterCardsAdmin;
  featuredCasts: typeof featuredCasts;
  fixAuctionTimer: typeof fixAuctionTimer;
  importData: typeof importData;
  languageBoost: typeof languageBoost;
  matches: typeof matches;
  missions: typeof missions;
  mostWanted: typeof mostWanted;
  neynarScore: typeof neynarScore;
  nftCache: typeof nftCache;
  nftCollections: typeof nftCollections;
  nftGifts: typeof nftGifts;
  notifications: typeof notifications;
  notificationsHelpers: typeof notificationsHelpers;
  pokerBattle: typeof pokerBattle;
  pokerChat: typeof pokerChat;
  pokerCpu: typeof pokerCpu;
  priceSnapshots: typeof priceSnapshots;
  profiles: typeof profiles;
  pvp: typeof pvp;
  quests: typeof quests;
  raidBoss: typeof raidBoss;
  rewardsChoice: typeof rewardsChoice;
  rooms: typeof rooms;
  roulette: typeof roulette;
  roundBetting: typeof roundBetting;
  scheduledTips: typeof scheduledTips;
  sessions: typeof sessions;
  shopAnnouncement: typeof shopAnnouncement;
  socialQuests: typeof socialQuests;
  stats: typeof stats;
  utils: typeof utils;
  vbmsClaim: typeof vbmsClaim;
  voiceChat: typeof voiceChat;
  welcomePack: typeof welcomePack;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
