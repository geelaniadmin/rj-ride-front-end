"use client";

import React, { useState, useMemo } from "react";
import { useWebhookStore } from "@/stores/webhookStore";
import { useTenantStore } from "@/stores/tenantStore";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Clock, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";

export const WebhookLogs: React.FC = () => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allEndpoints = useWebhookStore((s) => s.endpoints);
  const allLogs = useWebhookStore((s) => s.logs);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);

  const endpoints = useMemo(() => allEndpoints.filter((e) => e.tenantId === activeTenantId), [allEndpoints, activeTenantId]);

  const relevantLogs = useMemo(() => {
    const webhookIds = endpoints.map((e) => e.id);
    return allLogs.filter((l) => webhookIds.includes(l.webhookId));
  }, [endpoints, allLogs]);

  const filteredLogs = useMemo(() => {
    if (!selectedWebhookId) return relevantLogs;
    return relevantLogs.filter((l) => l.webhookId === selectedWebhookId);
  }, [relevantLogs, selectedWebhookId]);

  const stats = useMemo(() => {
    return {
      total: filteredLogs.length,
      success: filteredLogs.filter((l) => l.status === "success").length,
      failed: filteredLogs.filter((l) => l.status === "failed").length,
      pending: filteredLogs.filter((l) => l.status === "pending").length,
    };
  }, [filteredLogs]);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString();
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card padding="md" className="bg-ops-bg border border-border">
          <p className="text-xs text-text-secondary">Total Events</p>
          <p className="text-xl font-bold text-text-primary mt-1">{stats.total}</p>
        </Card>
        <Card padding="md" className="bg-success/10 border border-success/30">
          <p className="text-xs text-success">Delivered</p>
          <p className="text-xl font-bold text-text-primary mt-1">{stats.success}</p>
        </Card>
        <Card padding="md" className="bg-alert-amber/10 border border-alert-amber/30">
          <p className="text-xs text-alert-amber">Pending</p>
          <p className="text-xl font-bold text-text-primary mt-1">{stats.pending}</p>
        </Card>
        <Card padding="md" className="bg-danger/10 border border-danger/30">
          <p className="text-xs text-danger">Failed</p>
          <p className="text-xl font-bold text-text-primary mt-1">{stats.failed}</p>
        </Card>
      </div>

      {/* Filter */}
      {endpoints.length > 0 && (
        <Card padding="lg" header={<h3 className="font-semibold text-text-primary">🔍 Filter by Webhook</h3>}>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedWebhookId(null)}
              className={`px-3 py-1 rounded text-sm transition-all ${!selectedWebhookId ? "bg-brand-blue text-white" : "bg-ops-bg text-text-primary border border-border hover:bg-ops-bg/80"}`}
            >
              All Webhooks ({endpoints.length})
            </button>
            {endpoints.map((endpoint) => (
              <button
                key={endpoint.id}
                onClick={() => setSelectedWebhookId(endpoint.id)}
                className={`px-3 py-1 rounded text-sm transition-all ${
                  selectedWebhookId === endpoint.id ? "bg-brand-blue text-white" : "bg-ops-bg text-text-primary border border-border hover:bg-ops-bg/80"
                }`}
              >
                {endpoint.partnerId}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Logs Table */}
      <Card padding="lg" header={<h3 className="font-semibold text-text-primary">📋 Webhook Delivery Log</h3>}>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-4">No logs</p>
          ) : (
            filteredLogs
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((log) => {
                const endpoint = endpoints.find((e) => e.id === log.webhookId);
                const statusIcon =
                  log.status === "success" ? (
                    <CheckCircle className="w-4 h-4 text-success" />
                  ) : log.status === "failed" ? (
                    <AlertCircle className="w-4 h-4 text-danger" />
                  ) : log.status === "pending" ? (
                    <Clock className="w-4 h-4 text-alert-amber" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-brand-blue" />
                  );

                return (
                  <div key={log.id} className="p-3 bg-ops-bg rounded border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {statusIcon}
                        <span className="text-sm font-medium text-text-primary">{log.event}</span>
                        <Badge
                          variant={
                            log.status === "success" ? "green" : log.status === "failed" ? "red" : log.status === "pending" ? "amber" : "blue"
                          }
                        >
                          {log.status.toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-xs text-text-secondary">{formatTime(log.createdAt)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-text-secondary">Webhook</p>
                        <p className="text-text-primary">{endpoint?.partnerId || log.webhookId}</p>
                      </div>
                      <div>
                        <p className="text-text-secondary">Attempt</p>
                        <p className="text-text-primary">{log.attempt} / 10</p>
                      </div>
                      {log.statusCode && (
                        <div>
                          <p className="text-text-secondary">HTTP Status</p>
                          <p className={log.statusCode === 200 ? "text-success" : "text-danger"}>{log.statusCode}</p>
                        </div>
                      )}
                      {log.error && (
                        <div>
                          <p className="text-text-secondary">Error</p>
                          <p className="text-danger truncate">{log.error}</p>
                        </div>
                      )}
                    </div>

                    {log.payload !== undefined && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-text-secondary hover:text-text-primary">View Payload</summary>
                        <pre className="mt-2 bg-ops-sidebar rounded p-2 text-white overflow-x-auto max-w-sm border border-ops-sidebar/80">{JSON.stringify(log.payload as unknown, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                );
              })
          )}
        </div>
      </Card>

      {/* Retry Info */}
      <Card padding="lg" header={<h3 className="font-semibold text-text-primary">🔄 Retry Policy</h3>}>
        <div className="space-y-2 text-xs text-text-secondary">
          <div className="flex gap-2">
            <span className="font-medium text-text-secondary">Max Attempts:</span>
            <span className="text-text-primary">10</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium text-text-secondary">Retry Interval:</span>
            <span className="text-text-primary">2 minutes between attempts</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium text-text-secondary">Backoff:</span>
            <span className="text-text-primary">Linear (no exponential backoff)</span>
          </div>
          <p className="text-text-secondary italic mt-2">Failed deliveries are retried automatically. Check back after a few minutes.</p>
        </div>
      </Card>
    </div>
  );
};

WebhookLogs.displayName = "WebhookLogs";
