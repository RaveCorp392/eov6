export function roiEmailHtml(opts: { inputs: Record<string, any>; estimate: Record<string, any> }) {
  const { inputs, estimate } = opts;
  const toCurrency = (n: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(n || 0);

  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Your EOV6 ROI estimate</title>
<style>
  body{margin:0;padding:0;background:#F6F8FB;color:#0A0A0A;font:14px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Inter,Roboto,Helvetica,Arial,sans-serif}
  .wrap{max-width:640px;margin:0 auto;padding:24px}
  .card{background:#fff;border:1px solid #E5E7EB;border-radius:16px;padding:24px}
  .btn{display:inline-block;background:#1F7AED;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:600}
  .muted{color:#6B7280}
  pre{white-space:pre-wrap;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:12px}
  h1{font-size:20px;margin:0 0 8px 0}
  h2{font-size:16px;margin:16px 0 6px 0}
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Your EOV6 ROI estimate</h1>
      <p class="muted" style="margin-top:-4px">Thanks for trying EOV6's ROI calculator.</p>

      <h2>Summary</h2>
      <p>
        <b>Annual savings:</b> ${toCurrency(estimate.annualSavings || 0)}<br/>
        <b>Daily value:</b> ${toCurrency(estimate.dailyValue || 0)}<br/>
        <b>Hours saved/day:</b> ${(estimate.hoursSavedPerDay ?? 0).toFixed(2)}
      </p>

      <h2>Your inputs</h2>
      <pre>${JSON.stringify(inputs, null, 2)}</pre>

      <h2>Estimate</h2>
      <pre>${JSON.stringify(estimate, null, 2)}</pre>

      <p style="margin-top:16px">
        <a class="btn" href="https://eov6.com/agent">Start a session</a>
        &nbsp;&nbsp;
        <a class="btn" style="background:#10B981" href="https://eov6.com/pricing">See pricing</a>
      </p>

      <p class="muted" style="margin-top:12px">Reply to this email to book a quick demo or start a pilot.</p>
    </div>
  </div>
</body>
</html>`;
}
