'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  // --- ORIGINAL STATE ---
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1); // Step 1: Email, Step 2: Code
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // --- ORIGINAL FUNCTIONS ---
  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');

      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      code,
      redirect: false
    });

    if (result?.error) {
      setError("Invalid or expired code. Please try again.");
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  // --- RETRO UI RENDER ---
  return (
    <main className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        
        {/* LEFT COLUMN: THE RULES & PITCH */}
        <div className="bg-gradient-to-b from-barclays-blue to-barclays-dark text-white p-8 md:p-12 border-b-4 border-barclays-cyan shadow-xl flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic mb-6">
            Premiership <span className="text-barclays-cyan">Picks</span>
          </h1>
          
          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <span className="bg-barclays-cyan text-barclays-dark font-black px-3 py-1 text-lg">1</span>
              <p className="font-bold uppercase tracking-wide leading-relaxed text-sm md:text-base mt-1">Pick one player to score in every match.</p>
            </div>
            <div className="flex gap-4 items-start">
              <span className="bg-barclays-cyan text-barclays-dark font-black px-3 py-1 text-lg">2</span>
              <p className="font-bold uppercase tracking-wide leading-relaxed text-sm md:text-base mt-1">You can only use a player TWICE per season. Availability resets after Gameweek 19.</p>
            </div>
            <div className="flex gap-4 items-start">
              <span className="bg-barclays-cyan text-barclays-dark font-black px-3 py-1 text-lg">3</span>
              <p className="font-bold uppercase tracking-wide leading-relaxed text-sm md:text-base mt-1">
                Earn bonus multipliers based on position: <br/>
                <span className="text-gray-300 text-xs mt-1 block">FWD (1x) • MID (2x) • DEF (3x) • GK (10x)</span>
              </p>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-blue-800">
            <Link href="/rules" className="text-barclays-cyan hover:text-white font-bold uppercase tracking-widest text-sm transition">
              Read Full Rules &rarr;
            </Link>
          </div>
        </div>

        {/* RIGHT COLUMN: LOGIN FORM */}
        <div className="bg-white border-2 border-gray-300 shadow-xl p-8 md:p-12 flex flex-col justify-center relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-barclays-cyan"></div>

          <h2 className="text-2xl font-black text-barclays-dark uppercase tracking-wide mb-2">Manager Login</h2>
          <p className="text-gray-500 font-bold uppercase text-xs tracking-wider mb-6">
            {step === 1 ? 'Enter your email to receive an access code' : `We sent a code to ${email}`}
          </p>

          {/* Error Banner */}
          {error && (
            <div className="bg-red-100 text-red-700 p-3 mb-6 font-bold text-sm border-l-4 border-red-600 uppercase tracking-wide">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 font-bold text-barclays-dark focus:border-barclays-cyan outline-none bg-gray-50 uppercase"
                  placeholder="manager@club.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-barclays-dark text-white font-black uppercase tracking-widest py-4 mt-4 hover:bg-black transition disabled:opacity-50 border-b-4 border-barclays-blue"
              >
                {loading ? 'Sending Code...' : 'Request Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-2">Access Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 font-black text-center text-xl text-barclays-dark focus:border-barclays-cyan outline-none tracking-[0.5em]"
                  placeholder="123456"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-barclays-cyan text-barclays-dark font-black uppercase tracking-widest py-4 mt-4 hover:bg-white border-2 border-transparent hover:border-barclays-cyan transition disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Enter the game'}
              </button>
              
              <button
                type="button"
                onClick={() => { setStep(1); setCode(''); setError(''); }}
                className="w-full text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-barclays-blue mt-4 transition"
              >
                ◀ Use a different email
              </button>
            </form>
          )}
        </div>
        
      </div>
    </main>
  );
}