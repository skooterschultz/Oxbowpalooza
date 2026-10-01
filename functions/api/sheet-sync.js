const DESTINATION = { lat: 36.642336, lng: -93.852493 };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function toEntry(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    nickname: row.nickname,
    email: row.email,
    phone: row.phone,
    partyTotal: row.party_total,
    city: row.city,
    address: row.address,
    invitedBy: row.invited_by,
    familyConnection: row.family_connection,
    familyRelationship: row.family_relationship,
    foodNotes: row.food_notes,
    daysAttending: row.days_attending,
    birthMonth: row.birth_month,
    birthDay: row.birth_day,
    birthYear: row.birth_year,
    heightInches: row.height_inches,
    originLat: row.origin_lat,
    originLng: row.origin_lng,
    miles: row.miles,
    arrivalDate: row.flight_arrival_date,
    arrivalTime: row.flight_arrival_time,
    arrivalAirport: row.arrival_airport,
    departureDate: row.flight_departure_date,
    departureTime: row.flight_departure_time,
    flightNotes: row.flight_notes,
  };
}

async function ensureFamilyColumns(env) {
  const table = await env.DB.prepare("PRAGMA table_info(rsvps)").all();
  const columns = new Set((table.results || []).map((column) => column.name));
  const additions = [
    ["family_connection", "ALTER TABLE rsvps ADD COLUMN family_connection TEXT"],
    ["family_relationship", "ALTER TABLE rsvps ADD COLUMN family_relationship TEXT"],
    ["phone", "ALTER TABLE rsvps ADD COLUMN phone TEXT"],
    ["party_total", "ALTER TABLE rsvps ADD COLUMN party_total INTEGER"],
  ];

  for (const [name, statement] of additions) {
    if (!columns.has(name)) {
      try {
        await env.DB.prepare(statement).run();
      } catch (error) {
        if (!/duplicate column/i.test(String(error))) {
          throw error;
        }
      }
    }
  }
}

async function listEntriesForSheet(env) {
  await ensureFamilyColumns(env);
  const { results } = await env.DB.prepare(
    `SELECT
      id, created_at, name, nickname, email, phone, party_total, city, address, invited_by,
      family_connection, family_relationship,
      food_notes, days_attending, birth_month, birth_day, birth_year,
      height_inches, origin_lat, origin_lng, miles, flight_arrival_date,
      flight_arrival_time, arrival_airport, flight_departure_date,
      flight_departure_time, flight_notes
    FROM rsvps
    ORDER BY created_at ASC, id ASC`
  ).all();

  return (results || []).map(toEntry);
}

function json(data, status = 200) {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

function clean(value) {
  return String(value ?? "").trim();
}

function hasCityAndState(value) {
  const parts = clean(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return false;
  }

  const state = parts.pop();
  const city = parts.join(", ");
  return city.length >= 2 && /^(?:[a-z]{2}|[a-z][a-z .'-]{2,})$/i.test(state);
}

function normalizedLocation(value) {
  return clean(value)
    .toLowerCase()
    .replace(/state highway/g, "state hwy")
    .replace(/[.,#]/g, " ")
    .replace(/\s+/g, " ");
}

function isReunionAddress(address, city) {
  const location = normalizedLocation(`${address} ${city}`);
  const hasAddress = location.includes("20243") && location.includes("112");
  const hasResort = location.includes("fishers of men") || location.includes("fisher s of men");
  const hasCassville = location.includes("cassville") || location.includes("65625");
  return hasAddress || (hasResort && hasCassville);
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeEmails(value) {
  return [...new Set(
    clean(value)
      .split(/[;,]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  )].join(", ");
}

function distanceInMiles(origin, destination) {
  if (!origin) {
    return null;
  }

  const toRadians = (degrees) => degrees * Math.PI / 180;
  const earthRadiusMiles = 3958.8;
  const latDistance = toRadians(destination.lat - origin.lat);
  const lngDistance = toRadians(destination.lng - origin.lng);
  const a = Math.sin(latDistance / 2) ** 2
    + Math.cos(toRadians(origin.lat)) * Math.cos(toRadians(destination.lat))
    * Math.sin(lngDistance / 2) ** 2;
  return Math.round(earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function geocode(city, address, env) {
  const query = clean(address) ? `${clean(address)}, ${clean(city)}` : clean(city);
  if (!query || !env.MAPBOX_PUBLIC_TOKEN) {
    return null;
  }

  const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  url.searchParams.set("q", `${query}, USA`);
  url.searchParams.set("country", "us");
  url.searchParams.set("limit", "1");
  url.searchParams.set("access_token", env.MAPBOX_PUBLIC_TOKEN);
  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const coordinates = data.features?.[0]?.geometry?.coordinates;
  return Array.isArray(coordinates) ? { lng: coordinates[0], lat: coordinates[1] } : null;
}

async function updateFromSheet(env, entry) {
  await ensureFamilyColumns(env);
  const id = numeric(entry.id);
  if (!Number.isInteger(id) || id < 1) {
    return json({ ok: false, error: "A valid RSVP ID is required." }, 400);
  }

  const city = clean(entry.city);
  const address = clean(entry.address);
  const email = normalizeEmails(entry.email);
  const phone = clean(entry.phone);
  const partyTotal = numeric(entry.partyTotal);

  if (!email) {
    return json({ ok: false, error: "At least one email address is required." }, 400);
  }

  if (!phone) {
    return json({ ok: false, error: "A phone number is required." }, 400);
  }

  if (!Number.isInteger(partyTotal) || partyTotal < 1 || partyTotal > 50) {
    return json({ ok: false, error: "Party total must be a whole number from 1 to 50." }, 400);
  }

  if (!hasCityAndState(city)) {
    return json({ ok: false, error: "City and state are required. Use a format like Anderson, Missouri." }, 400);
  }

  const atReunion = isReunionAddress(address, city);
  const origin = atReunion ? DESTINATION : await geocode(city, address, env);
  const miles = atReunion ? 0 : distanceInMiles(origin, DESTINATION);

  const result = await env.DB.prepare(
    `UPDATE rsvps SET
      name = ?,
      nickname = ?,
      email = ?,
      phone = ?,
      party_total = ?,
      city = ?,
      address = ?,
      invited_by = ?,
      family_connection = ?,
      family_relationship = ?,
      food_notes = ?,
      days_attending = ?,
      birth_month = ?,
      birth_day = ?,
      birth_year = ?,
      height_inches = ?,
      origin_lat = ?,
      origin_lng = ?,
      miles = ?,
      flight_arrival_date = ?,
      flight_arrival_time = ?,
      arrival_airport = ?,
      flight_departure_date = ?,
      flight_departure_time = ?,
      flight_notes = ?
    WHERE id = ?`
  ).bind(
    clean(entry.name),
    clean(entry.nickname),
    email,
    phone,
    partyTotal,
    city,
    address,
    clean(entry.invitedBy),
    clean(entry.familyConnection),
    clean(entry.familyRelationship),
    clean(entry.foodNotes),
    clean(entry.daysAttending),
    clean(entry.birthMonth),
    numeric(entry.birthDay),
    numeric(entry.birthYear),
    numeric(entry.heightInches),
    origin?.lat ?? null,
    origin?.lng ?? null,
    miles,
    clean(entry.arrivalDate),
    clean(entry.arrivalTime),
    clean(entry.arrivalAirport),
    clean(entry.departureDate),
    clean(entry.departureTime),
    clean(entry.flightNotes),
    id
  ).run();

  if (!result.meta?.changes) {
    return json({ ok: false, error: "RSVP was not found." }, 404);
  }

  return json({ ok: true, id, miles });
}

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (!env.DB) {
    return json({ ok: false, error: "D1 binding DB is not configured." }, 500);
  }

  if (!env.SHEET_SYNC_SECRET) {
    return json({ ok: false, error: "Sheet sync secret is not configured." }, 500);
  }

  const authorization = request.headers.get("Authorization") || "";
  if (authorization !== `Bearer ${env.SHEET_SYNC_SECRET}`) {
    return json({ ok: false, error: "Unauthorized." }, 401);
  }

  try {
    if (request.method === "GET") {
      return json({ ok: true, entries: await listEntriesForSheet(env) });
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed." }, 405);
    }

    const body = await request.json();
    return updateFromSheet(env, body.entry || body);
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Unable to update RSVP." }, 500);
  }
}
