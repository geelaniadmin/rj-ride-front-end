import { Employee, Gender, DriverShift, SafetyFlag } from "@/lib/types";

export interface ParsedRosterRow {
  index: number;
  errors: string[];
  employee: Omit<Employee, "id"> | null;
  roster: { date: string; startTime: string; endTime: string } | null;
}

const REQUIRED_FIELDS = [
  "employee_id", "name", "phone", "gender",
  "home_address", "home_lat", "home_lng",
  "office_address", "office_lat", "office_lng",
  "shift", "date", "start_time", "end_time",
];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

/** Parse roster CSV with dynamic column mapping support */
export function parseRosterCSV(
  content: string,
  columnMapping?: Record<string, string>
): ParsedRosterRow[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  const rawHeaders = (lines[0] || "").split(",").map((h) => h.trim());
  const headers = rawHeaders.map((h) => normalizeHeader(h));

  // Apply column mapping if provided (maps CSV column -> our field name)
  const resolvedFields = columnMapping
    ? headers.map((h) => columnMapping[h] || h)
    : headers;

  // Check for required fields
  const missingFields = REQUIRED_FIELDS.filter(
    (f) => !resolvedFields.includes(f)
  );

  if (missingFields.length > 0) {
    return [
      {
        index: 0,
        errors: [
          `Missing required columns: ${missingFields.join(", ")}. ` +
          `Found: ${headers.join(", ")}`,
        ],
        employee: null,
        roster: null,
      },
    ];
  }

  const results: ParsedRosterRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = (lines[i] || "").trim();
    if (!line) continue;

    const values = line.split(",").map((v) => v.trim());
    const errors: string[] = [];
    const row: Record<string, string> = {};

    // Map values to fields
    resolvedFields.forEach((field, idx) => {
      row[field] = values[idx] || "";
    });

    // Validate required fields
    for (const field of REQUIRED_FIELDS) {
      if (!row[field]) {
        errors.push(`${field} is required`);
      }
    }

    if (errors.length > 0) {
      results.push({ index: i, errors, employee: null, roster: null });
      continue;
    }

    // Parse gender
    const genderNorm = (row["gender"] || "").toUpperCase();
    const gender: Gender =
      genderNorm === "MALE" ? "MALE" :
      genderNorm === "FEMALE" ? "FEMALE" :
      genderNorm === "OTHER" ? "OTHER" : "OTHER";

    // Parse shift
    const shiftNorm = (row["shift"] || "").toUpperCase();
    const shift: DriverShift =
      shiftNorm === "DAY" ? "DAY" :
      shiftNorm === "NIGHT" ? "NIGHT" : "FLEX";

    // Parse safety flags
    const safetyFlags: SafetyFlag[] = (row["safety_flags"] || "")
      .split(";")
      .map((f) => f.trim().toUpperCase())
      .filter((f): f is SafetyFlag =>
        ["LONE_FEMALE", "NIGHT_SHIFT", "SPECIAL_NEEDS", "SENSITIVE"].includes(f)
      );

    // Parse lat/lng
    const homeLat = parseFloat(row["home_lat"] || "");
    const homeLng = parseFloat(row["home_lng"] || "");
    const officeLat = parseFloat(row["office_lat"] || "");
    const officeLng = parseFloat(row["office_lng"] || "");

    if (isNaN(homeLat) || isNaN(homeLng)) {
      errors.push("Home coordinates must be valid numbers");
    }
    if (isNaN(officeLat) || isNaN(officeLng)) {
      errors.push("Office coordinates must be valid numbers");
    }

    // Validate date format
    if (row["date"] && !/^\d{4}-\d{2}-\d{2}$/.test(row["date"])) {
      errors.push("Date must be YYYY-MM-DD format");
    }

    // Validate time format
    if (row["start_time"] && !/^\d{2}:\d{2}$/.test(row["start_time"])) {
      errors.push("Start time must be HH:mm format");
    }
    if (row["end_time"] && !/^\d{2}:\d{2}$/.test(row["end_time"])) {
      errors.push("End time must be HH:mm format");
    }

    if (errors.length > 0) {
      results.push({ index: i, errors, employee: null, roster: null });
      continue;
    }

    results.push({
      index: i,
      errors: [],
      employee: {
        tenantId: "", // Will be set by caller
        employeeId: row["employee_id"] || "",
        name: row["name"] || "",
        phone: row["phone"] || "",
        email: row["email"],
        gender,
        homeLat,
        homeLng,
        homeAddress: row["home_address"] || "",
        officeLat,
        officeLng,
        officeAddress: row["office_address"] || "",
        officeZone: row["office_zone"],
        shift,
        safetyFlags,
        active: true,
      },
      roster: {
        date: row["date"] || "",
        startTime: row["start_time"] || "",
        endTime: row["end_time"] || "",
      },
    });
  }

  return results;
}

/** Generate a sample CSV template for roster upload */
export function generateRosterTemplate(): string {
  return [
    REQUIRED_FIELDS.join(","),
    "EMP001,John Doe,+911234567890,john@example.com,MALE,123 Main St,12.9719,77.5937,456 Oak Ave,12.9344,77.6101,ZONE_A,DAY,LONE_FEMALE,2026-07-01,08:00,17:00",
    "EMP002,Jane Smith,+911234567891,jane@example.com,FEMALE,789 Pine Rd,12.9352,77.6245,321 Elm St,12.9716,77.5946,ZONE_B,NIGHT,,2026-07-01,22:00,06:00",
  ].join("\n");
}
