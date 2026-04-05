import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

/**
 * GET /api/conversations/[conversationId]/pinned/count
 * Fast endpoint to fetch pinned direct message count.
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
              profileId: profile.id,
            },
          },
          {
            memberTwo: {
              profileId: profile.id,
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!conversation) {
      return new NextResponse("Conversation not found or access denied", {
        status: 404,
      });
    }

    const count = await db.directMessage.count({
      where: {
        conversationId,
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
    console.error("[CONVERSATION_PINNED_COUNT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
