'use client';
import { useEffect, useState } from 'react';
import OneSignal from 'react-onesignal';

export default function PushSubscribeButton() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false); 
  const [isSupported, setIsSupported] = useState(false);
  const [isDenied, setIsDenied] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false); 
  const [needsIOSInstall, setNeedsIOSInstall] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissedAt = localStorage.getItem('pushPromptDismissedAt');
      if (dismissedAt) {
        const dismissedTime = new Date(parseInt(dismissedAt, 10));
        const daysSinceDismissed = (new Date() - dismissedTime) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) {
          setIsDismissed(true);
          setIsLoading(false);
          return; 
        }
      }

      // --- NEW: Apple Detection Logic ---
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

      // If they are on an iPhone but NOT using the Home Screen app
      if (isIOS && !isStandalone) {
        setNeedsIOSInstall(true);
        setIsLoading(false);
        return; // Stop here, because OneSignal won't work in Safari anyway
      }
    }

    // --- NORMAL: Wait for OneSignal (for Desktop, Android, or iOS Home Screen Apps) ---
    let attempts = 0;
    const checkOneSignal = setInterval(() => {
      attempts++;
      
      if (typeof window !== 'undefined' && window.OneSignal && OneSignal.Notifications) {
        clearInterval(checkOneSignal);
        
        const pushSupported = OneSignal.Notifications.isPushSupported();
        setIsSupported(pushSupported);
        
        if (pushSupported) {
          const osPermission = OneSignal.Notifications.permission;
          const nativePermission = window.Notification?.permission;
          
          setIsSubscribed(osPermission === true || nativePermission === 'granted');
          setIsDenied(nativePermission === 'denied');
        }
        
        setIsLoading(false);
      } else if (attempts >= 20) {
        clearInterval(checkOneSignal);
        setIsLoading(false); 
      }
    }, 500);

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

  if (isLoading || isSubscribed || isDismissed) return null;

  // --- NEW: Render the iOS Instructions ---
  if (needsIOSInstall) {
    return (
      <div className="bg-barclays-dark text-white p-4 mb-6 shadow-sm border-l-4 border-barclays-cyan flex flex-col sm:flex-row items-center justify-between gap-4 relative animate-fade-in">
        <div>
          <h3 className="font-black uppercase tracking-wide text-sm text-barclays-cyan">
            🍎 iPhone User? Unlock Deadline Alerts
          </h3>
          <p className="text-xs text-gray-300 mt-1 leading-relaxed">
            Apple requires you to add this site to your Home Screen to get push notifications. 
            Tap the <span className="font-bold border border-gray-500 rounded px-1 pb-0.5 mx-1 inline-flex items-center justify-center">Share <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg></span> 
            icon below, then select <strong className="text-white">"Add to Home Screen"</strong>.
          </p>
        </div>
        <button onClick={handleDismiss} className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-white transition w-full sm:w-auto shrink-0">
          Dismiss
        </button>
      </div>
    );
  }

  // Hide the normal button if the browser genuinely doesn't support it
  if (!isSupported && !needsIOSInstall) return null;

  // --- NORMAL RENDER (Android, Desktop, iOS Home Screen App) ---
  return (
    <div className="bg-barclays-dark text-white p-4 mb-6 shadow-sm border-l-4 border-barclays-cyan flex flex-col md:flex-row items-center justify-between gap-4 relative animate-fade-in">
      <div>
        <h3 className="font-black uppercase tracking-wide text-sm">
          {isDenied ? "Notifications Blocked" : "Never miss a deadline"}
        </h3>
        <p className="text-xs text-gray-300 mt-1">
          {isDenied 
            ? "You previously blocked alerts. You need to enable them in your device settings." 
            : "Get a silent alert to your phone 15 mins before kick-off if you haven't made a pick."}
        </p>
      </div>
      
      {!isDenied && (
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
          <button onClick={handleDismiss} className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-white transition px-4 py-2 w-full sm:w-auto">
            Not Now
          </button>
          <button onClick={handleSubscribe} className="bg-barclays-cyan text-barclays-dark font-black uppercase tracking-widest text-xs px-4 py-2 hover:bg-white transition shrink-0 shadow-sm w-full sm:w-auto">
            Enable Alerts 🔔
          </button>
        </div>
      )}
    </div>
  );
}