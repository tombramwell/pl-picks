'use client';
import { useEffect, useState } from 'react';
import OneSignal from 'react-onesignal';

export default function PushSubscribeButton() {
  const [isSubscribed, setIsSubscribed] = useState(true); // Default true to prevent flash
  const [isSupported, setIsSupported] = useState(false);
  const [isDenied, setIsDenied] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (typeof window !== 'undefined' && window.OneSignal && OneSignal.Notifications) {
        setIsSupported(OneSignal.Notifications.isPushSupported());
        
        const currentPermission = OneSignal.Notifications.permission;
        console.log("Current Push Permission Status:", currentPermission);
        
        setIsSubscribed(currentPermission === 'granted');
        setIsDenied(currentPermission === 'denied');
      }
    };
    
    setTimeout(checkStatus, 1500);
  }, []);

  const handleSubscribe = async () => {
    try {
      console.log("1. Button tapped!");

      let finalPermission = 'default';

      // Step A: Force the raw, native browser prompt FIRST (Bypasses React/OneSignal quirks)
      if (typeof window.Notification !== 'undefined') {
        console.log("2. Firing native browser request...");
        finalPermission = await window.Notification.requestPermission();
        console.log("3. Native browser responded with:", finalPermission);
      }

      // Step B: Tell OneSignal to sync up with whatever the user just chose
      console.log("4. Syncing with OneSignal...");
      await OneSignal.Notifications.requestPermission();
      
      const newOneSignalPermission = OneSignal.Notifications.permission;
      console.log("5. Final OneSignal status:", newOneSignalPermission);

      setIsSubscribed(newOneSignalPermission === 'granted');
      setIsDenied(newOneSignalPermission === 'denied' || finalPermission === 'denied');

    } catch (error) {
      console.error("🚨 Error during subscription process:", error);
    }
  };

  if (isSubscribed || !isSupported) return null;

  return (
    <div className="bg-barclays-dark text-white p-4 mb-6 shadow-sm border-l-4 border-barclays-cyan flex flex-col sm:flex-row items-center justify-between gap-4">
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
        <button 
          onClick={handleSubscribe}
          className="bg-barclays-cyan text-barclays-dark font-black uppercase tracking-widest text-xs px-4 py-2 hover:bg-white transition shrink-0 w-full sm:w-auto shadow-sm"
        >
          Enable reminders 🔔
        </button>
      )}
    </div>
  );
}