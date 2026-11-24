import './globals.css';

export const metadata = {
  title: 'Find the Royals — KQJ',
  description:
    'A room-based multiplayer card game. Flip cards, claim the King, Queen and Jack, and hunt the secret Ace jackpot with up to 4 friends.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a1a12',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
