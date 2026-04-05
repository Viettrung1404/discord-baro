import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { canViewChannel } from "@/lib/channel-permissions";


const MESSAGES_BATCH = 10;

export async function GET(
    req: Request
) {
    try {
        const profile = await currentProfile();
        const { searchParams } = new URL(req.url);

        const cursor = searchParams.get("cursor");
        const channelId = searchParams.get("channelId");

        if ( !profile ) {
            return new NextResponse("Unauthorized", { status: 401 });
        }
        if ( !channelId ) {
            return new NextResponse("Channel ID is missing", { status: 400 });
        }

        const channel = await db.channel.findUnique({
            where: { id: channelId },
            select: {
                id: true,
                serverId: true,
            },
        });

        if (!channel) {
            return new NextResponse("Channel not found", { status: 404 });
        }

        const member = await db.member.findFirst({
            where: {
                serverId: channel.serverId,
                profileId: profile.id,
            },
            select: {
                id: true,
            },
        });

        if (!member) {
            return new NextResponse("Not a member of this server", { status: 403 });
        }

        // Check if member can view this channel
        const hasAccess = await canViewChannel(member.id, channelId);
        if (!hasAccess) {
            return new NextResponse("You don't have permission to view this channel", { status: 403 });
        }

        const messages = await db.message.findMany({
            take: MESSAGES_BATCH,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            where: { channelId },
            include: {
                member: {
                    include: { profile: true }
                },
                replyToMessage: {
                    include: {
                        member: {
                            include: { profile: true }
                        }
                    }
                },
            },
            orderBy: { createdAt: 'desc' }
        });
        
        let nextCursor= null;
        if ( messages.length === MESSAGES_BATCH ) {
            nextCursor = messages[MESSAGES_BATCH - 1].id;
        }

        return NextResponse.json({
            items: messages,
            nextCursor,
        });

    }
    catch (error) {
        console.log("[MESSAGES_GET]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}