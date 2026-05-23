const panels = Array.from(document.querySelectorAll("[data-panel-view]"));
const panelButtons = Array.from(document.querySelectorAll("[data-panel]"));
const RSVP_ENDPOINT = "";

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
const originMapLines = document.querySelector("#origin-map-lines");
const originMapEmpty = document.querySelector("#origin-map-empty");

function setFormStatus(message) {
  if (formStatus) {
    formStatus.textContent = message;
  }
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
      const city = entry.city ? ` from ${entry.city}` : "";
      return `<li><span>${entry.name}${city}</span><strong>${miles} mi</strong></li>`;
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
      return `<li><span>${displayName}</span><strong>${feet}' ${inches}\"</strong></li>`;
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

  if (!birthdayEntries.length) {
    birthdayCalendar.innerHTML = "<article><h4>July</h4><p>Birthdays appear here as people play along.</p></article>";
    return;
  }

  const grouped = birthdayEntries.reduce((acc, entry) => {
    acc[entry.birthMonth] ||= [];
    acc[entry.birthMonth].push(entry);
    return acc;
  }, {});

  birthdayCalendar.innerHTML = months
    .filter((month) => grouped[month])
    .map((month) => {
      const people = grouped[month]
        .map((entry) => {
          const displayName = entry.nickname || entry.name;
          return `<li><strong>${entry.birthDay}</strong><span>${displayName}</span></li>`;
        })
        .join("");
      return `<article><h4>${month}</h4><ul>${people}</ul></article>`;
    })
    .join("");
}

function projectOrigin(lat, lng) {
  const minLng = -125;
  const maxLng = -66;
  const minLat = 24;
  const maxLat = 50;
  const left = Math.max(4, Math.min(94, ((lng - minLng) / (maxLng - minLng)) * 100));
  const top = Math.max(6, Math.min(88, (1 - (lat - minLat) / (maxLat - minLat)) * 100));
  return { left, top };
}

function renderOriginMap(entries = []) {
  if (!originMap || !originMapLines) {
    return;
  }

  originMap.querySelectorAll(".origin-map__pin--guest").forEach((pin) => pin.remove());
  originMapLines.innerHTML = "";

  const origins = entries
    .filter((entry) => entry.name && Number.isFinite(Number(entry.originLat)) && Number.isFinite(Number(entry.originLng)))
    .slice(0, 24);

  if (originMapEmpty) {
    originMapEmpty.hidden = Boolean(origins.length);
  }

  origins.forEach((entry) => {
    const position = projectOrigin(Number(entry.originLat), Number(entry.originLng));
    const displayName = entry.nickname || entry.name;
    const city = entry.city || "Somewhere fun";

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", position.left);
    line.setAttribute("y1", position.top);
    line.setAttribute("x2", 57);
    line.setAttribute("y2", 44);
    originMapLines.append(line);

    const pin = document.createElement("button");
    pin.className = "origin-map__pin origin-map__pin--guest";
    pin.type = "button";
    pin.style.left = `${position.left}%`;
    pin.style.top = `${position.top}%`;
    pin.innerHTML = `<span>${displayName}</span>`;
    pin.setAttribute("aria-label", `${displayName} traveling from ${city}`);
    pin.addEventListener("click", () => {
      originMap.querySelectorAll(".origin-map__pin--guest").forEach((otherPin) => {
        otherPin.classList.toggle("is-open", otherPin === pin);
      });
    });
    originMap.append(pin);
  });
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
    const response = await fetch(`${RSVP_ENDPOINT}?action=leaderboard`);
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
      setFormStatus("Form is designed and ready. Paste the Google Apps Script web app URL into RSVP_ENDPOINT in app.js to send this to the Sheet.");
      return;
    }

    submitButton.disabled = true;
    setFormStatus("Sending you to the starting line...");

    try {
      const response = await fetch(RSVP_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Unable to save RSVP.");
      }

      travelForm.reset();
      setFormStatus(`You're in. ${Math.round(data.entry.miles).toLocaleString()} miles on the board.`);
      await loadLeaderboard();
    } catch (error) {
      setFormStatus("Could not save that yet. Check the Sheet connection and try again.");
    } finally {
      submitButton.disabled = false;
    }
  });
}

loadLeaderboard();
