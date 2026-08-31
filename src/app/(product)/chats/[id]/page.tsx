import { notFound } from "next/navigation";
import { ChatExperience } from "@/features/chat/chat-experience";
import { getProfile } from "@/data/profiles";
import { hasSupabaseEnv } from "@/lib/supabase/config";
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

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasSupabaseEnv) {
    const profile = getProfile(id);
    if (!profile) notFound();
    return <ChatExperience profile={profile} conversationId={id} demoMode/>;
  }

  const { supabase, userId } = await getCurrentProductSession();
  if (!userId) notFound();

  let { data: conversation } = await supabase!.from("conversations").select("id, match_id, message_ttl_hours").eq("id", id).maybeSingle();
  if (!conversation) {
    const { data: legacyMatch } = await supabase!.from("matches").select("id").or(`and(user_low.eq.${userId},user_high.eq.${id}),and(user_low.eq.${id},user_high.eq.${userId})`).eq("state", "active").maybeSingle();
    if (legacyMatch) {
      const result = await supabase!.from("conversations").select("id, match_id, message_ttl_hours").eq("match_id", legacyMatch.id).maybeSingle();
      conversation = result.data;
    }
  }
  if (!conversation) notFound();
  const { data: match } = await supabase!.from("matches").select("user_low, user_high, state").eq("id", conversation.match_id).maybeSingle();
  if (!match || match.state !== "active") notFound();
  const otherUserId = match.user_low === userId ? match.user_high : match.user_high === userId ? match.user_low : null;
  if (!otherUserId) notFound();

  const [profileResult, interestResult, messageResult] = await Promise.all([
    supabase!.from("profiles").select("first_name, current_area, from_place, occupation, relationship_intention, languages, lifestyle, bio, prompt_answers").eq("user_id", otherUserId).maybeSingle(),
    supabase!.from("user_interests").select("interests(label_en)").eq("user_id", otherUserId),
    supabase!.from("messages").select("id, sender_id, body, created_at, edited_at, deleted_at, expires_at, reply_to_id, message_reactions(user_id, emoji)").eq("conversation_id", conversation.id).order("created_at", { ascending: false }).limit(100),
  ]);
  if (!profileResult.data) notFound();

  const prompt = promptAnswer(profileResult.data.prompt_answers);
  const interests = (interestResult.data ?? [])
    .flatMap((row) => Array.isArray(row.interests) ? row.interests : row.interests ? [row.interests] : [])
    .map((interest) => interest.label_en);
  const profile: Profile = {
    id: otherUserId,
    firstName: profileResult.data.first_name,
    age: null,
    verified: false,
    city: profileResult.data.current_area,
    from: profileResult.data.from_place ?? "",
    occupation: profileResult.data.occupation ?? "",
    intent: profileResult.data.relationship_intention as Profile["intent"],
    interests,
    languages: profileResult.data.languages ?? [],
    lifestyle: profileResult.data.lifestyle ?? [],
    prompt: prompt.prompt,
    answer: prompt.answer,
    bio: profileResult.data.bio,
    promptAffinity: 0.5,
  };
  const rawMessages = [...(messageResult.data ?? [])].reverse();
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
