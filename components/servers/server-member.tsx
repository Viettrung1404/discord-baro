"use client";

import { Member, MemberRole, Profile, Server } from ".prisma/client/default.js";
import { cn } from "@/lib/utils";
import { ShieldAlert, ShieldCheck, User } from "lucide-react";
import { useParams, useRouter } from "next/dist/client/components/navigation";
import { UserAvatar } from "../user-avatar";

interface ServerMemberProps {
    member: Member & { profile: Profile | null };
    server: Server;
}

const IconMap= {
    [MemberRole.GUEST]: null,
    [MemberRole.MODERATOR]: <ShieldCheck className="mr-2 h-4 ml-2 text-indigo-500" />,
    [MemberRole.ADMIN]: <ShieldAlert className="mr-2 h-4 ml-2 text-rose-500" />,
}
export const ServerMember = ({
    member,
    server,
}: ServerMemberProps) => {

    const params = useParams();
    const router = useRouter();

    const icon = IconMap[member.role];
    const onClick = () => {
        router.push(`/servers/${server.id}/conversations/${member.id}`);
    };
    return (
        <button
            onClick={onClick}
            className={cn(
                "group px-2 py-2 rounded-md flex items-center gap-x-2 w-full hover:bg-zinc-700/10 dark:bg-zinc-700/50 transition mb-1",
                params?.memberId === member.id && "bg-zinc-700/20 dark:bg-zinc-700"
            )}
        >
            <UserAvatar 
                src={member.profile?.imageUrl} 
                className="h-8 w-8 md:h-8 md:w-8"
            />
            <p
                className={cn(
                    "font-semibold text-sm text-zinc-500 group-hover:text-zinc-600 dark:text-zinc-400 dark:group-hover:text-zinc-300 transition",
                    params?.memberId === member.id && "text-primary dark:text-zinc-200 dark:group-hover:text-white" 
                )}
            >
                {member.profile?.name || "Unknown User"}
            </p>
           {icon} 
        </button>
            
    )
}