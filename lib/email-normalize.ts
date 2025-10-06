export function normEmail(input: string): string {
  let e = (input || "").toLowerCase().trim();
  const at = e.indexOf("@");
  if (at < 0) return e;
  let local = e.slice(0, at);
  const dom = e.slice(at + 1);

  if (dom === "gmail.com" || dom === "googlemail.com") {
    const plus = local.indexOf("+");
    if (plus >= 0) local = local.slice(0, plus);
    local = local.replace(/\./g, "");
  }

  return `${local}@${dom}`;
}
