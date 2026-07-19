import { APIRequestContext } from '@playwright/test';

const API_BASE = process.env.API_BASE ?? 'http://localhost:8000';

export async function loginApi(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const res = await request.post(`${API_BASE}/v1/auth/token`, {
    data: { email, password },
  });
  if (!res.ok()) throw new Error(`Login failed: ${res.status()} ${await res.text()}`);
  const body = await res.json();
  return body.access ?? body.token ?? body.result?.access;
}

export async function seedTrip(
  request: APIRequestContext,
  token: string,
): Promise<{ tripId: string; vehicleId: string }> {
  const res = await request.post(`${API_BASE}/v1/trips`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      customerId: process.env.SEED_CUSTOMER_ID ?? 'seed-customer-1',
      stops: [
        { seq: 0, type: 'PICKUP', locationType: 'ADDRESS', address: 'MG Road, Bangalore', lat: 12.9756, lng: 77.6072 },
        { seq: 1, type: 'DROP', locationType: 'ADDRESS', address: 'Koramangala, Bangalore', lat: 12.9352, lng: 77.6245 },
      ],
      vehicles: [{ requestedVehicleTypeId: process.env.SEED_VEHICLE_TYPE_ID ?? 'seed-vt-1', pax: [] }],
      schedule: { type: 'ONE_OFF' },
      autoAssign: true,
    },
  });
  if (!res.ok()) throw new Error(`seedTrip failed: ${res.status()} ${await res.text()}`);
  const body = await res.json();
  const trip = body.result ?? body;
  const vehicleId: string = trip.vehicles?.[0]?.id ?? 'unknown';
  return { tripId: trip.id, vehicleId };
}

export async function getTestOtp(
  request: APIRequestContext,
  token: string,
  tripVehicleId: string,
  gate: 'pickup' | 'drop',
): Promise<string | null> {
  const res = await request.get(
    `${API_BASE}/v1/trips/${tripVehicleId}/otp?gate=${gate}&_debug=1`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok()) return null;
  const body = await res.json();
  return body.result?.otp ?? body.otp ?? null;
}

export async function transitionTripVehicle(
  request: APIRequestContext,
  token: string,
  tripVehicleId: string,
  action: string,
  body?: Record<string, unknown>,
): Promise<void> {
  const res = await request.post(
    `${API_BASE}/v1/trips/vehicles/${tripVehicleId}/${action}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: body ?? {},
    },
  );
  if (!res.ok()) {
    throw new Error(`transition '${action}' failed: ${res.status()} ${await res.text()}`);
  }
}
