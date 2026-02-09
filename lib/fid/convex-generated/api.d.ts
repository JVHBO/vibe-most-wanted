/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as audioStorage from "../audioStorage.js";
import type * as cardValidation from "../cardValidation.js";
import type * as cardVotes from "../cardVotes.js";
import type * as farcasterCards from "../farcasterCards.js";
import type * as mostWanted from "../mostWanted.js";
import type * as neynarScore from "../neynarScore.js";
import type * as nftGifts from "../nftGifts.js";
import type * as notifications from "../notifications.js";
import type * as pendingMints from "../pendingMints.js";
import type * as vibeRewards from "../vibeRewards.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  audioStorage: typeof audioStorage;
  cardValidation: typeof cardValidation;
  cardVotes: typeof cardVotes;
  farcasterCards: typeof farcasterCards;
  mostWanted: typeof mostWanted;
  neynarScore: typeof neynarScore;
  nftGifts: typeof nftGifts;
  notifications: typeof notifications;
  pendingMints: typeof pendingMints;
  vibeRewards: typeof vibeRewards;
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
