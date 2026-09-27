const PHOTO_KEY_PATTERN = /^photos\/[a-f0-9]{64}\.(?:jpg|png|webp|gif|avif)$/;

export async function onRequestGet({ request, env }) {
  if (!env.PHOTOS) {
    return new Response("Photo storage is not configured.", { status: 503 });
  }

  const key = new URL(request.url).searchParams.get("id") || "";
  if (!PHOTO_KEY_PATTERN.test(key)) {
    return new Response("Photo not found.", { status: 404 });
  }

  const object = await env.PHOTOS.get(key, { onlyIf: request.headers });
  if (!object) {
    return new Response("Photo not found.", { status: 404 });
  }

  if (!object.body) {
    return new Response(null, { status: 304, headers: { ETag: object.httpEtag } });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(object.body, { headers });
}
