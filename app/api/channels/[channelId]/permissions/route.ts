import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { MemberRole } from "@prisma/client";

/**
 * GET /api/channels/[channelId]/permissions
 * Get channel access settings and member-specific permissions
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { channelId } = await params;

    // Get channel with permissions
    const channel = await db.channel.findUnique({
      where: { id: channelId },
      include: {
        channelPermissions: {
          include: {
            member: {
              include: {
                profile: true
              }
            }
          }
        },
        server: {
          include: {
            members: {
              where: {
                profileId: profile.id
              }
            }
          }
        }
      }
    });

    if (!channel) {
      return new NextResponse("Channel not found", { status: 404 });
    }

    // Check if user is ADMIN or MODERATOR
    const member = channel.server.members[0];
    if (!member || (member.role !== MemberRole.ADMIN && member.role !== MemberRole.MODERATOR)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    return NextResponse.json({
      channelId: channel.id,
      isPrivate: channel.isPrivate,
      allowedRoles: channel.allowedRoles,
      permissions: channel.channelPermissions.map(p => ({
        id: p.id,
        memberId: p.memberId,
        memberName: p.member.profile.name,
        canView: p.canView,
        canSendMessages: p.canSendMessages,
        canManageMessages: p.canManageMessages,
        canInviteMembers: p.canInviteMembers,
      }))
    });

  } catch (error) {
    console.error("[CHANNEL_PERMISSIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

/**
 * PATCH /api/channels/[channelId]/permissions
 * Update channel access settings (isPrivate, allowedRoles)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { channelId } = await params;
    const { isPrivate, allowedRoles } = await req.json();

    // Get channel and check permissions
    const channel = await db.channel.findUnique({
      where: { id: channelId },
      include: {
        server: {
          include: {
            members: {
              where: {
                profileId: profile.id
              }
            }
          }
        }
      }
    });

    if (!channel) {
      return new NextResponse("Channel not found", { status: 404 });
    }

    // Only ADMIN can modify channel settings
    const member = channel.server.members[0];
    if (!member || member.role !== MemberRole.ADMIN) {
      return new NextResponse("Forbidden - Admin only", { status: 403 });
    }

    // Update channel settings
    const updatedChannel = await db.channel.update({
      where: { id: channelId },
      data: {
        isPrivate: isPrivate !== undefined ? isPrivate : channel.isPrivate,
        allowedRoles: allowedRoles || channel.allowedRoles,
      }
    });

    return NextResponse.json(updatedChannel);

  } catch (error) {
    console.error("[CHANNEL_PERMISSIONS_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

/**
 * POST /api/channels/[channelId]/permissions
 * Grant specific permission to a member
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { channelId } = await params;
    const body = await req.json();
    const {
      memberId,
      memberIds,
      canView = true,
      canSendMessages = true,
      canManageMessages = false,
      canInviteMembers = false,
    } = body ?? {};

    const requestedMemberIds = [
      ...(Array.isArray(memberIds) ? memberIds : []),
      ...(typeof memberId === "string" ? [memberId] : []),
    ]
      .map((id) => (typeof id === "string" ? id.trim() : ""))
      .filter(Boolean);

    const uniqueMemberIds = Array.from(new Set(requestedMemberIds));

    if (uniqueMemberIds.length === 0) {
      return new NextResponse("Member ID required", { status: 400 });
    }

    // Check if requester is ADMIN
    const channel = await db.channel.findUnique({
      where: { id: channelId },
      include: {
        server: {
          include: {
            members: {
              where: {
                profileId: profile.id
              }
            }
          }
        }
      }
    });

    if (!channel) {
      return new NextResponse("Channel not found", { status: 404 });
    }

    const requesterMember = channel.server.members[0];
    if (!requesterMember || requesterMember.role !== MemberRole.ADMIN) {
      return new NextResponse("Forbidden - Admin only", { status: 403 });
    }

    const targetMembers = await db.member.findMany({
      where: {
        id: {
          in: uniqueMemberIds,
        },
        serverId: channel.serverId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    const targetMemberIds = targetMembers
      .filter((targetMember) => targetMember.role !== MemberRole.ADMIN)
      .map((targetMember) => targetMember.id);

    if (targetMemberIds.length === 0) {
      return new NextResponse("No valid members found", { status: 400 });
    }

    await db.$transaction(async (tx) => {
      const existingPermissions = await tx.channelPermission.findMany({
        where: {
          channelId,
          memberId: {
            in: targetMemberIds,
          },
        },
        select: {
          memberId: true,
        },
      });

      const existingMemberIds = existingPermissions.map((permission) => permission.memberId);
      const existingMemberIdSet = new Set(existingMemberIds);

      const newMemberIds = targetMemberIds.filter((targetMemberId) => !existingMemberIdSet.has(targetMemberId));

      if (newMemberIds.length > 0) {
        await tx.channelPermission.createMany({
          data: newMemberIds.map((targetMemberId) => ({
            channelId,
            memberId: targetMemberId,
            canView,
            canSendMessages,
            canManageMessages,
            canInviteMembers,
          })),
          skipDuplicates: true,
        });
      }

      if (existingMemberIds.length > 0) {
        await tx.channelPermission.updateMany({
          where: {
            channelId,
            memberId: {
              in: existingMemberIds,
            },
          },
          data: {
            canView,
            canSendMessages,
            canManageMessages,
            canInviteMembers,
          },
        });
      }
    });

    const updatedPermissions = await db.channelPermission.findMany({
      where: {
        channelId,
        memberId: {
          in: targetMemberIds,
        },
      },
      include: {
        member: {
          include: {
            profile: true,
          },
        },
      },
    });

    const responseItems = updatedPermissions.map((permission) => ({
      id: permission.id,
      memberId: permission.memberId,
      memberName: permission.member.profile.name,
      canView: permission.canView,
      canSendMessages: permission.canSendMessages,
      canManageMessages: permission.canManageMessages,
      canInviteMembers: permission.canInviteMembers,
    }));

    if (responseItems.length === 1 && !Array.isArray(memberIds)) {
      return NextResponse.json(responseItems[0]);
    }

    return NextResponse.json({
      items: responseItems,
      count: responseItems.length,
    });

  } catch (error) {
    console.error("[CHANNEL_PERMISSIONS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

/**
 * DELETE /api/channels/[channelId]/permissions?memberId=xxx
 * Revoke member's specific permission
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { channelId } = await params;
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return new NextResponse("Member ID required", { status: 400 });
    }

    // Check if requester is ADMIN
    const channel = await db.channel.findUnique({
      where: { id: channelId },
      include: {
        server: {
          include: {
            members: {
              where: {
                profileId: profile.id
              }
            }
          }
        }
      }
    });

    if (!channel) {
      return new NextResponse("Channel not found", { status: 404 });
    }

    const requesterMember = channel.server.members[0];
    if (!requesterMember || requesterMember.role !== MemberRole.ADMIN) {
      return new NextResponse("Forbidden - Admin only", { status: 403 });
    }

    // Delete permission
    await db.channelPermission.delete({
      where: {
        channelId_memberId: {
          channelId,
          memberId
        }
      }
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error("[CHANNEL_PERMISSIONS_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
