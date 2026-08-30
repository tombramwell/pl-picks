'use client';
import { useEffect, useState } from 'react';
import OneSignal from 'react-onesignal';

export default function PushSubscribeButton() {
  const [isSubscribed, setIsSubscribed] = useState(true); // Default true to prevent flash
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if OneSignal is ready and the browser supports push
    const checkStatus = async () => {
      if (typeof window !== 'undefined' && OneSignal.Notifications) {
        setIsSupported(OneSignal.Notifications.isPushSupported());
        setIsSubscribed(OneSignal.Notifications.permission === 'granted');
      }
    };
    
    // Give OneSignal a second to initialize from layout.js
    setTimeout(checkStatus, 1500);
  }, []);

  const handleSubscribe = async () => {
    // THIS is the user action Apple requires!
    await OneSignal.Notifications.requestPermission();
    setIsSubscribed(OneSignal.Notifications.permission === 'granted');
  };

  // If they already subscribed, or their browser doesn't support it, hide the button
  if (isSubscribed || !isSupported) return null;

  return (
    <div className="bg-barclays-dark text-white p-4 mb-6 shadow-sm border-l-4 border-barclays-cyan flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h3 className="font-black uppercase tracking-wide text-sm">Never miss a deadline</h3>
        <p className="text-xs text-gray-300 mt-1">Get a silent alert to your phone 15 mins before kick-off if you haven't made a pick.</p>
      </div>
      <button 
        onClick={handleSubscribe}
        className="bg-barclays-cyan text-barclays-dark font-black uppercase tracking-widest text-xs px-4 py-2 hover:bg-white transition shrink-0 w-full sm:w-auto shadow-sm"
      >
        Enable reminders 🔔
      </button>
    </div>
  );
}