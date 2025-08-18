"use client";

import { useEffect, useState } from "react";
import { Card, Typography, Space, Tag } from "antd";
import { InfoCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";

const { Text } = Typography;

export default function PWADebug() {
  const [pwaStatus, setPwaStatus] = useState({
    serviceWorker: false,
    manifest: false,
    beforeInstallPrompt: false,
    isStandalone: false,
    isIOS: false,
    userAgent: ''
  });

  useEffect(() => {
    const checkPWAStatus = () => {
      const status = {
        serviceWorker: 'serviceWorker' in navigator,
        manifest: !!document.querySelector('link[rel="manifest"]'),
        beforeInstallPrompt: false,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
        isIOS: /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()),
        userAgent: navigator.userAgent
      };

      // Check if beforeinstallprompt event is available
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(() => {
          status.beforeInstallPrompt = true;
          setPwaStatus(status);
        });
      }

      setPwaStatus(status);
    };

    checkPWAStatus();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = () => {
      setPwaStatus(prev => ({ ...prev, beforeInstallPrompt: true }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const getStatusIcon = (status: boolean) => {
    return status ? <CheckCircleOutlined style={{ color: 'green' }} /> : <CloseCircleOutlined style={{ color: 'red' }} />;
  };

  const getStatusTag = (status: boolean) => {
    return status ? <Tag color="green">Working</Tag> : <Tag color="red">Not Working</Tag>;
  };

  return (
    <Card title="PWA Debug Information" className="mb-4">
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <Text strong>Service Worker: </Text>
          {getStatusIcon(pwaStatus.serviceWorker)} {getStatusTag(pwaStatus.serviceWorker)}
        </div>
        
        <div>
          <Text strong>Manifest: </Text>
          {getStatusIcon(pwaStatus.manifest)} {getStatusTag(pwaStatus.manifest)}
        </div>
        
        <div>
          <Text strong>Install Prompt: </Text>
          {getStatusIcon(pwaStatus.beforeInstallPrompt)} {getStatusTag(pwaStatus.beforeInstallPrompt)}
        </div>
        
        <div>
          <Text strong>Standalone Mode: </Text>
          {getStatusIcon(pwaStatus.isStandalone)} {getStatusTag(pwaStatus.isStandalone)}
        </div>
        
        <div>
          <Text strong>iOS Device: </Text>
          {getStatusIcon(pwaStatus.isIOS)} {getStatusTag(pwaStatus.isIOS)}
        </div>
        
        <div>
          <Text strong>User Agent: </Text>
          <Text code>{pwaStatus.userAgent}</Text>
        </div>

        <div style={{ marginTop: '16px' }}>
          <Text type="secondary">
            <InfoCircleOutlined /> This debug information helps troubleshoot PWA installation issues.
          </Text>
        </div>
      </Space>
    </Card>
  );
}
