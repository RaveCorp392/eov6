// /lib/types.ts
export type Contact = {
  id: string;
  email: string;
  name?: string | null;
  message?: string | null;
  source?: 'contact_form' | 'admin' | 'import';
  mailerLiteId?: string | null;
  createdAt: number;
  repliedAt?: number | null;
};

export type Org = {
  id: string;            // slug or random id
  name: string;
  ownerEmail: string;
  plan: 'team_month' | 'team_year' | 'free';
  seats: number;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  createdAt: number;
  updatedAt: number;
};

export type OrgMember = {
  email: string;
  role: 'owner' | 'admin' | 'member';
  invitedAt: number;
  joinedAt?: number | null;
  status: 'invited' | 'active' | 'removed';
};
