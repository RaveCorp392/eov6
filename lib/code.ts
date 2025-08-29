export function randomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function expiryInHours(h: number) {
  // Firestore Timestamp-like by seconds
  const d = new Date();
  d.setHours(d.getHours() + h);
  // If you use Firestore Timestamp object elsewhere, you can pass a Date; Firestore converts.
  return d;
}

export function slugName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-');
}
