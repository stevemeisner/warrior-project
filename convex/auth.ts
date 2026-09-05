import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import type { DataModel } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Google OAuth - primary authentication method
    Google,
    // Email/password - fallback authentication.
    // The default profile only keeps `email`; we also keep the name typed at
    // signup so onboarding can create the account record with it.
    Password<DataModel>({
      profile(params) {
        const name = typeof params.name === "string" ? params.name.trim() : "";
        return {
          email: (params.email as string).trim().toLowerCase(),
          ...(name ? { name } : {}),
        };
      },
    }),
  ],
});
