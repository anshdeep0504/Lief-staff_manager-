"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Card, Alert, Space, Typography, Button, Divider, Descriptions } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, ReloadOutlined, BugOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;

export default function ConfigCheck() {
  const [configStatus, setConfigStatus] = useState<{
    supabaseUrl: boolean;
    supabaseKey: boolean;
    clientInitialized: boolean;
    connectionTest: boolean;
    connectionLoading: boolean;
    connectionError: string | null;
    authTest: boolean;
    authLoading: boolean;
  }>({
    supabaseUrl: false,
    supabaseKey: false,
    clientInitialized: false,
    connectionTest: false,
    connectionLoading: false,
    connectionError: null,
    authTest: false,
    authLoading: false,
  });

  useEffect(() => {
    checkConfig();
  }, []);

  const checkConfig = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    setConfigStatus(prev => ({
      ...prev,
      supabaseUrl: !!supabaseUrl && supabaseUrl.length > 0,
      supabaseKey: !!supabaseKey && supabaseKey.length > 0,
      clientInitialized: !!(supabaseUrl && supabaseKey),
    }));
  };

  const testConnection = async () => {
    setConfigStatus(prev => ({ ...prev, connectionLoading: true, connectionError: null }));
    
    try {
      // Test basic connection to manager_settings table
      const { error } = await supabase.from('manager_settings').select('count').limit(1);
      
      if (error) {
        console.error('Connection test error:', error);
        setConfigStatus(prev => ({ 
          ...prev, 
          connectionTest: false, 
          connectionLoading: false,
          connectionError: error.message 
        }));
      } else {
        setConfigStatus(prev => ({ 
          ...prev, 
          connectionTest: true, 
          connectionLoading: false,
          connectionError: null 
        }));
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Connection test failed:', error);
      setConfigStatus(prev => ({ 
        ...prev, 
        connectionTest: false, 
        connectionLoading: false,
        connectionError: errorMessage
      }));
    }
  };

  const testAuth = async () => {
    setConfigStatus(prev => ({ ...prev, authLoading: true }));
    
    try {
      // Test auth connection
      const { error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth test error:', error);
        setConfigStatus(prev => ({ ...prev, authTest: false, authLoading: false }));
      } else {
        setConfigStatus(prev => ({ ...prev, authTest: true, authLoading: false }));
      }
    } catch (error: unknown) {
      console.error('Auth test failed:', error);
      setConfigStatus(prev => ({ ...prev, authTest: false, authLoading: false }));
    }
  };

  if (configStatus.clientInitialized && configStatus.connectionTest && configStatus.authTest) {
    return null; // Don't show anything if everything is working
  }

  return (
    <Card 
      title={
        <Space>
          <BugOutlined style={{ color: '#faad14' }} />
          <Title level={4} style={{ margin: 0 }}>Configuration & Connection Check</Title>
        </Space>
      }
      className="mb-4"
      style={{ borderColor: configStatus.clientInitialized ? '#faad14' : '#ff4d4f' }}
    >
      <Space direction="vertical" className="w-full">
        {/* Environment Variables Check */}
        <div className="space-y-2">
          <Text strong>Environment Variables:</Text>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              {configStatus.supabaseUrl ? (
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              ) : (
                <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
              )}
              <Text>
                Supabase URL: {configStatus.supabaseUrl ? '✓ Configured' : '✗ Missing'}
              </Text>
            </div>
            
            <div className="flex items-center space-x-2">
              {configStatus.supabaseKey ? (
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              ) : (
                <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
              )}
              <Text>
                Supabase Anon Key: {configStatus.supabaseKey ? '✓ Configured' : '✗ Missing'}
              </Text>
            </div>
          </div>
        </div>

        <Divider />

        {/* Connection Test */}
        <div className="space-y-2">
          <Text strong>Database Connection:</Text>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              {configStatus.connectionTest ? (
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              ) : configStatus.connectionLoading ? (
                <ExclamationCircleOutlined style={{ color: '#faad14' }} />
              ) : (
                <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
              )}
              <Text>
                Status: {
                  configStatus.connectionLoading ? 'Testing...' :
                  configStatus.connectionTest ? '✓ Connected' : '✗ Not Connected'
                }
              </Text>
              <Button 
                size="small" 
                onClick={testConnection}
                loading={configStatus.connectionLoading}
                icon={<ReloadOutlined />}
              >
                Test Connection
              </Button>
            </div>
            
            {configStatus.connectionError && (
              <Alert
                message="Connection Error"
                description={configStatus.connectionError}
                type="error"
                showIcon
                className="mt-2"
              />
            )}
          </div>
        </div>

        <Divider />

        {/* Auth Test */}
        <div className="space-y-2">
          <Text strong>Authentication Test:</Text>
          <div className="flex items-center space-x-2">
            {configStatus.authTest ? (
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
            ) : configStatus.authLoading ? (
              <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            ) : (
              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            )}
            <Text>
              Status: {
                configStatus.authLoading ? 'Testing...' :
                configStatus.authTest ? '✓ Working' : '✗ Failed'
              }
            </Text>
            <Button 
              size="small" 
              onClick={testAuth}
              loading={configStatus.authLoading}
              icon={<ReloadOutlined />}
            >
              Test Auth
            </Button>
          </div>
        </div>

        <Divider />

        {/* Setup Instructions */}
        <div className="bg-gray-50 p-3 rounded text-sm">
          <Text strong>To fix connection issues:</Text>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Verify your Supabase project exists and is active</li>
            <li>Check that you&apos;ve run the database schema SQL</li>
            <li>Ensure your environment variables are correct</li>
            <li>Restart your development server</li>
            <li>Click &quot;Test Connection&quot; to verify</li>
          </ol>
        </div>

        {/* Current Values (for debugging) */}
        <div className="bg-blue-50 p-3 rounded text-sm">
          <Text strong>Current Values:</Text>
          <Descriptions size="small" column={1} className="mt-2">
            <Descriptions.Item label="URL">
              {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'}
            </Descriptions.Item>
            <Descriptions.Item label="Key">
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
                `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 
                'Not set'
              }
            </Descriptions.Item>
          </Descriptions>
        </div>
      </Space>
    </Card>
  );
}
