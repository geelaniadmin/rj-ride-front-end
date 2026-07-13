"use client";

import React, { useState } from "react";
import { usePassengerStore } from "@/stores/passengerStore";
import { User, Smartphone, LogIn, ArrowRight, Car } from "lucide-react";

export const PassengerLogin: React.FC = () => {
  const login = usePassengerStore((s) => s.login);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"name" | "phone">("name");
  const [error, setError] = useState("");

  const handleNameSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter your name");
      return;
    }
    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    setError("");
    setStep("phone");
  };

  const handlePhoneSubmit = () => {
    const trimmed = phone.trim();
    if (!trimmed) {
      setError("Please enter your phone number");
      return;
    }
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Please enter a valid phone number (10+ digits)");
      return;
    }
    setError("");
    login(name.trim(), trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (step === "name") handleNameSubmit();
      else handlePhoneSubmit();
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-gradient-to-b from-brand-blue/5 via-white to-white">
      {/* Header branding */}
      <div className="pt-12 pb-8 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-blue shadow-lg shadow-brand-blue/20 flex items-center justify-center mx-auto mb-4">
          <Car className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-bold text-text-primary">RIDE Passenger</h1>
        <p className="text-xs text-text-secondary mt-1">Sign in to track your trips</p>
      </div>

      {/* Form card */}
      <div className="flex-1 px-6">
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 max-w-sm mx-auto w-full">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === "name" ? "bg-brand-blue text-white shadow-sm" : "bg-brand-blue/10 text-brand-blue"
              }`}
            >
              1
            </div>
            <div className={`flex-1 h-0.5 rounded transition-colors ${step === "phone" ? "bg-brand-blue" : "bg-border"}`} />
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === "phone" ? "bg-brand-blue text-white shadow-sm" : "bg-brand-blue/10 text-brand-blue"
              }`}
            >
              2
            </div>
          </div>

          {/* Name step */}
          {step === "name" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-brand-blue/5 flex items-center justify-center mx-auto mb-3">
                  <User className="w-6 h-6 text-brand-blue" />
                </div>
                <h2 className="text-sm font-semibold text-text-primary">What&apos;s your name?</h2>
                <p className="text-[11px] text-text-secondary mt-1">As provided by your company</p>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-text-secondary" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(""); }}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Priya Sharma"
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-ops-bg border border-border rounded-xl text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                />
              </div>

              {error && <p className="text-[11px] text-danger text-center">{error}</p>}

              <button
                onClick={handleNameSubmit}
                className="w-full py-3 bg-brand-blue text-white rounded-xl text-sm font-semibold hover:bg-brand-blue/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Phone step */}
          {step === "phone" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-brand-blue/5 flex items-center justify-center mx-auto mb-3">
                  <Smartphone className="w-6 h-6 text-brand-blue" />
                </div>
                <h2 className="text-sm font-semibold text-text-primary">Your phone number</h2>
                <p className="text-[11px] text-text-secondary mt-1">
                  For driver communication and trip updates
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <span className="text-sm text-text-secondary font-medium">+91</span>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10)); setError(""); }}
                  onKeyDown={handleKeyDown}
                  placeholder="98765 43210"
                  autoFocus
                  className="w-full pl-14 pr-4 py-3 bg-ops-bg border border-border rounded-xl text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                />
              </div>

              {error && <p className="text-[11px] text-danger text-center">{error}</p>}

              <button
                onClick={handlePhoneSubmit}
                className="w-full py-3 bg-brand-blue text-white rounded-xl text-sm font-semibold hover:bg-brand-blue/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>

              <button
                onClick={() => { setStep("name"); setError(""); }}
                className="w-full text-[11px] text-text-secondary hover:text-text-primary transition-colors"
              >
                ← Back to name
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-[10px] text-text-secondary/60 text-center mt-6 max-w-xs mx-auto">
          Your data is encrypted and masked by default. Only shared with your driver during active trips.
        </p>
      </div>
    </div>
  );
};

PassengerLogin.displayName = "PassengerLogin";
