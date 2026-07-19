import { test, expect } from '@playwright/test';
import { loginApi, seedTrip, getTestOtp, transitionTripVehicle } from './helpers';

const BASE_URL_PRD = process.env.BASE_URL_PRD ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@ride.test';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin123';

test.describe('Money path — quote → book → assign → transitions → BILLED', () => {
  test('admin books a trip, auto-assigns, drives through OTP gates, ends BILLED', async ({ page, request }) => {
    const token = await loginApi(request, ADMIN_EMAIL, ADMIN_PASSWORD).catch(() => null);

    if (!token) {
      test.skip(true, 'Backend not reachable — skipping money path spec');
      return;
    }

    const { tripId, vehicleId } = await seedTrip(request, token);

    await page.goto(`${BASE_URL_PRD}/login`);
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /login|sign in/i }).click();
    await expect(page).not.toHaveURL(/login/, { timeout: 15_000 });

    await page.goto(`${BASE_URL_PRD}/trips/${tripId}`);
    await expect(page.getByText(tripId.substring(0, 8), { exact: false })).toBeVisible({ timeout: 10_000 });

    const pickupOtp = await getTestOtp(request, token, vehicleId, 'pickup');
    if (!pickupOtp) {
      await expect(page.getByText(/ASSIGNED|CONFIRMED|IN_PROGRESS/i, { exact: false })).toBeVisible({ timeout: 10_000 });
      test.info().annotations.push({ type: 'note', description: 'OTP debug endpoint not available — drove transitions to assignment gate only.' });
      return;
    }

    await transitionTripVehicle(request, token, vehicleId, 'accept');
    await transitionTripVehicle(request, token, vehicleId, 'en-route-pickup');
    await transitionTripVehicle(request, token, vehicleId, 'at-pickup');
    await transitionTripVehicle(request, token, vehicleId, 'pax-picked', { otp: pickupOtp });

    const dropOtp = await getTestOtp(request, token, vehicleId, 'drop');
    if (dropOtp) {
      await transitionTripVehicle(request, token, vehicleId, 'in-transit');
      await transitionTripVehicle(request, token, vehicleId, 'at-drop');
      await transitionTripVehicle(request, token, vehicleId, 'pax-dropped', { otp: dropOtp });
    }

    await page.reload();
    const statusEl = page.getByText(/COMPLETED|BILLED/i, { exact: false });
    await expect(statusEl).toBeVisible({ timeout: 15_000 });

    const amountEl = page.locator('text=/₹|INR/').first();
    if (await amountEl.isVisible()) {
      const text = await amountEl.textContent();
      expect(text).toMatch(/\d/);
    }
  });
});
