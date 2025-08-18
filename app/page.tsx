"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Card, Row, Col, Statistic, Button, Space, Typography } from "antd";
import { 
  ClockCircleOutlined, 
  CalendarOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import Link from "next/link";


import AuthForm from "./components/AuthForm";


const { Title, Paragraph } = Typography;

export default function Home() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [stats, setStats] = useState({
    totalShifts: 0,
    totalHours: 0,
    activeUsers: 0
  });
  

  useEffect(() => {
    checkUser();
  }, []);
  useEffect(() => {
    if (user) fetchStats();
  }, [user]);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.warn('Auth not available or not configured. Continuing without user.');
        setUser(null);
        return;
      }
      setUser(user as { email?: string } | null);
    } catch (error) {
      console.warn('Error checking user, continuing without user:', error);
      setUser(null);
    }
  };

  const handleAuthSuccess = () => {
    checkUser(); // Refresh user state after successful authentication
  };

  const fetchStats = async () => {
    try {
      const { data: shifts, error } = await (supabase as any)
        .from('shifts')
        .select('*');

      if (error) {
        console.error('Error fetching stats:', error);
        return;
      }

      if (shifts) {
        const rows = shifts as any[];
        const totalShifts = rows.length;
        const totalHours = rows.reduce((sum: number, shift: any) => {
          if (shift.clock_out_time) {
            const duration = (new Date(shift.clock_out_time).getTime() - new Date(shift.clock_in_time).getTime()) / (1000 * 60 * 60);
            return sum + duration;
          }
          return sum;
        }, 0);
        const activeUsers = new Set(rows.map((s: any) => s.user_id)).size;

        setStats({
          totalShifts,
          totalHours: Math.round(totalHours * 100) / 100,
          activeUsers
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  

  if (!user) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="w-full max-w-6xl mx-auto">
        {/* PWA Install Button - First and Most Prominent */}
        

        <div className="mb-8">
          <Title level={2} style={{ marginBottom: 4 }}>Welcome back{user?.email ? `, ${user.email}` : ''}!</Title>
          <Paragraph className="text-gray-600">
            Manage your healthcare staff with fast clocking and clear insights.
          </Paragraph>
        </div>

        

        {/* Quick Stats */}
        <Row gutter={[16, 16]} className="mb-8">
          <Col xs={24} sm={12} md={8}>
            <Card className="shadow-sm">
              <Statistic
                title="Total Shifts"
                value={stats.totalShifts}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card className="shadow-sm">
              <Statistic
                title="Total Hours"
                value={stats.totalHours}
                prefix={<ClockCircleOutlined />}
                suffix="hrs"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card className="shadow-sm">
              <Statistic
                title="Active Users"
                value={stats.activeUsers}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Quick Actions */}
        <Row gutter={[16, 16]} className="mb-8">
          <Col xs={24} md={12}>
            <Card title="Quick Actions" className="h-full shadow-sm">
              <Space direction="vertical" className="w-full">
                <Link href="/clock">
                  <Button type="primary" block size="large" icon={<ClockCircleOutlined />}>
                    Clock In/Out
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button block size="large" icon={<CalendarOutlined />}>
                    View Dashboard
                  </Button>
                </Link>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Recent Activity" className="h-full shadow-sm">
              <div className="text-gray-500 text-center py-8">
                <ClockCircleOutlined className="text-4xl mb-2" />
                <p>No recent activity</p>
                <p className="text-sm">Clock in to start tracking your time</p>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Features */}
        <Card title="Features" className="shadow-sm">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <div className="text-center p-4">
                <ClockCircleOutlined className="text-3xl text-blue-500 mb-2" />
                <Title level={4}>Time Tracking</Title>
                <Paragraph>
                  Clock in and out with GPS location tracking and optional notes.
                </Paragraph>
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div className="text-center p-4">
                <TeamOutlined className="text-3xl text-green-500 mb-2" />
                <Title level={4}>Staff Management</Title>
                <Paragraph>
                  Monitor staff attendance and manage schedules efficiently.
                </Paragraph>
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div className="text-center p-4">
                <CalendarOutlined className="text-3xl text-purple-500 mb-2" />
                <Title level={4}>Analytics</Title>
                <Paragraph>
                  View detailed reports and insights on staff performance.
                </Paragraph>
              </div>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  );
}
