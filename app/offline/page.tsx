"use client";

import { Card, Typography, Space, Button } from "antd";
import { WifiOutlined, HomeOutlined, ReloadOutlined } from "@ant-design/icons";
import Link from "next/link";

const { Title, Paragraph } = Typography;

export default function OfflinePage() {
  const retryConnection = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="text-center max-w-md w-full">
        <Space direction="vertical" size="large" className="w-full">
          <WifiOutlined className="text-6xl text-gray-400" />
          
          <div>
            <Title level={2}>You&apos;re Offline</Title>
            <Paragraph className="text-gray-600">
              It looks like you don&apos;t have an internet connection right now. 
              Some features may not be available.
            </Paragraph>
          </div>

          <div className="space-y-3">
            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              onClick={retryConnection}
              block
              size="large"
            >
              Try Again
            </Button>
            
            <Link href="/">
              <Button 
                icon={<HomeOutlined />} 
                block
                size="large"
              >
                Go Home
              </Button>
            </Link>
          </div>

          
        </Space>
      </Card>
    </div>
  );
}
