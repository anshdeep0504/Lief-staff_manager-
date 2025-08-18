"use client";

import { useEffect, useState } from "react";
import { Button, message, Typography, Alert, Card } from "antd";
import { DownloadOutlined, AppstoreOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (typeof window !== 'undefined') {
      if (window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as Navigator & { standalone?: boolean }).standalone === true) {
        setIsInstalled(true);
        return;
      }

      const handler = (e: Event) => {
        e.preventDefault();
        console.log('🎉 beforeinstallprompt event fired - PWA is ready to install!');
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        message.success('🎉 App is ready to install! Click the Install button below.');
      };

      // Listen for the beforeinstallprompt event
      window.addEventListener("beforeinstallprompt", handler);

      // Detect iOS
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIos = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
      setIsIOS(isIos);

      // Service worker is registered in ServiceWorkerRegistration component

      // Listen for app installed event
      window.addEventListener('appinstalled', () => {
        console.log('🎊 PWA was installed successfully!');
        setIsInstalled(true);
        setDeferredPrompt(null);
        message.success('🎉 App installed successfully! You can now launch it from your desktop or Start menu.');
      });

      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }
  }, []);

  const installPWA = async () => {
    console.log('🚀 Install PWA button clicked!');
    setIsLoading(true);
    
    if (!deferredPrompt) {
      console.log('❌ No deferred prompt available');
      message.warning('Installation prompt not available. Please use your browser&apos;s install option.');
      setIsLoading(false);
      return;
    }

    try {
      // Show the install prompt
      console.log('📱 Showing install prompt...');
      await deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log('👤 User choice:', outcome);
      
      if (outcome === "accepted") {
        console.log("✅ User accepted the PWA install");
        message.success("🎉 App installation started! Check your desktop for the new app.");
      } else {
        console.log("❌ User dismissed the PWA install");
        message.info("Installation was cancelled. You can try again later.");
      }
    } catch (error) {
      console.error('💥 Error during installation:', error);
      message.error('Installation failed. Please try again or use manual installation.');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setIsLoading(false);
  };

  // Don't show anything if already installed
  if (isInstalled) {
    return (
      <Card className="mb-6" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <div style={{ textAlign: 'center' }}>
          <AppstoreOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
          <Title level={3} style={{ color: 'white', marginBottom: '8px' }}>🎉 App Installed Successfully!</Title>
          <Text style={{ color: 'white', fontSize: '16px' }}>
            This app is already installed on your device. You can launch it from your desktop or Start menu.
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-6 shadow-sm border-0">
      <div className="text-center p-5">
        <AppstoreOutlined className="text-5xl text-blue-600 mb-3" />
        <Title level={3} style={{ marginBottom: 8 }}>Install Desktop App</Title>
        <Text className="text-gray-600 block mb-4">
          Offline access and quick launch from your desktop
        </Text>

        {isIOS ? (
          <Alert
            message="Install on iOS"
            description={
              <Text>
                Tap the <Text strong>Share</Text> button in Safari and choose <Text strong>"Add to Home Screen"</Text>
              </Text>
            }
            type="info"
            showIcon
          />
        ) : (
          <Button
            type="primary"
            onClick={installPWA}
            icon={<DownloadOutlined />}
            size="large"
            loading={isLoading}
          >
            {isLoading ? 'Installing…' : 'Install App'}
          </Button>
        )}
      </div>
    </Card>
  );
}