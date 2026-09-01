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
  age: number | null;
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
  portrait?: PortraitQuadrant;
  thumbnailUrl?: string | null;
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
  replyTo?: { id: string; text: string; sender: "me" | "them" };
  edited?: boolean;
  deleted?: boolean;
  expiresAt?: string | null;
  reactions?: Array<{ emoji: string; mine: boolean }>;
}

export interface DemoConversation {
  id: string;
  profileId: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  profile?: Profile;
}

export interface ProfileSetupData {
  name: string;
  dob: string;
  gender: string;
  meet: string[];
  intent: RelationshipIntent | "";
  city: string;
  from: string;
  languages: string[];
  interests: string[];
  bio: string;
  prompt: string;
  answer: string;
  photos: string[];
}

export interface CurrentUserProfile {
  userId: string | null;
  firstName: string;
  age: number | null;
  city: string;
  verified: boolean;
  completion: number;
  contact: string;
  thumbnailUrl?: string | null;
  settings: {
    age: boolean;
    city: boolean;
    active: boolean;
    receipts: boolean;
    visibility: boolean;
    incognito: boolean;
  };
}
