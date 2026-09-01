import Link from "next/link";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ChatExperience } from "@/features/chat/chat-experience";
import { getProfile } from "@/data/profiles";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { loadSignedProfilePhotoUrls } from "@/lib/supabase/profile-photo-urls";
import { getCurrentProductSession } from "@/lib/supabase/server";
import type { DemoMessage, Profile } from "@/types/domain";

function promptAnswer(value: unknown) {
  const first = Array.isArray(value) && value[0] && typeof value[0] === "object"
    ? value[0] as { prompt?: unknown; answer?: unknown }
    : null;
  return {
    prompt: typeof first?.prompt === "string" ? first.prompt : "A little about me",
    answer: typeof first?.answer === "string" ? first.answer : "Still putting this profile together.",
  };
}

type MatchRow = { user_low: string; user_high: string; state: string };
type ConversationRow = {
  id: string;
  match_id: string;
  message_ttl_hours?: number | null;
  matches?: MatchRow | MatchRow[] | null;
};
type MessageRow = {
  id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  expires_at?: string | null;
  reply_to_id?: string | null;
  message_reactions?: Array<{ user_id: string; emoji: string }> | null;
};

function reportChatFailure(stage: string, error: { code?: string; message?: string; details?: string; hint?: string } | null) {
  console.error(JSON.stringify({ event: "chat_detail_query_failed", stage, code: error?.code, message: error?.message, details: error?.details, hint: error?.hint }));
}

function linkedMatch(conversation: ConversationRow | null) {
  if (!conversation?.matches) return null;
  return Array.isArray(conversation.matches) ? conversation.matches[0] ?? null : conversation.matches;
}

function ChatLoadError() {
  return <main className="grid min-h-[calc(100dvh-180px)] place-items-center px-6 text-center">
    <section role="alert" className="w-full rounded-[28px] border bg-surface p-7">
      <div className="mx-auto grid size-14 place-items-center rounded-[20px] bg-crimson/10 text-crimson"><AlertCircle size={22}/></div>
      <h1 className="mt-5 text-xl font-semibold">This chat needs another try</h1>
      <p className="mt-2 text-sm leading-6 text-stone">Your match is still safe. We couldn’t load this conversation right now.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/chats" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold"><ArrowLeft size={16}/>Chats</Link>
        <Link href="" className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-foreground px-4 text-sm font-semibold text-background"><RefreshCw size={16}/>Retry</Link>
      </div>
    </section>
  </main>;
}

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasSupabaseEnv) {
    const profile = getProfile(id);
    if (!profile) notFound();
    return <ChatExperience profile={profile} conversationId={id} demoMode/>;
  }

  const { supabase, userId } = await getCurrentProductSession();
  if (!supabase || !userId) redirect(`/auth?next=${encodeURIComponent(`/chats/${id}`)}`);

  const advancedConversationResult = await supabase
    .from("conversations")
    .select("id, match_id, message_ttl_hours, matches!inner(user_low, user_high, state)")
    .eq("id", id)
    .maybeSingle();
  let conversation = advancedConversationResult.data as unknown as ConversationRow | null;
  if (advancedConversationResult.error) {
    reportChatFailure("conversation_lifecycle", advancedConversationResult.error);
    const baseConversationResult = await supabase
      .from("conversations")
      .select("id, match_id, matches!inner(user_low, user_high, state)")
      .eq("id", id)
      .maybeSingle();
    if (baseConversationResult.error) {
      reportChatFailure("conversation_base", baseConversationResult.error);
      return <ChatLoadError/>;
    }
    conversation = baseConversationResult.data as unknown as ConversationRow | null;
  }
  if (!conversation) {
    const { data: legacyMatch, error: legacyMatchError } = await supabase.from("matches").select("id").or(`and(user_low.eq.${userId},user_high.eq.${id}),and(user_low.eq.${id},user_high.eq.${userId})`).eq("state", "active").maybeSingle();
    if (legacyMatchError) {
      reportChatFailure("legacy_match_lookup", legacyMatchError);
      return <ChatLoadError/>;
    }
    if (legacyMatch) {
      const result = await supabase
        .from("conversations")
        .select("id, match_id, message_ttl_hours, matches!inner(user_low, user_high, state)")
        .eq("match_id", legacyMatch.id)
        .maybeSingle();
      if (result.error) {
        reportChatFailure("legacy_conversation_lookup", result.error);
        return <ChatLoadError/>;
      }
      conversation = result.data as unknown as ConversationRow | null;
    }
  }
  if (!conversation) notFound();
  const match = linkedMatch(conversation);
  if (!match || match.state !== "active") notFound();
  const otherUserId = match.user_low === userId ? match.user_high : match.user_high === userId ? match.user_low : null;
  if (!otherUserId) notFound();

  const [profileResult, interestResult, thumbnailUrls, advancedMessageResult] = await Promise.all([
    supabase.from("profiles").select("first_name, current_area, from_place, occupation, relationship_intention, languages, lifestyle, bio, prompt_answers").eq("user_id", otherUserId).maybeSingle(),
    supabase.from("user_interests").select("interests(label_en)").eq("user_id", otherUserId),
    loadSignedProfilePhotoUrls(supabase, [otherUserId]),
    supabase.from("messages").select("id, sender_id, body, created_at, edited_at, deleted_at, expires_at, reply_to_id, message_reactions(user_id, emoji)").eq("conversation_id", conversation.id).order("created_at", { ascending: false }).limit(100),
  ]);
  if (profileResult.error) reportChatFailure("profile", profileResult.error);
  if (interestResult.error) reportChatFailure("interests", interestResult.error);

  let rawMessages = (advancedMessageResult.data ?? []) as unknown as MessageRow[];
  if (advancedMessageResult.error) {
    reportChatFailure("messages_lifecycle", advancedMessageResult.error);
    const baseMessageResult = await supabase.from("messages").select("id, sender_id, body, created_at, edited_at, deleted_at").eq("conversation_id", conversation.id).order("created_at", { ascending: false }).limit(100);
    if (baseMessageResult.error) {
      reportChatFailure("messages_base", baseMessageResult.error);
      return <ChatLoadError/>;
    }
    rawMessages = (baseMessageResult.data ?? []) as MessageRow[];
  }

  const profileData = profileResult.data;
  const prompt = promptAnswer(profileData?.prompt_answers);
  const interests = (interestResult.data ?? [])
    .flatMap((row) => Array.isArray(row.interests) ? row.interests : row.interests ? [row.interests] : [])
    .map((interest) => interest.label_en);
  const profile: Profile = {
    id: otherUserId,
    firstName: profileData?.first_name || "Your match",
    age: null,
    verified: false,
    city: profileData?.current_area || "Bhetau",
    from: profileData?.from_place ?? "",
    occupation: profileData?.occupation ?? "",
    intent: (profileData?.relationship_intention ?? "Meet & see") as Profile["intent"],
    interests,
    languages: profileData?.languages ?? [],
    lifestyle: profileData?.lifestyle ?? [],
    prompt: prompt.prompt,
    answer: prompt.answer,
    bio: profileData?.bio ?? "You matched on Bhetau. Start with a thoughtful hello.",
    thumbnailUrl: thumbnailUrls.get(otherUserId) ?? null,
    promptAffinity: 0.5,
  };
  rawMessages = [...rawMessages].reverse();
  const messageById = new Map(rawMessages.map((message) => [message.id, message]));
  const messages: DemoMessage[] = rawMessages.map((message) => {
    const reply = message.reply_to_id ? messageById.get(message.reply_to_id) : null;
    return {
      id: message.id,
      sender: message.sender_id === userId ? "me" : "them",
      text: message.deleted_at ? "Message unsent" : message.body ?? "",
      timestamp: new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: message.sender_id === userId ? "sent" : undefined,
      edited: Boolean(message.edited_at),
      deleted: Boolean(message.deleted_at),
      expiresAt: message.expires_at,
      reactions: (message.message_reactions ?? []).map((reaction) => ({ emoji: reaction.emoji, mine: reaction.user_id === userId })),
      replyTo: !message.deleted_at && reply ? {
        id: reply.id,
        sender: reply.sender_id === userId ? "me" : "them",
        text: reply.deleted_at ? "Message unsent" : reply.body ?? "",
      } : undefined,
    };
  });

  const initialTimerHours = conversation.message_ttl_hours === 6 || conversation.message_ttl_hours === 12 ? conversation.message_ttl_hours : null;
  return <ChatExperience key={conversation.id} profile={profile} conversationId={conversation.id} initialMessages={messages} initialTimerHours={initialTimerHours} initialReadMessageId={rawMessages.at(-1)?.id} demoMode={false}/>;
}
