const DESTINATION = {
  lat: 36.58271,
  lng: -93.83739,
};

const KNOWN_ORIGINS = [
  {
    matches: ["honokaa hi", "honokaa hawaii"],
    lat: 20.0755626,
    lng: -155.4638819,
  },
];

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

function emailSet(value) {
  return new Set(
    clean(value)
      .split(/[;,]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

function normalizeEmails(value) {
  return [...emailSet(value)].join(", ");
}

async function syncToGoogleSheet(env, entry) {
  if (!env.GOOGLE_SHEET_WEB_APP_URL || !env.SHEET_SYNC_SECRET) {
    return { configured: false, synced: false };
  }

  try {
    const response = await fetch(env.GOOGLE_SHEET_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upsert",
        secret: env.SHEET_SYNC_SECRET,
        entry,
      }),
    });

    const responseText = await response.text();
    let payload = null;
    try {
      payload = JSON.parse(responseText);
    } catch (error) {
      console.error("Google Sheet sync returned a non-JSON response", response.status);
    }

    const synced = response.ok && payload?.ok === true;
    if (!synced) {
      console.error("Google Sheet sync was rejected", response.status, payload?.error || "Invalid response");
    }

    return {
      configured: true,
      synced,
      error: synced ? undefined : payload?.error || `Google returned ${response.status}.`,
    };
  } catch (error) {
    console.error("Google Sheet sync failed", error);
    return { configured: true, synced: false };
  }
}

async function findExistingByEmail(env, email) {
  const incoming = emailSet(email);
  if (!incoming.size) {
    return null;
  }

  const { results } = await env.DB.prepare(
    "SELECT id, email FROM rsvps WHERE email IS NOT NULL AND trim(email) <> '' ORDER BY created_at DESC LIMIT 500"
  ).all();

  return (results || []).find((row) => [...emailSet(row.email)].some((item) => incoming.has(item))) || null;
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
  const hasAddress = location.includes("12716") && location.includes("2239");
  const hasPark = location.includes("roaring river") || location.includes("state park");
  const hasCassville = location.includes("cassville") || location.includes("65625");

  return hasAddress || (hasPark && hasCassville);
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

function toPublicEntry(row) {
  return {
    id: row.id,
    name: row.name,
    nickname: row.nickname,
    city: row.city,
    invitedBy: row.invited_by,
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
  };
}

async function tableColumns(env) {
  const table = await env.DB.prepare("PRAGMA table_info(rsvps)").all();
  return new Set((table.results || []).map((column) => column.name));
}

function selectColumn(columns, name) {
  return columns.has(name) ? name : `NULL AS ${name}`;
}

async function repairKnownOrigins(env, rows) {
  for (const row of rows) {
    if (row.origin_lat !== null && row.origin_lng !== null) {
      continue;
    }

    const city = normalizedLocation(row.city);
    const knownOrigin = KNOWN_ORIGINS.find((origin) => origin.matches.includes(city));
    if (!knownOrigin) {
      continue;
    }

    const miles = distanceInMiles(knownOrigin, DESTINATION);
    await env.DB.prepare(
      "UPDATE rsvps SET origin_lat = ?, origin_lng = ?, miles = ? WHERE id = ?"
    )
      .bind(knownOrigin.lat, knownOrigin.lng, miles, row.id)
      .run();

    row.origin_lat = knownOrigin.lat;
    row.origin_lng = knownOrigin.lng;
    row.miles = miles;
  }
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
      "User-Agent": "Hudson Hubbard Family Reunion RSVP site",
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
      ${selectColumn(columns, "birth_year")},
      height_inches,
      origin_lat,
      origin_lng,
      miles,
      ${selectColumn(columns, "flight_arrival_date")},
      ${selectColumn(columns, "flight_arrival_time")},
      ${selectColumn(columns, "arrival_airport")},
      ${selectColumn(columns, "flight_departure_date")},
      ${selectColumn(columns, "flight_departure_time")}
    FROM rsvps
    ORDER BY created_at DESC
    LIMIT 250`
  ).all();

  await repairKnownOrigins(env, results);
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
  const email = normalizeEmails(body.email);
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

  if (!clean(body.birthMonth) || !clean(body.birthDay) || !clean(body.birthYear)) {
    return json({ ok: false, error: "A complete birthday is required." }, 400);
  }

  const heightInches = numeric(body.heightInches);
  const birthDay = numeric(body.birthDay);
  const birthYear = numeric(body.birthYear);
  if (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > 2027) {
    return json({ ok: false, error: "Enter a valid four-digit birth year." }, 400);
  }
  const origin = isPartyAddress(address, city) ? DESTINATION : await geocodeCity(originQuery, env);
  const miles = isPartyAddress(address, city) ? 0 : distanceInMiles(origin, DESTINATION);
  const columns = await tableColumns(env);
  const hasBirthYear = columns.has("birth_year");
  const hasFlightColumns =
    columns.has("flight_arrival_date") &&
    columns.has("flight_arrival_time") &&
    columns.has("flight_departure_date") &&
    columns.has("flight_departure_time") &&
    columns.has("flight_notes") &&
    columns.has("arrival_airport");
  const existing = await findExistingByEmail(env, email);
  const wasUpdated = Boolean(existing?.id);
  let savedId = existing?.id || null;

  if (savedId) {
    const birthYearSet = hasBirthYear ? ",\n        birth_year = ?" : "";
    const birthYearValues = hasBirthYear ? [birthYear] : [];
    const flightSet = hasFlightColumns
      ? `,
        flight_arrival_date = ?,
        flight_arrival_time = ?,
        arrival_airport = ?,
        flight_departure_date = ?,
        flight_departure_time = ?,
        flight_notes = ?`
      : "";
    const flightValues = hasFlightColumns
      ? [clean(body.arrivalDate), clean(body.arrivalTime), clean(body.arrivalAirport), clean(body.departureDate), clean(body.departureTime), clean(body.flightNotes)]
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
        birth_day = ?${birthYearSet},
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
        ...birthYearValues,
        heightInches,
        origin?.lat || null,
        origin?.lng || null,
        miles,
        ...flightValues,
        savedId
      )
      .run();
  } else {
    const birthYearColumn = hasBirthYear ? ",\n      birth_year" : "";
    const birthYearPlaceholder = hasBirthYear ? ", ?" : "";
    const birthYearValues = hasBirthYear ? [birthYear] : [];
    const flightColumns = hasFlightColumns
      ? `,
      flight_arrival_date,
      flight_arrival_time,
      arrival_airport,
      flight_departure_date,
      flight_departure_time,
      flight_notes`
      : "";
    const flightPlaceholders = hasFlightColumns ? ", ?, ?, ?, ?, ?, ?" : "";
    const flightValues = hasFlightColumns
      ? [clean(body.arrivalDate), clean(body.arrivalTime), clean(body.arrivalAirport), clean(body.departureDate), clean(body.departureTime), clean(body.flightNotes)]
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
      birth_day${birthYearColumn},
      height_inches,
      origin_lat,
      origin_lng,
      miles${flightColumns}
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?${birthYearPlaceholder}, ?, ?, ?, ?${flightPlaceholders})`
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
      ...birthYearValues,
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
      ${selectColumn(columns, "birth_year")},
      height_inches,
      origin_lat,
      origin_lng,
      miles,
      ${selectColumn(columns, "flight_arrival_date")},
      ${selectColumn(columns, "flight_arrival_time")},
      ${selectColumn(columns, "arrival_airport")},
      ${selectColumn(columns, "flight_departure_date")},
      ${selectColumn(columns, "flight_departure_time")},
      ${selectColumn(columns, "flight_notes")}
    FROM rsvps
    WHERE id = ?`
  )
    .bind(savedId)
    .first();

  const entry = toEntry(saved);
  const sheetSync = await syncToGoogleSheet(env, entry);
  return json({ ok: true, updated: wasUpdated, entry, sheetSync });
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
