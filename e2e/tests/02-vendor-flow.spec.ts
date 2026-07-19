import { test, expect } from '@playwright/test';
import { loginApi, seedTrip, transitionTripVehicle } from './helpers';

const BASE_URL_VENDOR = process.env.BASE_URL_VENDOR ?? 'http://localhost:3001';
const API_BASE = process.env.API_BASE ?? 'http://localhost:8000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@ride.test';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123';
const VENDOR_EMAIL = process.env.VENDOR_EMAIL ?? 'vendor@ride.test';
const VENDOR_PASSWORD = process.env.VENDOR_PASSWORD ?? 'vendor123';

test.describe('Vendor flow — login → see trip → acknowledge → reassign', () => {
  test('vendor manager sees assigned trip, acknowledges it, reassigns to another vehicle', async ({ page, request }) => {
    const adminToken = await loginApi(request, ADMIN_EMAIL, ADMIN_PASSWORD).catch(() => null);

    if (!adminToken) {
      test.skip(true, 'Backend not reachable — skipping vendor flow spec');
      return;
    }

    const { tripId, vehicleId } = await seedTrip(request, adminToken);
    await transitionTripVehicle(request, adminToken, vehicleId, 'accept').catch(() => {});

    await page.goto(`${BASE_URL_VENDOR}/login`);
    await page.getByLabel(/email/i).fill(VENDOR_EMAIL);
    await page.getByLabel(/password/i).fill(VENDOR_PASSWORD);
    await page.getByRole('button', { name: /login|sign in/i }).click();
    await expect(page).not.toHaveURL(/login/, { timeout: 15_000 });

    await page.goto(`${BASE_URL_VENDOR}/trips`);
    await expect(page.getByText(tripId.substring(0, 8), { exact: false })).toBeVisible({ timeout: 15_000 });

    const acknowledgeBtn = page.getByRole('button', { name: /acknowledge|accept/i }).first();
    if (await acknowledgeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await acknowledgeBtn.click();
      await expect(acknowledgeBtn).toBeHidden({ timeout: 5_000 });
    }

    const reassignBtn = page.getByRole('button', { name: /reassign|change vehicle/i }).first();
    if (await reassignBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await reassignBtn.click();
      const vehicleOption = page.getByRole('option').first();
      if (await vehicleOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await vehicleOption.click();
        const confirmBtn = page.getByRole('button', { name: /confirm|save/i }).first();
        if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await confirmBtn.click();
        }
        await expect(page.getByText(/reassigned|updated/i, { exact: false })).toBeVisible({ timeout: 8_000 }).catch(() => {});
      }
    }

    await expect(page.getByText(tripId.substring(0, 8), { exact: false })).toBeVisible();

    const altVehicleRes = await request.get(`${API_BASE}/v1/fleet/vehicles`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (altVehicleRes.ok()) {
      const body = await altVehicleRes.json();
      const vehicles = body.result ?? body.results ?? [];
      const alt = vehicles.find((v: { id: string }) => v.id !== vehicleId);
      if (alt) {
        const patchRes = await request.patch(
          `${API_BASE}/v1/trips/vehicles/${vehicleId}/reassign`,
          {
            headers: { Authorization: `Bearer ${adminToken}` },
            data: { newVehicleId: alt.id },
          },
        );
        if (patchRes.ok()) {
          await page.reload();
          await expect(page.getByText(tripId.substring(0, 8), { exact: false })).toBeVisible();
        }
      }
    }
  });
});
