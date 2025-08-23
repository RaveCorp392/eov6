export type IvrQuestion = { key: string; label: string; type?: "text" | "textarea" };
export const IVR_QUESTIONS: IvrQuestion[] = [
  { key: "org", label: "Organization (optional)" },
  { key: "reason", label: "What do you need help with?", type: "textarea" },
];
