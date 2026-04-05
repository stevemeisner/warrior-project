/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as auth from "../auth.js";
import type * as blockedUsers from "../blockedUsers.js";
import type * as caregivers from "../caregivers.js";
import type * as crons from "../crons.js";
import type * as email from "../email.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as moderation from "../moderation.js";
import type * as notifications from "../notifications.js";
import type * as rateLimit from "../rateLimit.js";
import type * as search from "../search.js";
import type * as status from "../status.js";
import type * as storage from "../storage.js";
import type * as supportRequests from "../supportRequests.js";
import type * as threads from "../threads.js";
import type * as typing from "../typing.js";
import type * as warriors from "../warriors.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  auth: typeof auth;
  blockedUsers: typeof blockedUsers;
  caregivers: typeof caregivers;
  crons: typeof crons;
  email: typeof email;
  emailTemplates: typeof emailTemplates;
  http: typeof http;
  messages: typeof messages;
  moderation: typeof moderation;
  notifications: typeof notifications;
  rateLimit: typeof rateLimit;
  search: typeof search;
  status: typeof status;
  storage: typeof storage;
  supportRequests: typeof supportRequests;
  threads: typeof threads;
  typing: typeof typing;
  warriors: typeof warriors;
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
