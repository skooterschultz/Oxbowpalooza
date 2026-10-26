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
const familyTreeBotanical = document.querySelector("#family-tree-botanical");
const familyTreeExpandButtons = Array.from(document.querySelectorAll("[data-family-tree-expand]"));
const familyTreeModeButtons = Array.from(document.querySelectorAll("[data-family-tree-mode]"));
const familyTreeViews = Array.from(document.querySelectorAll("[data-family-tree-view]"));
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
let activeGalleryKey = "";
let hasLoadedPhotoGallery = false;
let galleryDataFingerprint = "";
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
          { id: "robbey", name: "Robbey", meta: "LaDonna's son", detail: "Robbey is LaDonna's son and Emma's father.", children: [
            { id: "emma", name: "Emma", meta: "Robbey's daughter", detail: "Emma is Robbey's daughter." },
          ] },
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
          { id: "floyd", name: "Floyd", meta: "Hudson sibling", detail: "Floyd is a son of Harvey and Ada." },
          { id: "betty", name: "Betty", meta: "Hudson sibling", detail: "Betty's children are Donnie, Elaine, and Sherry.", children: [
            { id: "donnie", name: "Donnie" }, { id: "elaine", name: "Elaine" }, { id: "sherry", name: "Sherry" },
          ] },
          { id: "clarence", name: "Clarence", meta: "1922-2020", detail: "Clarence married Hazel Mae. Their children are Charles and Caroline.", children: [
            { id: "charles", name: "Charles" }, { id: "caroline", name: "Caroline" },
          ] },
          { id: "mary", name: "Mary", meta: "Hudson sibling", detail: "Mary is one of Harvey and Ada's children." },
          { id: "virgil", name: "Virgil", meta: "1925-1990", detail: "Virgil married Della Hubbard. Their children are Diana, Brenda, Mike, Chris, David, and Laura." },
          { id: "jane", name: "Jane", meta: "Married Bill", detail: "Jane and Bill's children are Billie Jean, Bobbie Joe, Sue, and Kim.", children: [
            { id: "billie-jean", name: "Billie Jean" }, { id: "bobbie-joe", name: "Bobbie Joe" },
            { id: "sue", name: "Sue" }, { id: "kim", name: "Kim" },
          ] },
          { id: "billie-rae", name: "Billie Rae", meta: "Hudson sibling", detail: "Billie Rae's children are Rick and Steve.", children: [
            { id: "rick", name: "Rick" }, { id: "steve", name: "Steve" },
          ] },
          { id: "richard", name: "Richard", meta: "1927-2019", detail: "Richard's son is Scott.", children: [{ id: "scott", name: "Scott" }] },
          { id: "carl", name: "Carl", meta: "Hudson sibling", detail: "Carl is a son of Harvey and Ada." },
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
          { id: "kenneth", name: "Kenneth", meta: "Married Ginger", detail: "Kenneth and Ginger's children are Gary, Gloria, Sheila, Iris, Gayla, and Sherman.", children: [
            { id: "gary", name: "Gary" }, { id: "gloria", name: "Gloria" }, { id: "sheila", name: "Sheila" },
            { id: "iris", name: "Iris" }, { id: "gayla", name: "Gayla" }, { id: "sherman", name: "Sherman" },
          ] },
          { id: "jackie", name: "Jackie", meta: "Married Bob", detail: "Jackie and Bob's children are Robbie, Billie, Patty, Linda, and Lou Ann.", children: [
            { id: "robbie", name: "Robbie" }, { id: "billie-jackie", name: "Billie" }, { id: "patty", name: "Patty" }, { id: "linda", name: "Linda" }, { id: "lou-ann", name: "Lou Ann" },
          ] },
          { id: "della", name: "Della", meta: "Married Virgil Hudson", detail: "Della and Virgil connect the Hubbard and Hudson branches. Their children are Diana, Brenda, Mike, Chris, David, and Laura." },
          { id: "freddie", name: "Freddie", meta: "Married Patty", detail: "Freddie and Patty's children are Tammy and Brent.", children: [
            { id: "tammy", name: "Tammy" }, { id: "brent", name: "Brent" },
          ] },
          { id: "claudine", name: "Claudine", meta: "Hubbard sibling", detail: "Claudine's children are Margaret, Jeannie, and Bradley.", children: [
            { id: "margaret", name: "Margaret" }, { id: "jeannie", name: "Jeannie" }, { id: "bradley", name: "Bradley" },
          ] },
        ],
      },
    ],
  },
};

const BOTANICAL_TREE_SIZE = { width: 2800, height: 1630 };
const BOTANICAL_TREE_NODES = [
  { id: "emma", x: 1020, y: 30 },
  { id: "trent", x: 820, y: 110 }, { id: "skooter", x: 940, y: 110 },
  { id: "robbey", x: 1020, y: 110 }, { id: "bella", x: 1100, y: 110 },
  { id: "jw", x: 1190, y: 110 }, { id: "abby-j", x: 1270, y: 110 },
  { id: "brian", x: 580, y: 360 }, { id: "todd", x: 700, y: 360 },
  { id: "kimberly", x: 820, y: 360 }, { id: "ladonna", x: 980, y: 360 },
  { id: "frank", x: 1100, y: 360 }, { id: "robert-joe", x: 1220, y: 360 },
  { id: "jeremy", x: 1420, y: 360 }, { id: "jessica", x: 1540, y: 360 },
  { id: "bethany", x: 1950, y: 360 }, { id: "seth", x: 2070, y: 360 },
  { id: "christine", x: 2400, y: 360 },
  { id: "diana", x: 700, y: 650, featured: true },
  { id: "brenda", x: 1080, y: 650, featured: true },
  { id: "mike", x: 1480, y: 650, featured: true },
  { id: "chris", x: 1710, y: 650, featured: true },
  { id: "david", x: 2030, y: 650, featured: true },
  { id: "laura", x: 2400, y: 650, featured: true },
  { id: "virgil-della", x: 1400, y: 850, couple: true },
  { id: "donnie", x: 210, y: 1040, compact: true }, { id: "elaine", x: 310, y: 1040, compact: true },
  { id: "sherry", x: 410, y: 1040, compact: true }, { id: "charles", x: 510, y: 1040, compact: true },
  { id: "caroline", x: 610, y: 1040, compact: true }, { id: "billie-jean", x: 710, y: 1040, compact: true },
  { id: "bobbie-joe", x: 810, y: 1040, compact: true }, { id: "sue", x: 900, y: 1040, compact: true },
  { id: "kim", x: 990, y: 1040, compact: true }, { id: "rick", x: 1080, y: 1040, compact: true },
  { id: "steve", x: 1170, y: 1040, compact: true }, { id: "scott", x: 1260, y: 1040, compact: true },
  { id: "gary", x: 1500, y: 1040, compact: true }, { id: "gloria", x: 1590, y: 1040, compact: true },
  { id: "sheila", x: 1680, y: 1040, compact: true }, { id: "iris", x: 1770, y: 1040, compact: true },
  { id: "gayla", x: 1860, y: 1040, compact: true }, { id: "sherman", x: 1950, y: 1040, compact: true },
  { id: "robbie", x: 2040, y: 1040, compact: true }, { id: "billie-jackie", x: 2130, y: 1040, compact: true },
  { id: "patty", x: 2220, y: 1040, compact: true }, { id: "linda", x: 2310, y: 1040, compact: true },
  { id: "lou-ann", x: 2400, y: 1040, compact: true }, { id: "tammy", x: 2475, y: 1040, compact: true },
  { id: "brent", x: 2545, y: 1040, compact: true }, { id: "margaret", x: 2625, y: 1040, compact: true },
  { id: "jeannie", x: 2700, y: 1120, compact: true }, { id: "bradley", x: 2745, y: 1040, compact: true },
  { id: "floyd", x: 120, y: 1260 }, { id: "betty", x: 280, y: 1260 },
  { id: "clarence", x: 460, y: 1260 }, { id: "mary", x: 630, y: 1260 },
  { id: "jane", x: 800, y: 1260 }, { id: "billie-rae", x: 970, y: 1260 },
  { id: "richard", x: 1140, y: 1260 }, { id: "carl", x: 1280, y: 1260 },
  { id: "kenneth", x: 1710, y: 1260 }, { id: "jackie", x: 2200, y: 1260 },
  { id: "freddie", x: 2510, y: 1260 }, { id: "claudine", x: 2700, y: 1260 },
  { id: "harvey-ada", x: 720, y: 1510, couple: true },
  { id: "sherman-beuna", x: 2200, y: 1510, couple: true },
];

const BOTANICAL_TREE_EDGES = [
  ["harvey-ada", "floyd"], ["harvey-ada", "betty"], ["harvey-ada", "clarence"],
  ["harvey-ada", "mary"], ["harvey-ada", "jane"], ["harvey-ada", "billie-rae"],
  ["harvey-ada", "richard"], ["harvey-ada", "carl"],
  ["harvey-ada", "virgil-della"], ["sherman-beuna", "kenneth"], ["sherman-beuna", "jackie"],
  ["sherman-beuna", "freddie"], ["sherman-beuna", "claudine"], ["sherman-beuna", "virgil-della"],
  ["virgil-della", "diana"], ["virgil-della", "brenda"], ["virgil-della", "mike"],
  ["virgil-della", "chris"], ["virgil-della", "david"], ["virgil-della", "laura"],
  ["diana", "brian"], ["diana", "todd"], ["diana", "kimberly"],
  ["brenda", "ladonna"], ["brenda", "frank"], ["brenda", "robert-joe"],
  ["mike", "jeremy"], ["mike", "jessica"], ["david", "bethany"],
  ["david", "seth"], ["laura", "christine"], ["kimberly", "trent"],
  ["ladonna", "skooter"], ["ladonna", "robbey"], ["robbey", "emma"], ["frank", "bella"],
  ["robert-joe", "jw"], ["robert-joe", "abby-j"],
  ["betty", "donnie"], ["betty", "elaine"], ["betty", "sherry"],
  ["clarence", "charles"], ["clarence", "caroline"], ["jane", "billie-jean"],
  ["jane", "bobbie-joe"], ["jane", "sue"], ["jane", "kim"],
  ["billie-rae", "rick"], ["billie-rae", "steve"], ["richard", "scott"],
  ["kenneth", "gary"], ["kenneth", "gloria"], ["kenneth", "sheila"],
  ["kenneth", "iris"], ["kenneth", "gayla"], ["kenneth", "sherman"], ["jackie", "robbie"],
  ["jackie", "billie-jackie"], ["jackie", "patty"], ["jackie", "linda"],
  ["jackie", "lou-ann"], ["freddie", "tammy"], ["freddie", "brent"],
  ["claudine", "margaret"], ["claudine", "jeannie"], ["claudine", "bradley"],
];

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
  const approximateYear = String(photo.approximateYear || "").trim();

  if (!people && !approximateYear) {
    return "";
  }

  if (thumbnail) {
    return `${people ? `<span class="photo-gallery__people">${escapeHtml(people)}</span>` : ""}${approximateYear ? `<span class="photo-gallery__year">${escapeHtml(approximateYear)}</span>` : ""}`;
  }

  return `<figcaption>${people ? `<strong>${escapeHtml(people)}</strong>` : ""}${approximateYear ? `<span>${escapeHtml(approximateYear)}</span>` : ""}</figcaption>`;
}

function galleryPhotoLabel(photo) {
  return String(photo.people || "family photo").trim();
}

function galleryPhotoKey(photo) {
  return String(photo?.id || photo?.key || photo?.src || "");
}

function galleryFingerprint(photos) {
  return JSON.stringify(photos.map((photo) => [
    galleryPhotoKey(photo),
    photo.src,
    photo.people,
    photo.approximateYear,
    photo.rotation,
    photo.type,
  ]));
}

function galleryNameEditor(photo) {
  return `
    <div class="photo-gallery__names">
      <div class="photo-gallery__detail-buttons">
        <button type="button" class="photo-gallery__edit-names" data-gallery-edit-names>Add or Edit Names</button>
        <button type="button" class="photo-gallery__edit-year" data-gallery-edit-year>Year</button>
      </div>
      <form class="photo-gallery__names-form" data-gallery-names-form hidden>
        <label>
          <span>Everyone in this photo</span>
          <input name="people" type="text" maxlength="300" value="${escapeHtml(photo.people || "")}" placeholder="Add names, separated by commas" required />
        </label>
        <div>
          <button type="submit">Save Names</button>
          <button type="button" data-gallery-cancel-names>Cancel</button>
        </div>
        <p data-gallery-names-status role="status" aria-live="polite"></p>
      </form>
      <form class="photo-gallery__names-form" data-gallery-year-form hidden>
        <label>
          <span>When was this taken?</span>
          <input name="approximateYear" type="text" maxlength="40" value="${escapeHtml(photo.approximateYear || "")}" placeholder="Example: 2024" required />
        </label>
        <div>
          <button type="submit">Save Year</button>
          <button type="button" data-gallery-cancel-year>Cancel</button>
        </div>
        <p data-gallery-year-status role="status" aria-live="polite"></p>
      </form>
    </div>
  `;
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

function selectGalleryPhoto(index) {
  const nextIndex = Math.min(Math.max(Number(index) || 0, 0), galleryPhotos.length - 1);
  const photo = galleryPhotos[nextIndex];
  const featured = photoGallery?.querySelector(".photo-gallery__featured");

  if (!photo || !featured) {
    return;
  }

  activeGalleryIndex = nextIndex;
  activeGalleryKey = galleryPhotoKey(photo);
  const caption = galleryCaption(photo);

  featured.innerHTML = `
    <button type="button" class="photo-gallery__open" data-gallery-open="true" aria-label="Open ${escapeHtml(galleryPhotoLabel(photo))} larger">
      ${galleryMedia(photo, { featured: true })}
    </button>
    ${caption}
    ${galleryNameEditor(photo)}
  `;

  photoGallery.querySelectorAll("[data-gallery-index]").forEach((thumb) => {
    const isActive = Number(thumb.dataset.galleryIndex) === nextIndex;
    thumb.classList.toggle("is-active", isActive);
    thumb.setAttribute("aria-pressed", String(isActive));
  });

  window.requestAnimationFrame(() => fitRotatedGalleryMedia(featured));
}

function renderPhotoGallery(photos = galleryPhotos, selectedIndex = activeGalleryIndex, { preservePagePosition = false } = {}) {
  if (!photoGallery) {
    return;
  }

  const pagePosition = preservePagePosition
    ? { x: window.scrollX, y: window.scrollY }
    : null;

  if (!photos.length) {
    galleryPhotos = [];
    activeGalleryIndex = 0;
    activeGalleryKey = "";
    galleryDataFingerprint = galleryFingerprint([]);
    photoGallery.innerHTML = "<p>The reunion gallery is ready for its first family memory.</p>";
    if (pagePosition) {
      window.scrollTo(pagePosition.x, pagePosition.y);
    }
    return;
  }

  const existingThumbnails = photoGallery.querySelector(".photo-gallery__thumbs");
  const previousThumbnailScroll = existingThumbnails?.scrollLeft || 0;
  galleryPhotos = photos;
  activeGalleryIndex = Math.min(Math.max(selectedIndex, 0), photos.length - 1);

  const featured = photos[activeGalleryIndex];
  activeGalleryKey = galleryPhotoKey(featured);
  galleryDataFingerprint = galleryFingerprint(photos);
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
      ${galleryNameEditor(featured)}
    </figure>
    <div class="photo-gallery__thumbs" aria-label="Choose a photo">${thumbnails}</div>
  `;
  if (pagePosition) {
    window.scrollTo(pagePosition.x, pagePosition.y);
  }
  window.requestAnimationFrame(() => {
    fitRotatedGalleryMedia(photoGallery);
    const updatedThumbnails = photoGallery.querySelector(".photo-gallery__thumbs");
    if (updatedThumbnails) {
      updatedThumbnails.scrollLeft = previousThumbnailScroll;
    }
    if (pagePosition) {
      window.scrollTo(pagePosition.x, pagePosition.y);
    }
  });
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
  activeGalleryKey = galleryPhotoKey(photo);
  lightbox.dataset.galleryIndex = String(nextIndex);
  figure.innerHTML = `${galleryMedia(photo, { featured: true, controls: photo.type === "video" })}${caption}`;
  window.requestAnimationFrame(() => fitRotatedGalleryMedia(figure));
  selectGalleryPhoto(nextIndex);
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
    const nextFingerprint = galleryFingerprint(galleryItems);
    let selectedIndex = 0;

    if (galleryItems.length) {
      if (!hasLoadedPhotoGallery) {
        selectedIndex = Math.floor(Math.random() * galleryItems.length);
      } else {
        const matchingIndex = galleryItems.findIndex((photo) => galleryPhotoKey(photo) === activeGalleryKey);
        selectedIndex = matchingIndex >= 0
          ? matchingIndex
          : Math.min(activeGalleryIndex, galleryItems.length - 1);
      }
    }

    if (hasLoadedPhotoGallery && nextFingerprint === galleryDataFingerprint) {
      galleryPhotos = galleryItems;
      activeGalleryIndex = selectedIndex;
      return;
    }

    renderPhotoGallery(galleryItems, selectedIndex, { preservePagePosition: hasLoadedPhotoGallery });
    hasLoadedPhotoGallery = true;
  } catch (error) {
    console.warn("Could not load photo gallery", error);
    if (!galleryPhotos.length) {
      photoGallery.innerHTML = "<p>The photo pile is taking a minute. Try refreshing in a bit.</p>";
    }
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
  const editNamesButton = event.target.closest("[data-gallery-edit-names]");
  const cancelNamesButton = event.target.closest("[data-gallery-cancel-names]");
  const editYearButton = event.target.closest("[data-gallery-edit-year]");
  const cancelYearButton = event.target.closest("[data-gallery-cancel-year]");
  const closeButton = event.target.closest(".photo-lightbox__close");
  const lightboxStep = event.target.closest("[data-lightbox-step]");
  const lightbox = event.target.closest(".photo-lightbox");

  if (editNamesButton && photoGallery.contains(editNamesButton)) {
    const editor = editNamesButton.closest(".photo-gallery__names");
    const form = editor.querySelector("[data-gallery-names-form]");
    editor.querySelector("[data-gallery-year-form]").hidden = true;
    form.hidden = false;
    editor.querySelectorAll("[data-gallery-edit-names], [data-gallery-edit-year]").forEach((button) => {
      button.hidden = true;
    });
    form.elements.people.focus();
    return;
  }

  if (cancelNamesButton && photoGallery.contains(cancelNamesButton)) {
    const form = cancelNamesButton.closest("[data-gallery-names-form]");
    form.hidden = true;
    form.closest(".photo-gallery__names").querySelectorAll("[data-gallery-edit-names], [data-gallery-edit-year]").forEach((button) => {
      button.hidden = false;
    });
    return;
  }

  if (editYearButton && photoGallery.contains(editYearButton)) {
    const editor = editYearButton.closest(".photo-gallery__names");
    editor.querySelectorAll("[data-gallery-names-form], [data-gallery-year-form]").forEach((form) => {
      form.hidden = form.dataset.galleryYearForm === undefined;
    });
    editor.querySelectorAll("[data-gallery-edit-names], [data-gallery-edit-year]").forEach((button) => {
      button.hidden = true;
    });
    editor.querySelector("[data-gallery-year-form]").elements.approximateYear.focus();
    return;
  }

  if (cancelYearButton && photoGallery.contains(cancelYearButton)) {
    const form = cancelYearButton.closest("[data-gallery-year-form]");
    form.hidden = true;
    form.closest(".photo-gallery__names").querySelectorAll("[data-gallery-edit-names], [data-gallery-edit-year]").forEach((button) => {
      button.hidden = false;
    });
    return;
  }

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

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-gallery-names-form]");

  if (!form || !photoGallery?.contains(form)) {
    return;
  }

  event.preventDefault();
  const photo = galleryPhotos[activeGalleryIndex];
  const people = form.elements.people.value.trim();
  const status = form.querySelector("[data-gallery-names-status]");
  const submitButton = form.querySelector("button[type='submit']");

  if (!photo || !people) {
    status.textContent = "Add at least one name.";
    return;
  }

  submitButton.disabled = true;
  status.textContent = "Saving names...";

  try {
    const response = await fetch("/api/photos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: photo.id, people }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      throw new Error(result.error || `Update returned ${response.status}`);
    }

    galleryPhotos[activeGalleryIndex] = { ...photo, people: result.item.people, alt: result.item.alt };
    renderPhotoGallery(galleryPhotos, activeGalleryIndex);
  } catch (error) {
    console.warn("Could not update photo names", error);
    status.textContent = error.message || "Those names could not be saved. Please try again.";
    submitButton.disabled = false;
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-gallery-year-form]");

  if (!form || !photoGallery?.contains(form)) {
    return;
  }

  event.preventDefault();
  const photo = galleryPhotos[activeGalleryIndex];
  const approximateYear = form.elements.approximateYear.value.trim();
  const status = form.querySelector("[data-gallery-year-status]");
  const submitButton = form.querySelector("button[type='submit']");

  if (!photo || !approximateYear) {
    status.textContent = "Add the year or wording you want displayed.";
    return;
  }

  submitButton.disabled = true;
  status.textContent = "Saving year...";

  try {
    const response = await fetch("/api/photos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: photo.id, approximateYear }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      throw new Error(result.error || `Update returned ${response.status}`);
    }

    galleryPhotos[activeGalleryIndex] = {
      ...photo,
      approximateYear: result.item.approximateYear,
      alt: result.item.alt,
    };
    renderPhotoGallery(galleryPhotos, activeGalleryIndex);
  } catch (error) {
    console.warn("Could not update approximate photo year", error);
    status.textContent = error.message || "That year could not be saved. Please try again.";
    submitButton.disabled = false;
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

function familyTreePeopleById() {
  const people = new Map();
  const addPerson = (person) => {
    people.set(person.id, person);
    (person.children || []).forEach(addPerson);
  };

  addPerson(FAMILY_TREE_VIEWS.center.root);
  FAMILY_TREE_VIEWS.center.branches.forEach(addPerson);
  FAMILY_TREE_VIEWS.hudson.generations.forEach((generation) => generation.people.forEach(addPerson));
  FAMILY_TREE_VIEWS.hubbard.generations.forEach((generation) => generation.people.forEach(addPerson));
  return people;
}

const FAMILY_TREE_PEOPLE_BY_ID = familyTreePeopleById();
const BOTANICAL_TREE_NAME_OVERRIDES = {
  "harvey-ada": "Harvey & Ada Hudson",
  "sherman-beuna": "Sherman & Beuna Hubbard",
  "virgil-della": "Virgil Hudson & Della Hubbard",
  "robert-joe": "Robert",
};

function botanicalTreeName(id) {
  return BOTANICAL_TREE_NAME_OVERRIDES[id] || FAMILY_TREE_PEOPLE_BY_ID.get(id)?.name || "";
}

function botanicalTreeNode(node) {
  const name = botanicalTreeName(node.id);
  const width = node.couple
    ? Math.max(240, Math.min(390, 70 + name.length * 11))
    : node.compact
      ? Math.max(66, Math.min(105, 28 + name.length * 8.5))
      : Math.max(82, Math.min(144, 42 + name.length * 11));
  const height = node.couple ? 58 : node.compact ? 42 : 48;
  const x = node.x - width / 2;
  const y = node.y - height / 2;
  const classes = [
    "botanical-tree__name",
    node.featured ? "botanical-tree__name--featured" : "",
    node.couple ? "botanical-tree__name--couple" : "",
    node.compact ? "botanical-tree__name--compact" : "",
  ].filter(Boolean).join(" ");

  return `<g class="${classes}" data-tree-person="${escapeHtml(node.id)}">
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="2"></rect>
    <text x="${node.x}" y="${node.y + 1}" text-anchor="middle" dominant-baseline="middle">${escapeHtml(name)}</text>
  </g>`;
}

function botanicalTreeEdge(from, to) {
  const fromHeight = from.couple ? 58 : from.compact ? 42 : 48;
  const toHeight = to.couple ? 58 : to.compact ? 42 : 48;
  const startY = from.y - fromHeight / 2;
  const endY = to.y + toHeight / 2;
  const bendY = endY + (startY - endY) * 0.48;
  const isTrunk = from.id.includes("ada") || from.id.includes("beuna") || to.id === "virgil-della";

  return `<path class="botanical-tree__branch${isTrunk ? " botanical-tree__branch--trunk" : ""}" d="M ${from.x} ${startY} C ${from.x} ${bendY}, ${to.x} ${bendY}, ${to.x} ${endY}" vector-effect="non-scaling-stroke"></path>`;
}

function botanicalTreeSprig(x, y, rotation = 0, scale = 1) {
  return `<g class="botanical-tree__sprig" transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})">
    <path d="M -22 7 C -8 4, 6 -2, 24 -13"></path>
    <ellipse cx="-12" cy="2" rx="7" ry="3.2" transform="rotate(24 -12 2)"></ellipse>
    <ellipse cx="0" cy="-3" rx="7" ry="3.2" transform="rotate(-28 0 -3)"></ellipse>
    <ellipse cx="12" cy="-8" rx="7" ry="3.2" transform="rotate(22 12 -8)"></ellipse>
    <ellipse cx="21" cy="-14" rx="6" ry="3" transform="rotate(-26 21 -14)"></ellipse>
  </g>`;
}

function renderBotanicalFamilyTree() {
  if (!familyTreeBotanical) {
    return;
  }

  const nodes = new Map(BOTANICAL_TREE_NODES.map((node) => [node.id, node]));
  const edges = BOTANICAL_TREE_EDGES.map(([fromId, toId]) => botanicalTreeEdge(nodes.get(fromId), nodes.get(toId))).join("");
  const sprigs = [
    [700, 238, -68, 0.92], [940, 236, -62, 0.9], [1100, 236, -70, 0.9],
    [1220, 236, -66, 0.9], [700, 520, -56, 0.95], [1080, 520, -52, 0.95],
    [1480, 520, -58, 0.95], [2030, 520, -54, 0.95], [2400, 520, -58, 0.95],
    [1400, 758, -4, 1.12], [210, 1146, -64, 0.82], [510, 1146, -62, 0.82],
    [800, 1146, -66, 0.82], [1080, 1146, -64, 0.82], [1500, 1146, -62, 0.82],
    [1860, 1146, -66, 0.82], [2220, 1146, -64, 0.82], [2545, 1146, -62, 0.82],
    [2700, 1146, -66, 0.82], [720, 1400, 10, 1.08], [2200, 1400, -10, 1.08],
  ].map((sprig) => botanicalTreeSprig(...sprig)).join("");

  familyTreeBotanical.innerHTML = `<svg class="botanical-tree" viewBox="0 0 ${BOTANICAL_TREE_SIZE.width} ${BOTANICAL_TREE_SIZE.height}" role="img" aria-labelledby="botanical-tree-title botanical-tree-description" preserveAspectRatio="xMidYMin meet">
    <title id="botanical-tree-title">Hudson and Hubbard family tree</title>
    <desc id="botanical-tree-description">A botanical family tree connecting the Hudson and Hubbard ancestors to Virgil and Della and their descendants.</desc>
    <path class="botanical-tree__root-line" d="M 120 1580 C 650 1535, 1040 1550, 1400 1610 C 1760 1550, 2220 1535, 2680 1580" vector-effect="non-scaling-stroke"></path>
    <g aria-hidden="true">${edges}${sprigs}</g>
    <g>${BOTANICAL_TREE_NODES.map(botanicalTreeNode).join("")}</g>
  </svg>`;
}

let familyTreeViewerTrigger = null;
let familyTreeViewerZoom = 1;

function applyFamilyTreeViewerZoom(viewer, fit = false) {
  const stage = viewer?.querySelector(".family-tree-viewer__stage");
  const svg = viewer?.querySelector(".botanical-tree");
  const output = viewer?.querySelector("[data-family-tree-zoom-output]");

  if (!stage || !svg || !output) {
    return;
  }

  if (fit) {
    const fitWidth = Math.min(
      Math.max(280, stage.clientWidth - 24),
      Math.max(280, (stage.clientHeight - 24) * (BOTANICAL_TREE_SIZE.width / BOTANICAL_TREE_SIZE.height)),
    );
    svg.style.width = `${Math.round(fitWidth)}px`;
    output.textContent = "Fit";
    return;
  }

  const stageWidth = Math.max(320, stage.clientWidth - 24);
  const readableWidth = Math.max(stageWidth, 1900);
  svg.style.width = `${Math.round(readableWidth * familyTreeViewerZoom)}px`;
  output.textContent = `${Math.round(familyTreeViewerZoom * 100)}%`;
}

function closeFamilyTreeViewer() {
  const viewer = document.querySelector("[data-family-tree-viewer]");

  if (!viewer) {
    return;
  }

  viewer.remove();
  document.body.classList.remove("has-family-tree-viewer");
  familyTreeViewerTrigger?.focus();
  familyTreeViewerTrigger = null;
}

function openFamilyTreeViewer(trigger) {
  const sourceTree = familyTreeBotanical?.querySelector(".botanical-tree");

  if (!sourceTree || document.querySelector("[data-family-tree-viewer]")) {
    return;
  }

  familyTreeViewerTrigger = trigger || familyTreeBotanical;
  familyTreeViewerZoom = 1;

  const viewer = document.createElement("div");
  viewer.className = "family-tree-viewer";
  viewer.dataset.familyTreeViewer = "true";
  viewer.setAttribute("role", "dialog");
  viewer.setAttribute("aria-modal", "true");
  viewer.setAttribute("aria-labelledby", "family-tree-viewer-title");
  viewer.innerHTML = `
    <header class="family-tree-viewer__toolbar">
      <h2 id="family-tree-viewer-title">Hudson &amp; Hubbard Family Tree</h2>
      <div class="family-tree-viewer__controls" aria-label="Family tree viewing controls">
        <button type="button" data-family-tree-zoom="out" aria-label="Zoom out">−</button>
        <button type="button" data-family-tree-fit>Fit</button>
        <span data-family-tree-zoom-output aria-live="polite">100%</span>
        <button type="button" data-family-tree-zoom="in" aria-label="Zoom in">+</button>
        <button type="button" class="family-tree-viewer__close" data-family-tree-close>Close</button>
      </div>
    </header>
    <div class="family-tree-viewer__stage" data-family-tree-viewer-stage></div>
  `;

  const expandedTree = sourceTree.cloneNode(true);
  expandedTree.removeAttribute("aria-labelledby");
  expandedTree.setAttribute("aria-label", "Complete Hudson and Hubbard family tree");
  expandedTree.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
  viewer.querySelector("[data-family-tree-viewer-stage]").append(expandedTree);
  document.body.append(viewer);
  document.body.classList.add("has-family-tree-viewer");

  window.requestAnimationFrame(() => {
    applyFamilyTreeViewerZoom(viewer);
    const stage = viewer.querySelector(".family-tree-viewer__stage");
    stage.scrollLeft = Math.max(0, (stage.scrollWidth - stage.clientWidth) / 2);
    viewer.querySelector("[data-family-tree-close]").focus();
  });
}

function setFamilyTreeMode(mode, focusSelected = false) {
  familyTreeModeButtons.forEach((button) => {
    const selected = button.dataset.familyTreeMode === mode;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected && focusSelected) {
      button.focus();
    }
  });

  familyTreeViews.forEach((view) => {
    view.hidden = view.dataset.familyTreeView !== mode;
  });

  if (mode === "tree" && familyTreeBotanical) {
    window.requestAnimationFrame(() => {
      familyTreeBotanical.scrollLeft = Math.max(0, (familyTreeBotanical.scrollWidth - familyTreeBotanical.clientWidth) / 2);
    });
  }
}

renderBotanicalFamilyTree();

familyTreeExpandButtons.forEach((button) => {
  button.addEventListener("click", () => openFamilyTreeViewer(button));
});

familyTreeBotanical?.addEventListener("click", () => openFamilyTreeViewer(familyTreeBotanical));
familyTreeBotanical?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openFamilyTreeViewer(familyTreeBotanical);
  }
});

document.addEventListener("click", (event) => {
  const viewer = event.target.closest("[data-family-tree-viewer]");

  if (!viewer) {
    return;
  }

  if (event.target.matches("[data-family-tree-viewer]") || event.target.closest("[data-family-tree-close]")) {
    closeFamilyTreeViewer();
    return;
  }

  if (event.target.closest("[data-family-tree-fit]")) {
    applyFamilyTreeViewerZoom(viewer, true);
    return;
  }

  const zoomButton = event.target.closest("[data-family-tree-zoom]");
  if (!zoomButton) {
    return;
  }

  const direction = zoomButton.dataset.familyTreeZoom === "in" ? 0.25 : -0.25;
  familyTreeViewerZoom = Math.min(2.5, Math.max(0.5, familyTreeViewerZoom + direction));
  applyFamilyTreeViewerZoom(viewer);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.querySelector("[data-family-tree-viewer]")) {
    closeFamilyTreeViewer();
  }
});

familyTreeModeButtons.forEach((button, index) => {
  button.addEventListener("click", () => setFamilyTreeMode(button.dataset.familyTreeMode));
  button.addEventListener("keydown", (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextButton = familyTreeModeButtons[(index + direction + familyTreeModeButtons.length) % familyTreeModeButtons.length];
    setFamilyTreeMode(nextButton.dataset.familyTreeMode, true);
  });
});

const requestedFamilyTreeMode = new URLSearchParams(window.location.search).get("family-tree");
setFamilyTreeMode(requestedFamilyTreeMode === "tree" ? "tree" : "guide");

if (window.location.hash === "#family-tree") {
  window.setTimeout(() => document.querySelector("#family-tree")?.scrollIntoView({ block: "start" }), 100);
}

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
