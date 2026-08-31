import { conversations as demoConversations, getProfile } from "@/data/profiles";
import { ChatsList, type ChatListItem } from "@/features/chat/chats-list";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { getCurrentProductSession } from "@/lib/supabase/server";

const KATHMANDU_TIME_ZONE = "Asia/Kathmandu";

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KATHMANDU_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatChatTime(iso: string, now = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  if (dateKey(date) === dateKey(now)) {
    return new Intl.DateTimeFormat("en", {
      timeZone: KATHMANDU_TIME_ZONE,
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  const yesterday = new Date(now.getTime() - 86_400_000);
  if (dateKey(date) === dateKey(yesterday)) return "Yesterday";
  if (now.getTime() - date.getTime() < 6 * 86_400_000) {
    return new Intl.DateTimeFormat("en", {
      timeZone: KATHMANDU_TIME_ZONE,
      weekday: "short",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en", {
    timeZone: KATHMANDU_TIME_ZONE,
    month: "short",
    day: "numeric",
  }).format(date);
}

function demoItems(): ChatListItem[] {
  return demoConversations.flatMap((conversation) => {
    const profile = getProfile(conversation.profileId);
    if (!profile) return [];
    return [{
      id: conversation.id,
      profileId: profile.id,
      firstName: profile.firstName,
      city: profile.city,
      verified: profile.verified,
      portrait: profile.portrait,
      lastMessage: conversation.lastMessage,
      timestamp: conversation.timestamp,
      timestampIso: null,
      unread: conversation.unread,
      matchedAt: new Date(0).toISOString(),
      hasMessages: true,
    }];
  });
}

type ChatSummaryRow = {
  conversation_id: string;
  other_user_id: string;
  first_name: string;
  current_area: string;
  verified: boolean;
  matched_at: string;
  last_message_body: string | null;
  last_message_type: "text" | "image" | "system" | null;
  last_message_sender_id: string | null;
  last_message_created_at: string | null;
  last_message_deleted_at: string | null;
  unread_count: number;
};

async function loadChats(): Promise<{ items: ChatListItem[]; error?: string }> {
  const { supabase, userId } = await getCurrentProductSession();
  if (!supabase) return { items: [] };
  if (!userId) return { items: [], error: "Sign in again to load your conversations." };

  const { data, error } = await supabase.rpc("get_my_chat_summaries", { p_limit: 100 });
  if (error) {
    return { items: [], error: "We couldn’t load your conversations. Please retry." };
  }

  const summaries = (data ?? []) as ChatSummaryRow[];
  const now = new Date();
  const items = summaries.map((summary): ChatListItem => {
    const activityAt = summary.last_message_created_at ?? summary.matched_at;
    const messagePreview = summary.last_message_deleted_at
      ? "Message unsent"
      : summary.last_message_type === "image"
        ? `${summary.last_message_sender_id === userId ? "You sent" : "Sent"} a photo`
        : summary.last_message_body?.trim() || "You matched — say hello.";

    return {
      id: summary.conversation_id,
      profileId: summary.other_user_id,
      firstName: summary.first_name || "Your match",
      city: summary.current_area || "Bhetau",
      verified: summary.verified,
      lastMessage: summary.last_message_created_at && summary.last_message_sender_id === userId && summary.last_message_type === "text" && !summary.last_message_deleted_at
        ? `You: ${messagePreview}`
        : messagePreview,
      timestamp: formatChatTime(activityAt, now),
      timestampIso: activityAt,
      unread: Number(summary.unread_count) || 0,
      matchedAt: summary.matched_at,
      hasMessages: Boolean(summary.last_message_created_at),
    };
  });
  return { items };
}

export default async function ChatsPage() {
  if (!hasSupabaseEnv) {
    return <ChatsList initialItems={demoItems()} demoMode />;
  }

  const { items, error } = await loadChats();
  return <ChatsList initialItems={items} loadError={error} />;
}
