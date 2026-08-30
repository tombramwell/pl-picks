'use client';
import { useEffect, useState } from 'react';
import OneSignal from 'react-onesignal';

export default function PushSubscribeButton() {
  const [isSubscribed, setIsSubscribed] = useState(true); 
  const [isSupported, setIsSupported] = useState(false);
  const [isDenied, setIsDenied] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true); 

  useEffect(() => {
    // 1. Check the 7-day cooldown
    if (typeof window !== 'undefined') {
      const dismissedAt = localStorage.getItem('pushPromptDismissedAt');
      if (dismissedAt) {
        const dismissedTime = new Date(parseInt(dismissedAt, 10));
        const now = new Date();
        const daysSinceDismissed = (now - dismissedTime) / (1000 * 60 * 60 * 24);
        
        if (daysSinceDismissed < 7) {
          return; // Still in cooldown, stay hidden
        }
      }
    }

    setIsDismissed(false);

    // 2. Patiently wait for OneSignal to initialize (checks every 0.5s for up to 5s)
    let attempts = 0;
    const checkOneSignal = setInterval(() => {
      attempts++;
      
      if (typeof window !== 'undefined' && window.OneSignal && OneSignal.Notifications) {
        // OneSignal is ready! Stop checking.
        clearInterval(checkOneSignal);
        
        const pushSupported = OneSignal.Notifications.isPushSupported();
        setIsSupported(pushSupported);
        
        if (pushSupported) {
          const osPermission = OneSignal.Notifications.permission;
          const nativePermission = window.Notification?.permission;
          
          setIsSubscribed(osPermission === true || nativePermission === 'granted');
          setIsDenied(nativePermission === 'denied');
        }
      } else if (attempts >= 10) {
        // Give up after 5 seconds to prevent an infinite loop
        clearInterval(checkOneSignal);
      }
    }, 500);

    // Cleanup interval if user navigates away
    return () => clearInterval(checkOneSignal);
  }, []);

  const handleSubscribe = async () => {
    try {
      let finalNativePermission = 'default';

      if (typeof window.Notification !== 'undefined') {
        finalNativePermission = await window.Notification.requestPermission();
      }

      await OneSignal.Notifications.requestPermission();
      
      const newOsPermission = OneSignal.Notifications.permission;

      setIsSubscribed(newOsPermission === true || finalNativePermission === 'granted');
      setIsDenied(finalNativePermission === 'denied');

    } catch (error) {
      console.error("🚨 Error during subscription process:", error);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pushPromptDismissedAt', Date.now().toString());
    setIsDismissed(true);
  };

  if (isSubscribed || !isSupported || isDismissed) return null;

  return (
    <div className="bg-barclays-dark text-white p-4 mb-6 shadow-sm border-l-4 border-barclays-cyan flex flex-col md:flex-row items-center justify-between gap-4 relative">
      <div>
        <h3 className="font-black uppercase tracking-wide text-sm">
          {isDenied ? "Notifications Blocked" : "Never miss a deadline"}
        </h3>
        <p className="text-xs text-gray-300 mt-1">
          {isDenied 
            ? "You previously blocked alerts. You need to enable them in your device/browser settings." 
            : "Get a silent alert to your phone 15 mins before kick-off if you haven't made a pick."}
        </p>
      </div>
      
      {!isDenied && (
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
          <button 
            onClick={handleDismiss}
            className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-white transition px-4 py-2 w-full sm:w-auto"
          >
            Not now
          </button>
          <button 
            onClick={handleSubscribe}
            className="bg-barclays-cyan text-barclays-dark font-black uppercase tracking-widest text-xs px-4 py-2 hover:bg-white transition shrink-0 shadow-sm w-full sm:w-auto"
          >
            Enable alerts 🔔
          </button>
        </div>
      )}
    </div>
  );
}