import nodemailer from "nodemailer";

export type SendInput = { to: string; subject: string; text: string; html?: string };

export async function sendWithZohoFallback({ to, subject, text, html }: SendInput) {
  const user = process.env.ZOHO_SMTP_USER!;
  const pass = process.env.ZOHO_SMTP_PASS!;
  const from = process.env.EMAIL_FROM || `EOV6 <${user}>`;
  const hostPrimary = process.env.ZOHO_SMTP_HOST || "smtp.zoho.com";
  const portEnv = Number(process.env.ZOHO_SMTP_PORT || 587);

  const hosts: string[] = [hostPrimary];
  if (!hosts.includes("smtp.zoho.com")) hosts.push("smtp.zoho.com");

  const combos: Array<{ host: string; port: number; secure: boolean }> = [];
  for (const host of hosts) {
    combos.push({ host, port: portEnv, secure: portEnv === 465 });
    if (portEnv !== 465) combos.push({ host, port: 465, secure: true });
  }

  let lastError: unknown = null;
  for (const cfg of combos) {
    try {
      const transport = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: { user, pass }
      });
      const info = await transport.sendMail({ from, to, subject, text, html });
      return {
        ok: true,
        usedHost: cfg.host,
        usedPort: cfg.port,
        secure: cfg.secure,
        messageId: info.messageId,
        response: String(info.response || "")
      };
    } catch (err: any) {
      lastError = err;
    }
  }

  throw new Error(String((lastError as any)?.message || lastError));
}
