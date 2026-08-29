export type RelationshipIntent =
  | "Long-term relationship"
  | "Something casual"
  | "Meet & see"
  | "New friends"
  | "Still figuring it out";

export type PortraitQuadrant = "tl" | "tr" | "bl" | "br";

export interface Profile {
  id: string;
  firstName: string;
  age: number;
  verified: boolean;
  city: string;
  from: string;
  occupation: string;
  intent: RelationshipIntent;
  interests: string[];
  languages: string[];
  lifestyle: string[];
  prompt: string;
  answer: string;
  bio: string;
  portrait: PortraitQuadrant;
  promptAffinity: number;
}

export interface VibeScore {
  score: number;
  reasons: string[];
  filtered: boolean;
}

export interface DemoMessage {
  id: string;
  sender: "me" | "them";
  text: string;
  timestamp: string;
  status?: "sending" | "sent" | "read";
}

export interface DemoConversation {
  id: string;
  profileId: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
}
