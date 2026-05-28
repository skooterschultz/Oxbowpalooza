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
const travelGroupsList = document.querySelector("#travel-groups-list");
const flightGroupsList = document.querySelector("#flight-groups-list");
const birthdayCalendar = document.querySelector("#birthday-calendar");
const familyClansGrid = document.querySelector("#family-clans-grid");
const originMap = document.querySelector("#origin-map");
const originMapCanvas = document.querySelector("#origin-map-canvas");
const originMapEmpty = document.querySelector("#origin-map-empty");
const mapStyleButtons = Array.from(document.querySelectorAll("[data-map-style]"));
const mapActionButtons = Array.from(document.querySelectorAll("[data-map-action]"));
let mapboxAccessToken = "";
const OXBOW_POSITION = { lat: 45.4859628, lng: -122.3071819, label: "Oxbow" };
const MAPBOX_STYLES = {
  satellite: "mapbox://styles/mapbox/standard-satellite",
  night: "mapbox://styles/mapbox/dark-v11",
};
const MAP_PIN_COLORS = ["#d6512a", "#3187a6", "#5f9b4b", "#c65f80", "#e58a2e", "#7a568f", "#0f6f78", "#f1c75a"];
const OREGON_WASHINGTON_CITIES = new Set([
  "albany",
  "aloha",
  "ashland",
  "astoria",
  "beaverton",
  "bend",
  "canby",
  "central point",
  "clackamas",
  "coos bay",
  "corvallis",
  "eagle creek",
  "eugene",
  "fairview",
  "forest grove",
  "gladstone",
  "grants pass",
  "gresham",
  "happy valley",
  "hermiston",
  "hillsboro",
  "hood river",
  "keizer",
  "klamath falls",
  "lake oswego",
  "lebanon",
  "mcminnville",
  "medford",
  "milwaukie",
  "molalla",
  "newberg",
  "oregon city",
  "pendleton",
  "portland",
  "redmond",
  "roseburg",
  "salem",
  "sandy",
  "sherwood",
  "springfield",
  "the dalles",
  "tigard",
  "troutdale",
  "tualatin",
  "vancouver",
  "west linn",
  "wilsonville",
  "wood village",
  "woodburn",
  "auburn",
  "bellingham",
  "bellevue",
  "bothell",
  "bremerton",
  "camas",
  "centralia",
  "everett",
  "federal way",
  "kennewick",
  "kent",
  "kirkland",
  "lacey",
  "longview",
  "marysville",
  "olympia",
  "pasco",
  "pullman",
  "puyallup",
  "redmond",
  "renton",
  "richland",
  "seattle",
  "shoreline",
  "spokane",
  "tacoma",
  "vancouver",
  "walla walla",
  "wenatchee",
  "yakima",
]);
let originMapInstance;
let activeMapStyle = "satellite";
let latestMapEntries = [];
let mapMarkers = new Map();
const FAMILY_CLANS = [
  { name: "Bevings", inviters: ["Laura", "JCam"] },
  { name: "Sielings", inviters: ["Toni", "John", "Sandy"] },
  { name: "Vitangelis", inviters: ["Scott", "Nancy"] },
  { name: "Schultz", inviters: ["Danny", "Skooter", "Xander", "Zoe", "Mark"] },
];

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

function titleCase(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function displayShortName(entry) {
  if (entry.nickname && entry.nickname.trim()) {
    return titleCase(entry.nickname);
  }

  return titleCase(String(entry.name || "").trim().split(/\s+/)[0] || "Friend");
}

function cityTown(value) {
  return titleCase(String(value || "").split(",")[0] || "");
}

function hasUsableCoordinates(entry) {
  return entry.originLat !== null && entry.originLng !== null && Number.isFinite(Number(entry.originLat)) && Number.isFinite(Number(entry.originLng));
}

function isOregonOrWashington(entry) {
  const location = String(entry.city || entry.address || "").toLowerCase();
  const town = String(entry.city || "").split(",")[0].trim().toLowerCase();
  const lat = Number(entry.originLat);
  const lng = Number(entry.originLng);
  const looksLikeOregon = /\b(oregon|or)\b/.test(location);
  const looksLikeWashington = /\b(washington|wa)\b/.test(location);
  const cityIsLocal = OREGON_WASHINGTON_CITIES.has(town);
  const insideOregon = hasUsableCoordinates(entry) && lat >= 42 && lat <= 46.35 && lng >= -124.8 && lng <= -116.3;
  const insideWashington = hasUsableCoordinates(entry) && lat >= 45.45 && lat <= 49.05 && lng >= -124.85 && lng <= -116.75;

  return looksLikeOregon || looksLikeWashington || cityIsLocal || insideOregon || insideWashington;
}

function distanceMiles(a, b) {
  const earthRadiusMiles = 3958.8;
  const lat1 = Number(a.originLat) * (Math.PI / 180);
  const lat2 = Number(b.originLat) * (Math.PI / 180);
  const deltaLat = (Number(b.originLat) - Number(a.originLat)) * (Math.PI / 180);
  const deltaLng = (Number(b.originLng) - Number(a.originLng)) * (Math.PI / 180);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function entryColor(entry) {
  const key = String(entry.id || entryKey(entry));
  let hash = 0;

  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % MAP_PIN_COLORS.length;
  }

  return MAP_PIN_COLORS[Math.abs(hash) % MAP_PIN_COLORS.length];
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
      const town = cityTown(entry.city);
      const location = town ? `<small>${escapeHtml(town)}</small>` : "";
      return `<li><button type="button" data-map-entry-id="${entryKey(entry)}">${escapeHtml(displayShortName(entry))}</button><strong>${location}<span>${miles} mi</span></strong></li>`;
    })
    .join("");
}

function renderTravelGroups(entries = []) {
  if (!travelGroupsList) {
    return;
  }

  const candidates = entries
    .filter((entry) => entry.name && hasUsableCoordinates(entry))
    .filter((entry) => !isOregonOrWashington(entry));
  const used = new Set();
  const groups = [];

  candidates.forEach((entry, index) => {
    const key = entryKey(entry);
    if (used.has(key)) {
      return;
    }

    const group = [entry];
    used.add(key);

    candidates.slice(index + 1).forEach((candidate) => {
      const candidateKey = entryKey(candidate);
      if (!used.has(candidateKey) && group.some((member) => distanceMiles(member, candidate) <= 50)) {
        group.push(candidate);
        used.add(candidateKey);
      }
    });

    if (group.length > 1) {
      groups.push(group);
    }
  });

  if (!groups.length) {
    travelGroupsList.innerHTML = "<p>Nearby crews will appear when two or more out-of-state travelers are within 50 miles.</p>";
    return;
  }

  travelGroupsList.innerHTML = groups
    .sort((a, b) => b.length - a.length)
    .map((group) => {
      const label = cityTown(group[0].city) || "Road crew";
      const names = group.map((entry) => `<span>${escapeHtml(displayShortName(entry))}</span>`).join("");
      return `<article><strong>${escapeHtml(label)} area</strong><div>${names}</div></article>`;
    })
    .join("");
}

function flightDateTime(date, time) {
  if (!date || !time) {
    return null;
  }

  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatFlightWindow(date, time) {
  const parsed = flightDateTime(date, time);
  if (!parsed) {
    return "";
  }

  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function collectFlightGroups(entries = [], type) {
  const dateKey = type === "arrival" ? "arrivalDate" : "departureDate";
  const timeKey = type === "arrival" ? "arrivalTime" : "departureTime";
  const candidates = entries
    .map((entry) => ({ entry, when: flightDateTime(entry[dateKey], entry[timeKey]) }))
    .filter((item) => item.entry.name && item.when)
    .sort((a, b) => a.when - b.when);
  const used = new Set();
  const groups = [];

  candidates.forEach((item, index) => {
    const key = entryKey(item.entry);
    if (used.has(key)) {
      return;
    }

    const group = [item];
    used.add(key);

    candidates.slice(index + 1).forEach((candidate) => {
      const candidateKey = entryKey(candidate.entry);
      const sameDay = candidate.when.toDateString() === item.when.toDateString();
      const hoursApart = Math.abs(candidate.when - item.when) / 36e5;
      if (!used.has(candidateKey) && sameDay && hoursApart <= 3) {
        group.push(candidate);
        used.add(candidateKey);
      }
    });

    if (group.length > 1) {
      groups.push({ type, items: group });
    }
  });

  return groups;
}

function renderFlightGroups(entries = []) {
  if (!flightGroupsList) {
    return;
  }

  const groups = [...collectFlightGroups(entries, "arrival"), ...collectFlightGroups(entries, "departure")]
    .sort((a, b) => a.items[0].when - b.items[0].when)
    .slice(0, 8);

  if (!groups.length) {
    flightGroupsList.innerHTML = "<p>Flight matches will appear when two or more people have PDX times within about three hours.</p>";
    return;
  }

  flightGroupsList.innerHTML = groups
    .map((group) => {
      const label = group.type === "arrival" ? "Landing at PDX" : "Leaving from PDX";
      const first = group.items[0].entry;
      const time = formatFlightWindow(
        group.type === "arrival" ? first.arrivalDate : first.departureDate,
        group.type === "arrival" ? first.arrivalTime : first.departureTime
      );
      const names = group.items.map(({ entry }) => `<span>${escapeHtml(displayShortName(entry))}</span>`).join("");
      return `<article><strong>${label}${time ? `: ${escapeHtml(time)}` : ""}</strong><div>${names}</div></article>`;
    })
    .join("");
}

function renderFamilyClans(entries = []) {
  if (!familyClansGrid) {
    return;
  }

  familyClansGrid.innerHTML = FAMILY_CLANS.map((clan) => {
    const inviterSet = new Set(clan.inviters.map((name) => name.toLowerCase()));
    const people = entries
      .filter((entry) => entry.name && inviterSet.has(String(entry.invitedBy || "").toLowerCase()))
      .sort((a, b) => displayShortName(a).localeCompare(displayShortName(b)));
    const roster = people.length
      ? `<ul>${people.map((entry) => `<li>${escapeHtml(displayShortName(entry))}</li>`).join("")}</ul>`
      : "<p>Waiting for RSVPs.</p>";

    return `<article><h4>${clan.name}</h4><strong>${people.length} checked in</strong>${roster}</article>`;
  }).join("");
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
      const displayName = displayShortName(entry);
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
        .sort((a, b) => Number(a.birthDay) - Number(b.birthDay))
        .map((entry) => {
          const displayName = displayShortName(entry);
          return `<li style="--birthday-color: ${entryColor(entry)}"><strong>${entry.birthDay}</strong><button type="button" data-map-entry-id="${entryKey(entry)}" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</button></li>`;
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
  const displayName = escapeHtml(displayShortName(entry));
  const city = escapeHtml(titleCase(entry.city || "Somewhere fun"));
  const miles = Number.isFinite(Number(entry.miles)) ? `${Math.round(Number(entry.miles)).toLocaleString()} mi` : "";
  return `<strong>${displayName}</strong><span>${city}</span>${miles ? `<small>${miles}</small>` : ""}`;
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
  originMapInstance.fitBounds(bounds, { padding: 72, duration: 900, maxZoom: 7, pitch: 0, bearing: 0 });
}

function flyToOxbow() {
  if (originMapInstance) {
    originMapInstance.flyTo({ center: [OXBOW_POSITION.lng, OXBOW_POSITION.lat], zoom: 11, pitch: 0, bearing: 0 });
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
  if (!entry) {
    return;
  }

  const marker = mapMarkers.get(entryId);
  if (marker) {
    marker.getPopup().addTo(originMapInstance);
  }

  const bounds = new mapboxgl.LngLatBounds([OXBOW_POSITION.lng, OXBOW_POSITION.lat], [OXBOW_POSITION.lng, OXBOW_POSITION.lat]);
  bounds.extend([Number(entry.originLng), Number(entry.originLat)]);
  originMapInstance.fitBounds(bounds, { padding: 90, duration: 900, maxZoom: 7, pitch: 0, bearing: 0 });
}

document.addEventListener("click", (event) => {
  const mapButton = event.target.closest("[data-map-entry-id]");

  if (!mapButton) {
    return;
  }

  highlightMapEntry(mapButton.dataset.mapEntryId);
  if (originMap) {
    originMap.scrollIntoView({ behavior: "smooth", block: "center" });
  }
});

function renderOriginMap(entries = []) {
  latestMapEntries = entries
    .filter((entry) => entry.name && hasUsableCoordinates(entry))
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

    marker.getElement().style.setProperty("--pin-color", entryColor(entry));
    marker.getElement().dataset.entryId = id;
    marker.getElement().setAttribute("aria-label", `${displayShortName(entry)} traveling from ${titleCase(entry.city || "somewhere fun")}`);
    marker.getElement().addEventListener("click", () => highlightMapEntry(id));
    mapMarkers.set(id, marker);
  });

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
    pitch: 0,
    bearing: 0,
    attributionControl: true,
  });

  originMapInstance.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");

  const homeMarker = new mapboxgl.Marker({ element: makeMarker("origin-marker origin-marker--home"), anchor: "bottom" })
    .setLngLat([OXBOW_POSITION.lng, OXBOW_POSITION.lat])
    .setPopup(new mapboxgl.Popup({ offset: 24 }).setHTML("<strong>Oxbowpalooza</strong><span>Over by Oxbow Park</span>"))
    .addTo(originMapInstance);

  homeMarker.getElement().setAttribute("aria-label", "Oxbowpalooza near Oxbow Park");
  originMapInstance.on("load", () => {
    renderOriginMap(latestMapEntries);
  });
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
    renderTravelGroups([]);
    renderFlightGroups([]);
    renderFamilyClans([]);
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
    renderTravelGroups(entries);
    renderFlightGroups(entries);
    renderFamilyClans(entries);
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

    if (!payload.invitedBy) {
      setFormStatus("Pick the person who brought you into this beautiful mess.");
      return;
    }

    if (!payload.birthMonth || !payload.birthDay) {
      setFormStatus("Add your birthday month and day for the birthday board.");
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
      if (data.updated) {
        setFormStatus("Updated your RSVP. The boards will catch up in a second.");
      } else if (Number.isFinite(Number(data.entry.miles))) {
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
