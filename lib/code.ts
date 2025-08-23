export const defaultCodeLength: number = Number(process.env.NEXT_PUBLIC_CODE_LENGTH ?? 6);

export function randomCode(len: number = defaultCodeLength): string {
  let s = '';
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}

export function expiryInHours(h: number) {
  const d = new Date();
  d.setHours(d.getHours() + h);
  return d as any;
}
