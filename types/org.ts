export type Org = {
id: string;
name: string;
logoUrl?: string;
domains: string[]; // e.g. ["ssq.com"]
admins: string[]; // email list
users: string[]; // seat emails
features: {
allowUploads: boolean;
translateUnlimited: boolean;
};
texts: {
privacyStatement: string;
ackTemplate: string;
};
 acks?: {
 slots: Array<{
   id: "slot1" | "slot2";
   title: string;
   body: string;
   required: boolean;
   order: 1 | 2;
 }>;
 };
billing: {
plan: "starter" | "pro" | "enterprise" | string;
stripeCustomerId: string;
};
};
