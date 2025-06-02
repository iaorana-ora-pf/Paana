
let events = {};
let currentEvents = [];
let currentIndex = -1;

const categoryIcons = new Map();
const subjectColors = new Map();

const availableIcons = [
  "fa-landmark", "fa-shield-alt", "fa-lightbulb", "fa-database", 
  "fa-leaf", "fa-heart-pulse", "fa-globe", "fa-users", "fa-scale-balanced"
];
let iconIndex = 0;

function generateColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 60%, 60%)`;
}

function getIconForCategory(cat) {
  if (categoryIcons.has(cat)) return categoryIcons.get(cat);
  const stored = localStorage.getItem("icon-" + cat);
  if (stored) {
    categoryIcons.set(cat, stored);
    return stored;
  }
  const icon = availableIcons[iconIndex % availableIcons.length];
  iconIndex++;
  categoryIcons.set(cat, icon);
  localStorage.setItem("icon-" + cat, icon);
  return icon;
}

function getColorForSubject(subject) {
  if (subjectColors.has(subject)) return subjectColors.get(subject);
  const stored = localStorage.getItem("color-" + subject);
  if (stored) {
    subjectColors.set(subject, stored);
    return stored;
  }
  const color = generateColor();
  subjectColors.set(subject, color);
  localStorage.setItem("color-" + subject, color);
  return color;
}

fetch('./explorer.json')
  .then(response => response.json())
  .then(data => {
    events = expandMultiYearEvents(data);
    initDropdowns();
    updateTimeline();
    document.getElementById("event-details-container").innerHTML = `
      <p style="text-align: center; font-style: italic; color: #555;">
        Cliquez sur un événement pour accéder à sa fiche détaillée.
      </p>
    `;
  })
  .catch(error => {
    console.error("Erreur lors du chargement des événements :", error);
  });

function expandMultiYearEvents(data) {
  const expanded = {};
  for (const year in data) {
    data[year].forEach(event => {
      const start = parseInt(event.start || year);
      const end = parseInt(event.end || year);
      for (let y = start; y <= end; y++) {
        const yStr = y.toString();
        if (!expanded[yStr]) expanded[yStr] = [];
        expanded[yStr].push({ ...event });
      }
    });
  }
  return expanded;
}

function updateTimeline() {
  const container = document.getElementById("timeline");
  container.innerHTML = "";
  const filters = getFilters();

  for (const year in events) {
    const filtered = events[year].filter(e =>
      (!filters.categories.length || (
        Array.isArray(e.category)
          ? e.category.some(cat => filters.categories.includes(cat))
          : filters.categories.includes(e.category)
      )) &&
      (!filters.subjects.length || filters.subjects.includes(e.subject)) &&
      (!filters.keywords.length || filters.keywords.some(k => e.keywords.includes(k))) &&
      (!filters.search || (
        e.name.toLowerCase().includes(filters.search) ||
        (Array.isArray(e.category)
          ? e.category.join(", ").toLowerCase()
          : e.category.toLowerCase()
        ).includes(filters.search) ||
        e.subject.toLowerCase().includes(filters.search) ||
        e.keywords.some(k => k.toLowerCase().includes(filters.search))
      ))
    );

    if (filtered.length) {
      const eventsHTML = filtered.map((ev, i) => {
        const id = `event-${year}-${i}`;
        window[id] = ev;
        const categoryIconsHTML = (Array.isArray(ev.category) ? ev.category : [ev.category])
          .map(cat => `<i class="fas ${getIconForCategory(cat)}" title="${cat}" style="margin-right:4px; color:#007b7f;"></i>`)
          .join("");
        const color = getColorForSubject(ev.subject);
        const isMultiYear = ev.start && ev.end && ev.start !== ev.end;
        return `
          <li data-uid="${ev.name}-${year}" onclick='showDetails(window["${id}"], "${year}")'>
            ${categoryIconsHTML}
            <span class="color-box" style="background:${color}" title="${ev.subject}"></span> 
            <span>${ev.name}</span>
            ${isMultiYear ? `<span class="multi-year-badge">Pluriannuel</span>` : ""}
          </li>`;
      }).join("");

      const block = document.createElement("div");
      block.className = "year-block";
      block.innerHTML = `
        <h3>${year}</h3>
        <div class="event-grid">
          ${eventsHTML}
        </div>
      `;
      container.appendChild(block);
    }
  }
  updateDependentFilters();
  updateActiveFilterBadges();
}
