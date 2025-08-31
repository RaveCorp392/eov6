import './globals.css';

export const metadata = {
  title: 'EOV6',
  description: 'Ephemeral one-visit secure chat',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* NOTE: padding classes preserved exactly as before */}
      <body className="p-4 sm:p-8">{children}</body>
    </html>
  );
}
