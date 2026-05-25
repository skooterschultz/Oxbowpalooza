# Oxbowpalooza RSVP: Cloudflare D1 Setup

This replaces the Google Sheet / Apps Script flow with a Cloudflare Pages Function and a D1 database.

## What The Site Uses

- Frontend endpoint: `/api/rsvp`
- Cloudflare Function: `functions/api/rsvp.js`
- Database schema: `d1-schema.sql`
- Required D1 binding name: `DB`
- Optional secret for better geocoding: `GOOGLE_MAPS_API_KEY`

## Step 1: Create The D1 Database

In Cloudflare:

1. Go to **Workers & Pages**.
2. Open **D1 SQL Database**.
3. Click **Create database**.
4. Name it something like `oxbowpalooza-rsvps`.

## Step 2: Create The Table

Open the new D1 database, go to its query console, paste the contents of `d1-schema.sql`, and run it.

This creates the `rsvps` table and the indexes used by the leaderboards and birthday board.

## Step 3: Bind The Database To The Pages Site

In Cloudflare:

1. Go to **Workers & Pages**.
2. Open your Oxbowpalooza Pages project.
3. Go to **Settings**.
4. Open **Functions**.
5. Find **D1 database bindings**.
6. Add a binding:
   - Variable name: `DB`
   - D1 database: your `oxbowpalooza-rsvps` database
7. Save.

The variable name must be exactly `DB`, because the Function reads `env.DB`.

## Step 4: Deploy

Commit and push these files to GitHub:

- `index.html`
- `app.js`
- `functions/api/rsvp.js`
- `d1-schema.sql`
- `D1_SETUP.md`

Cloudflare Pages should redeploy from GitHub. After it deploys, the form will post to `/api/rsvp`.

The public leaderboard/birthday/map data is read from:

```txt
/api/rsvp?view=leaderboards
```

That read endpoint only returns display-safe fields. It does not expose email addresses, food notes, inviter names, or submitted questions.

## Step 5: Test It

On the live site:

1. Fill out the RSVP form with a test person.
2. Submit it.
3. Go back to your D1 database query console.
4. Run:

```sql
SELECT * FROM rsvps ORDER BY created_at DESC;
```

You should see the test entry.

## Optional: Better Mileage

By default, the Function geocodes the city and calculates straight-line mileage to Oxbow. That is lightweight and good enough for the travel leaderboard game.

If you want Google geocoding instead, add a Cloudflare Pages secret/environment variable:

- Name: `GOOGLE_MAPS_API_KEY`
- Value: your Google Maps API key

The Function will use Google first when that key exists, then fall back to OpenStreetMap geocoding.

## Mapbox Map Setup

The RSVP map now uses Mapbox for real map tiles, satellite/outdoor/road/night styles, pins, and curved ribbon routes.

1. Create or log into your Mapbox account:
   `https://account.mapbox.com`
2. Copy your **public access token**.
3. In Cloudflare Pages, add an environment variable:
   - Name: `MAPBOX_PUBLIC_TOKEN`
   - Value: your Mapbox public token
4. In Mapbox, restrict the token to your live Cloudflare Pages domain and any custom domain you use.

The token is public browser-side configuration, so domain restrictions are the important safety step.

## If D1 Seems Broken

Open `d1-schema.sql`.

1. Run:

```sql
PRAGMA table_info(rsvps);
```

2. Compare the result to the columns listed in `d1-schema.sql`.
3. If a column is missing, run the matching `ALTER TABLE` line from the repair section.
4. If Cloudflare says `duplicate column name`, that column already exists. Skip it.
5. After repairs, test with:

```sql
SELECT * FROM rsvps ORDER BY created_at DESC LIMIT 25;
```
