const DESTINATION = {
  lat: 45.4859628,
  lng: -122.3071819,
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: CORS_HEADERS,
  });
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

function clean(value) {
  return String(value || "").trim();
}

function geocodeQuery(address, city) {
  const query = address ? `${address}, ${city}` : city;

  return query && !/\b(usa|united states)\b/i.test(query) ? `${query}, USA` : query;
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizedLocation(value) {
  return clean(value)
    .toLowerCase()
    .replace(/southeast/g, "se")
    .replace(/parkway/g, "pkwy")
    .replace(/[.,#]/g, " ")
    .replace(/\s+/g, " ");
}

function isPartyAddress(address, city) {
  const location = normalizedLocation(`${address} ${city}`);
  const hasAddress = location.includes("5238") && location.includes("oxbow") && (location.includes("pkwy") || location.includes("park"));
  const hasGresham = location.includes("gresham") || location.includes("97080");

  return hasAddress && hasGresham;
}

function toEntry(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    nickname: row.nickname,
    email: row.email,
    city: row.city,
    address: row.address,
    invitedBy: row.invited_by,
    foodNotes: row.food_notes,
    daysAttending: row.days_attending,
    birthMonth: row.birth_month,
    birthDay: row.birth_day,
    heightInches: row.height_inches,
    originLat: row.origin_lat,
    originLng: row.origin_lng,
    miles: row.miles,
    arrivalDate: row.flight_arrival_date,
    arrivalTime: row.flight_arrival_time,
    departureDate: row.flight_departure_date,
    departureTime: row.flight_departure_time,
    flightNotes: row.flight_notes,
  };
}

function toPublicEntry(row) {
  return {
    id: row.id,
    name: row.name,
    nickname: row.nickname,
    city: row.city,
    invitedBy: row.invited_by,
    birthMonth: row.birth_month,
    birthDay: row.birth_day,
    heightInches: row.height_inches,
    originLat: row.origin_lat,
    originLng: row.origin_lng,
    miles: row.miles,
    arrivalDate: row.flight_arrival_date,
    arrivalTime: row.flight_arrival_time,
    departureDate: row.flight_departure_date,
    departureTime: row.flight_departure_time,
  };
}

async function tableColumns(env) {
  const table = await env.DB.prepare("PRAGMA table_info(rsvps)").all();
  return new Set((table.results || []).map((column) => column.name));
}

function selectColumn(columns, name) {
  return columns.has(name) ? name : `NULL AS ${name}`;
}

function distanceInMiles(from, to) {
  if (!from) {
    return null;
  }

  const earthMiles = 3958.8;
  const fromLat = (from.lat * Math.PI) / 180;
  const toLat = (to.lat * Math.PI) / 180;
  const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthMiles * c);
}

async function geocodeWithGoogle(city, env) {
  if (!env.GOOGLE_MAPS_API_KEY) {
    return null;
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", city);
  url.searchParams.set("key", env.GOOGLE_MAPS_API_KEY);

  const response = await fetch(url.toString());
  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const location = data.results?.[0]?.geometry?.location;

  return location ? { lat: location.lat, lng: location.lng } : null;
}

async function geocodeWithOpenStreetMap(city) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", city);

  const response = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Oxbowpalooza RSVP site",
    },
  });

  if (!response.ok) {
    return null;
  }

  const [result] = await response.json();
  if (!result) {
    return null;
  }

  return {
    lat: Number(result.lat),
    lng: Number(result.lon),
  };
}

async function geocodeCity(city, env) {
  if (!city) {
    return null;
  }

  try {
    return (await geocodeWithGoogle(city, env)) || (await geocodeWithOpenStreetMap(city));
  } catch (error) {
    return null;
  }
}

async function listEntries(env) {
  const columns = await tableColumns(env);
  const { results } = await env.DB.prepare(
    `SELECT
      id,
      name,
      nickname,
      city,
      invited_by,
      birth_month,
      birth_day,
      height_inches,
      origin_lat,
      origin_lng,
      miles,
      ${selectColumn(columns, "flight_arrival_date")},
      ${selectColumn(columns, "flight_arrival_time")},
      ${selectColumn(columns, "flight_departure_date")},
      ${selectColumn(columns, "flight_departure_time")}
    FROM rsvps
    ORDER BY created_at DESC
    LIMIT 250`
  ).all();

  return results.map(toPublicEntry);
}

async function healthCheck(env) {
  if (!env.DB) {
    return { ok: false, error: "D1 binding DB is not configured." };
  }

  try {
    const table = await env.DB.prepare("PRAGMA table_info(rsvps)").all();
    const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM rsvps").first();
    return {
      ok: true,
      columns: (table.results || []).map((column) => column.name),
      total: count?.total || 0,
    };
  } catch (error) {
    return {
      ok: false,
      error: errorMessage(error),
    };
  }
}

async function createEntry(request, env) {
  const body = await request.json();
  const name = clean(body.name);
  const email = clean(body.email).toLowerCase();
  const city = clean(body.city);
  const address = clean(body.address);
  const originQuery = geocodeQuery(address, city);
  const daysAttending = clean(body.daysAttending);

  if (!name) {
    return json({ ok: false, error: "Name is required." }, 400);
  }

  if (!daysAttending) {
    return json({ ok: false, error: "Pick at least one day you are attending." }, 400);
  }

  if (!clean(body.invitedBy)) {
    return json({ ok: false, error: "Pick the person who brought you into this beautiful mess." }, 400);
  }

  if (!clean(body.birthMonth) || !clean(body.birthDay)) {
    return json({ ok: false, error: "Birthday month and day are required." }, 400);
  }

  const heightInches = numeric(body.heightInches);
  const birthDay = numeric(body.birthDay);
  const origin = isPartyAddress(address, city) ? DESTINATION : await geocodeCity(originQuery, env);
  const miles = isPartyAddress(address, city) ? 0 : distanceInMiles(origin, DESTINATION);
  const columns = await tableColumns(env);
  const hasFlightColumns =
    columns.has("flight_arrival_date") &&
    columns.has("flight_arrival_time") &&
    columns.has("flight_departure_date") &&
    columns.has("flight_departure_time") &&
    columns.has("flight_notes");
  const existing = email
    ? await env.DB.prepare("SELECT id FROM rsvps WHERE lower(email) = ? ORDER BY created_at DESC LIMIT 1").bind(email).first()
    : null;
  const wasUpdated = Boolean(existing?.id);
  let savedId = existing?.id || null;

  if (savedId) {
    const flightSet = hasFlightColumns
      ? `,
        flight_arrival_date = ?,
        flight_arrival_time = ?,
        flight_departure_date = ?,
        flight_departure_time = ?,
        flight_notes = ?`
      : "";
    const flightValues = hasFlightColumns
      ? [clean(body.arrivalDate), clean(body.arrivalTime), clean(body.departureDate), clean(body.departureTime), clean(body.flightNotes)]
      : [];

    await env.DB.prepare(
      `UPDATE rsvps
      SET
        name = ?,
        nickname = ?,
        email = ?,
        city = ?,
        address = ?,
        invited_by = ?,
        food_notes = ?,
        days_attending = ?,
        birth_month = ?,
        birth_day = ?,
        height_inches = ?,
        origin_lat = ?,
        origin_lng = ?,
        miles = ?${flightSet}
      WHERE id = ?`
    )
      .bind(
        name,
        clean(body.nickname),
        email,
        city,
        address,
        clean(body.invitedBy),
        clean(body.foodNotes),
        daysAttending,
        clean(body.birthMonth),
        birthDay,
        heightInches,
        origin?.lat || null,
        origin?.lng || null,
        miles,
        ...flightValues,
        savedId
      )
      .run();
  } else {
    const flightColumns = hasFlightColumns
      ? `,
      flight_arrival_date,
      flight_arrival_time,
      flight_departure_date,
      flight_departure_time,
      flight_notes`
      : "";
    const flightPlaceholders = hasFlightColumns ? ", ?, ?, ?, ?, ?" : "";
    const flightValues = hasFlightColumns
      ? [clean(body.arrivalDate), clean(body.arrivalTime), clean(body.departureDate), clean(body.departureTime), clean(body.flightNotes)]
      : [];
    const result = await env.DB.prepare(
    `INSERT INTO rsvps (
      name,
      nickname,
      email,
      city,
      address,
      invited_by,
      food_notes,
      days_attending,
      birth_month,
      birth_day,
      height_inches,
      origin_lat,
      origin_lng,
      miles${flightColumns}
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${flightPlaceholders})`
  )
    .bind(
      name,
      clean(body.nickname),
      email,
      city,
      address,
      clean(body.invitedBy),
      clean(body.foodNotes),
      daysAttending,
      clean(body.birthMonth),
      birthDay,
      heightInches,
      origin?.lat || null,
      origin?.lng || null,
      miles,
      ...flightValues
    )
    .run();
    savedId = result.meta.last_row_id;
  }

  const saved = await env.DB.prepare(
    `SELECT
      id,
      created_at,
      name,
      nickname,
      email,
      city,
      address,
      invited_by,
      food_notes,
      days_attending,
      birth_month,
      birth_day,
      height_inches,
      origin_lat,
      origin_lng,
      miles,
      ${selectColumn(columns, "flight_arrival_date")},
      ${selectColumn(columns, "flight_arrival_time")},
      ${selectColumn(columns, "flight_departure_date")},
      ${selectColumn(columns, "flight_departure_time")},
      ${selectColumn(columns, "flight_notes")}
    FROM rsvps
    WHERE id = ?`
  )
    .bind(savedId)
    .first();

  return json({ ok: true, updated: wasUpdated, entry: toEntry(saved) });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (!env.DB) {
    return json({ ok: false, error: "D1 binding DB is not configured." }, 500);
  }

  try {
    if (request.method === "GET" && url.searchParams.get("health") === "1") {
      const health = await healthCheck(env);
      return json(health, health.ok ? 200 : 500);
    }

    if (request.method === "GET") {
      return json({ ok: true, entries: await listEntries(env) });
    }

    if (request.method === "POST") {
      return createEntry(request, env);
    }

    return json({ ok: false, error: "Method not allowed." }, 405);
  } catch (error) {
    return json({ ok: false, error: errorMessage(error) }, 500);
  }
}
