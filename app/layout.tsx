import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'NISSI | Clean cooking, made simple',
  description: 'Explore NISSI clean-cooking briquettes, pellets, stoves and fire lighters. Made in Uganda.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
