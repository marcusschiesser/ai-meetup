import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'AI Engineering Meetup — Chiang Mai',
  description:
    'Join the AI Engineering Meetup every Saturday at 10 am at The Kannas Hotel in Chiang Mai. Share a demo, suggest a topic, and vote.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
