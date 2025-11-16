/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as achievementDefinitions from "../achievementDefinitions.js";
import type * as achievements from "../achievements.js";
import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as backup from "../backup.js";
import type * as bettingCredits from "../bettingCredits.js";
import type * as cardPacks from "../cardPacks.js";
import type * as coinsInbox from "../coinsInbox.js";
import type * as crons from "../crons.js";
import type * as cryptoActions from "../cryptoActions.js";
import type * as economy from "../economy.js";
import type * as economyVBMS from "../economyVBMS.js";
import type * as importData from "../importData.js";
import type * as languageBoost from "../languageBoost.js";
import type * as matches from "../matches.js";
import type * as migrations_cleanDefenseDecks from "../migrations/cleanDefenseDecks.js";
import type * as migrations_normalizeUsernames from "../migrations/normalizeUsernames.js";
import type * as missions from "../missions.js";
import type * as nftCollections from "../nftCollections.js";
import type * as notifications from "../notifications.js";
import type * as notificationsHelpers from "../notificationsHelpers.js";
import type * as pokerBattle from "../pokerBattle.js";
import type * as pokerChat from "../pokerChat.js";
import type * as pokerCpu from "../pokerCpu.js";
import type * as profiles from "../profiles.js";
import type * as pvp from "../pvp.js";
import type * as quests from "../quests.js";
import type * as rewardsChoice from "../rewardsChoice.js";
import type * as rooms from "../rooms.js";
import type * as scheduledTips from "../scheduledTips.js";
import type * as shopAnnouncement from "../shopAnnouncement.js";
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

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  achievementDefinitions: typeof achievementDefinitions;
  achievements: typeof achievements;
  admin: typeof admin;
  auth: typeof auth;
  backup: typeof backup;
  bettingCredits: typeof bettingCredits;
  cardPacks: typeof cardPacks;
  coinsInbox: typeof coinsInbox;
  crons: typeof crons;
  cryptoActions: typeof cryptoActions;
  economy: typeof economy;
  economyVBMS: typeof economyVBMS;
  importData: typeof importData;
  languageBoost: typeof languageBoost;
  matches: typeof matches;
  "migrations/cleanDefenseDecks": typeof migrations_cleanDefenseDecks;
  "migrations/normalizeUsernames": typeof migrations_normalizeUsernames;
  missions: typeof missions;
  nftCollections: typeof nftCollections;
  notifications: typeof notifications;
  notificationsHelpers: typeof notificationsHelpers;
  pokerBattle: typeof pokerBattle;
  pokerChat: typeof pokerChat;
  pokerCpu: typeof pokerCpu;
  profiles: typeof profiles;
  pvp: typeof pvp;
  quests: typeof quests;
  rewardsChoice: typeof rewardsChoice;
  rooms: typeof rooms;
  scheduledTips: typeof scheduledTips;
  shopAnnouncement: typeof shopAnnouncement;
  stats: typeof stats;
  utils: typeof utils;
  vbmsClaim: typeof vbmsClaim;
  voiceChat: typeof voiceChat;
  welcomePack: typeof welcomePack;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
