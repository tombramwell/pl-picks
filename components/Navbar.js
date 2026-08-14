import Link from 'next/link';
import { cookies } from 'next/headers';

export default async function Navbar() {
  // 1. Check if the user has an active session cookie
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  return (
    <nav className="bg-green-500 text-white shadow-md">
      <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
        
        {/* Logo area - Routes to Dashboard if logged in, Login if not */}
        <Link href={token ? "/" : "/login"} className="text-2xl font-black tracking-tight hover:text-blue-200 transition-colors">
          Just Fontaine Challenge
        </Link>

        {/* Dynamic Navigation Links */}
        <div className="flex items-center space-x-4 md:space-x-6">
          
          {/* Everyone can always see the Rules */}
          <Link href="/rules" className="font-medium hover:text-blue-200 transition-colors">
            Rules
          </Link>

          {/* IF LOGGED IN: Show the game links */}
          {token ? (
            <>
              <Link href="/" className="font-medium hover:text-blue-200 transition-colors">
                Picks
              </Link>
              <Link href="/leaderboard" className="font-medium hover:text-blue-200 transition-colors">
                Table
              </Link>
              {/* Optional: Add your logout button or profile link here if you have one */}
            </>
          ) : (
            /* IF LOGGED OUT: Show the Join/Login button */
            <Link 
              href="/login" 
              className="font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition-colors shadow-sm"
            >
              Join / Sign In
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
}