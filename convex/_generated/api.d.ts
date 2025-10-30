/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as cryptoActions from "../cryptoActions.js";
import type * as importData from "../importData.js";
import type * as matches from "../matches.js";
import type * as migrations_cleanDefenseDecks from "../migrations/cleanDefenseDecks.js";
import type * as notifications from "../notifications.js";
import type * as profiles from "../profiles.js";
import type * as rooms from "../rooms.js";

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
  auth: typeof auth;
  cryptoActions: typeof cryptoActions;
  importData: typeof importData;
  matches: typeof matches;
  "migrations/cleanDefenseDecks": typeof migrations_cleanDefenseDecks;
  notifications: typeof notifications;
  profiles: typeof profiles;
  rooms: typeof rooms;
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
