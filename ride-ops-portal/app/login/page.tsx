'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useLanguageStore } from '@/lib/shared';
import { Globe } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const { language, toggleLanguage } = useLanguageStore();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.push('/');
    } catch {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F5F7] to-[#E8ECEF] flex items-center justify-center p-4">
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#E0E0E0] hover:bg-gray-50 transition-colors text-sm font-medium text-[#3D434A]"
        >
          <Globe className="w-4 h-4" />
          <span>{language.toUpperCase()}</span>
        </button>
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#2563EB] text-white font-bold text-lg mb-4">
            R
          </div>
          <h1 className="text-2xl font-bold text-[#1B2A4A] mb-1">Ride Ops Portal</h1>
          <p className="text-sm text-[#8B8FA8]">Operations Control Center</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#E0E0E0] p-6 space-y-4 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ops@example.com"
              required
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2563EB] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1d4fd8] transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
