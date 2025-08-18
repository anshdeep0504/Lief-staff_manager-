"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { Button, Input, Card, message, Tabs, Typography, notification, Alert } from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";


const { Text } = Typography;

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signup");
  

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
      const { error } = await supabase.auth.signUp({ 
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
      router.push("/");
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
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="w-full max-w-md">
        <Card title="Lief Healthcare" className="shadow-lg">
          

          <Tabs activeKey={activeTab} onChange={handleTabChange} centered defaultActiveKey="signup" items={[
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
            {
              key: 'login',
              label: 'Login',
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
                    Login
                  </Button>
                </div>
              ),
            },
          ]} />
          
          <div className="mt-6 text-center text-sm text-gray-600">
            <Text>
              {activeTab === "signup" 
                ? "Already have an account? Switch to Login tab to sign in."
                : "Don't have an account? Switch to Sign Up tab to create one."
              }
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
}
