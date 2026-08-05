"use client";

import React, { useState, useMemo } from "react";
import { useWebhookStore } from "@/stores/webhookStore";
import { useTenantStore } from "@ride/shared";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import { useToastStore } from "@/stores/toastStore";
import { Trash2, Plus, Copy, Eye, EyeOff } from "lucide-react";

export const WebhookConfig: React.FC = () => {
  const activeTenantId = useTenantStore((s) => s.activeTenantId);
  const allEndpoints = useWebhookStore((s) => s.endpoints);
  const addEndpoint = useWebhookStore((s) => s.addEndpoint);
  const removeEndpoint = useWebhookStore((s) => s.removeEndpoint);
  const toggleEndpoint = useWebhookStore((s) => s.toggleEndpoint);
  const addToast = useToastStore((s) => s.addToast);

  const endpoints = useMemo(() => allEndpoints.filter((e) => e.tenantId === activeTenantId), [allEndpoints, activeTenantId]);

  const [showModal, setShowModal] = useState(false);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    partnerId: "",
    url: "",
    events: [] as string[],
  });

  const availableEvents = ["TRIP_CREATED", "TRIP_CONFIRMED", "TRIP_ASSIGNED", "TRIP_IN_PROGRESS", "TRIP_COMPLETED", "TRIP_CANCELLED"];

  const handleAddEndpoint = () => {
    if (!formData.partnerId || !formData.url || formData.events.length === 0) {
      addToast("Fill all fields", "error");
      return;
    }

    const endpoint = addEndpoint({
      tenantId: activeTenantId,
      partnerId: formData.partnerId,
      url: formData.url,
      events: formData.events,
      apiKey: `sk_live_${formData.partnerId.toLowerCase()}_${Date.now().toString().slice(-6)}`,
      active: true,
    });

    addToast(`Webhook registered for ${endpoint.partnerId}`, "success");
    setFormData({ partnerId: "", url: "", events: [] });
    setShowModal(false);
  };

  const toggleEvent = (event: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event) ? prev.events.filter((e) => e !== event) : [...prev.events, event],
    }));
  };

  return (
    <>
      <Card padding="lg" header={<h3 className="font-semibold text-text-primary">🪝 Webhook Endpoints</h3>}>
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowModal(true)} variant="primary" size="sm">
              <Plus className="w-3 h-3 mr-1" /> Add Webhook
            </Button>
          </div>

          <div className="space-y-2">
            {endpoints.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-4">No webhooks registered</p>
            ) : (
              endpoints.map((endpoint) => (
                <div key={endpoint.id} className="p-4 bg-ops-bg rounded border border-border space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">{endpoint.partnerId}</span>
                      <Badge variant={endpoint.active ? "green" : "amber"}>{endpoint.active ? "Active" : "Inactive"}</Badge>
                    </div>
                    <button onClick={() => removeEndpoint(endpoint.id)} className="text-danger hover:text-danger/80 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-text-secondary">URL</p>
                      <p className="text-sm text-text-primary font-mono break-all">{endpoint.url}</p>
                    </div>

                    <div>
                      <p className="text-xs text-text-secondary mb-1">API Key</p>
                      <div className="flex items-center gap-2 bg-ops-sidebar rounded p-2">
                        <code className="text-xs text-white flex-1 font-mono">
                          {showApiKey[endpoint.id] ? endpoint.apiKey : endpoint.apiKey.slice(0, 20) + "..."}
                        </code>
                        <button
                          onClick={() => setShowApiKey((prev) => ({ ...prev, [endpoint.id]: !prev[endpoint.id] }))}
                          className="text-white/60 hover:text-white transition-colors"
                        >
                          {showApiKey[endpoint.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(endpoint.apiKey);
                            addToast("API key copied", "success");
                          }}
                          className="text-white/60 hover:text-white transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-text-secondary mb-1">Events ({endpoint.events.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {endpoint.events.map((evt) => (
                          <Badge key={evt} variant="blue">
                            {evt}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleEndpoint(endpoint.id)}
                      className="text-xs text-brand-blue hover:text-brand-blue/80 transition-colors"
                    >
                      {endpoint.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      <Drawer open={showModal} onClose={() => setShowModal(false)} title="Register Webhook Endpoint" width="lg">
        <div className="space-y-4">
          <FormField label="Partner ID" required>
            <Input value={formData.partnerId} onChange={(e) => setFormData((prev) => ({ ...prev, partnerId: e.target.value }))} placeholder="e.g., RISMA" />
          </FormField>

          <FormField label="Webhook URL" required>
            <Input value={formData.url} onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))} placeholder="https://partner.internal/webhooks/rides" />
          </FormField>

          <FormField label="Events" required hint={`Select ${formData.events.length} event(s)`}>
            <div className="space-y-2">
              {availableEvents.map((event) => (
                <label key={event} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.events.includes(event)} onChange={() => toggleEvent(event)} className="w-4 h-4 rounded" />
                  <span className="text-sm text-text-primary">{event}</span>
                </label>
              ))}
            </div>
          </FormField>

          <div className="flex gap-2 justify-end pt-4 border-t border-border">
            <Button onClick={() => setShowModal(false)} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleAddEndpoint} variant="primary">
              Register
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  );
};

WebhookConfig.displayName = "WebhookConfig";
