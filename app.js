const panels = Array.from(document.querySelectorAll("[data-panel-view]"));
const panelButtons = Array.from(document.querySelectorAll("[data-panel]"));
const carouselSlides = Array.from(document.querySelectorAll(".hero-carousel__slide"));
const RSVP_ENDPOINT = "/api/rsvp";

document.querySelectorAll('.site-nav a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) {
      return;
    }

    event.preventDefault();
    window.history.replaceState(null, "", link.getAttribute("href"));
    target.scrollIntoView({ behavior: "auto", block: "start" });
  });
});

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
const ageList = document.querySelector("#age-list");
const travelGroupsList = document.querySelector("#travel-groups-list");
const flightGroupsList = document.querySelector("#flight-groups-list");
const birthdayCalendar = document.querySelector("#birthday-calendar");
const familyClansGrid = document.querySelector("#family-clans-grid");
const familyClansTotal = document.querySelector("#family-clans-total");
const familyTreeBranches = document.querySelector("#family-tree-branches");
const familyTreeCount = document.querySelector("#family-tree-count");
const photoGallery = document.querySelector("#photo-gallery");
const photoUploadForm = document.querySelector("#photo-upload-form");
const photoUploadStatus = document.querySelector("#photo-upload-status");
const originMap = document.querySelector("#origin-map");
const originMapCanvas = document.querySelector("#origin-map-canvas");
const originMapEmpty = document.querySelector("#origin-map-empty");
const mapStyleButtons = Array.from(document.querySelectorAll("[data-map-style]"));
const mapActionButtons = Array.from(document.querySelectorAll("[data-map-action]"));
let mapboxAccessToken = "";
const REUNION_POSITION = { lat: 36.58271, lng: -93.83739, label: "Roaring River" };
const MAPBOX_STYLES = {
  satellite: "mapbox://styles/mapbox/standard-satellite",
  night: "mapbox://styles/mapbox/dark-v11",
};
const MAP_PIN_COLORS = ["#17385f", "#426f7f", "#31543a", "#66804b", "#9a6b22", "#b58c35", "#456f68", "#7e4d2b"];
const BIRTHDAY_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const PHOTO_GALLERY_ENDPOINT = "/api/photos?v=2027-reunion-gallery";
const PHOTO_GALLERY_REFRESH_MS = 180000;
let galleryPhotos = [];
let activeGalleryIndex = 0;
let thumbnailDrag = null;
let suppressNextThumbnailClick = false;
const MISSOURI_CITIES = new Set([
  "cassville",
  "monett",
  "springfield",
  "branson",
  "joplin",
  "aurora",
  "exeter",
  "shell knob",
  "washburn",
]);
let originMapInstance;
let activeMapStyle = "satellite";
let latestMapEntries = [];
let mapMarkers = new Map();
const FAMILY_CLANS = [
  { name: "Hudson", inviters: ["Hudson"] },
  { name: "Hubbard", inviters: ["Hubbard"] },
  { name: "Family Friends", inviters: ["Family Friend"] },
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

function galleryMedia(photo, options = {}) {
  const src = escapeHtml(photo.src);
  const alt = escapeHtml(photo.alt || photo.caption || "Hudson Hubbard family photo");

  if (photo.type === "video") {
    const controls = options.controls ? " controls" : "";
    const muted = options.thumbnail ? " muted playsinline" : "";
    return `<video${controls}${muted} preload="metadata"><source src="${src}" />Your browser cannot play this video.</video>`;
  }

  return `<img src="${src}" alt="${alt}" loading="${options.featured ? "eager" : "lazy"}" decoding="async" />`;
}

function scrollActiveThumbnailIntoView() {
  const activeThumb = photoGallery?.querySelector(".photo-gallery__thumb.is-active");

  if (activeThumb) {
    activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }
}

function renderPhotoGallery(photos = galleryPhotos, selectedIndex = activeGalleryIndex) {
  if (!photoGallery) {
    return;
  }

  if (!photos.length) {
    photoGallery.innerHTML = "<p>The reunion gallery is ready for its first family memory.</p>";
    return;
  }

  galleryPhotos = photos;
  activeGalleryIndex = Math.min(Math.max(selectedIndex, 0), photos.length - 1);

  const featured = photos[activeGalleryIndex];
  const featuredCaption = featured.caption ? `<figcaption>${escapeHtml(featured.caption)}</figcaption>` : "";
  const thumbnails = photos
    .map((photo, index) => {
      const caption = photo.caption ? `<span>${escapeHtml(photo.caption)}</span>` : "";
      const current = index === activeGalleryIndex ? " is-active" : "";
      return `<button class="photo-gallery__thumb${current}" type="button" data-gallery-index="${index}" aria-label="Show ${escapeHtml(photo.caption || "gallery item")}">${galleryMedia(photo, { thumbnail: true })}${caption}</button>`;
    })
    .join("");

  photoGallery.innerHTML = `
    <figure class="photo-gallery__featured">
      <button type="button" class="photo-gallery__open" data-gallery-open="true" aria-label="Open ${escapeHtml(featured.caption || "gallery item")} larger">
        ${galleryMedia(featured, { featured: true })}
      </button>
      ${featuredCaption}
    </figure>
    <div class="photo-gallery__thumbs" aria-label="Choose a photo">${thumbnails}</div>
  `;
  window.setTimeout(scrollActiveThumbnailIntoView, 0);
}

function openGalleryLightbox(index = activeGalleryIndex) {
  const photo = galleryPhotos[index];

  if (!photo) {
    return;
  }

  activeGalleryIndex = Math.min(Math.max(index, 0), galleryPhotos.length - 1);
  const caption = photo.caption ? `<figcaption>${escapeHtml(photo.caption)}</figcaption>` : "";
  const lightbox = document.createElement("div");
  lightbox.className = "photo-lightbox";
  lightbox.dataset.galleryLightbox = "true";
  lightbox.dataset.galleryIndex = String(activeGalleryIndex);
  lightbox.innerHTML = `
    <button type="button" class="photo-lightbox__close" aria-label="Close larger gallery view">Close</button>
    <button type="button" class="photo-lightbox__nav photo-lightbox__nav--prev" data-lightbox-step="-1" aria-label="Previous photo">‹</button>
    <figure>
      ${galleryMedia(photo, { featured: true, controls: photo.type === "video" })}
      ${caption}
    </figure>
    <button type="button" class="photo-lightbox__nav photo-lightbox__nav--next" data-lightbox-step="1" aria-label="Next photo">›</button>
  `;
  document.body.append(lightbox);
  document.body.classList.add("has-photo-lightbox");
  lightbox.querySelector(".photo-lightbox__close").focus();
}

function showLightboxPhoto(step) {
  const lightbox = document.querySelector("[data-gallery-lightbox]");

  if (!lightbox || !galleryPhotos.length) {
    return;
  }

  const currentIndex = Number(lightbox.dataset.galleryIndex || activeGalleryIndex);
  const nextIndex = (currentIndex + step + galleryPhotos.length) % galleryPhotos.length;
  const photo = galleryPhotos[nextIndex];
  const caption = photo.caption ? `<figcaption>${escapeHtml(photo.caption)}</figcaption>` : "";
  const figure = lightbox.querySelector("figure");

  activeGalleryIndex = nextIndex;
  lightbox.dataset.galleryIndex = String(nextIndex);
  figure.innerHTML = `${galleryMedia(photo, { featured: true, controls: photo.type === "video" })}${caption}`;
  renderPhotoGallery(galleryPhotos, nextIndex);
}

async function loadPhotoGallery() {
  if (!photoGallery) {
    return;
  }

  try {
    const response = await fetch(`${PHOTO_GALLERY_ENDPOINT}&t=${Date.now()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Gallery returned ${response.status}`);
    }

    const photos = await response.json();
    const galleryItems = Array.isArray(photos) ? photos : photos.items || [];
    const currentSrc = galleryPhotos[activeGalleryIndex]?.src;
    const nextIndex = currentSrc ? galleryItems.findIndex((photo) => photo.src === currentSrc) : -1;
    renderPhotoGallery(galleryItems, nextIndex >= 0 ? nextIndex : galleryItems.length - 1);
  } catch (error) {
    console.warn("Could not load photo gallery", error);
    photoGallery.innerHTML = "<p>The photo pile is taking a minute. Try refreshing in a bit.</p>";
  }
}

loadPhotoGallery();

if (photoGallery) {
  window.setInterval(loadPhotoGallery, PHOTO_GALLERY_REFRESH_MS);
}

if (photoUploadForm) {
  photoUploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = photoUploadForm.querySelector("button[type='submit']");
    const submitter = photoUploadForm.elements.submitter.value.trim();
    const website = photoUploadForm.elements.website.value;
    const files = Array.from(photoUploadForm.elements.photos.files || []);

    if (!submitter || !files.length) {
      photoUploadStatus.textContent = "Add your name and choose at least one photo.";
      return;
    }

    if (files.length > 12) {
      photoUploadStatus.textContent = "Please upload 12 photos or fewer at a time.";
      return;
    }

    submitButton.disabled = true;

    try {
      for (let index = 0; index < files.length; index += 1) {
        photoUploadStatus.textContent = `Uploading photo ${index + 1} of ${files.length}...`;
        const formData = new FormData();
        formData.append("submitter", submitter);
        formData.append("website", website);
        formData.append("photo", files[index]);

        const response = await fetch("/api/photos", {
          method: "POST",
          body: formData,
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result.error || `Upload returned ${response.status}`);
        }
      }

      photoUploadForm.reset();
      photoUploadStatus.textContent = files.length === 1
        ? "Your photo is in the family gallery."
        : `${files.length} photos are in the family gallery.`;
      await loadPhotoGallery();
    } catch (error) {
      console.warn("Could not upload photo", error);
      photoUploadStatus.textContent = error.message || "That photo did not upload. Please try again.";
    } finally {
      submitButton.disabled = false;
    }
  });
}

document.addEventListener("click", (event) => {
  const thumb = event.target.closest("[data-gallery-index]");
  const openButton = event.target.closest("[data-gallery-open]");
  const closeButton = event.target.closest(".photo-lightbox__close");
  const lightboxStep = event.target.closest("[data-lightbox-step]");
  const lightbox = event.target.closest(".photo-lightbox");

  if (thumb && photoGallery.contains(thumb)) {
    if (suppressNextThumbnailClick) {
      suppressNextThumbnailClick = false;
      return;
    }

    renderPhotoGallery(galleryPhotos, Number(thumb.dataset.galleryIndex));
    return;
  }

  if (openButton && photoGallery.contains(openButton)) {
    openGalleryLightbox(activeGalleryIndex);
    return;
  }

  if (lightboxStep) {
    showLightboxPhoto(Number(lightboxStep.dataset.lightboxStep));
    return;
  }

  if (closeButton || (lightbox && event.target === lightbox)) {
    lightbox.remove();
    document.body.classList.remove("has-photo-lightbox");
  }
});

document.addEventListener("keydown", (event) => {
  const lightbox = document.querySelector(".photo-lightbox");

  if (!lightbox) {
    return;
  }

  if (event.key === "Escape") {
    lightbox.remove();
    document.body.classList.remove("has-photo-lightbox");
  }

  if (event.key === "ArrowLeft") {
    showLightboxPhoto(-1);
  }

  if (event.key === "ArrowRight") {
    showLightboxPhoto(1);
  }
});

document.addEventListener("pointerdown", (event) => {
  const thumbs = event.target.closest(".photo-gallery__thumbs");

  if (!thumbs || event.button !== 0) {
    return;
  }

  thumbnailDrag = {
    element: thumbs,
    pointerId: event.pointerId,
    startX: event.clientX,
    scrollLeft: thumbs.scrollLeft,
    moved: false,
  };
  thumbs.setPointerCapture(event.pointerId);
});

document.addEventListener("pointermove", (event) => {
  if (!thumbnailDrag) {
    return;
  }

  const deltaX = event.clientX - thumbnailDrag.startX;

  if (Math.abs(deltaX) > 4) {
    thumbnailDrag.moved = true;
    event.preventDefault();
  }

  thumbnailDrag.element.scrollLeft = thumbnailDrag.scrollLeft - deltaX;
});

function endThumbnailDrag() {
  if (!thumbnailDrag) {
    return;
  }

  if (thumbnailDrag.element.hasPointerCapture?.(thumbnailDrag.pointerId)) {
    thumbnailDrag.element.releasePointerCapture(thumbnailDrag.pointerId);
  }

  suppressNextThumbnailClick = thumbnailDrag.moved;
  thumbnailDrag = null;

  if (suppressNextThumbnailClick) {
    window.setTimeout(() => {
      suppressNextThumbnailClick = false;
    }, 120);
  }
}

document.addEventListener("pointerup", endThumbnailDrag);
document.addEventListener("pointercancel", endThumbnailDrag);

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

function isMissouriLocal(entry) {
  const location = String(entry.city || entry.address || "").toLowerCase();
  const town = String(entry.city || "").split(",")[0].trim().toLowerCase();
  const lat = Number(entry.originLat);
  const lng = Number(entry.originLng);
  const looksLikeMissouri = /\b(missouri|mo)\b/.test(location);
  const cityIsLocal = MISSOURI_CITIES.has(town);
  const insideMissouri = hasUsableCoordinates(entry) && lat >= 35.9 && lat <= 40.62 && lng >= -95.78 && lng <= -89.1;

  return looksLikeMissouri || cityIsLocal || insideMissouri;
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

  const attendees = entries
    .filter((entry) => entry.name && Number.isFinite(Number(entry.miles)))
    .sort((a, b) => Number(b.miles) - Number(a.miles))
    .slice(0, 8);

  if (!attendees.length) {
    leaderboardList.innerHTML = "<li><span>Travel details will appear after the first RSVP.</span><strong>0 mi</strong></li>";
    return;
  }

  leaderboardList.innerHTML = attendees
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
    .filter((entry) => !isMissouriLocal(entry));
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
      const airport = String(item.entry.arrivalAirport || "").trim().toLowerCase();
      const candidateAirport = String(candidate.entry.arrivalAirport || "").trim().toLowerCase();
      const compatibleAirport = type !== "arrival" || !airport || !candidateAirport || airport === candidateAirport;
      if (!used.has(candidateKey) && sameDay && hoursApart <= 3 && compatibleAirport) {
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
    flightGroupsList.innerHTML = "<p>Flight matches will appear when two or more people have arrival or departure times within about three hours.</p>";
    return;
  }

  flightGroupsList.innerHTML = groups
    .map((group) => {
      const first = group.items[0].entry;
      const airport = group.type === "arrival" ? titleCase(first.arrivalAirport) : "";
      const label = group.type === "arrival"
        ? airport ? `Arriving at ${airport}` : "Arriving nearby"
        : "Departing nearby";
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

  const allInviters = new Set(FAMILY_CLANS.flatMap((clan) => clan.inviters.map((name) => name.toLowerCase())));
  const assignedPeople = entries.filter(
    (entry) => entry.name && allInviters.has(String(entry.invitedBy || "").toLowerCase())
  );

  if (familyClansTotal) {
    familyClansTotal.textContent = `${assignedPeople.length} total RSVP${assignedPeople.length === 1 ? "" : "s"}`;
  }

  familyClansGrid.innerHTML = FAMILY_CLANS.map((clan) => {
    const inviterSet = new Set(clan.inviters.map((name) => name.toLowerCase()));
    const people = entries
      .filter((entry) => entry.name && inviterSet.has(String(entry.invitedBy || "").toLowerCase()))
      .sort((a, b) => familyRosterName(a).localeCompare(familyRosterName(b)));
    const roster = people.length
      ? `<ul>${people.map((entry) => `<li>${escapeHtml(familyRosterName(entry))}</li>`).join("")}</ul>`
      : "<p>Waiting for RSVPs.</p>";

    return `<article><h4>${clan.name}</h4><strong>${people.length} checked in</strong>${roster}</article>`;
  }).join("");
}

function renderFamilyTree(entries = []) {
  if (!familyTreeBranches) {
    return;
  }

  const branches = ["Hudson", "Hubbard"];
  const connected = entries.filter((entry) =>
    branches.includes(entry.invitedBy) && (entry.familyConnection || entry.familyRelationship)
  );

  if (familyTreeCount) {
    familyTreeCount.textContent = connected.length
      ? `${connected.length} connection${connected.length === 1 ? "" : "s"} shared`
      : "The story is just beginning";
  }

  familyTreeBranches.innerHTML = branches.map((branch) => {
    const people = entries
      .filter((entry) => entry.invitedBy === branch)
      .sort((a, b) => displayShortName(a).localeCompare(displayShortName(b)));
    const nodes = people.length
      ? people.map((entry) => {
          const connection = titleCase(entry.familyConnection);
          const relationship = String(entry.familyRelationship || "").trim();
          const details = [
            connection ? `Connected through ${connection}` : "",
            relationship,
          ].filter(Boolean).join(" · ");

          return `<div class="family-tree__person"><strong>${escapeHtml(displayShortName(entry))}</strong><span>${escapeHtml(details || "Relationship details coming soon")}</span></div>`;
        }).join("")
      : `<p class="family-tree__empty">${branch} connections will take root here as the family shares them.</p>`;

    return `<article class="family-tree__branch family-tree__branch--${branch.toLowerCase()}">
      <div class="family-tree__branch-heading"><span>${branch} family</span><h4>If you know one of these people, you might be a ${branch}.</h4></div>
      <div class="family-tree__people">${nodes}</div>
    </article>`;
  }).join("");
}

function familyRosterName(entry) {
  const firstName = titleCase(String(entry.name || "").trim().split(/\s+/)[0] || "Friend");
  const nickname = titleCase(entry.nickname);

  return nickname && nickname.toLowerCase() !== firstName.toLowerCase()
    ? `${nickname} · ${firstName}`
    : firstName;
}

function renderHeightLeaderboard(entries = []) {
  if (!heightList) {
    return;
  }

  const attendees = entries
    .filter((entry) => entry.name && Number.isFinite(Number(entry.heightInches)) && Number(entry.heightInches) > 0)
    .sort((a, b) => {
      const heightDiff = Number(b.heightInches) - Number(a.heightInches);
      if (heightDiff) {
        return heightDiff;
      }

      return displayShortName(a).localeCompare(displayShortName(b));
    })
    .slice(0, 8);

  if (!attendees.length) {
    heightList.innerHTML = "<li><span>Height details will appear here.</span><strong>0 ft</strong></li>";
    return;
  }

  heightList.innerHTML = attendees
    .map((entry) => {
      const total = Number(entry.heightInches);
      const feet = Math.floor(total / 12);
      const inches = total % 12;
      const displayName = displayShortName(entry);
      return `<li><button type="button" data-map-entry-id="${entryKey(entry)}">${escapeHtml(displayName)}</button><strong>${feet}' ${inches}\"</strong></li>`;
    })
    .join("");
}

function ageAtReunion(entry) {
  const birthYear = Number(entry.birthYear);
  const birthMonth = BIRTHDAY_MONTHS.indexOf(entry.birthMonth);
  const birthDay = Number(entry.birthDay);

  if (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > 2027 || birthMonth < 0 || !birthDay) {
    return null;
  }

  let age = 2027 - birthYear;
  if (birthMonth > 5 || (birthMonth === 5 && birthDay > 9)) {
    age -= 1;
  }
  return age;
}

function renderAgeSummary(entries = []) {
  if (!ageList) {
    return;
  }

  const attendees = entries
    .map((entry) => ({ entry, age: ageAtReunion(entry) }))
    .filter(({ entry, age }) => entry.name && Number.isInteger(age) && age >= 0)
    .sort((a, b) => b.age - a.age || displayShortName(a.entry).localeCompare(displayShortName(b.entry)))
    .slice(0, 8);

  if (!attendees.length) {
    ageList.innerHTML = "<li><span>Age details will appear here.</span><strong>0 yrs</strong></li>";
    return;
  }

  ageList.innerHTML = attendees
    .map(({ entry, age }) => `<li><button type="button" data-map-entry-id="${entryKey(entry)}">${escapeHtml(displayShortName(entry))}</button><strong>${age} yrs</strong></li>`)
    .join("");
}

function renderBirthdayCalendar(entries = []) {
  if (!birthdayCalendar) {
    return;
  }

  const months = BIRTHDAY_MONTHS;

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

  const bounds = new mapboxgl.LngLatBounds([REUNION_POSITION.lng, REUNION_POSITION.lat], [REUNION_POSITION.lng, REUNION_POSITION.lat]);
  entries.forEach((entry) => {
    bounds.extend([Number(entry.originLng), Number(entry.originLat)]);
  });
  originMapInstance.fitBounds(bounds, { padding: 72, duration: 900, maxZoom: 7, pitch: 0, bearing: 0 });
}

function flyToReunion() {
  if (originMapInstance) {
    originMapInstance.flyTo({ center: [REUNION_POSITION.lng, REUNION_POSITION.lat], zoom: 11, pitch: 0, bearing: 0 });
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

  const bounds = new mapboxgl.LngLatBounds([REUNION_POSITION.lng, REUNION_POSITION.lat], [REUNION_POSITION.lng, REUNION_POSITION.lat]);
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
    originMapEmpty.hidden = hasMapboxToken();
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
    center: [REUNION_POSITION.lng, REUNION_POSITION.lat],
    zoom: 11,
    pitch: 0,
    bearing: 0,
    attributionControl: true,
  });

  originMapInstance.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");

  const homeMarker = new mapboxgl.Marker({ element: makeMarker("origin-marker origin-marker--home"), anchor: "bottom" })
    .setLngLat([REUNION_POSITION.lng, REUNION_POSITION.lat])
    .setPopup(new mapboxgl.Popup({ offset: 24 }).setHTML("<strong>Hudson Hubbard Family Reunion</strong><span>Roaring River State Park</span>"))
    .addTo(originMapInstance);

  homeMarker.getElement().setAttribute("aria-label", "Hudson Hubbard Family Reunion at Roaring River State Park");
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
      flyToReunion();
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
    renderAgeSummary([]);
    renderTravelGroups([]);
    renderFlightGroups([]);
    renderFamilyClans([]);
    renderFamilyTree([]);
    renderBirthdayCalendar([]);
    renderOriginMap([]);
    return;
  }

  try {
    const response = await fetch(`${RSVP_ENDPOINT}?view=rsvps`);
    const data = await response.json();
    const entries = data.entries || [];
    renderLeaderboard(entries);
    renderHeightLeaderboard(entries);
    renderAgeSummary(entries);
    renderTravelGroups(entries);
    renderFlightGroups(entries);
    renderFamilyClans(entries);
    renderFamilyTree(entries);
    renderBirthdayCalendar(entries);
    renderOriginMap(entries);
  } catch (error) {
    setFormStatus("RSVP details are taking a minute. Try refreshing shortly.");
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

    if (!payload.birthMonth || !payload.birthDay || !payload.birthYear) {
      setFormStatus("Add your complete birthday for the family calendar.");
      return;
    }

    if (!RSVP_ENDPOINT) {
      setFormStatus("Form is designed and ready. Connect the Cloudflare D1 endpoint to collect RSVPs.");
      return;
    }

    submitButton.disabled = true;
    setFormStatus("Saving your RSVP...");

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
        setFormStatus("Updated your RSVP. The family boards will catch up in a second.");
      } else if (Number.isFinite(Number(data.entry.miles))) {
        setFormStatus(`You're in. We mapped your ${Math.round(data.entry.miles).toLocaleString()}-mile journey to the reunion.`);
      } else {
        setFormStatus("You're in. We saved the RSVP, and your travel details will appear when the city can be mapped.");
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
