export type Profile = {
  name?: string;
  email?: string;
  phone?: string; // <— added/ensured
};

// (Optional) central prompts — keep if you already have similar constants
export const IVR_QUESTIONS = {
  askName: "Could you please provide your full name?",
  askEmail: "Could you please provide your best email address?",
  askPhone: "Could you please provide a phone number we can reach you on?",
};
