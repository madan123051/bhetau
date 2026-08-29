import { notFound } from "next/navigation";
import { ChatExperience } from "@/features/chat/chat-experience";
import { getProfile } from "@/data/profiles";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = getProfile(id);
  if (!profile) notFound();
  return <ChatExperience profile={profile}/>;
}
