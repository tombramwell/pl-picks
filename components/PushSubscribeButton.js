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
        
        const osPermission = OneSignal.Notifications.permission; // Returns boolean: true/false
        const nativePermission = window.Notification?.permission; // Returns string: 'granted'/'denied'/'default'
        
        // If EITHER of them say you are subscribed, hide the button!
        setIsSubscribed(osPermission === true || nativePermission === 'granted');
        setIsDenied(nativePermission === 'denied');
      }
    };
    
    setTimeout(checkStatus, 1500);
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
          Enable alerts 🔔
        </button>
      )}
    </div>
  );
}