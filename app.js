const panels = Array.from(document.querySelectorAll("[data-panel-view]"));
const panelButtons = Array.from(document.querySelectorAll("[data-panel]"));
const carouselSlides = Array.from(document.querySelectorAll(".hero-carousel__slide"));
const RSVP_ENDPOINT = "/api/rsvp";

function startHeroCarousel() {
  if (carouselSlides.length < 2) {
    return;
  }

  let activeIndex = carouselSlides.findIndex((slide) => slide.classList.contains("is-active"));

  if (activeIndex < 0) {
    activeIndex = 0;
    carouselSlides[activeIndex].classList.add("is-active");
  }

  window.setInterval(() => {
    carouselSlides[activeIndex].classList.remove("is-active");
    activeIndex = (activeIndex + 1) % carouselSlides.length;
    carouselSlides[activeIndex].classList.add("is-active");
  }, 4500);
}

startHeroCarousel();

function setPanel(panelName) {
  panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panelView === panelName);
  });

  panelButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panel === panelName);
  });
}

panelButtons.forEach((button) => {
  button.addEventListener("click", () => setPanel(button.dataset.panel));
});

const travelForm = document.querySelector("#travel-form");
const formStatus = document.querySelector("#form-status");
const leaderboardList = document.querySelector("#leaderboard-list");
const heightList = document.querySelector("#height-list");
const birthdayCalendar = document.querySelector("#birthday-calendar");
const originMap = document.querySelector("#origin-map");
const originMapCanvas = document.querySelector("#origin-map-canvas");
const originMapEmpty = document.querySelector("#origin-map-empty");
const mapStyleButtons = Array.from(document.querySelectorAll("[data-map-style]"));
const mapActionButtons = Array.from(document.querySelectorAll("[data-map-action]"));
let mapboxAccessToken = "";
const OXBOW_POSITION = { lat: 45.5308, lng: -122.2443, label: "Oxbow" };
const MAPBOX_STYLES = {
  satellite: "mapbox://styles/mapbox/standard-satellite",
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
  standard: "mapbox://styles/mapbox/standard",
  night: "mapbox://styles/mapbox/dark-v11",
};
let originMapInstance;
let activeMapStyle = "satellite";
let latestMapEntries = [];
let mapMarkers = new Map();

function setFormStatus(message) {
  if (formStatus) {
    formStatus.textContent = message;
  }
}

function entryKey(entry) {
  return String(entry.id || `${entry.name}-${entry.city || ""}-${entry.nickname || ""}`).replace(/[^a-zA-Z0-9_-]/g, "-");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderLeaderboard(entries = []) {
  if (!leaderboardList) {
    return;
  }

  const leaders = entries
    .filter((entry) => entry.name && Number.isFinite(Number(entry.miles)))
    .sort((a, b) => Number(b.miles) - Number(a.miles))
    .slice(0, 8);

  if (!leaders.length) {
    leaderboardList.innerHTML = "<li><span>Leaderboard warms up after the first RSVP.</span><strong>0 mi</strong></li>";
    return;
  }

  leaderboardList.innerHTML = leaders
    .map((entry) => {
      const miles = Math.round(Number(entry.miles)).toLocaleString();
      const city = entry.city ? ` from ${escapeHtml(entry.city)}` : "";
      return `<li><button type="button" data-map-entry-id="${entryKey(entry)}">${escapeHtml(entry.name)}${city}</button><strong>${miles} mi</strong></li>`;
    })
    .join("");
}

function renderHeightLeaderboard(entries = []) {
  if (!heightList) {
    return;
  }

  const leaders = entries
    .filter((entry) => entry.name && Number.isFinite(Number(entry.heightInches)) && Number(entry.heightInches) > 0)
    .sort((a, b) => Number(b.heightInches) - Number(a.heightInches))
    .slice(0, 8);

  if (!leaders.length) {
    heightList.innerHTML = "<li><span>Awaiting tall tales.</span><strong>0 ft</strong></li>";
    return;
  }

  heightList.innerHTML = leaders
    .map((entry) => {
      const total = Number(entry.heightInches);
      const feet = Math.floor(total / 12);
      const inches = total % 12;
      const displayName = entry.nickname || entry.name;
      return `<li><button type="button" data-map-entry-id="${entryKey(entry)}">${escapeHtml(displayName)}</button><strong>${feet}' ${inches}\"</strong></li>`;
    })
    .join("");
}

function renderBirthdayCalendar(entries = []) {
  if (!birthdayCalendar) {
    return;
  }

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const birthdayEntries = entries
    .filter((entry) => entry.name && entry.birthMonth && entry.birthDay)
    .sort((a, b) => {
      const monthDiff = months.indexOf(a.birthMonth) - months.indexOf(b.birthMonth);
      return monthDiff || Number(a.birthDay) - Number(b.birthDay);
    });

  const grouped = birthdayEntries.reduce((acc, entry) => {
    acc[entry.birthMonth] ||= [];
    acc[entry.birthMonth].push(entry);
    return acc;
  }, {});

  birthdayCalendar.innerHTML = months
    .map((month) => {
      const people = (grouped[month] || [])
        .map((entry) => {
          const displayName = entry.nickname || entry.name;
          return `<li><strong>${entry.birthDay}</strong><span>${displayName}</span></li>`;
        })
        .join("");
      return `<article><h4>${month}</h4>${people ? `<ul>${people}</ul>` : "<p>Waiting for birthdays.</p>"}</article>`;
    })
    .join("");
}

function hasMapboxToken() {
  return Boolean(mapboxAccessToken);
}

async function loadMapboxToken() {
  try {
    const response = await fetch("/api/config");
    const data = await response.json();
    mapboxAccessToken = data.mapboxPublicToken || "";
  } catch (error) {
    mapboxAccessToken = "";
  }
}

function setActiveMapStyle(styleName) {
  activeMapStyle = styleName;
  mapStyleButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mapStyle === styleName);
  });
}

function makePopupHtml(entry) {
  const displayName = escapeHtml(entry.nickname || entry.name);
  const city = escapeHtml(entry.city || "Somewhere fun");
  const miles = Number.isFinite(Number(entry.miles)) ? `${Math.round(Number(entry.miles)).toLocaleString()} mi` : "";
  return `<strong>${displayName}</strong><span>${city}</span>${miles ? `<small>${miles}</small>` : ""}`;
}

function makeRibbonCoordinates(originLng, originLat, destinationLng, destinationLat) {
  const miles = distanceInMiles({ lat: originLat, lng: originLng }, { lat: destinationLat, lng: destinationLng });

  if (Number.isFinite(miles) && miles < 300) {
    return [
      [originLng, originLat],
      [destinationLng, destinationLat],
    ];
  }

  const coordinates = [];
  const dx = destinationLng - originLng;
  const dy = destinationLat - originLat;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const bow = Math.min(18, Math.max(4, distance * 0.18));
  const normalLng = -dy / (distance || 1);
  const normalLat = dx / (distance || 1);

  for (let i = 0; i <= 64; i += 1) {
    const t = i / 64;
    const curve = Math.sin(Math.PI * t) * bow;
    coordinates.push([
      originLng + dx * t + normalLng * curve,
      originLat + dy * t + normalLat * curve,
    ]);
  }

  return coordinates;
}

function makeRouteFeature(entry) {
  const id = entryKey(entry);
  const displayName = entry.nickname || entry.name;
  return {
    type: "Feature",
    id,
    properties: {
      id,
      name: displayName,
      city: entry.city || "",
    },
    geometry: {
      type: "LineString",
      coordinates: makeRibbonCoordinates(
        Number(entry.originLng),
        Number(entry.originLat),
        OXBOW_POSITION.lng,
        OXBOW_POSITION.lat
      ),
    },
  };
}

function setMapData(entries = latestMapEntries) {
  if (!originMapInstance || !originMapInstance.isStyleLoaded()) {
    return;
  }

  const routeSource = originMapInstance.getSource("origin-routes");
  const highlightedSource = originMapInstance.getSource("highlighted-route");
  const routeData = {
    type: "FeatureCollection",
    features: entries.map(makeRouteFeature),
  };

  if (routeSource) {
    routeSource.setData(routeData);
  }

  if (highlightedSource) {
    highlightedSource.setData({ type: "FeatureCollection", features: [] });
  }
}

function addMapSourcesAndLayers() {
  if (!originMapInstance || originMapInstance.getSource("origin-routes")) {
    setMapData();
    return;
  }

  originMapInstance.addSource("origin-routes", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  originMapInstance.addSource("highlighted-route", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  originMapInstance.addLayer({
    id: "origin-routes-shadow",
    type: "line",
    source: "origin-routes",
    paint: {
      "line-color": "rgba(21, 17, 13, 0.38)",
      "line-width": 8,
      "line-blur": 5,
    },
  });

  originMapInstance.addLayer({
    id: "origin-routes-ribbon",
    type: "line",
    source: "origin-routes",
    paint: {
      "line-color": "#f6b64b",
      "line-width": 5,
      "line-opacity": 0.72,
    },
  });

  originMapInstance.addLayer({
    id: "highlighted-route-glow",
    type: "line",
    source: "highlighted-route",
    paint: {
      "line-color": "#fff4dc",
      "line-width": 12,
      "line-blur": 6,
      "line-opacity": 0.9,
    },
  });

  originMapInstance.addLayer({
    id: "highlighted-route-ribbon",
    type: "line",
    source: "highlighted-route",
    paint: {
      "line-color": "#ff6b1f",
      "line-width": 8,
      "line-opacity": 0.96,
    },
  });

  setMapData();
}

function makeMarker(className) {
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = className;
  return marker;
}

function fitMapToEntries(entries = latestMapEntries) {
  if (!originMapInstance) {
    return;
  }

  const bounds = new mapboxgl.LngLatBounds([OXBOW_POSITION.lng, OXBOW_POSITION.lat], [OXBOW_POSITION.lng, OXBOW_POSITION.lat]);
  entries.forEach((entry) => {
    bounds.extend([Number(entry.originLng), Number(entry.originLat)]);
  });
  originMapInstance.fitBounds(bounds, { padding: 72, duration: 900, maxZoom: 6 });
}

function flyToOxbow() {
  if (originMapInstance) {
    originMapInstance.flyTo({ center: [OXBOW_POSITION.lng, OXBOW_POSITION.lat], zoom: 11, pitch: 48, bearing: -18 });
  }
}

function highlightMapEntry(entryId) {
  if (!originMapInstance || !entryId) {
    return;
  }

  mapMarkers.forEach((marker, id) => {
    marker.getElement().classList.toggle("is-highlighted", id === entryId);
  });

  const entry = latestMapEntries.find((candidate) => entryKey(candidate) === entryId);
  const highlightedSource = originMapInstance.getSource("highlighted-route");

  if (!entry || !highlightedSource) {
    return;
  }

  highlightedSource.setData({
    type: "FeatureCollection",
    features: [makeRouteFeature(entry)],
  });

  const marker = mapMarkers.get(entryId);
  if (marker) {
    marker.getPopup().addTo(originMapInstance);
  }

  const bounds = new mapboxgl.LngLatBounds([OXBOW_POSITION.lng, OXBOW_POSITION.lat], [OXBOW_POSITION.lng, OXBOW_POSITION.lat]);
  bounds.extend([Number(entry.originLng), Number(entry.originLat)]);
  originMapInstance.fitBounds(bounds, { padding: 90, duration: 900, maxZoom: 5.5 });
}

document.addEventListener("click", (event) => {
  const mapButton = event.target.closest("[data-map-entry-id]");

  if (!mapButton) {
    return;
  }

  highlightMapEntry(mapButton.dataset.mapEntryId);
});

function renderOriginMap(entries = []) {
  latestMapEntries = entries
    .filter((entry) => entry.name && Number.isFinite(Number(entry.originLat)) && Number.isFinite(Number(entry.originLng)))
    .slice(0, 80);

  if (originMapEmpty) {
    originMapEmpty.hidden = hasMapboxToken() && Boolean(latestMapEntries.length);
  }

  if (!originMapInstance) {
    return;
  }

  mapMarkers.forEach((marker) => marker.remove());
  mapMarkers = new Map();

  latestMapEntries.forEach((entry) => {
    const id = entryKey(entry);
    const marker = new mapboxgl.Marker({ element: makeMarker("origin-marker"), anchor: "bottom" })
      .setLngLat([Number(entry.originLng), Number(entry.originLat)])
      .setPopup(new mapboxgl.Popup({ offset: 24 }).setHTML(makePopupHtml(entry)))
      .addTo(originMapInstance);

    marker.getElement().dataset.entryId = id;
    marker.getElement().setAttribute("aria-label", `${entry.nickname || entry.name} traveling from ${entry.city || "somewhere fun"}`);
    marker.getElement().addEventListener("click", () => highlightMapEntry(id));
    mapMarkers.set(id, marker);
  });

  setMapData(latestMapEntries);
  if (latestMapEntries.length) {
    fitMapToEntries(latestMapEntries);
  }
}

async function startOriginMap() {
  await loadMapboxToken();

  if (!originMapCanvas || !window.mapboxgl || !hasMapboxToken()) {
    return;
  }

  mapboxgl.accessToken = mapboxAccessToken;
  setActiveMapStyle(activeMapStyle);

  originMapInstance = new mapboxgl.Map({
    container: originMapCanvas,
    style: MAPBOX_STYLES[activeMapStyle],
    center: [OXBOW_POSITION.lng, OXBOW_POSITION.lat],
    zoom: 11,
    pitch: 48,
    bearing: -18,
    attributionControl: true,
  });

  originMapInstance.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");

  const homeMarker = new mapboxgl.Marker({ element: makeMarker("origin-marker origin-marker--home"), anchor: "bottom" })
    .setLngLat([OXBOW_POSITION.lng, OXBOW_POSITION.lat])
    .setPopup(new mapboxgl.Popup({ offset: 24 }).setHTML("<strong>Oxbowpalooza</strong><span>Over by Oxbow Park</span>"))
    .addTo(originMapInstance);

  homeMarker.getElement().setAttribute("aria-label", "Oxbowpalooza near Oxbow Park");
  originMapInstance.on("load", () => {
    addMapSourcesAndLayers();
    renderOriginMap(latestMapEntries);
  });

  originMapInstance.on("style.load", addMapSourcesAndLayers);
}

mapStyleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const styleName = button.dataset.mapStyle;
    if (!MAPBOX_STYLES[styleName]) {
      return;
    }
    setActiveMapStyle(styleName);
    if (originMapInstance) {
      originMapInstance.setStyle(MAPBOX_STYLES[styleName]);
    }
  });
});

mapActionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.mapAction === "home") {
      flyToOxbow();
    } else {
      fitMapToEntries();
    }
  });
});

startOriginMap();

async function loadLeaderboard() {
  if (!RSVP_ENDPOINT) {
    renderLeaderboard([]);
    renderHeightLeaderboard([]);
    renderBirthdayCalendar([]);
    renderOriginMap([]);
    return;
  }

  try {
    const response = await fetch(`${RSVP_ENDPOINT}?view=leaderboards`);
    const data = await response.json();
    const entries = data.entries || [];
    renderLeaderboard(entries);
    renderHeightLeaderboard(entries);
    renderBirthdayCalendar(entries);
    renderOriginMap(entries);
  } catch (error) {
    setFormStatus("Leaderboard is being shy. Try refreshing in a minute.");
  }
}

if (travelForm) {
  travelForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = travelForm.querySelector("button[type='submit']");
    const formData = new FormData(travelForm);
    const daysAttending = formData.getAll("daysAttending");
    const payload = Object.fromEntries(formData.entries());
    payload.daysAttending = daysAttending.join(", ");
    payload.heightInches = (Number(payload.heightFeet) || 0) * 12 + (Number(payload.heightInches) || 0);

    if (!daysAttending.length) {
      setFormStatus("Pick at least one day you are attending.");
      return;
    }

    if (!RSVP_ENDPOINT) {
      setFormStatus("Form is designed and ready. Connect the Cloudflare D1 endpoint to collect RSVPs.");
      return;
    }

    submitButton.disabled = true;
    setFormStatus("Sending you to the starting line...");

    try {
      const response = await fetch(RSVP_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({
        ok: false,
        error: `Server returned ${response.status}.`,
      }));

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to save RSVP.");
      }

      travelForm.reset();
      if (Number.isFinite(Number(data.entry.miles))) {
        setFormStatus(`You're in. ${Math.round(data.entry.miles).toLocaleString()} miles on the board.`);
      } else {
        setFormStatus("You're in. We saved the RSVP, and the mileage board will update when the city can be mapped.");
      }
      await loadLeaderboard();
    } catch (error) {
      setFormStatus(`Could not save that yet: ${error.message}`);
    } finally {
      submitButton.disabled = false;
    }
  });
}

loadLeaderboard();
