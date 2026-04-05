import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

/**
 * GET /api/conversations/[conversationId]/pinned
 * Get all pinned direct messages in a conversation
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const [profile, { conversationId }] = await Promise.all([
      currentProfile(),
      params,
    ]);

    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          {
            memberOne: {
              profileId: profile.id
            }
          },
          {
            memberTwo: {
              profileId: profile.id
            }
          }
        ]
      },
      select: {
        id: true,
      },
    });

    if (!conversation) {
      return new NextResponse("Conversation not found or access denied", { status: 404 });
    }

    const pinnedMessages = await db.directMessage.findMany({
      where: {
        conversationId,
        pinned: true,
        deleted: false
      },
      select: {
        id: true,
        content: true,
        fileUrl: true,
        pinned: true,
        pinnedAt: true,
        createdAt: true,
        member: {
          select: {
            id: true,
            role: true,
            profile: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
      orderBy: [{ pinnedAt: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(pinnedMessages, {
      headers: {
        "Cache-Control": "private, max-age=5, stale-while-revalidate=30",
      },
    });

  } catch (error) {
    console.error("[CONVERSATION_PINNED_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
