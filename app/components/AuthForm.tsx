"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { Button, Input, Card, message, Tabs, Typography, notification, Alert } from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";


const { Text, Title } = Typography;

interface AuthFormProps {
  onAuthSuccess: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

export default function AuthForm({ onAuthSuccess, onCancel, showCancel = false }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  const signUp = async () => {
    if (!email || !password) {
      message.error("Please fill in all fields");
      return;
    }
    
    if (password.length < 6) {
      message.error("Password must be at least 6 characters");
      return;
    }
    
    setLoading(true);
    try {
      const emailForNotice = email;
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
        }
      });
      
      if (error) throw error;
      
      notification.success({
        message: 'Verification email sent',
        description: `We’ve sent a verification link to ${emailForNotice}. Please verify your email before logging in.`,
        placement: 'topRight',
        duration: 6,
        style: { zIndex: 2000 },
      });
      message.success("Verification email sent. Please check your inbox.");
      try {
        if (typeof window !== 'undefined') {
          const el = document.activeElement as HTMLElement | null;
          el?.blur();
        }
      } catch {}
      setTimeout(() => setActiveTab("login"), 75);
      
      // Clear form
      setEmail("");
      setPassword("");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Signup failed";
      if (errorMessage.includes("already registered")) {
        message.info("This email is already registered. Please try logging in instead.");
        setActiveTab("login");
      } else {
        message.error("Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    if (!email || !password) {
      message.error("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          message.error("Invalid email or password. Please check your credentials.");
        } else {
          throw error;
        }
        return;
      }
      
      message.success("Login successful!");
      onAuthSuccess();
    } catch {
      message.error("Login failed. Please check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setEmail("");
    setPassword("");
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-64px)] bg-gray-50 p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-0">
          <div className="text-center mb-6">
            <Title level={2} style={{ marginBottom: '8px' }}>Welcome</Title>
            <Text type="secondary">Sign in to continue</Text>
          </div>

          <Tabs activeKey={activeTab} onChange={handleTabChange} centered defaultActiveKey="login" items={[
            {
              key: 'login',
              label: 'Sign In',
              children: (
                <div className="space-y-4 mt-4">
                  <Input 
                    prefix={<MailOutlined />}
                    placeholder="Email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    size="large"
                  />
                  <Input.Password 
                    prefix={<LockOutlined />}
                    placeholder="Password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    size="large"
                  />
                  <Button 
                    type="primary" 
                    block 
                    onClick={signIn} 
                    loading={loading}
                    size="large"
                    icon={<UserOutlined />}
                  >
                    Sign In
                  </Button>
                </div>
              ),
            },
            {
              key: 'signup',
              label: 'Sign Up',
              children: (
                <div className="space-y-4 mt-4">
                  <Alert
                    type="info"
                    showIcon
                    message="Email verification required"
                    description="After signing up, please verify your email using the Supabase verification link sent to your inbox (check spam/junk if not visible)."
                  />
                  <Input 
                    prefix={<MailOutlined />}
                    placeholder="Email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    size="large"
                  />
                  <Input.Password 
                    prefix={<LockOutlined />}
                    placeholder="Password (min 6 characters)" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    size="large"
                  />
                  <Button 
                    block 
                    onClick={signUp}
                    loading={loading}
                    size="large"
                    icon={<UserOutlined />}
                  >
                    Create Account
                  </Button>
                </div>
              ),
            },
          ]} />
          
          <div className="mt-6 text-center text-sm text-gray-600">
            <Text>
              {activeTab === "signup" 
                ? "Already have an account? Switch to Sign In tab to log in."
                : "Don't have an account? Switch to Sign Up tab to create one."
              }
            </Text>
          </div>

          {showCancel && onCancel && (
            <div className="mt-4 text-center">
              <Button onClick={onCancel} type="link">
                Cancel
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
