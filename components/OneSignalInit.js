'use client';
import { useEffect } from 'react';
import OneSignal from 'react-onesignal';

export default function OneSignalInit({ userEmail }) {
  useEffect(() => {
    const initOneSignal = async () => {
      await OneSignal.init({
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true, // Helpful for testing
      });

      // If we have a logged-in user, link their email to this device
      if (userEmail) {
        await OneSignal.login(userEmail);
      }
    };
    
    initOneSignal();
  }, [userEmail]);

  return null; // This component is invisible
}