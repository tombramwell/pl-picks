import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Premiership Picks',
  description: 'Select your scorer. Earn points. Win prizes?',
};


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        {/* The Navbar will automatically render at the top of every page */}
        {/* <Navbar /> */}
        {children}
      </body>
    </html>
  );
}