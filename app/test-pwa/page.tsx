"use client";

import { useEffect, useState } from 'react';
import { Card, Button, Alert, Space, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import PWAInstallButton from '../components/PWAInstallButton';

const { Title, Text } = Typography;

export default function PWATestPage() {
  const [pwaStatus, setPwaStatus] = useState({
    manifestLoaded: false,
    serviceWorkerRegistered: false,
    beforeInstallPrompt: false,
    isInstalled: false,
    isStandalone: false
  });

  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  useEffect(() => {
    // Override console.log to capture logs
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      setConsoleLogs(prev => [...prev, `LOG: ${message}`]);
      originalLog.apply(console, args);
    };
    
    console.error = (...args) => {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      setConsoleLogs(prev => [...prev, `ERROR: ${message}`]);
      originalError.apply(console, args);
    };

    // Check PWA status
    const checkPWAStatus = () => {
      const status = {
        manifestLoaded: false,
        serviceWorkerRegistered: false,
        beforeInstallPrompt: false,
        isInstalled: false,
        isStandalone: false
      };

      // Check if manifest is loaded
      const manifestLink = document.querySelector('link[rel="manifest"]');
      status.manifestLoaded = !!manifestLink;

      // Check if app is in standalone mode
      status.isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

      // Check if already installed
      status.isInstalled = status.isStandalone;

      setPwaStatus(status);
    };

    // Check service worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        setPwaStatus(prev => ({
          ...prev,
          serviceWorkerRegistered: registrations.length > 0
        }));
      });
    }

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('🎉 beforeinstallprompt event fired!');
      setPwaStatus(prev => ({
        ...prev,
        beforeInstallPrompt: true
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Initial check
    checkPWAStatus();

    // Cleanup
    return () => {
      console.log = originalLog;
      console.error = originalError;
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const clearLogs = () => {
    setConsoleLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Title level={1}>🔧 PWA Debug & Test Page</Title>
        
        <Space direction="vertical" size="large" className="w-full">
          {/* PWA Status */}
          <Card title="📊 PWA Status Check" className="w-full">
            <Space direction="vertical" className="w-full">
              <div className="flex items-center justify-between">
                <Text>Manifest Loaded:</Text>
                {pwaStatus.manifestLoaded ? 
                  <CheckCircleOutlined style={{ color: 'green' }} /> : 
                  <CloseCircleOutlined style={{ color: 'red' }} />
                }
              </div>
              <div className="flex items-center justify-between">
                <Text>Service Worker Registered:</Text>
                {pwaStatus.serviceWorkerRegistered ? 
                  <CheckCircleOutlined style={{ color: 'green' }} /> : 
                  <CloseCircleOutlined style={{ color: 'red' }} />
                }
              </div>
              <div className="flex items-center justify-between">
                <Text>Before Install Prompt Available:</Text>
                {pwaStatus.beforeInstallPrompt ? 
                  <CheckCircleOutlined style={{ color: 'green' }} /> : 
                  <CloseCircleOutlined style={{ color: 'red' }} />
                }
              </div>
              <div className="flex items-center justify-between">
                <Text>App Installed:</Text>
                {pwaStatus.isInstalled ? 
                  <CheckCircleOutlined style={{ color: 'green' }} /> : 
                  <CloseCircleOutlined style={{ color: 'red' }} />
                }
              </div>
              <div className="flex items-center justify-between">
                <Text>Standalone Mode:</Text>
                {pwaStatus.isStandalone ? 
                  <CheckCircleOutlined style={{ color: 'green' }} /> : 
                  <CloseCircleOutlined style={{ color: 'red' }} />
                }
              </div>
            </Space>
          </Card>

          {/* PWA Install Button */}
          <Card title="🚀 PWA Install Button" className="w-full">
            <PWAInstallButton />
          </Card>

          {/* Manual Test Buttons */}
          <Card title="🧪 Manual Tests" className="w-full">
            <Space direction="vertical" className="w-full">
              <Button 
                onClick={() => {
                  const manifestLink = document.querySelector('link[rel="manifest"]');
                  console.log('Manifest link:', manifestLink);
                  if (manifestLink) {
                    fetch('/manifest.json')
                      .then(response => response.json())
                      .then(data => console.log('Manifest content:', data))
                      .catch(err => console.error('Manifest fetch error:', err));
                  }
                }}
              >
                Test Manifest Loading
              </Button>
              
              <Button 
                onClick={() => {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(registrations => {
                      console.log('Service Worker registrations:', registrations);
                    });
                  }
                }}
              >
                Check Service Worker Registrations
              </Button>
            </Space>
          </Card>

          {/* Console Logs */}
          <Card 
            title="📝 Console Logs" 
            extra={<Button size="small" onClick={clearLogs}>Clear</Button>}
            className="w-full"
          >
            <div className="bg-black text-green-400 p-4 rounded h-64 overflow-y-auto font-mono text-sm">
              {consoleLogs.length === 0 ? (
                <Text style={{ color: 'gray' }}>No logs yet. Interact with the page to see logs.</Text>
              ) : (
                consoleLogs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Instructions */}
          <Card title="📋 Testing Instructions" className="w-full">
            <Space direction="vertical" className="w-full">
              <Alert
                message="Chrome Testing Steps"
                description={
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open Chrome DevTools (F12)</li>
                    <li>Go to Application tab</li>
                    <li>Check Manifest section for any errors</li>
                    <li>Check Service Workers section for registration</li>
                    <li>Look for &quot;beforeinstallprompt&quot; event in Console</li>
                    <li>Test the install button functionality</li>
                  </ol>
                }
                type="info"
                showIcon
              />
              
              <Alert
                message="PWA Requirements"
                description={
                  <ul className="list-disc list-inside space-y-1">
                    <li>HTTPS or localhost (localhost:3000)</li>
                    <li>Valid manifest.json with start_url: &quot;/&quot;</li>
                    <li>display: &quot;standalone&quot; in manifest</li>
                    <li>Valid icons (192x192, 512x512)</li>
                    <li>Service worker registered</li>
                    <li>beforeinstallprompt event fired</li>
                  </ul>
                }
                type="success"
                showIcon
              />
            </Space>
          </Card>
        </Space>
      </div>
    </div>
  );
}
