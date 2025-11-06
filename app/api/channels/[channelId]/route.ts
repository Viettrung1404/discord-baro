import { currentProfile } from '@/lib/current-profile';
import { NextResponse } from "next/server";
import { db } from '@/lib/db';
import { MemberRole } from '@prisma/client';
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ channelId: string }> }
) {
    try {
        const profile = await currentProfile();
        const { searchParams } = new URL(req.url);
        const serverId = searchParams.get("serverId");
        const { channelId } = await params;

        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!serverId) {
            return NextResponse.json({ error: 'Server Id missing' }, { status: 400 });
        }
        if (!channelId) {
            return NextResponse.json({ error: 'Channel Id missing' }, { status: 400 });
        }
        const server = await db.server.update({
            where: {
                id: serverId,
                members: {
                    some: {
                        profileId: profile.id,
                        role: {
                            in: [MemberRole.ADMIN, MemberRole.MODERATOR],
                        }
                    }
                } 
            },
            data: {
                channels: {
                    delete: {
                        id: channelId,
                        name: {
                            not: "general",
                        }
                    }
                }
            }
        });
        return NextResponse.json(server);
    }
    catch (error) {
        console.error("Error deleting channel:", error);
        return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ channelId: string }> }
) {
    try {
        const profile = await currentProfile();
        const { name, type } = await req.json();
        const { searchParams } = new URL(req.url);
        const serverId = searchParams.get("serverId");
        const { channelId } = await params;

        if (!profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!serverId) {
            return NextResponse.json({ error: 'Server Id missing' }, { status: 400 });
        }
        if (!channelId) {
            return NextResponse.json({ error: 'Channel Id missing' }, { status: 400 });
        }
        if (name === "general") {
            return NextResponse.json({ error: "Name cannot be 'general'" }, { status: 400 });
        }
        const server = await db.server.update({
            where: {
                id: serverId,
                members: {
                    some: {
                        profileId: profile.id,
                        role: {
                            in: [MemberRole.ADMIN, MemberRole.MODERATOR],
                        }
                    }
                } 
            },
            data: {
                channels: {
                    update: {
                        where: {
                            id: channelId,
                            NOT: {
                                name: "general",
                            },
                        },
                        data: {
                            name,
                            type
                        }
                    }
                }
            }
        });
        return NextResponse.json(server);
    }
    catch (error) {
        console.error("CHANNELS_ID_PATCH", error);
        return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 });
    }
}