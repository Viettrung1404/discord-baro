import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/dist/client/components/navigation";
import { db } from "@/lib/db";
import { getOrCreateConversation } from "@/lib/conversation";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
interface MemberIdPage {
    params: {
        memberId: string;
        serverId: string;
    }
}

const MemberIdPage = async ({
    params
}: MemberIdPage) => {
    const profile = await currentProfile();

    if (!profile) {
        return redirect("/sign-in");
    }

    const currentMeber = await db.member.findFirst({
        where: {
            serverId: params.serverId,
            profileId: profile.id,
        },
        include: {
            profile: true,
        }
    });

    if (!currentMeber) {
        return redirect("/");
    }

    const conversation = await getOrCreateConversation(currentMeber.id, params.memberId);
    if (!conversation) {
        return redirect(`servers/${params.serverId}`);
    }

    const { memberOne, memberTwo } = conversation;

    const otherMember = memberOne.profileId === profile.id ? memberTwo : memberOne;

    return ( 
        <div className="bg-white dark:bg-[#313338] flex flex-col h-full">
            <ChatHeader
                imageUrl={otherMember.profile.imageUrl || undefined}
                name={otherMember.profile.name || "Unknown"}
                serverId={params.serverId}
                type="conversation"
            />
            <ChatMessages
                member={currentMeber}
                name={otherMember.profile.name || "Unknown"}
                apiUrl="/api/direct-messages"
                paramKey="conversationId"
                paramValue={conversation.id}
                chatId={conversation.id}
                socketUrl="/api/socket/direct-messages"
                socketQuery={{ conversationId: conversation.id }}
                type="conversation"
            />
            <ChatInput
                name={otherMember.profile.name || "Unknown"}
                type="conversation"
                apiUrl="/api/socket/direct-messages"
                query={{ conversationId: conversation.id }}
            />
        </div>
    );
}
 
export default MemberIdPage;