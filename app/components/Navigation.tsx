"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { Menu, Button, Avatar, Dropdown, Space, Drawer } from "antd";
import { 
  HomeOutlined, 
  ClockCircleOutlined, 
  DashboardOutlined, 
  UserOutlined,
  LogoutOutlined, 
  MenuOutlined
} from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const [user, setUser] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const pathname = usePathname();

  const checkUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user?.email) {
        await checkIsManager(user.email);
      } else {
        setIsManager(false);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user?.email) {
        checkIsManager(session.user.email);
      } else {
        setIsManager(false);
      }
    });

    const handleResize = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint is 640px
    };

    handleResize(); // Set initial value
    window.addEventListener('resize', handleResize);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('resize', handleResize);
    };
  }, [checkUser]);

  

  const checkIsManager = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('managers')
        .select('email')
        .eq('email', email)
        .single();
      if (error || !data) {
        // If table missing or RLS blocks, default to non-manager
        setIsManager(false);
        return;
      }
      setIsManager(true);
    } catch {
      setIsManager(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      onClick: handleSignOut,
    },
  ];

  const navigationItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link href="/">Home</Link>,
    },
    {
      key: '/clock',
      icon: <ClockCircleOutlined />,
      label: <Link href="/clock">Clock In/Out</Link>,
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: <Link href="/profile">Profile</Link>,
    },
    ...(isManager ? [{
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <Link href="/dashboard">Dashboard</Link>,
    }] : []),
  ];

  if (loading) {
    return (
      <div className="sticky top-0 z-50 h-16 bg-white/80 backdrop-blur border-b flex items-center">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 text-gray-500">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="sticky top-0 z-50 h-16 bg-white/80 backdrop-blur border-b">
        <div className="w-full h-full max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6">
          <div className="text-xl font-bold text-blue-600">Lief Healthcare</div>
          <div className="text-sm text-gray-500">Please sign in to continue</div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-50 h-16 bg-white/80 backdrop-blur border-b shadow-sm">
      <div className="w-full h-full max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center space-x-4 sm:space-x-8">
          <div className="text-xl font-bold text-blue-600">Lief Healthcare</div>
          {!isMobile && (
            <Menu
              mode="horizontal"
              selectedKeys={[pathname]}
              className="border-0"
              items={navigationItems}
            />
          )}
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuVisible(true)}
            />
          )}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
            <Space className="cursor-pointer hover:bg-gray-50 px-2 sm:px-3 py-2 rounded-lg">
              <Avatar icon={<UserOutlined />} />
              <span className="text-sm font-medium hidden sm:inline">{(user as { email?: string } | null)?.email ?? 'Account'}</span>
            </Space>
          </Dropdown>
        </div>
      </div>

      <Drawer
        title="Navigation"
        placement="left"
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        styles={{ body: { padding: 0 } }}
      >
        <Menu
          selectedKeys={[pathname]}
          mode="vertical"
          items={navigationItems}
          onClick={() => setMobileMenuVisible(false)}
        />
      </Drawer>
    </div>
  );
}
