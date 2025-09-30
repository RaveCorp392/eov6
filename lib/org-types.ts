export type OrgDoc = {
  id: string;
  name?: string;
  ownerEmail?: string | null;
  pendingOwnerEmail?: string | null;
  domains?: string[];
  features?: Record<string, any>;
  texts?: Record<string, any>;
  logoUrl?: string | null;
  admins?: string[];
  users?: string[];
  billing?: {
    plan?: string;
    stripeCustomerId?: string;
    [key: string]: any;
  };
  acks?: {
    slots?: Array<{
      id?: string;
      title?: string;
      body?: string;
      required?: boolean;
      order?: number;
    }>;
  };
  createdAt?: number;
  updatedAt?: number;
};
