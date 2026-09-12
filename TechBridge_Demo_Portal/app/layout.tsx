import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TechBridge Academy — Demo Portal for Bloom SIEM',
  description: 'Functional education portal with JWT auth, file upload, comments — testing Bloom SIEM security monitoring.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
