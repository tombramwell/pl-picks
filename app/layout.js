import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Just Fontaine World Cup Goal Scorer Challenge',
  description: 'Pick a player, earn points if they score, enjoy an otherwise inevitably terrible tournament. ',
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