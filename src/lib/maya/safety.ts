import type { MayaResponse } from "./schemas";
import { MAYA_DISCLOSURE } from "./policy";

type Signal = { category: MayaResponse["safety"]["categories"][number]; pattern: RegExp; action: MayaResponse["safety"]["recommendedActions"][number] };

const signals: Signal[] = [
  { category: "financial_request", pattern: /\b(send|lend|transfer|wire|pay)\b.{0,30}\b(money|cash|rupees?|rs\.?|dollars?)\b/i, action: "avoid_payment" },
  { category: "investment_or_crypto", pattern: /\b(crypto|bitcoin|investment|forex|guaranteed return|wallet address)\b/i, action: "avoid_payment" },
  { category: "suspicious_link", pattern: /https?:\/\/|\bbit\.ly\b|\btinyurl\b/i, action: "be_cautious" },
  { category: "personal_information", pattern: /\b(password|otp|bank account|card number|passport|citizenship number)\b/i, action: "protect_personal_info" },
  { category: "off_platform_pressure", pattern: /\b(whatsapp|telegram|signal)\b.{0,30}\b(now|immediately|right away)\b/i, action: "stay_on_bhetau" },
  { category: "sexual_pressure", pattern: /\b(send nudes?|prove you love me|you owe me sex|won't take no)\b/i, action: "block" },
  { category: "threat", pattern: /\b(i will hurt|i'll hurt|kill you|find where you live|ruin your life)\b/i, action: "contact_emergency_services" },
  { category: "underage_signal", pattern: /\b(i am|i'm|im)\s+(1[0-7]|[1-9])\b|\bminor\b/i, action: "report" },
];

export function detectSafetySignals(text: string): MayaResponse | null {
  const matches = signals.filter((signal) => signal.pattern.test(text));
  if (!matches.length) return null;
  const categories = [...new Set(matches.map((match) => match.category))];
  const recommendedActions = [...new Set(matches.map((match) => match.action))];
  if (!recommendedActions.includes("report")) recommendedActions.push("report");
  const high = categories.some((category) => ["threat", "sexual_pressure", "underage_signal"].includes(category));
  return {
    mode: "safety_check",
    title: high ? "Potential safety risk" : "Potential risk detected",
    summary: categories.includes("financial_request")
      ? "Requests for money early in an online relationship can be a scam warning sign. Avoid sending money or financial information."
      : "This message contains a possible warning sign. Consider being cautious and use Bhetau's safety controls if needed.",
    suggestions: [{ text: "I’m not comfortable with that. Please don’t ask me again.", tone: "direct" }],
    safety: {
      riskLevel: high ? "high" : categories.length > 1 ? "medium" : "low",
      categories,
      explanation: "This is a pattern-based warning, not a finding that the other person has done something wrong.",
      recommendedActions: recommendedActions.slice(0, 5),
    },
    disclosure: MAYA_DISCLOSURE,
  };
}

