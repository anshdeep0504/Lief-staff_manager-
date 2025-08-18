"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { Table, Card, Row, Col, Statistic, DatePicker, Space, Button, message, Tabs, Typography, Modal, InputNumber, Tag } from "antd";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title as ChartJsTitle,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  UserOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  TeamOutlined,
  SettingOutlined,
} from "@ant-design/icons";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  ChartJsTitle,
  Tooltip,
  Legend
);

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface Shift {
  id: string;
  user_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  clock_in_location: string;
  clock_out_location: string | null;
  clock_in_note: string | null;
  clock_out_note: string | null;
  user_email?: string;
  duration_hours?: number;
}

interface Stats {
  totalShifts: number;
  totalHours: number;
  avgHoursPerShift: number;
  activeUsers: number;
  currentlyClockedIn: number;
}

export default function DashboardPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalShifts: 0,
    totalHours: 0,
    avgHoursPerShift: 0,
    activeUsers: 0,
    currentlyClockedIn: 0
  });
  const [isManager, setIsManager] = useState<boolean | null>(null);
  const [idToEmail, setIdToEmail] = useState<Record<string, string>>({});
  const isFetchingRef = useRef(false);
  const [settings, setSettings] = useState<{ perimeter_lat: number; perimeter_long: number; radius_km: number } | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [latInput, setLatInput] = useState<number | undefined>(undefined);
  const [longInput, setLongInput] = useState<number | undefined>(undefined);
  const [radiusInput, setRadiusInput] = useState<number | undefined>(undefined);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Guard: only managers can view
  useEffect(() => {
    const guard = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
          setIsManager(false);
          return;
        }
        const { data, error } = await supabase
          .from('managers')
          .select('email')
          .eq('email', user.email)
          .single();
        if (error || !data) {
          setIsManager(false);
        } else {
          setIsManager(true);
        }
      } catch {
        setIsManager(false);
      }
    };
    guard();
  }, []);

  // Fetch manager settings
  const fetchManagerSettings = useCallback(async () => {
    if (!isManager) return;
    setSettingsLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setSettings(null);
        return;
      }
      const res = await fetch('/api/manager-settings', {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json();
      if (res.ok) {
        setSettings(json.settings || null);
      } else {
        setSettings(null);
      }
    } catch {
      setSettings(null);
    } finally {
      setSettingsLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    if (isManager) fetchManagerSettings();
  }, [isManager, fetchManagerSettings]);

  const openSettingsModal = () => {
    setLatInput(settings?.perimeter_lat);
    setLongInput(settings?.perimeter_long);
    setRadiusInput(settings?.radius_km ?? 1);
    setIsSettingsModalOpen(true);
  };

  const saveSettings = async () => {
    if (typeof latInput !== 'number' || typeof longInput !== 'number' || typeof radiusInput !== 'number') {
      message.error('Please provide valid latitude, longitude, and radius.');
      return;
    }
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error('Missing auth token');
      const res = await fetch('/api/manager-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ perimeter_lat: latInput, perimeter_long: longInput, radius_km: radiusInput }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save');
      setSettings(json.settings || null);
      setIsSettingsModalOpen(false);
      message.success('Perimeter saved');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save settings';
      message.error(msg);
    }
  };

  const clearSettings = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error('Missing auth token');
      const res = await fetch('/api/manager-settings', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to clear');
      setSettings(null);
      setIsSettingsModalOpen(false);
      message.success('Perimeter cleared');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to clear settings';
      message.error(msg);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      message.error('Geolocation is not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatInput(pos.coords.latitude);
        setLongInput(pos.coords.longitude);
      },
      () => message.error('Unable to get current location'),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const fetchShifts = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      let query: any = supabase
        .from('shifts')
        .select('*')
        .order('clock_in_time', { ascending: false });

      if (dateRange) {
        query = query
          .gte('clock_in_time', dateRange[0])
          .lte('clock_in_time', dateRange[1]);
      }

      const { data, error } = await query;

      if (error) throw error;

      const processedShifts: Shift[] = (data || []).map((shift: any) => ({
        ...shift,
        duration_hours: shift.clock_out_time
          ? (new Date(shift.clock_out_time).getTime() - new Date(shift.clock_in_time).getTime()) / (1000 * 60 * 60)
          : undefined
      }));

      setShifts(processedShifts);
      calculateStats(processedShifts);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch shifts";
      message.error(errorMessage);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [dateRange]);

  // Load shifts when filters or access change
  useEffect(() => {
    if (!isManager) return;
    fetchShifts();
  }, [fetchShifts, isManager]);

  // Resolve emails after shifts are loaded/changed
  useEffect(() => {
    const resolveEmails = async () => {
      if (!isManager || shifts.length === 0) {
        setIdToEmail({});
        return;
      }
      const userIds = Array.from(new Set(shifts.map(s => s.user_id)));
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const res = await fetch('/api/user-emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ userIds }),
        });
        const json = await res.json();
        if (res.ok) {
          setIdToEmail(json.idToEmail || {});
        } else {
          setIdToEmail({});
        }
      } catch {
        setIdToEmail({});
      }
    };
    resolveEmails();
  }, [isManager, shifts]);

  const calculateStats = (shifts: Shift[]) => {
    const totalShifts = shifts.length;
    const totalHours = shifts.reduce((sum, shift) => sum + (shift.duration_hours || 0), 0);
    const avgHoursPerShift = totalShifts > 0 ? totalHours / totalShifts : 0;
    const activeUsers = new Set(shifts.map(s => s.user_id)).size;
    const currentlyClockedIn = shifts.filter(s => !s.clock_out_time).length;

    setStats({
      totalShifts,
      totalHours: Math.round(totalHours * 100) / 100,
      avgHoursPerShift: Math.round(avgHoursPerShift * 100) / 100,
      activeUsers,
      currentlyClockedIn
    });
  };

  const getWeeklyData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyHours = last7Days.map(date => {
      const dayShifts = shifts.filter(shift => shift.clock_in_time.startsWith(date) && shift.duration_hours);
      return dayShifts.reduce((sum, shift) => sum + (shift.duration_hours || 0), 0);
    });

    return {
      labels: last7Days.map(date => new Date(date).toLocaleDateString('en-US', { weekday: 'short' })),
      datasets: [{
        label: 'Hours Worked',
        data: dailyHours,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }]
    };
  };

  const getEmployeeData = () => {
    const employeeStats = shifts.reduce((acc, shift) => {
      const email = shift.user_email || 'Unknown';
      if (!acc[email]) acc[email] = { totalHours: 0, shifts: 0 };
      if (shift.duration_hours) {
        acc[email].totalHours += shift.duration_hours;
        acc[email].shifts += 1;
      }
      return acc;
    }, {} as Record<string, { totalHours: number; shifts: number }>);

    const topEmployees = Object.entries(employeeStats)
      .sort(([, a], [, b]) => b.totalHours - a.totalHours)
      .slice(0, 5);

    return {
      labels: topEmployees.map(([email]) => email.split('@')[0]),
      datasets: [{
        label: 'Hours This Period',
        data: topEmployees.map(([, stats]) => Math.round(stats.totalHours * 100) / 100),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)'
        ]
      }]
    };
  };

  const getShiftDistribution = () => {
    const morning = shifts.filter(s => {
      const hour = new Date(s.clock_in_time).getHours();
      return hour >= 6 && hour < 12;
    }).length;

    const afternoon = shifts.filter(s => {
      const hour = new Date(s.clock_in_time).getHours();
      return hour >= 12 && hour < 18;
    }).length;

    const night = shifts.filter(s => {
      const hour = new Date(s.clock_in_time).getHours();
      return hour >= 18 || hour < 6;
    }).length;

    return {
      labels: ['Morning (6AM-12PM)', 'Afternoon (12PM-6PM)', 'Night (6PM-6AM)'],
      datasets: [{
        data: [morning, afternoon, night],
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)'
        ]
      }]
    };
  };

  const columns = [
    { title: 'Employee', dataIndex: 'user_email', key: 'user_email', render: (_: string, record: Shift) => {
        const email = idToEmail[record.user_id] || '';
        if (email) {
          const name = email.split('@')[0];
          return name;
        }
        return record.user_id ? `${record.user_id.slice(0, 6)}…` : 'Unknown';
      } },
    { title: 'Clock In', dataIndex: 'clock_in_time', key: 'clock_in_time', render: (time: string) => new Date(time).toLocaleString() },
    { title: 'Clock Out', dataIndex: 'clock_out_time', key: 'clock_out_time', render: (time: string | null) => time ? new Date(time).toLocaleString() : 'Active' },
    { title: 'Duration (hrs)', dataIndex: 'duration_hours', key: 'duration_hours', render: (hours: number | undefined) => hours ? `${hours.toFixed(2)}h` : '-' },
    { title: 'Location', key: 'location', render: (_: unknown, record: Shift) => (
        <div>
          <div>In: {record.clock_in_location}</div>
          {record.clock_out_location && <div>Out: {record.clock_out_location}</div>}
        </div>
      )
    },
    { title: 'Notes', key: 'notes', render: (_: unknown, record: Shift) => (
        <div>
          {record.clock_in_note && <div>In: {record.clock_in_note}</div>}
          {record.clock_out_note && <div>Out: {record.clock_out_note}</div>}
        </div>
      )
    }
  ];

  const tabItems = [
    {
      key: 'overview',
      label: <span><TeamOutlined /> Overview</span>,
      children: (
        <>
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} sm={12} md={8} lg={4}>
              <Card><Statistic title="Total Shifts" value={stats.totalShifts} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#3f8600' }} /></Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Card><Statistic title="Total Hours" value={stats.totalHours} prefix={<ClockCircleOutlined />} suffix="hrs" valueStyle={{ color: '#1890ff' }} /></Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Card><Statistic title="Avg Hours/Shift" value={stats.avgHoursPerShift} prefix={<DollarOutlined />} suffix="hrs" valueStyle={{ color: '#722ed1' }} /></Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Card><Statistic title="Active Users" value={stats.activeUsers} prefix={<TeamOutlined />} valueStyle={{ color: '#cf1322' }} /></Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Card><Statistic title="Currently Clocked In" value={stats.currentlyClockedIn} prefix={<UserOutlined />} valueStyle={{ color: '#fa8c16' }} /></Card>
            </Col>
          </Row>

          

          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} lg={12}><Card title="Weekly Hours Trend"><Line data={getWeeklyData()} /></Card></Col>
            <Col xs={24} lg={12}><Card title="Employee Hours This Period"><Bar data={getEmployeeData()} /></Card></Col>
          </Row>

          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} lg={12}><Card title="Shift Distribution"><Doughnut data={getShiftDistribution()} /></Card></Col>
          </Row>

          <Card title="Staff Logs" className="mb-6">
            {isMobile ? (
              <div className="space-y-4">
                {shifts.map(shift => (
                  <Card key={shift.id} size="small">
                    <p><Text strong>Employee:</Text> {shift.user_email || 'Unknown'}</p>
                    <p><Text strong>Clock In:</Text> {new Date(shift.clock_in_time).toLocaleString()}</p>
                    <p><Text strong>Clock Out:</Text> {shift.clock_out_time ? new Date(shift.clock_out_time).toLocaleString() : 'Active'}</p>
                    {shift.duration_hours !== undefined && <p><Text strong>Duration:</Text> {`${shift.duration_hours.toFixed(2)}h`}</p>}
                    {(shift.clock_in_location || shift.clock_out_location) && <p><Text strong>Location:</Text> In: {shift.clock_in_location} Out: {shift.clock_out_location}</p>}
                    {(shift.clock_in_note || shift.clock_out_note) && <p><Text strong>Notes:</Text> In: {shift.clock_in_note} Out: {shift.clock_out_note}</p>}
                  </Card>
                ))}
              </div>
            ) : (
              <Table columns={columns} dataSource={shifts} loading={loading} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true, showQuickJumper: true, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items` }} />
            )}
          </Card>
        </>
      )
    }
  ];

  if (isManager) {
    tabItems.push({
      key: 'settings',
      label: <span><SettingOutlined /> Settings</span>,
      children: (
        <>
          <Card className="mb-6" title="Perimeter Configuration" loading={settingsLoading}>
            <Space direction="vertical" className="w-full">
              <div>
                <Tag color={settings ? 'green' : 'default'}>
                  {settings ? 'Perimeter Set' : 'Not Set'}
                </Tag>
                {settings && (
                  <span className="ml-2 text-gray-600">
                    Center: {settings.perimeter_lat.toFixed(5)}, {settings.perimeter_long.toFixed(5)} — Radius: {settings.radius_km} km
                  </span>
                )}
              </div>
              <Space>
                <Button type="primary" onClick={openSettingsModal}>Edit Perimeter</Button>
                {settings && (
                  <Button danger onClick={clearSettings}>Clear Perimeter</Button>
                )}
              </Space>
            </Space>
          </Card>

          <Modal
            title="Edit Perimeter"
            open={isSettingsModalOpen}
            onOk={saveSettings}
            onCancel={() => setIsSettingsModalOpen(false)}
            okText="Save"
          >
            <Space direction="vertical" className="w-full">
              <Space>
                <InputNumber
                  placeholder="Latitude"
                  value={latInput}
                  onChange={(v) => setLatInput(typeof v === 'number' ? v : undefined)}
                  min={-90}
                  max={90}
                  step={0.000001}
                />
                <InputNumber
                  placeholder="Longitude"
                  value={longInput}
                  onChange={(v) => setLongInput(typeof v === 'number' ? v : undefined)}
                  min={-180}
                  max={180}
                  step={0.000001}
                />
                <InputNumber
                  placeholder="Radius (km)"
                  value={radiusInput}
                  onChange={(v) => setRadiusInput(typeof v === 'number' ? v : undefined)}
                  min={0.1}
                  max={50}
                  step={0.1}
                />
              </Space>
              <Button onClick={useMyLocation}>Use My Current Location</Button>
            </Space>
          </Modal>
        </>
      )
    });
  }

  if (isManager === null) {
    return (
      <div className="min-h-screen bg-gray-50 p-2 sm:p-6 md:p-8 lg:p-10">
        <div className="w-full lg:max-w-7xl mx-auto">Checking access…</div>
      </div>
    );
  }

  if (!isManager) {
    return (
      <div className="min-h-screen bg-gray-50 p-2 sm:p-6 md:p-8 lg:p-10">
        <div className="w-full lg:max-w-7xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-800 mb-4">Access denied</h1>
          <p className="text-gray-600">This page is for managers only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-6 md:p-8 lg:p-10">
      <div className="w-full lg:max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Manager Dashboard</h1>
        <Tabs defaultActiveKey="overview" size="large" items={tabItems} />
      </div>
    </div>
  );
}
