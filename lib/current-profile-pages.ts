import { clerkClient, getAuth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { NextApiRequest } from "next";

export const currentProfilePages = async (req: NextApiRequest) => {
    if ((!req.cookies || typeof req.cookies !== "object") && req.headers?.cookie) {
        req.cookies = parseCookieHeader(req.headers.cookie);
    } else if (req.headers?.cookie) {
        req.cookies = {
            ...req.cookies,
            ...parseCookieHeader(req.headers.cookie),
        };
    }

    let userId = await resolveUserId(req);
    if (!userId) {
        return null;
    }

    const profile = await getOrCreateProfile(userId);
    return profile;
};

const getOrCreateProfile = async (userId: string) => {
    const existingProfile = await db.profile.findUnique({
        where: {
            userId,
        },
    });

    if (existingProfile) {
        return existingProfile;
    }

    try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const fallbackName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.id;
        const fallbackEmail = user.emailAddresses[0]?.emailAddress ?? user.primaryEmailAddress?.emailAddress ?? "";

        const profile = await db.profile.upsert({
            where: {
                userId,
            },
            update: {
                name: fallbackName,
                imageUrl: user.imageUrl,
                email: fallbackEmail,
            },
            create: {
                userId,
                name: fallbackName,
                imageUrl: user.imageUrl,
                email: fallbackEmail,
            },
        });

        return profile;
    } catch (error) {
        console.error("[CLERK_PROFILE_SYNC] Failed to upsert profile", { userId, error });
        return null;
    }
};

const resolveUserId = async (req: NextApiRequest) => {
    try {
        const auth = await getAuth(req);
        if (auth?.userId) {
            return auth.userId;
        }
    } catch (error) {
        if (!isMiddlewareDetectionError(error)) {
            console.error("[SOCKET_AUTH] getAuth error", error);
            throw error;
        }
    }

    try {
        const client = await clerkClient();
        const headers = buildHeaders(req);
        const url = buildRequestUrl(req, headers);

        const request = new Request(url, {
            method: req.method ?? "GET",
            headers,
        });

        const requestState = await client.authenticateRequest(request);
        const auth = requestState.toAuth();
        if (auth && typeof auth === "object" && "userId" in auth && auth.userId) {
            return auth.userId as string;
        }
        return null;
    } catch (error) {
        console.error("[CLERK_FALLBACK] Failed", { url: req.url });
        return null;
    }
};

const buildHeaders = (req: NextApiRequest) => {
    const headers = new Headers();
    Object.entries(req.headers ?? {}).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            value.forEach((item) => headers.append(key, item));
            } else if (typeof value === "string") {
                headers.append(key, value);
        }
    });
    return headers;
};

const buildRequestUrl = (req: NextApiRequest, headers: Headers) => {
    const protocol = headers.get("x-forwarded-proto") ?? "http";
    const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";
    const path = req.url ?? "/";
    return `${protocol}://${host}${path}`;
};

const isMiddlewareDetectionError = (error: unknown) => {
    return error instanceof Error && error.message.includes("clerkMiddleware");
};

const parseCookieHeader = (cookieHeader: string) => {
    return cookieHeader.split(";").reduce<Record<string, string>>((acc, cookie) => {
        const [name, ...rest] = cookie.trim().split("=");
        if (!name) return acc;
        acc[decodeURIComponent(name)] = decodeURIComponent(rest.join("="));
        return acc;
    }, {});
};