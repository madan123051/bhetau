import { notFound } from "next/navigation";
import { ChatExperience } from "@/features/chat/chat-experience";
import { getProfile } from "@/data/profiles";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
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

  const supabase = await getSupabaseServerClient();
  const { data: auth } = await supabase!.auth.getClaims();
  const userId = typeof auth?.claims?.sub === "string" ? auth.claims.sub : null;
  if (!userId) notFound();

  let { data: conversation } = await supabase!.from("conversations").select("id, match_id").eq("id", id).maybeSingle();
  if (!conversation) {
    const { data: legacyMatch } = await supabase!.from("matches").select("id").or(`and(user_low.eq.${userId},user_high.eq.${id}),and(user_low.eq.${id},user_high.eq.${userId})`).eq("state", "active").maybeSingle();
    if (legacyMatch) {
      const result = await supabase!.from("conversations").select("id, match_id").eq("match_id", legacyMatch.id).maybeSingle();
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
    supabase!.from("messages").select("id, sender_id, body, created_at").eq("conversation_id", conversation.id).order("created_at", { ascending: true }).limit(100),
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
  const messages: DemoMessage[] = (messageResult.data ?? []).map((message) => ({
    id: message.id,
    sender: message.sender_id === userId ? "me" : "them",
    text: message.body ?? "",
    timestamp: new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    status: message.sender_id === userId ? "sent" : undefined,
  }));

  return <ChatExperience profile={profile} conversationId={conversation.id} initialMessages={messages} demoMode={false}/>;
}
