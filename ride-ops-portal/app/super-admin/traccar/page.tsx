'use client';

import React, { useState } from 'react';
import { traccarService, useLanguageStore, t } from '@/lib/shared';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { useToastStore } from '@/components/ui/Toast';
import { MapPin, Settings, AlertCircle, CheckCircle } from 'lucide-react';

export default function TraccarPage() {
  const language = useLanguageStore((s) => s.language);
  const addToast = useToastStore((s) => s.addToast);

  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`${url}/api/devices`, {
        headers: {
          Authorization: `Basic ${btoa(`${username}:${password}`)}`,
        },
      });

      if (response.ok) {
        setTestResult({ success: true, message: t('connectedToTraccarSuccessfully', language) });
        addToast({ type: 'success', message: t('traccarConnectionSuccessful', language), duration: 3000 });
      } else {
        setTestResult({ success: false, message: `HTTP ${response.status}: ${response.statusText}` });
      }
    } catch (error) {
      setTestResult({ success: false, message: error instanceof Error ? error.message : t('connectionFailed', language) });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    addToast({ type: 'success', message: 'Traccar configuration saved', duration: 3000 });
  };

  const [deviceCount, setDeviceCount] = React.useState(0);
  React.useEffect(() => {
    traccarService.fetchDevices().then((devices) => setDeviceCount(devices.length)).catch(() => setDeviceCount(0));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2A4A] flex items-center gap-2">
          <MapPin className="w-8 h-8" />
          {t('traccarGPSTracking', language)}
        </h1>
        <p className="text-sm text-[#8B8FA8] mt-1">{t('configureVehicleLocationTracking', language)}</p>
      </div>

      <AlertBanner type="info" message={`Traccar integration active — ${deviceCount} device(s) tracked.`} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card header={t('status', language)} className="md:col-span-1">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {deviceCount > 0 ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-[#3D434A]">{t('liveTraccar', language)}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span className="text-sm text-[#3D434A]">No devices tracked</span>
                </>
              )}
            </div>
            {testResult && (
              <div className={`p-2 rounded text-xs ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {testResult.message}
              </div>
            )}
          </div>
        </Card>

        <Card header={t('connection', language)} className="md:col-span-2">
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-[#8B8FA8] mb-1">Devices tracked</p>
              <p className="font-bold text-[#1B2A4A]">{deviceCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card header={t('configuration', language)} className={isEditing ? 'border-[#2563EB]' : ''}>
        <div className="space-y-4">
          {isEditing && (
            <>
              <div>
                <label className="block text-sm font-semibold text-[#1B2A4A] mb-2">{t('traccarServerURL', language)}</label>
                <input
                  type="text"
                  placeholder="http://localhost:8082"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1B2A4A] mb-2">{t('username', language)}</label>
                <input
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1B2A4A] mb-2">{t('password', language)}</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave}>{t('saveConfiguration', language)}</Button>
                <Button onClick={() => setIsEditing(false)} variant="secondary">{t('cancel', language)}</Button>
                <Button
                  onClick={handleTestConnection}
                  variant="secondary"
                  disabled={isTesting || !url}
                >
                  {isTesting ? t('testing', language) : t('testConnection', language)}
                </Button>
              </div>
            </>
          )}

          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="secondary">
              <Settings className="w-4 h-4 mr-2 inline" /> {t('editConfiguration', language)}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
