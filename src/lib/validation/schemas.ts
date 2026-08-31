import { z } from "zod";

const eighteenYearsAgo = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date;
};

export const dateOfBirthSchema = z.coerce.date().refine(
  (date) => date <= eighteenYearsAgo(),
  "You must be 18 or older to use Bhetau.",
);

export const profileSchema = z.object({
  firstName: z.string().trim().min(2).max(40),
  dateOfBirth: dateOfBirthSchema,
  gender: z.string().trim().min(1).max(40),
  interestedIn: z.array(z.string().min(1)).min(1),
  intent: z.enum(["Long-term relationship", "Something casual", "Meet & see", "New friends", "Still figuring it out"]),
  city: z.string().trim().min(2).max(80),
  languages: z.array(z.string().min(1)).min(1).max(8),
  interests: z.array(z.string().min(1)).min(3).max(12),
  bio: z.string().trim().min(20).max(500),
});

const profileSetupDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth.").refine(
  (value) => dateOfBirthSchema.safeParse(value).success,
  "You must be 18 or older to use Bhetau.",
);

export const profileSetupSchema = z.object({
  name: z.string().trim().min(2).max(40),
  dob: profileSetupDateSchema,
  gender: z.string().trim().min(1).max(40),
  meet: z.array(z.string().trim().min(1).max(40)).min(1).max(4),
  intent: z.enum(["Long-term relationship", "Something casual", "Meet & see", "New friends", "Still figuring it out"]),
  city: z.string().trim().min(2).max(80),
  from: z.string().trim().max(80),
  languages: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
  interests: z.array(z.string().trim().min(1).max(40)).min(3).max(12),
  bio: z.string().trim().min(20).max(500),
  prompt: z.string().trim().min(3).max(100),
  answer: z.string().trim().min(8).max(300),
}).strict();

export const profileSettingsSchema = z.object({
  age: z.boolean().optional(),
  city: z.boolean().optional(),
  active: z.boolean().optional(),
  receipts: z.boolean().optional(),
  visibility: z.boolean().optional(),
  incognito: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Choose at least one setting.");

export const messageSchema = z.object({
  conversationId: z.string().uuid().or(z.string().min(2).max(80)),
  text: z.string().trim().min(1).max(2000),
  replyToId: z.string().uuid().or(z.string().min(1).max(80)).nullable().optional(),
});

export const messageMutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("edit"), messageId: z.string().uuid().or(z.string().min(1).max(80)), text: z.string().trim().min(1).max(2000) }),
  z.object({ action: z.literal("unsend"), messageId: z.string().uuid().or(z.string().min(1).max(80)) }),
  z.object({ action: z.literal("react"), messageId: z.string().uuid().or(z.string().min(1).max(80)), emoji: z.enum(["❤️", "😂", "👍", "😮", "😢", "🔥"]).nullable() }),
]);

export const conversationSettingsSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("archive"), conversationId: z.string().uuid().or(z.string().min(1).max(80)) }),
  z.object({ action: z.literal("read"), conversationId: z.string().uuid().or(z.string().min(1).max(80)), messageId: z.string().uuid().or(z.string().min(1).max(80)) }),
  z.object({ action: z.literal("timer"), conversationId: z.string().uuid().or(z.string().min(1).max(80)), hours: z.union([z.literal(6), z.literal(12), z.null()]) }),
]);

export const likeSchema = z.object({ targetUserId: z.string().uuid() });

export const reportSchema = z.object({
  reportedUserId: z.string().uuid().or(z.string().min(2).max(80)),
  reason: z.enum(["Fake profile", "Under 18", "Harassment", "Sexual content", "Scam", "Hate or abuse", "Impersonation", "Other"]),
  details: z.string().trim().max(1000).optional(),
});

export function sanitizeProfileText(value: string) {
  return value.replace(/[<>]/g, "");
}

export function sanitizeProfileTextStrict(value: string) {
  return value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}
