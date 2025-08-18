"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { Button, Input, Card, message, Space, Typography, Alert, Tag } from "antd";
import { ClockCircleOutlined, EnvironmentOutlined, ReloadOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;

// Utils outside component to avoid hook dependency noise
const toRad = (value: number) => (value * Math.PI) / 180;
const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

interface Location {
  lat: number;
  long: number;
  accuracy?: number;
}

interface ManagerSettings {
  perimeter_lat: number;
  perimeter_long: number;
  radius_km: number;
}

interface ActiveShift {
  id: string;
  clock_in_time: string;
}

export default function ClockPage() {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [, setTick] = useState(0);
  const [settings, setSettings] = useState<ManagerSettings | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  const db = supabase as any;

  const computeDistance = useCallback((loc: Location, cfg: ManagerSettings | null) => {
    if (!cfg) return null;
    return haversineKm(loc.lat, loc.long, cfg.perimeter_lat, cfg.perimeter_long);
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await db
        .from('manager_settings')
        .select('perimeter_lat, perimeter_long, radius_km')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error && data) setSettings(data as ManagerSettings);
    } catch {
      // ignore
    }
  }, [db]);

  // Recompute distance when settings or location change
  useEffect(() => {
    if (currentLocation) {
      setDistanceKm(computeDistance(currentLocation, settings));
    }
  }, [currentLocation, settings, computeDistance]);

  const getLocation = useCallback(() => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const location = {
            lat: pos.coords.latitude,
            long: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          };
          setCurrentLocation(location);
          setDistanceKm(computeDistance(location, settings));
          setLocationLoading(false);
        },
        (error) => {
          let errorMessage = "Unable to get location. Please enable location services.";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location permission denied. Please enable location access.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out.";
              break;
          }
          message.error(errorMessage);
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      message.error("Geolocation is not supported by this browser.");
      setLocationLoading(false);
    }
  }, [computeDistance, settings]);

  const startLocationTracking = useCallback(() => {
    // Check location every 30 seconds when active
    locationIntervalRef.current = setInterval(() => {
      if (activeShift) {
        getLocation();
      }
    }, 30000);
  }, [activeShift, getLocation]);



  // Initial load: get location and any existing active shift
  useEffect(() => {
    getLocation();
    checkActiveShift();
    loadSettings();

    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [getLocation, loadSettings]);

  // Start/stop background tracking when active shift changes
  useEffect(() => {
    if (activeShift) {
      startLocationTracking();
    } else if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
    }
  }, [activeShift, startLocationTracking]);

  // Live timer re-render while clocked in
  useEffect(() => {
    if (activeShift) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setTick((t) => t + 1);
      }, 1000);
      return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  }, [activeShift]);

  const checkActiveShift = async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        // No active shift found
        return;
      }
      const { user } = authData;

      if (user) {
        const { data } = await db
          .from("shifts")
          .select("id, clock_in_time")
          .eq("user_id", user.id)
          .is("clock_out_time", null)
          .order("clock_in_time", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        setActiveShift(data as ActiveShift | null);
      }
    } catch {
      // No active shift found
    }
  };

  const clockIn = async () => {
    if (!currentLocation) {
      message.error("Location not available. Please try again.");
      return;
    }

    // Enforce geofence if configured
    if (settings) {
      const dist = computeDistance(currentLocation, settings);
      if (typeof dist === 'number') setDistanceKm(dist);
      if (typeof dist === 'number' && dist > settings.radius_km) {
        message.error(`You're outside the allowed area (distance ${dist.toFixed(2)} km, radius ${settings.radius_km} km).`);
        return;
      }
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        message.error("Please login first");
        return;
      }
      const { user } = authData;

      // Prevent multiple active shifts: check first
      const { data: existing } = await db
        .from("shifts")
        .select("*")
        .eq("user_id", user.id)
        .is("clock_out_time", null)
        .order("clock_in_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setActiveShift(existing);
        message.info("You're already clocked in.");
        return;
      }

      const { data: inserted, error } = await db.from("shifts").insert([{
        user_id: user.id,
        clock_in_time: new Date().toISOString(),
        clock_in_location: `${currentLocation.lat},${currentLocation.long}`,
        clock_in_note: note,
      }]).select().single();

      if (error) throw error;
      
      message.success("Clocked in successfully!");
      setNote("");
      if (inserted) {
        setActiveShift(inserted);
      } else {
        checkActiveShift();
      }
      startLocationTracking();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Clock in failed";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clockOut = async () => {
    if (!currentLocation) {
      message.error("Location not available. Please try again.");
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        message.error("Please login first");
        return;
      }
      const { user } = authData;

      // Prefer updating the known active shift id; otherwise resolve the latest active
      let activeId = activeShift?.id;
      if (!activeId) {
        const { data: latest } = await db
          .from("shifts")
          .select("id")
          .eq("user_id", user.id)
          .is("clock_out_time", null)
          .order("clock_in_time", { ascending: false })
          .limit(1)
          .maybeSingle();
        activeId = latest?.id;
      }

      if (!activeId) {
        message.info("No active shift to clock out.");
        return;
      }

      const { error } = await db
        .from("shifts")
        .update({
          clock_out_time: new Date().toISOString(),
          clock_out_location: `${currentLocation.lat},${currentLocation.long}`,
          clock_out_note: note
        })
        .eq("id", activeId);

      if (error) throw error;
      
      message.success("Clocked out successfully!");
      setNote("");
      setActiveShift(null);
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Clock out failed";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-6 md:p-8 lg:p-10">
      <div className="w-full md:max-w-md mx-auto">
        <Card 
          title={
            <Space>
              <ClockCircleOutlined />
              <Title level={4} style={{ margin: 0 }}>Clock In / Clock Out</Title>
            </Space>
          }
          className="shadow-lg"
        >
          <div className="space-y-4">
            {/* Location Status */}
            {currentLocation && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <Space direction="vertical" className="w-full">
                  <div className="flex items-center justify-between">
                    <Space>
                      <EnvironmentOutlined />
                      <Text strong>Current Location</Text>
                    </Space>
                    <Button 
                      size="small" 
                      icon={<ReloadOutlined />} 
                      onClick={getLocation}
                      loading={locationLoading}
                    >
                      Refresh
                    </Button>
                  </div>
                  <Text className="text-sm">
                    {currentLocation.lat.toFixed(6)}, {currentLocation.long.toFixed(6)}
                  </Text>
                  {currentLocation.accuracy && (
                    <Text className="text-xs text-gray-500">
                      Accuracy: ±{Math.round(currentLocation.accuracy)}m
                    </Text>
                  )}
                  {settings && (
                    <div className="mt-2">
                      <Space>
                        <Tag color={typeof distanceKm === 'number' && distanceKm <= settings.radius_km ? 'green' : 'red'}>
                          {typeof distanceKm === 'number'
                            ? `Distance: ${distanceKm.toFixed(2)} km (radius ${settings.radius_km} km)`
                            : 'Checking perimeter...'}
                        </Tag>
                        <Text type="secondary">
                          Center: {settings.perimeter_lat.toFixed(5)}, {settings.perimeter_long.toFixed(5)}
                        </Text>
                      </Space>
                    </div>
                  )}
                </Space>
              </div>
            )}

            

            {/* Active Shift Status */}
            {activeShift ? (
              <Alert
                message="Currently Clocked In"
                description={
                  <div>
                    <Text strong>Since: {new Date(activeShift.clock_in_time).toLocaleString()}</Text><br />
                    <Text type="secondary">
                      Duration: {Math.floor((Date.now() - new Date(activeShift.clock_in_time).getTime()) / 1000)} seconds
                    </Text>
                  </div>
                }
                type="success"
                showIcon
                icon={<ClockCircleOutlined />}
              />
            ) : null}

            {/* Note Input */}
            <div>
              <Text strong>Note (Optional)</Text>
              <Input.TextArea 
                rows={3} 
                placeholder="Add a note about your shift..." 
                value={note} 
                onChange={(e) => setNote(e.target.value)}
                size="large"
                className="mt-2"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {!activeShift ? (
                <Button 
                  type="primary" 
                  block 
                  onClick={clockIn} 
                  loading={loading}
                  size="large"
                  icon={<ClockCircleOutlined />}
                  disabled={!!settings && typeof distanceKm === 'number' && distanceKm > settings.radius_km}
                >
                  Clock In
                </Button>
              ) : (
                <Button 
                  danger 
                  block 
                  onClick={clockOut}
                  loading={loading}
                  size="large"
                  icon={<ClockCircleOutlined />}
                >
                  Clock Out
                </Button>
              )}
            </div>

            {/* Help Text */}
            <div className="text-center text-sm text-gray-500">
              
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
