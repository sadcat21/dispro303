import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useHasPermission, useWorkerPermissions } from '@/hooks/usePermissions';
import { MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * For worker (non-admin) accounts:
 * - Blocks login until GPS is enabled
 * - Monitors GPS status and forces logout when GPS is turned off
 */
const GpsGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, isAuthenticated, logout } = useAuth();
  const [gpsStatus, setGpsStatus] = useState<'checking' | 'granted' | 'denied' | 'unavailable'>('checking');
  const { isLoading: workerPermsLoading } = useWorkerPermissions();
  const canBypassGpsGuard = useHasPermission('bypass_gps_guard');

  const isWorker = isAuthenticated && role !== 'admin' && role !== 'branch_admin';
  const shouldEnforceGps = isWorker && !canBypassGpsGuard;
  const canCheckGps = shouldEnforceGps && !workerPermsLoading;

  const checkGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      return;
    }

    // In Capacitor WebView, navigator.permissions API is unreliable.
    // Always use getCurrentPosition directly — it triggers the native permission dialog.
    navigator.geolocation.getCurrentPosition(
      () => setGpsStatus('granted'),
      (err) => {
        console.warn('GPS check failed:', err.code, err.message);
        // PERMISSION_DENIED = 1, only treat as denied if explicitly denied
        if (err.code === 1) {
          setGpsStatus('denied');
        } else {
          // POSITION_UNAVAILABLE or TIMEOUT — GPS is on but can't get fix yet, treat as granted
          setGpsStatus('granted');
        }
      },
      { timeout: 10000, maximumAge: 120000, enableHighAccuracy: false }
    );
  }, []);

  // Initial check + periodic monitoring
  useEffect(() => {
    if (!canCheckGps) return;
    checkGps();
    const interval = setInterval(checkGps, 15000);
    return () => clearInterval(interval);
  }, [canCheckGps, checkGps]);

  // Force logout when GPS denied
  useEffect(() => {
    if (canCheckGps && gpsStatus === 'denied') {
      toast.error('تم تعطيل خدمة الموقع. سيتم تسجيل الخروج.');
      const timer = setTimeout(() => logout(), 2000);
      return () => clearTimeout(timer);
    }
  }, [canCheckGps, gpsStatus, logout]);

  // Non-worker accounts or explicit bypass
  if (!shouldEnforceGps) return <>{children}</>;

  // Still checking
  if (gpsStatus === 'checking') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-6 text-center" dir="rtl">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-lg font-medium">جاري التحقق من خدمة الموقع...</p>
      </div>
    );
  }

  // GPS denied or unavailable — show blocking screen
  if (gpsStatus === 'denied' || gpsStatus === 'unavailable') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6 p-6 text-center" dir="rtl">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <MapPin className="w-10 h-10 text-destructive" />
        </div>
        <h2 className="text-xl font-bold">يجب تفعيل خدمة الموقع (GPS)</h2>
        <p className="text-muted-foreground max-w-sm">
          لاستخدام التطبيق، يجب تفعيل خدمة تحديد المواقع على جهازك ومنح الإذن للتطبيق.
        </p>
        <div className="flex gap-3">
          <Button onClick={checkGps} variant="default">
            إعادة المحاولة
          </Button>
          <Button onClick={logout} variant="outline">
            تسجيل الخروج
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default GpsGuard;
