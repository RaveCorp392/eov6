export type FeedbackReason = "too_expensive" | "not_useful" | "chose_competitor" | "other";

export interface TrialFeedback {
  org: string;
  email: string;
  plan?: "team" | "enterprise" | "pro" | "trial" | "none" | string;
  reason: FeedbackReason;
  competitor?: string | null;
  message?: string | null;
  createdAt: Date;
  offer?: { type: "team" | "enterprise"; url?: string } | null;
}
