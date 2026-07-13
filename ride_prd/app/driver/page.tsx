"use client";

import React from "react";
import { DriverApp } from "@/components/driver/DriverApp";

export default function DriverPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Driver App</h1>
        <p className="text-sm text-text-secondary mt-1">Full-width driver simulator for dispatch monitoring</p>
      </div>
      <DriverApp compact={false} />
    </div>
  );
}
