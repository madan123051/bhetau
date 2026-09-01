import { conversations as demoConversations, getProfile } from "@/data/profiles";
import { ChatsList, type ChatListItem } from "@/features/chat/chats-list";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { getCurrentProductSession } from "@/lib/supabase/server";
import { PROFILE_PHOTO_BUCKET } from "@/lib/profile-photo";

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

type LegacyConversation = { id: string; match_id: string; created_at: string; last_message_at: string | null };
type LegacyMatch = { id: string; user_low: string; user_high: string; created_at: string; state: string };
type LegacyParticipant = { conversation_id: string; user_id: string; last_read_at: string | null; archived_at: string | null };
type LegacyMessage = { conversation_id: string; sender_id: string; body: string | null; type: "text" | "image" | "system"; created_at: string; deleted_at: string | null };

function reportChatQueryFailure(stage: string, error: { code?: string; message?: string; details?: string; hint?: string } | null) {
  console.error(JSON.stringify({ event: "chat_query_failed", stage, code: error?.code, message: error?.message, details: error?.details, hint: error?.hint }));
}

async function attachChatThumbnails(
  supabase: NonNullable<Awaited<ReturnType<typeof getCurrentProductSession>>["supabase"]>,
  items: ChatListItem[],
) {
  const userIds = [...new Set(items.map((item) => item.profileId))];
  if (!userIds.length) return items;

  const { data: photos, error } = await supabase
    .from("profile_photos")
    .select("user_id, storage_path")
    .in("user_id", userIds)
    .eq("position", 1)
    .eq("moderation_state", "approved");
  if (error || !photos?.length) {
    if (error) reportChatQueryFailure("chat_thumbnails", error);
    return items;
  }

  const paths = photos.map((photo) => photo.storage_path);
  const signed = await supabase.storage.from(PROFILE_PHOTO_BUCKET).createSignedUrls(paths, 60 * 60);
  if (signed.error) {
    reportChatQueryFailure("chat_thumbnail_urls", signed.error);
    return items;
  }

  const signedByPath = new Map((signed.data ?? []).flatMap((photo) => photo.signedUrl ? [[photo.path, photo.signedUrl] as const] : []));
  const pathByUser = new Map(photos.map((photo) => [photo.user_id, photo.storage_path]));
  return items.map((item) => ({ ...item, thumbnailUrl: signedByPath.get(pathByUser.get(item.profileId) ?? "") ?? null }));
}

async function loadLegacyChats(
  supabase: NonNullable<Awaited<ReturnType<typeof getCurrentProductSession>>["supabase"]>,
  userId: string,
): Promise<{ items: ChatListItem[]; error?: string }> {
  const participantResult = await supabase
    .from("conversation_participants")
    .select("conversation_id, user_id, last_read_at, archived_at")
    .eq("user_id", userId)
    .is("archived_at", null)
    .limit(100);
  if (participantResult.error) {
    reportChatQueryFailure("legacy_participants", participantResult.error);
    return { items: [], error: "We couldn’t load your conversations. Please retry." };
  }

  const mine = (participantResult.data ?? []) as LegacyParticipant[];
  const conversationIds = mine.map((row) => row.conversation_id);
  if (!conversationIds.length) return { items: [] };

  const [conversationResult, allParticipantsResult, messageResult] = await Promise.all([
    supabase.from("conversations").select("id, match_id, created_at, last_message_at").in("id", conversationIds),
    supabase.from("conversation_participants").select("conversation_id, user_id, last_read_at, archived_at").in("conversation_id", conversationIds),
    supabase.from("messages").select("conversation_id, sender_id, body, type, created_at, deleted_at").in("conversation_id", conversationIds).order("created_at", { ascending: false }).limit(500),
  ]);
  if (conversationResult.error || allParticipantsResult.error || messageResult.error) {
    reportChatQueryFailure("legacy_conversations", conversationResult.error ?? allParticipantsResult.error ?? messageResult.error);
    return { items: [], error: "We couldn’t load your conversations. Please retry." };
  }

  const conversations = (conversationResult.data ?? []) as LegacyConversation[];
  const matchIds = conversations.map((row) => row.match_id);
  const matchResult = await supabase.from("matches").select("id, user_low, user_high, created_at, state").in("id", matchIds).eq("state", "active");
  if (matchResult.error) {
    reportChatQueryFailure("legacy_matches", matchResult.error);
    return { items: [], error: "We couldn’t load your matches. Please retry." };
  }

  const matches = (matchResult.data ?? []) as LegacyMatch[];
  const otherIds = matches.map((match) => match.user_low === userId ? match.user_high : match.user_low);
  const profileResult = otherIds.length
    ? await supabase.from("profiles").select("user_id, first_name, current_area").in("user_id", otherIds)
    : { data: [], error: null };
  if (profileResult.error) reportChatQueryFailure("legacy_profiles", profileResult.error);

  const profileById = new Map((profileResult.data ?? []).map((row) => [row.user_id, row]));
  const matchById = new Map(matches.map((match) => [match.id, match]));
  const mineByConversation = new Map(mine.map((participant) => [participant.conversation_id, participant]));
  const otherParticipantByConversation = new Map(
    ((allParticipantsResult.data ?? []) as LegacyParticipant[])
      .filter((participant) => participant.user_id !== userId)
      .map((participant) => [participant.conversation_id, participant]),
  );
  const messages = (messageResult.data ?? []) as LegacyMessage[];
  const now = new Date();

  const items = conversations.flatMap((conversation): ChatListItem[] => {
    const match = matchById.get(conversation.match_id);
    if (!match) return [];
    const otherUserId = match.user_low === userId ? match.user_high : match.user_low;
    if (!otherParticipantByConversation.has(conversation.id)) return [];
    const profile = profileById.get(otherUserId);
    const conversationMessages = messages.filter((message) => message.conversation_id === conversation.id);
    const latest = conversationMessages[0];
    const lastReadAt = mineByConversation.get(conversation.id)?.last_read_at;
    const unread = conversationMessages.filter((message) => message.sender_id !== userId && (!lastReadAt || message.created_at > lastReadAt)).length;
    const activityAt = latest?.created_at ?? conversation.last_message_at ?? match.created_at ?? conversation.created_at;
    const preview = latest?.deleted_at
      ? "Message unsent"
      : latest?.type === "image"
        ? `${latest.sender_id === userId ? "You sent" : "Sent"} a photo`
        : latest?.body?.trim() || "You matched — say hello.";
    return [{
      id: conversation.id,
      profileId: otherUserId,
      firstName: profile?.first_name || "Your match",
      city: profile?.current_area || "Bhetau",
      verified: false,
      lastMessage: latest?.sender_id === userId && latest.type === "text" && !latest.deleted_at ? `You: ${preview}` : preview,
      timestamp: formatChatTime(activityAt, now),
      timestampIso: activityAt,
      unread,
      matchedAt: match.created_at,
      hasMessages: Boolean(latest),
    }];
  });
  return { items: await attachChatThumbnails(supabase, items) };
}

async function loadChats(): Promise<{ items: ChatListItem[]; error?: string }> {
  const { supabase, userId } = await getCurrentProductSession();
  if (!supabase) return { items: [] };
  if (!userId) return { items: [], error: "Sign in again to load your conversations." };

  const { data, error } = await supabase.rpc("get_my_chat_summaries", { p_limit: 100 });
  if (error) {
    reportChatQueryFailure("chat_summary_rpc", error);
    return loadLegacyChats(supabase, userId);
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
  return { items: await attachChatThumbnails(supabase, items) };
}

export default async function ChatsPage() {
  if (!hasSupabaseEnv) {
    return <ChatsList initialItems={demoItems()} demoMode />;
  }

  const { items, error } = await loadChats();
  return <ChatsList initialItems={items} loadError={error} />;
}
