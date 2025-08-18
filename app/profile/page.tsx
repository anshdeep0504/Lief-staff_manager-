"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Card, Table, Typography, Button, Space, message } from "antd";
import Link from "next/link";

const { Title, Text } = Typography;

interface ShiftRow {
  id: string;
  user_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  clock_in_location: string;
  clock_out_location: string | null;
  clock_in_note: string | null;
  clock_out_note: string | null;
  duration_hours?: number;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<ShiftRow[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (!user) {
          setUserEmail(null);
          setRows([]);
          return;
        }
        setUserEmail(user.email ?? null);
        const { data, error } = await (supabase as any)
          .from("shifts")
          .select("*")
          .order("clock_in_time", { ascending: false })
          .eq("user_id", user.id);
        if (error) throw error;
        const processed = ((data ?? []) as ShiftRow[]).map((s: ShiftRow) => ({
          ...s,
          duration_hours: s.clock_out_time
            ? (new Date(s.clock_out_time).getTime() - new Date(s.clock_in_time).getTime()) / (1000 * 60 * 60)
            : undefined,
        }));
        setRows(processed);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load profile";
        message.error(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const columns = useMemo(() => [
    { title: 'Clock In', dataIndex: 'clock_in_time', key: 'clock_in_time', render: (t: string) => new Date(t).toLocaleString() },
    { title: 'Clock Out', dataIndex: 'clock_out_time', key: 'clock_out_time', render: (t: string | null) => t ? new Date(t).toLocaleString() : 'Active' },
    { title: 'Duration (hrs)', dataIndex: 'duration_hours', key: 'duration_hours', render: (h: number | undefined) => h ? h.toFixed(2) : '-' },
    { title: 'Location', key: 'loc', render: (_: unknown, r: ShiftRow) => (
        <div>
          <div>In: {r.clock_in_location}</div>
          {r.clock_out_location && <div>Out: {r.clock_out_location}</div>}
        </div>
      )
    },
    { title: 'Notes', key: 'notes', render: (_: unknown, r: ShiftRow) => (
        <div>
          {r.clock_in_note && <div>In: {r.clock_in_note}</div>}
          {r.clock_out_note && <div>Out: {r.clock_out_note}</div>}
        </div>
      )
    },
  ], []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8 lg:p-10">
      <div className="w-full lg:max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Title level={2} style={{ marginBottom: 0 }}>My Profile</Title>
            <Text type="secondary">{userEmail ?? 'Not signed in'}</Text>
          </div>
          <Space>
            <Link href="/clock"><Button type="primary">Go to Clock</Button></Link>
          </Space>
        </div>

        <Card title="My Shifts">
          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={rows}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </div>
    </div>
  );
}


