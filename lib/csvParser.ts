export interface BulkTripRow {
  customer_code: string;
  pickup_address: string;
  pickup_lat: string;
  pickup_lng: string;
  drop_address: string;
  drop_lat: string;
  drop_lng: string;
  vehicle_types: string; // comma-separated list of vehicle type names
  schedule_date: string; // YYYY-MM-DD
  reference?: string;
}

export interface ParsedBulkRow {
  index: number;
  data: BulkTripRow;
  errors: string[];
}

export function parseCSV(content: string): ParsedBulkRow[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) {
    return [];
  }

  const headers = (lines[0] || "").split(",").map((h) => h.trim().toLowerCase());
  const requiredHeaders = ["customer_code", "pickup_address", "pickup_lat", "pickup_lng", "drop_address", "drop_lat", "drop_lng", "vehicle_types", "schedule_date"];

  const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return [
      {
        index: 0,
        data: {} as BulkTripRow,
        errors: [`Missing required columns: ${missingHeaders.join(", ")}`],
      },
    ];
  }

  const results: ParsedBulkRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = (lines[i] || "").trim();
    if (!line) continue;

    const values = (line || "").split(",").map((v) => v.trim());
    const row: Partial<BulkTripRow> = {};
    const errors: string[] = [];

    requiredHeaders.forEach((header, idx) => {
      const value = values[idx];
      if (!value) {
        errors.push(`${header} is required`);
      } else {
        (row as Record<string, string>)[header] = value;
      }
    });

    // Validate numeric fields
    const lat = parseFloat(row.pickup_lat || "");
    const lng = parseFloat(row.pickup_lng || "");
    if (isNaN(lat) || isNaN(lng)) {
      errors.push("Pickup lat/lng must be valid numbers");
    }

    const dropLat = parseFloat(row.drop_lat || "");
    const dropLng = parseFloat(row.drop_lng || "");
    if (isNaN(dropLat) || isNaN(dropLng)) {
      errors.push("Drop lat/lng must be valid numbers");
    }

    // Validate date format
    if (row.schedule_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.schedule_date)) {
      errors.push("Schedule date must be YYYY-MM-DD format");
    }

    // Validate vehicle types (not empty)
    if (!row.vehicle_types || row.vehicle_types.split(",").length === 0) {
      errors.push("Vehicle types are required (comma-separated list)");
    }

    results.push({
      index: i,
      data: row as BulkTripRow,
      errors,
    });
  }

  return results;
}

export function parseExcel(fileContent: ArrayBuffer): ParsedBulkRow[] {
  // For now, we'll just show an error since implementing a full Excel parser is complex
  // In a real app, we'd use a library like xlsx
  return [
    {
      index: 0,
      data: {} as BulkTripRow,
      errors: ["Excel parsing is coming soon. Please use CSV format."],
    },
  ];
}
