import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { MemberRole } from "@prisma/client";

/**
 * GET /api/channels/[channelId]/pinned/count
 * Fast endpoint to fetch pinned message count.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const [profile, { channelId }] = await Promise.all([currentProfile(), params]);

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const channel = await db.channel.findUnique({
      where: { id: channelId },
      select: {
        id: true,
        serverId: true,
        isPrivate: true,
        allowedRoles: true,
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
        role: true,
      },
    });

    if (!member) {
      return new NextResponse("Not a member of this server", { status: 403 });
    }

    let hasAccess = member.role === MemberRole.ADMIN;

    if (!hasAccess) {
      if (channel.isPrivate) {
        const permission = await db.channelPermission.findUnique({
          where: {
            channelId_memberId: {
              channelId,
              memberId: member.id,
            },
          },
          select: {
            canView: true,
          },
        });

        hasAccess = !!permission?.canView;
      } else {
        hasAccess = channel.allowedRoles.includes(member.role);
      }
    }

    if (!hasAccess) {
      return new NextResponse("You don't have permission to view this channel", { status: 403 });
    }

    const count = await db.message.count({
      where: {
        channelId,
        pinned: true,
        deleted: false,
      },
    });

    return NextResponse.json(
      { count },
      {
        headers: {
          "Cache-Control": "private, max-age=10, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("[CHANNEL_PINNED_COUNT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
