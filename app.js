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
const familyTreeGraphic = document.querySelector("#family-tree-graphic");
const photoGallery = document.querySelector("#photo-gallery");
const photoUploadForm = document.querySelector("#photo-upload-form");
const photoUploadStatus = document.querySelector("#photo-upload-status");
const originMap = document.querySelector("#origin-map");
const originMapCanvas = document.querySelector("#origin-map-canvas");
const originMapEmpty = document.querySelector("#origin-map-empty");
const mapStyleButtons = Array.from(document.querySelectorAll("[data-map-style]"));
const mapActionButtons = Array.from(document.querySelectorAll("[data-map-action]"));
let mapboxAccessToken = "";
const REUNION_POSITION = { lat: 36.642336, lng: -93.852493, label: "Fishers of Men Family Resort" };
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
  { name: "Both", inviters: ["Hudson & Hubbard", "Both Hudson & Hubbard"] },
  { name: "Family Friends", inviters: ["Family Friend"], hideWhenEmpty: true },
];
const BOTH_FAMILY_ROLL_CALL_NAMES = new Set(["brenda", "al", "alfred", "frank", "ladonna"]);
const FAMILY_TREE_VIEWS = {
  center: {
    title: "Virgil and Della's branch",
    subtitle: "The marriage that brings the Hudson and Hubbard stories together.",
    root: { id: "virgil-della", name: "Virgil Hudson + Della Hubbard", meta: "Hudson + Hubbard", detail: "Virgil Hudson (1925-1990) married Della Hubbard. Their six children form the shared branch at the heart of this reunion.", featured: true },
    branches: [
      { id: "diana", name: "Diana", meta: "Child of Virgil + Della", detail: "Diana's children are Brian, Todd, and Kimberly.", children: [
        { id: "brian", name: "Brian", meta: "Diana's son", detail: "Brian is Diana's son." },
        { id: "todd", name: "Todd", meta: "Diana's son", detail: "Todd is Diana's son." },
        { id: "kimberly", name: "Kimberly", meta: "Diana's daughter", detail: "Kimberly is Diana's daughter and Trent's mother.", children: [{ id: "trent", name: "Trent", meta: "Kimberly's son", detail: "Trent is Kimberly's son." }] },
      ] },
      { id: "brenda", name: "Brenda", meta: "Child of Virgil + Della", detail: "Brenda's children are LaDonna, Frank, and Robert \"Joe\".", children: [
        { id: "ladonna", name: "LaDonna", meta: "Brenda's daughter", detail: "LaDonna is Brenda's daughter and the mother of Skooter and Robbey.", children: [
          { id: "skooter", name: "Skooter", meta: "LaDonna's son", detail: "Skooter is LaDonna's son." },
          { id: "robbey", name: "Robbey", meta: "LaDonna's son", detail: "Robbey is LaDonna's son." },
        ] },
        { id: "frank", name: "Frank", meta: "Brenda's son", detail: "Frank is Brenda's son and Bella's father.", children: [{ id: "bella", name: "Bella", meta: "Frank's daughter", detail: "Bella is Frank's daughter." }] },
        { id: "robert-joe", name: "Robert \"Joe\"", meta: "Brenda's son", detail: "Robert \"Joe\" is Brenda's son and the father of JW and Abby J.", children: [
          { id: "jw", name: "JW", meta: "Robert's child", detail: "JW is Robert \"Joe\"'s child." },
          { id: "abby-j", name: "Abby J", meta: "Robert's child", detail: "Abby J is Robert \"Joe\"'s child." },
        ] },
      ] },
      { id: "mike", name: "Mike", meta: "Child of Virgil + Della", detail: "Mike's children are Jeremy and Jessica.", children: [
        { id: "jeremy", name: "Jeremy", meta: "Mike's son", detail: "Jeremy is Mike's son." },
        { id: "jessica", name: "Jessica", meta: "Mike's daughter", detail: "Jessica is Mike's daughter." },
      ] },
      { id: "chris", name: "Chris", meta: "Child of Virgil + Della", detail: "Chris is one of Virgil and Della's six children.", children: [] },
      { id: "david", name: "David", meta: "Child of Virgil + Della", detail: "David's children are Bethany and Seth.", children: [
        { id: "bethany", name: "Bethany", meta: "David's daughter", detail: "Bethany is David's daughter." },
        { id: "seth", name: "Seth", meta: "David's son", detail: "Seth is David's son." },
      ] },
      { id: "laura", name: "Laura", meta: "Child of Virgil + Della", detail: "Laura's daughter is Christine.", children: [
        { id: "christine", name: "Christine", meta: "Laura's daughter", detail: "Christine is Laura's daughter." },
      ] },
    ],
  },
  hudson: {
    title: "Hudson roots",
    subtitle: "Beginning with Harvey and Ada Brown Hudson of Eureka Springs, Arkansas.",
    generations: [
      {
        label: "Earlier generation",
        people: [
          { id: "harvey-ada", name: "Harvey Hudson + Ada Brown", meta: "Eureka Springs, Arkansas", detail: "Harvey Hudson and Ada Brown Hudson are the parents of the Hudson siblings shown here.", featured: true },
        ],
      },
      {
        label: "Their children",
        people: [
          { id: "betty", name: "Betty", meta: "Married Floyd", detail: "Betty and Floyd's children are Donnie, Elaine, and Sherry." },
          { id: "clarence", name: "Clarence", meta: "1922-2020", detail: "Clarence married Hazel Mae. Their children are Charles and Caroline." },
          { id: "mary", name: "Mary", meta: "Hudson sibling", detail: "Mary is one of Harvey and Ada's children." },
          { id: "virgil", name: "Virgil", meta: "1925-1990", detail: "Virgil married Della Hubbard. Their children are Diana, Brenda, Mike, Chris, David, and Laura." },
          { id: "jane", name: "Jane", meta: "Married Bill", detail: "Jane and Bill's child is Billie." },
          { id: "billie-rae", name: "Billie Rae", meta: "Hudson sibling", detail: "Billie Rae is one of Harvey and Ada's children." },
          { id: "richard", name: "Richard", meta: "1927-2019", detail: "Richard's son is Rick." },
        ],
      },
    ],
  },
  hubbard: {
    title: "Hubbard roots",
    subtitle: "Beginning with Sherman L. E. and Beuna Viola Hubbard of Missouri.",
    generations: [
      {
        label: "Earlier generation",
        people: [
          { id: "sherman-beuna", name: "Sherman L. E. + Beuna Viola Hubbard", meta: "Missouri", detail: "Sherman L. E. Hubbard (1909-1983) and Beuna Viola Hubbard (1913-2002) are at the head of this branch.", featured: true },
        ],
      },
      {
        label: "Their children",
        people: [
          { id: "kenneth", name: "Kenneth", meta: "Married Ginger", detail: "Kenneth and Ginger's children are Gary, Gloria, Sheila, and Iris." },
          { id: "jackie", name: "Jackie", meta: "Married Bob", detail: "Jackie and Bob's children are Robbie, Billie, Patty, Linda, and Lou Ann." },
          { id: "della", name: "Della", meta: "Married Virgil Hudson", detail: "Della and Virgil connect the Hubbard and Hudson branches. Their children are Diana, Brenda, Mike, Chris, David, and Laura." },
          { id: "freddie", name: "Freddie", meta: "Married Patty", detail: "Freddie and Patty's child is Tammy." },
          { id: "claudine", name: "Claudine", meta: "Hubbard sibling", detail: "Claudine's children are Margaret and Jeanie." },
        ],
      },
    ],
  },
};

function setFormStatus(message) {
  if (formStatus) {
    formStatus.textContent = message;
  }
}

function hasCityAndState(value) {
  const parts = String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return false;
  }

  const state = parts.pop();
  const city = parts.join(", ");
  return city.length >= 2 && /^(?:[a-z]{2}|[a-z][a-z .'-]{2,})$/i.test(state);
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
  const alt = escapeHtml(photo.alt || photo.people || "Hudson Hubbard family photo");

  if (photo.type === "video") {
    const controls = options.controls ? " controls" : "";
    const muted = options.thumbnail ? " muted playsinline" : "";
    return `<video${controls}${muted} preload="metadata"><source src="${src}" />Your browser cannot play this video.</video>`;
  }

  const image = `<img src="${src}" alt="${alt}" loading="${options.featured ? "eager" : "lazy"}" decoding="async" />`;

  if (Number(photo.rotation) === 90) {
    return `<span class="photo-media-rotation" data-photo-rotation="90">${image}</span>`;
  }

  return image;
}

function galleryCaption(photo, { thumbnail = false } = {}) {
  const people = String(photo.people || "").trim();

  if (!people) {
    return "";
  }

  return thumbnail
    ? `<span class="photo-gallery__people">${escapeHtml(people)}</span>`
    : `<figcaption><strong>${escapeHtml(people)}</strong></figcaption>`;
}

function galleryPhotoLabel(photo) {
  return String(photo.people || "family photo").trim();
}

function fitRotatedGalleryMedia(scope = document) {
  scope.querySelectorAll("[data-photo-rotation='90']").forEach((frame) => {
    const image = frame.querySelector("img");

    if (!image) {
      return;
    }

    const fitImage = () => {
      const frameWidth = frame.clientWidth;
      const frameHeight = frame.clientHeight;

      if (!frameWidth || !frameHeight || !image.naturalWidth || !image.naturalHeight) {
        return;
      }

      const scale = Math.min(frameWidth / image.naturalHeight, frameHeight / image.naturalWidth);
      image.style.width = `${Math.max(1, image.naturalWidth * scale)}px`;
      image.style.height = `${Math.max(1, image.naturalHeight * scale)}px`;
    };

    if (image.complete) {
      fitImage();
    } else {
      image.addEventListener("load", fitImage, { once: true });
    }
  });
}

function scrollActiveThumbnailIntoView() {
  const activeThumb = photoGallery?.querySelector(".photo-gallery__thumb.is-active");

  if (activeThumb) {
    activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }
}

function selectGalleryPhoto(index, { scrollThumbnail = true } = {}) {
  const nextIndex = Math.min(Math.max(Number(index) || 0, 0), galleryPhotos.length - 1);
  const photo = galleryPhotos[nextIndex];
  const featured = photoGallery?.querySelector(".photo-gallery__featured");

  if (!photo || !featured) {
    return;
  }

  activeGalleryIndex = nextIndex;
  const caption = galleryCaption(photo);

  featured.innerHTML = `
    <button type="button" class="photo-gallery__open" data-gallery-open="true" aria-label="Open ${escapeHtml(galleryPhotoLabel(photo))} larger">
      ${galleryMedia(photo, { featured: true })}
    </button>
    ${caption}
  `;

  photoGallery.querySelectorAll("[data-gallery-index]").forEach((thumb) => {
    const isActive = Number(thumb.dataset.galleryIndex) === nextIndex;
    thumb.classList.toggle("is-active", isActive);
    thumb.setAttribute("aria-pressed", String(isActive));
  });

  window.requestAnimationFrame(() => fitRotatedGalleryMedia(featured));

  if (scrollThumbnail) {
    scrollActiveThumbnailIntoView();
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
  const featuredCaption = galleryCaption(featured);
  const thumbnails = photos
    .map((photo, index) => {
      const caption = galleryCaption(photo, { thumbnail: true });
      const current = index === activeGalleryIndex ? " is-active" : "";
      return `<button class="photo-gallery__thumb${current}" type="button" data-gallery-index="${index}" aria-label="Show ${escapeHtml(galleryPhotoLabel(photo))}" aria-pressed="${index === activeGalleryIndex}">${galleryMedia(photo, { thumbnail: true })}${caption}</button>`;
    })
    .join("");

  photoGallery.innerHTML = `
    <figure class="photo-gallery__featured">
      <button type="button" class="photo-gallery__open" data-gallery-open="true" aria-label="Open ${escapeHtml(galleryPhotoLabel(featured))} larger">
        ${galleryMedia(featured, { featured: true })}
      </button>
      ${featuredCaption}
    </figure>
    <div class="photo-gallery__thumbs" aria-label="Choose a photo">${thumbnails}</div>
  `;
  window.requestAnimationFrame(() => fitRotatedGalleryMedia(photoGallery));
  window.setTimeout(scrollActiveThumbnailIntoView, 0);
}

function openGalleryLightbox(index = activeGalleryIndex) {
  const photo = galleryPhotos[index];

  if (!photo) {
    return;
  }

  activeGalleryIndex = Math.min(Math.max(index, 0), galleryPhotos.length - 1);
  const caption = galleryCaption(photo);
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
  window.requestAnimationFrame(() => fitRotatedGalleryMedia(lightbox));
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
  const caption = galleryCaption(photo);
  const figure = lightbox.querySelector("figure");

  activeGalleryIndex = nextIndex;
  lightbox.dataset.galleryIndex = String(nextIndex);
  figure.innerHTML = `${galleryMedia(photo, { featured: true, controls: photo.type === "video" })}${caption}`;
  window.requestAnimationFrame(() => fitRotatedGalleryMedia(figure));
  renderPhotoGallery(galleryPhotos, nextIndex);
}

window.addEventListener("resize", () => fitRotatedGalleryMedia());

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
    const people = photoUploadForm.elements.people.value.trim();
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
        formData.append("people", people);
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

    selectGalleryPhoto(Number(thumb.dataset.galleryIndex));
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

  if (!thumbs || event.button !== 0 || (event.pointerType && event.pointerType !== "mouse")) {
    return;
  }

  thumbnailDrag = {
    element: thumbs,
    pointerId: event.pointerId,
    startX: event.clientX,
    scrollLeft: thumbs.scrollLeft,
    moved: false,
  };
});

document.addEventListener("pointermove", (event) => {
  if (!thumbnailDrag) {
    return;
  }

  const deltaX = event.clientX - thumbnailDrag.startX;

  if (Math.abs(deltaX) > 10) {
    if (!thumbnailDrag.moved) {
      thumbnailDrag.element.setPointerCapture?.(thumbnailDrag.pointerId);
    }

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

document.addEventListener("wheel", (event) => {
  const thumbs = event.target.closest(".photo-gallery__thumbs");

  if (!thumbs || thumbs.scrollWidth <= thumbs.clientWidth) {
    return;
  }

  const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;

  if (!delta) {
    return;
  }

  event.preventDefault();
  thumbs.scrollLeft += delta;
}, { passive: false });

function titleCase(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function primaryNickname(value) {
  return String(value || "")
    .split(/\s*\/\s*|\s+\|\s+|\s*,\s*/)[0]
    .trim();
}

function displayShortName(entry) {
  if (entry.nickname && entry.nickname.trim()) {
    return titleCase(primaryNickname(entry.nickname));
  }

  return titleCase(String(entry.name || "").trim().split(/\s+/)[0] || "Friend");
}

function displayLeaderboardName(entry) {
  const fullName = titleCase(entry.name || "Friend");
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const familiarName = displayShortName(entry);

  if (!lastName) {
    return familiarName;
  }

  return familiarName.toLowerCase().endsWith(lastName.toLowerCase())
    ? familiarName
    : `${familiarName} ${lastName}`;
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
      return `<li><button type="button" data-map-entry-id="${entryKey(entry)}">${escapeHtml(displayLeaderboardName(entry))}</button><strong>${location}<span>${miles} mi</span></strong></li>`;
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

  const assignedPeople = entries.filter((entry) => entry.name && rollCallClan(entry));

  if (familyClansTotal) {
    familyClansTotal.textContent = `${assignedPeople.length} total RSVP${assignedPeople.length === 1 ? "" : "s"}`;
  }

  familyClansGrid.innerHTML = FAMILY_CLANS.map((clan) => {
    const people = entries
      .filter((entry) => entry.name && rollCallClan(entry) === clan.name)
      .sort((a, b) => familyRosterName(a).localeCompare(familyRosterName(b)));
    if (clan.hideWhenEmpty && !people.length) {
      return "";
    }
    const roster = people.length
      ? `<ul>${people.map((entry) => `<li>${escapeHtml(familyRosterName(entry))}</li>`).join("")}</ul>`
      : "<p>Waiting for RSVPs.</p>";

    return `<article><h4>${clan.name}</h4><strong>${people.length} checked in</strong>${roster}</article>`;
  }).join("");
}

function rollCallClan(entry) {
  const firstName = String(entry.name || "").trim().toLowerCase().split(/\s+/)[0];

  if (BOTH_FAMILY_ROLL_CALL_NAMES.has(firstName)) {
    return "Both";
  }

  const savedFamily = String(entry.invitedBy || "").trim().toLowerCase();
  return FAMILY_CLANS.find((clan) => clan.inviters.some((name) => name.toLowerCase() === savedFamily))?.name || "";
}

function renderFamilyTreeGraphic() {
  if (!familyTreeGraphic) {
    return;
  }

  const center = FAMILY_TREE_VIEWS.center;
  const hudson = FAMILY_TREE_VIEWS.hudson;
  const hubbard = FAMILY_TREE_VIEWS.hubbard;

  familyTreeGraphic.innerHTML = `
    <header class="family-tree__graphic-heading">
      <span>Both sides of the family in one continuous view.</span>
      <h4>From the roots to the newest branches</h4>
    </header>
    <div class="family-tree__complete">
      <div class="family-tree__roots-grid">
        ${familyTreeRootSide(hudson, "hudson")}
        ${familyTreeRootSide(hubbard, "hubbard")}
      </div>
      <div class="family-tree__union">
        <span class="family-tree__union-line" aria-hidden="true"></span>
        <p class="family-tree__generation-label">The two families join</p>
        ${familyTreeNode(center.root, " family-tree__node--featured", true)}
        <span class="family-tree__trunk family-tree__trunk--center" aria-hidden="true"></span>
      </div>
      <div class="family-tree__lineage">
        <p class="family-tree__generation-label">Their children and every branch below</p>
        <div class="family-tree__branch-grid">
          ${center.branches.map((branch) => `
            <section class="family-tree__descendant-branch" aria-label="${escapeHtml(branch.name)}'s family branch">
              ${familyTreeNode(branch, " family-tree__node--branch", true)}
              ${branch.children.length ? `<span class="family-tree__branch-line" aria-hidden="true"></span><div class="family-tree__branch-children">
                ${branch.children.map((child) => `<div class="family-tree__descendant">
                  ${familyTreeNode(child, "", true)}
                  ${child.children?.length ? `<div class="family-tree__great-grandchildren">${child.children.map((grandchild) => familyTreeNode(grandchild, " family-tree__node--youngest", true)).join("")}</div>` : ""}
                </div>`).join("")}
              </div>` : '<p class="family-tree__branch-open">More family grows from here.</p>'}
            </section>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

function familyTreeRootSide(view, side) {
  const root = view.generations[0].people[0];
  const children = view.generations[1].people;
  return `<section class="family-tree__root-side family-tree__root-side--${side}" aria-label="${escapeHtml(view.title)}">
    <p class="family-tree__generation-label">${escapeHtml(view.title)}</p>
    ${familyTreeNode(root, " family-tree__node--family-root", true)}
    <span class="family-tree__branch-line" aria-hidden="true"></span>
    <div class="family-tree__root-children">${children.map((person) => familyTreeNode(person, "", true)).join("")}</div>
  </section>`;
}

function familyTreeNode(person, className = "", showDetail = false) {
  return `<article class="family-tree__node${person.featured ? " family-tree__node--featured" : ""}${className}">
    <strong>${escapeHtml(person.name)}</strong>
    <span>${escapeHtml(person.meta)}</span>
    ${showDetail ? `<small>${escapeHtml(person.detail)}</small>` : ""}
  </article>`;
}

renderFamilyTreeGraphic();

function renderFamilyTree(entries = []) {
  if (!familyTreeBranches) {
    return;
  }

  const connected = entries
    .filter((entry) => entry.name && (entry.familyConnection || entry.familyRelationship))
    .sort((a, b) => displayShortName(a).localeCompare(displayShortName(b)));

  if (familyTreeCount) {
    familyTreeCount.textContent = connected.length
      ? `${connected.length} RSVP connection${connected.length === 1 ? "" : "s"} shared`
      : "Our shared family history";
  }

  familyTreeBranches.innerHTML = connected.length
    ? `<h4>Connections shared in RSVPs</h4><div>${connected.map((entry) => {
        const connection = titleCase(entry.familyConnection);
        const relationship = String(entry.familyRelationship || "").trim();
        const details = [connection, relationship].filter(Boolean).join(" · ");
        return `<span><strong>${escapeHtml(displayShortName(entry))}</strong>${details ? ` ${escapeHtml(details)}` : ""}</span>`;
      }).join("")}</div>`
    : "";
}

function familyRosterName(entry) {
  const firstName = titleCase(String(entry.name || "").trim().split(/\s+/)[0] || "Friend");
  const nickname = titleCase(primaryNickname(entry.nickname));

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

      return displayLeaderboardName(a).localeCompare(displayLeaderboardName(b));
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
      const displayName = displayLeaderboardName(entry);
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
  if (birthMonth > 6 || (birthMonth === 6 && birthDay > 1)) {
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
    .sort((a, b) => b.age - a.age || displayLeaderboardName(a.entry).localeCompare(displayLeaderboardName(b.entry)))
    .slice(0, 8);

  if (!attendees.length) {
    ageList.innerHTML = "<li><span>Age details will appear here.</span><strong>0 yrs</strong></li>";
    return;
  }

  ageList.innerHTML = attendees
    .map(({ entry, age }) => `<li><button type="button" data-map-entry-id="${entryKey(entry)}">${escapeHtml(displayLeaderboardName(entry))}</button><strong>${age} yrs</strong></li>`)
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
    .setPopup(new mapboxgl.Popup({ offset: 24 }).setHTML("<strong>Hudson Hubbard Family Reunion</strong><span>Fishers of Men Family Resort</span>"))
    .addTo(originMapInstance);

  homeMarker.getElement().setAttribute("aria-label", "Hudson Hubbard Family Reunion at Fishers of Men Family Resort");
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

    if (!String(payload.email || "").trim()) {
      setFormStatus("Add at least one email address so we can save or update your RSVP.");
      travelForm.elements.email?.focus();
      return;
    }

    if (!String(payload.phone || "").trim()) {
      setFormStatus("Add a phone number for your party.");
      travelForm.elements.phone?.focus();
      return;
    }

    const partyTotal = Number(payload.partyTotal);
    if (!Number.isInteger(partyTotal) || partyTotal < 1 || partyTotal > 50) {
      setFormStatus("Enter the total number of people in your party, from 1 to 50.");
      travelForm.elements.partyTotal?.focus();
      return;
    }

    if (!hasCityAndState(payload.city)) {
      setFormStatus("Add both the city and state in this format: Anderson, Missouri.");
      travelForm.elements.city?.focus();
      return;
    }

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
