export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t mt-12">
      <div className="mx-auto max-w-6xl px-6 py-6 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 text-sm text-zinc-600">
        <div className="flex-1">
          <div className="font-medium text-zinc-800">EOV6</div>
          <div className="text-xs mt-1">© {year} EOV6. All rights reserved.</div>
        </div>

        <nav className="flex flex-wrap items-center gap-4">
          <a href="/privacy" className="hover:underline">Privacy</a>
          <a href="/terms" className="hover:underline">Terms</a>
        </nav>
      </div>
    </footer>
  );
}
