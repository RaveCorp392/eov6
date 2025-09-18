import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { sendEmail, buildRoiEmail, buildSalesEmail, seatRange, isEnterprise } from "@/lib/email/roiEmail";

export async function POST(req: Request){
  try{
    const body = await req.json();
    const { email, company, consent, hp, inputs, outputs, page } = body || {};
    if (typeof email !== "string" || !email.includes("@"))
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    if (hp && String(hp).length > 0) return NextResponse.json({ ok: true }); // honeypot hit

    const now = new Date();
    const leadDoc = {
      email: email.trim().toLowerCase(),
      company: (company||"").trim(),
      consent: Boolean(consent),
      page: page || "/pricing",
      inputs: inputs || null,
      outputs: outputs || null,
      createdAt: now,
      userAgent: req.headers.get("user-agent") || "",
      ip: (req.headers.get("x-forwarded-for")||"").split(",")[0] || "",
    };

    await adminDb.collection("leads").doc().set(leadDoc);

    const POSTMARK_TOKEN = process.env.POSTMARK_SERVER_TOKEN;
    const FROM = process.env.EMAIL_FROM;
    const SALES_TO = process.env.SALES_TO;
    const SALES_TO_ENTERPRISE = process.env.SALES_TO_ENTERPRISE;
    const SALES_BCC = process.env.SALES_BCC;

    if (POSTMARK_TOKEN && FROM && leadDoc.consent) {
      const { html, text } = buildRoiEmail({ email: leadDoc.email, company: leadDoc.company, inputs: leadDoc.inputs, outputs: leadDoc.outputs, page: leadDoc.page });
      await sendEmail({ provider: "postmark", token: POSTMARK_TOKEN, from: FROM, to: leadDoc.email, subject: "Your EOV6 ROI estimate", html, text });
    }

    if (POSTMARK_TOKEN && FROM && (SALES_TO || SALES_TO_ENTERPRISE)) {
      const to = isEnterprise(Number(leadDoc?.inputs?.agents || 0)) && SALES_TO_ENTERPRISE ? SALES_TO_ENTERPRISE : (SALES_TO as string);
      const { html, text } = buildSalesEmail({ lead: leadDoc });
      const bucket = seatRange(Number(leadDoc?.inputs?.agents || 0));
      const prefix = (to === SALES_TO_ENTERPRISE) ? "[Enterprise ROI Lead" : "[ROI Lead";
      await sendEmail({ provider: "postmark", token: POSTMARK_TOKEN, from: FROM, to, subject: `${prefix} ${bucket}] ${leadDoc.company || leadDoc.email}`, html, text, bcc: SALES_BCC || undefined });
    }

    return NextResponse.json({ ok: true });
  }catch(e:any){
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
