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
  }, 5500);
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
const originMapWorld = document.querySelector("#origin-map-world");
const originMapLines = document.querySelector("#origin-map-lines");
const originMapEmpty = document.querySelector("#origin-map-empty");
const originMapHome = document.querySelector("#origin-map-home");
const mapZoomButtons = Array.from(document.querySelectorAll("[data-map-zoom]"));
const OXBOW_POSITION = { lat: 45.5308, lng: -122.2443 };
const mapZoomLevels = [1, 1.75, 3.1];
let mapZoomIndex = 2;

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

function projectMapPoint(lat, lng) {
  const minLng = -170;
  const maxLng = -30;
  const minLat = -60;
  const maxLat = 75;
  const left = Math.max(4, Math.min(94, ((lng - minLng) / (maxLng - minLng)) * 100));
  const top = Math.max(4, Math.min(94, (1 - (lat - minLat) / (maxLat - minLat)) * 100));
  return { left, top };
}

function updateOriginMapZoom() {
  if (!originMap || !originMapWorld) {
    return;
  }

  const zoom = mapZoomLevels[mapZoomIndex];
  const home = projectMapPoint(OXBOW_POSITION.lat, OXBOW_POSITION.lng);
  const rect = originMap.getBoundingClientRect();
  const x = rect.width * 0.5 - rect.width * (home.left / 100) * zoom;
  const y = rect.height * 0.5 - rect.height * (home.top / 100) * zoom;

  originMapWorld.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
  originMap.dataset.zoom = String(zoom);
}

mapZoomButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const direction = button.dataset.mapZoom;
    mapZoomIndex += direction === "in" ? 1 : -1;
    mapZoomIndex = Math.max(0, Math.min(mapZoomLevels.length - 1, mapZoomIndex));
    updateOriginMapZoom();
  });
});

window.addEventListener("resize", updateOriginMapZoom);

function highlightMapEntry(entryId) {
  if (!originMapWorld || !entryId) {
    return;
  }

  originMapWorld.querySelectorAll("[data-entry-id]").forEach((element) => {
    element.classList.toggle("is-highlighted", element.dataset.entryId === entryId);
    element.classList.toggle("is-open", element.dataset.entryId === entryId && element.classList.contains("origin-map__pin"));
  });

  const matchingPin = Array.from(originMapWorld.querySelectorAll(".origin-map__pin--guest")).find(
    (pin) => pin.dataset.entryId === entryId
  );

  if (matchingPin) {
    matchingPin.focus({ preventScroll: true });
  }
}

document.addEventListener("click", (event) => {
  const mapButton = event.target.closest("[data-map-entry-id]");

  if (!mapButton) {
    return;
  }

  highlightMapEntry(mapButton.dataset.mapEntryId);
});

function renderOriginMap(entries = []) {
  if (!originMap || !originMapWorld || !originMapLines) {
    return;
  }

  originMapWorld.querySelectorAll(".origin-map__pin--guest").forEach((pin) => pin.remove());
  originMapLines.innerHTML = "";
  const home = projectMapPoint(OXBOW_POSITION.lat, OXBOW_POSITION.lng);

  if (originMapHome) {
    originMapHome.style.left = `${home.left}%`;
    originMapHome.style.top = `${home.top}%`;
  }

  const origins = entries
    .filter((entry) => entry.name && Number.isFinite(Number(entry.originLat)) && Number.isFinite(Number(entry.originLng)))
    .slice(0, 24);

  if (originMapEmpty) {
    originMapEmpty.hidden = Boolean(origins.length);
  }

  origins.forEach((entry) => {
    const position = projectMapPoint(Number(entry.originLat), Number(entry.originLng));
    const displayName = entry.nickname || entry.name;
    const city = entry.city || "Somewhere fun";
    const id = entryKey(entry);

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", position.left);
    line.setAttribute("y1", position.top);
    line.setAttribute("x2", home.left);
    line.setAttribute("y2", home.top);
    line.dataset.entryId = id;
    originMapLines.append(line);

    const pin = document.createElement("button");
    pin.className = "origin-map__pin origin-map__pin--guest";
    pin.type = "button";
    pin.style.left = `${position.left}%`;
    pin.style.top = `${position.top}%`;
    pin.innerHTML = `<span>${escapeHtml(displayName)}</span>`;
    pin.dataset.entryId = id;
    pin.setAttribute("aria-label", `${displayName} traveling from ${city}`);
    pin.addEventListener("click", () => {
      originMapWorld.querySelectorAll(".origin-map__pin--guest").forEach((otherPin) => {
        otherPin.classList.toggle("is-open", otherPin === pin);
      });
      highlightMapEntry(id);
    });
    originMapWorld.append(pin);
  });

  updateOriginMapZoom();
}

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
    const payload = Object.fromEntries(new FormData(travelForm).entries());
    payload.heightInches = (Number(payload.heightFeet) || 0) * 12 + (Number(payload.heightInches) || 0);

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
      const data = await response.json();

      if (!data.ok) {
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
      setFormStatus("Could not save that yet. Check the Cloudflare D1 connection and try again.");
    } finally {
      submitButton.disabled = false;
    }
  });
}

loadLeaderboard();
