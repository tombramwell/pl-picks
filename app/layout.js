import { Inter } from 'next/font/google';
import './globals.css';
import OneSignalInit from '@/components/OneSignalInit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Premiership Picks',
  description: 'Select your scorer. Earn points. Win prizes?',
};


// 2. Make sure the function is async
export default async function RootLayout({ children }) {
  
  // 3. Fetch the active user session
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        {/* Now it safely knows what session is! */}
        <OneSignalInit userEmail={session?.user?.email} />
        {children}
      </body>
    </html>
  );
}