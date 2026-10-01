const PHOTO_PREFIX = "photos/";
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const MAX_GALLERY_BYTES = 8_000_000_000;
const DUPLICATE_PHOTO_KEYS = [
  "photos/565a75b4857a606597f466f05ae2606fe292b39b5fcdab6b212ae3c84ef35adb.jpg",
];
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/avif", "avif"],
]);

function json(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function cleanSubmitter(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function galleryBytes(bucket) {
  let total = 0;
  let cursor;

  do {
    const page = await bucket.list({
      prefix: PHOTO_PREFIX,
      limit: 1000,
      cursor,
    });
    total += page.objects.reduce((sum, object) => sum + object.size, 0);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return total;
}

export async function onRequestGet({ env }) {
  if (!env.PHOTOS) {
    return json({ ok: false, error: "Photo storage is not configured yet.", items: [] }, 503);
  }

  await Promise.all(DUPLICATE_PHOTO_KEYS.map((key) => env.PHOTOS.delete(key)));

  const listing = await env.PHOTOS.list({
    prefix: PHOTO_PREFIX,
    limit: 500,
    include: ["customMetadata", "httpMetadata"],
  });

  const items = listing.objects
    .filter((object) => ALLOWED_TYPES.has(object.httpMetadata?.contentType || ""))
    .sort((left, right) => new Date(right.uploaded) - new Date(left.uploaded))
    .map((object) => {
      const caption = cleanSubmitter(object.customMetadata?.submitter) || "Hudson Hubbard family";
      return {
        id: object.key,
        src: `/api/photo?id=${encodeURIComponent(object.key)}&v=${encodeURIComponent(object.etag)}`,
        alt: `Hudson Hubbard family photo shared by ${caption}`,
        caption,
        uploaded: object.uploaded,
        type: "image",
      };
    });

  return json({ ok: true, items });
}

export async function onRequestPost({ request, env }) {
  if (!env.PHOTOS) {
    return json({ ok: false, error: "Photo storage is not connected yet." }, 503);
  }

  const requestOrigin = request.headers.get("Origin");
  const siteOrigin = new URL(request.url).origin;
  if (requestOrigin && requestOrigin !== siteOrigin) {
    return json({ ok: false, error: "Uploads must come from the reunion website." }, 403);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "That upload could not be read." }, 400);
  }

  if (String(form.get("website") || "").trim()) {
    return json({ ok: true, duplicate: false });
  }

  const submitter = cleanSubmitter(form.get("submitter"));
  const photo = form.get("photo");
  if (!submitter) {
    return json({ ok: false, error: "Please add your name." }, 400);
  }

  if (!photo || typeof photo.arrayBuffer !== "function") {
    return json({ ok: false, error: "Please choose a photo." }, 400);
  }

  const extension = ALLOWED_TYPES.get(photo.type);
  if (!extension) {
    return json({ ok: false, error: "Please use a JPEG, PNG, WebP, GIF, or AVIF photo." }, 415);
  }

  if (!photo.size || photo.size > MAX_PHOTO_BYTES) {
    return json({ ok: false, error: "Each photo must be 12 MB or smaller." }, 413);
  }

  const bytes = await photo.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const key = `${PHOTO_PREFIX}${toHex(digest)}.${extension}`;
  const existing = await env.PHOTOS.head(key);

  if (!existing) {
    const usedBytes = await galleryBytes(env.PHOTOS);
    if (usedBytes + photo.size > MAX_GALLERY_BYTES) {
      return json({
        ok: false,
        error: "The family gallery has reached its 8 GB safety limit. Please contact the reunion organizers.",
      }, 507);
    }

    await env.PHOTOS.put(key, bytes, {
      httpMetadata: {
        contentType: photo.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: {
        submitter,
        originalName: String(photo.name || "photo").slice(0, 180),
      },
    });
  }

  return json({
    ok: true,
    duplicate: Boolean(existing),
    item: {
      id: key,
      src: `/api/photo?id=${encodeURIComponent(key)}`,
      caption: existing?.customMetadata?.submitter || submitter,
      type: "image",
    },
  });
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { Allow: "GET, POST, OPTIONS" },
  });
}
