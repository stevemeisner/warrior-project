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
import type * as email from "../email.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as search from "../search.js";
import type * as status from "../status.js";
import type * as supportRequests from "../supportRequests.js";
import type * as threads from "../threads.js";
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
  email: typeof email;
  http: typeof http;
  messages: typeof messages;
  notifications: typeof notifications;
  search: typeof search;
  status: typeof status;
  supportRequests: typeof supportRequests;
  threads: typeof threads;
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
