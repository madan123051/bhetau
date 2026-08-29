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

export const messageSchema = z.object({
  conversationId: z.string().uuid().or(z.string().min(2).max(80)),
  text: z.string().trim().min(1).max(2000),
});

export const likeSchema = z.object({ targetUserId: z.string().uuid() });

export const reportSchema = z.object({
  reportedUserId: z.string().uuid().or(z.string().min(2).max(80)),
  reason: z.enum(["Fake profile", "Under 18", "Harassment", "Sexual content", "Scam", "Hate or abuse", "Impersonation", "Other"]),
  details: z.string().trim().max(1000).optional(),
});

export function sanitizeProfileText(value: string) {
  return value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}
