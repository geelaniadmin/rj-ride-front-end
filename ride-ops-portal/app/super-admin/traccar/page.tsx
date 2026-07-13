'use client';

import React, { useState } from 'react';
import { useTraccarStore } from '@ride/shared';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { useToastStore } from '@/components/ui/Toast';
import { MapPin, Settings, AlertCircle, CheckCircle } from 'lucide-react';

export default function TraccarPage() {
  const traccarStore = useTraccarStore();
  const addToast = useToastStore((s) => s.addToast);

  const [isEditing, setIsEditing] = useState(false);
  const [url, setUrl] = useState(traccarStore.traccarUrl);
  const [username, setUsername] = useState(traccarStore.traccarUsername);
  const [password, setPassword] = useState(traccarStore.traccarPassword);
  const [useMock, setUseMock] = useState(traccarStore.useMockData);
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
        setTestResult({ success: true, message: 'Connected to Traccar successfully!' });
        addToast({ type: 'success', message: 'Traccar connection successful', duration: 3000 });
      } else {
        setTestResult({ success: false, message: `HTTP ${response.status}: ${response.statusText}` });
      }
    } catch (error) {
      setTestResult({ success: false, message: error instanceof Error ? error.message : 'Connection failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    traccarStore.setTraccarConfig(url, username, password, useMock);
    setIsEditing(false);
    addToast({ type: 'success', message: 'Traccar configuration saved', duration: 3000 });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1B2A4A] flex items-center gap-2">
          <MapPin className="w-8 h-8" />
          Traccar GPS Tracking
        </h1>
        <p className="text-sm text-[#8B8FA8] mt-1">Configure vehicle location tracking service</p>
      </div>

      {useMock && (
        <AlertBanner
          type="info"
          message="Currently using mock/demo data. Real vehicle positions are simulated. Switch to live Traccar to see actual GPS data."
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card header="Status" className="md:col-span-1">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {useMock ? (
                <>
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span className="text-sm text-[#3D434A]">Mock Data</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-[#3D434A]">Live Traccar</span>
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

        <Card header="Connection" className="md:col-span-2">
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-[#8B8FA8] mb-1">Server URL</p>
              <p className="font-mono text-[#3D434A]">{url}</p>
            </div>
            {!useMock && (
              <div>
                <p className="text-[#8B8FA8] mb-1">Username</p>
                <p className="font-mono text-[#3D434A]">{username || '(not set)'}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card header="Configuration" className={isEditing ? 'border-[#2563EB]' : ''}>
        <div className="space-y-4">
          {/* Mode selector */}
          <div>
            <label className="block text-sm font-semibold text-[#1B2A4A] mb-2">Data Source</label>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setUseMock(true);
                  if (!isEditing) {
                    traccarStore.setTraccarConfig(url, username, password, true);
                  }
                }}
                className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
                  useMock
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-gray-100 text-[#3D434A] hover:bg-gray-200'
                }`}
              >
                Mock Data (Testing)
              </button>
              <button
                onClick={() => {
                  setUseMock(false);
                  if (!isEditing) {
                    traccarStore.setTraccarConfig(url, username, password, false);
                  }
                }}
                className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
                  !useMock
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-gray-100 text-[#3D434A] hover:bg-gray-200'
                }`}
              >
                Live Traccar
              </button>
            </div>
          </div>

          {isEditing && (
            <>
              <div>
                <label className="block text-sm font-semibold text-[#1B2A4A] mb-2">Traccar Server URL</label>
                <input
                  type="text"
                  placeholder="http://localhost:8082"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
                />
              </div>

              {!useMock && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-[#1B2A4A] mb-2">Username</label>
                    <input
                      type="text"
                      placeholder="admin"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1B2A4A] mb-2">Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E0E0E0] rounded text-sm"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSave}>Save Configuration</Button>
                <Button onClick={() => setIsEditing(false)} variant="secondary">
                  Cancel
                </Button>
                {!useMock && (
                  <Button
                    onClick={handleTestConnection}
                    variant="secondary"
                    disabled={isTesting || !url}
                  >
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </Button>
                )}
              </div>
            </>
          )}

          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="secondary">
              <Settings className="w-4 h-4 mr-2 inline" /> Edit Configuration
            </Button>
          )}
        </div>
      </Card>

      {/* Quick links */}
      <Card header="Quick Links">
        <div className="space-y-2">
          <p className="text-sm text-[#8B8FA8] mb-3">Access Traccar resources:</p>
          <div className="flex flex-wrap gap-2">
            {!useMock && (
              <>
                <a
                  href={`${url}/#/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded text-sm hover:bg-blue-600"
                >
                  <MapPin className="w-4 h-4" /> Open Dashboard
                </a>
                <a
                  href={`${url}/#/settings`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-[#3D434A] rounded text-sm hover:bg-gray-200"
                >
                  <Settings className="w-4 h-4" /> Settings
                </a>
              </>
            )}
            <a
              href="https://www.traccar.org/documentation/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-[#3D434A] rounded text-sm hover:bg-gray-200"
            >
              📖 Documentation
            </a>
          </div>
        </div>
      </Card>

      {/* Demo info */}
      <Card header="Demo Features" className="bg-blue-50 border-blue-200">
        <div className="space-y-2 text-sm">
          <p className="text-[#3D434A]">
            <strong>Mock Mode:</strong> Simulates GPS tracking with randomized vehicle movements. Perfect for testing without a live Traccar instance.
          </p>
          <p className="text-[#3D434A]">
            <strong>Live Mode:</strong> Connects to a real Traccar instance using HTTP Basic Auth. Ensure your Traccar server is running and accessible.
          </p>
          <p className="text-[#3D434A]">
            <strong>Default URL:</strong> {traccarStore.useMockData ? 'N/A (Mock)' : 'http://localhost:8082'}
          </p>
        </div>
      </Card>
    </div>
  );
}
