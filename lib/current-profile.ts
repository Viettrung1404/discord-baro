import { auth, clerkClient } from "@clerk/nextjs/server";

import { db } from "@/lib/db";

export const currentProfile = async () => {
    const { userId } = await auth();
    console.info("[CLERK_PROFILE_SYNC] currentProfile called", { userId });
    
    if (!userId) {
        console.warn("[CLERK_PROFILE_SYNC] No userId from auth()");
        return null;
    }

    let profile = await db.profile.findUnique({
        where: { userId }
    });

    if (profile) {
        return profile;
    }

    try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const fallbackName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.id;
        const fallbackEmail = user.emailAddresses?.[0]?.emailAddress ?? user.primaryEmailAddress?.emailAddress ?? "";

        profile = await db.profile.create({
            data: {
                userId,
                name: fallbackName,
                imageUrl: user.imageUrl,
                email: fallbackEmail,
            },
        });

        console.info("[CLERK_PROFILE_SYNC] Created profile from currentUser", {
            userId,
            profileId: profile.id,
        });

        return profile;
    } catch (error) {
        console.error("[CLERK_PROFILE_SYNC] Failed to create profile from currentUser", {
            userId,
            error,
        });
        return null;
    }
}