"use client";

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // In development, ensure no service worker is active (prevents dev styling/assets issues)
      if (process.env.NODE_ENV !== 'production') {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => registration.unregister());
        });
        return;
      }

      console.log('🔧 Attempting to register service worker...');

      navigator.serviceWorker
        .register('service-worker.js')
        .then((registration) => {
          console.log('✅ Service Worker registered successfully:', registration);

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🔄 New service worker installed, refresh to update');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });

      // Handle service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Service worker controller changed');
      });
    }
  }, []);

  return null; // This component doesn't render anything
}
