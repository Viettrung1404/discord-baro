import type { PresenceUser } from "./types";

class PresenceManager {
  private channelPresence = new Map<string, Map<string, PresenceUser>>();

  joinChannel(channelId: string, user: PresenceUser) {
    const existing = this.channelPresence.get(channelId) ?? new Map<string, PresenceUser>();
    existing.set(user.profileId, { ...user, channelId, lastSeenAt: Date.now() });
    this.channelPresence.set(channelId, existing);
  }

  leaveChannel(channelId: string, profileId: string) {
    const existing = this.channelPresence.get(channelId);
    if (!existing) return;
    existing.delete(profileId);
    if (!existing.size) {
      this.channelPresence.delete(channelId);
    }
  }

  removeProfile(profileId: string) {
    for (const [channelId, users] of this.channelPresence.entries()) {
      if (users.has(profileId)) {
        users.delete(profileId);
        if (!users.size) {
          this.channelPresence.delete(channelId);
        }
      }
    }
  }

  touch(channelId: string, profileId: string) {
    const channelUsers = this.channelPresence.get(channelId);
    if (!channelUsers) return;
    const user = channelUsers.get(profileId);
    if (!user) return;
    channelUsers.set(profileId, { ...user, lastSeenAt: Date.now() });
  }

  getChannelSnapshot(channelId: string): PresenceUser[] {
    return Array.from(this.channelPresence.get(channelId)?.values() ?? []);
  }
}

export const presenceManager = new PresenceManager();
