// Shared types
export * from './types';

// Shared stores
export { useTripStore } from './stores/tripStore';
export { useDriverStore } from './stores/driverStore';
export { useVehicleTypeStore } from './stores/vehicleTypeStore';
export { useVehicleStore } from './stores/vehicleStore';
export { useVendorStore, useVendorInfoStore } from './stores/vendorStore';
export { useEarningsStore } from './stores/earningsStore';
export { usePayoutStore } from './stores/payoutStore';
export { useAlertStore } from './stores/alertStore';
export { useSafetyAlertStore } from './stores/safetyAlertStore';
export type { SafetyAlert, SafetyAlertType, SafetyAlertStatus, SafetyTimeline } from './stores/safetyAlertStore';
export { useSessionStore } from './stores/sessionStore';
export { useCustomerStore } from './stores/customerStore';
export { useTenantStore } from './stores/tenantStore';
export { useTraccarStore } from './stores/traccarStore';

// Language store & translations
export { useLanguageStore } from './stores/languageStore';
export type { Language } from './stores/languageStore';
export { translations, t } from './translations';

// Traccar service & types
export { traccarService } from './services/traccarService';
export type { TraccarPosition, TraccarDevice } from './services/traccarService';

// Encryption utilities
export { encrypt, decrypt, clearKey } from './crypto';
export { encryptedStorage } from './encryptedStorage';

// Helpers
export { id } from './helpers';

// API foundation
export { apiClient, client, ApiError, isApiError, getErrorCode } from './api/client';
export type { ApiErrorData } from './api/client';
export { formatMoney, toMinor } from './api/money';
export { createQueryClient, keys, wsInvalidationMap } from './api/query';
export { ApiProviders } from './api/ApiProviders';
export { useCursorList } from './api/useCursorList';
export type { CursorPage } from './api/useCursorList';
export { QueryBoundary } from './api/QueryBoundary';

// Auth
export { AuthProvider, useSession, useAuth, requireRole } from './auth/AuthProvider';

// Realtime
export { connectEvents, useRideEvents } from './realtime/ws';
export type { RideEvent, TripEvent, BillingEvent, SosEvent, TrackingEvent, DocumentEvent } from './realtime/ws';
