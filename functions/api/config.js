export function onRequestGet({ env }) {
  return Response.json({
    mapboxPublicToken: env.MAPBOX_PUBLIC_TOKEN || "",
  });
}
