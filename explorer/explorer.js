// === explorer.js complet, version propre avec catégories fixes ===

let events = {};
let currentEvents = [];
let currentIndex = -1;

// Énumération de catégories fixes avec icônes
const fixedCategories = [
  "Gouvernance et pilotage stratégique",
  "Données, surveillance et recherche",
  "Promotion de la santé et prévention",
  "Protection sanitaire et gestion des risques",
  "Accès aux services et aux moyens",
  "Contexte"
];

const fixedCategoryIcons = {
  "Gouvernance et pilotage stratégique": "fa-scale-balanced",
  "Données, surveillance et recherche": "fa-database",
  "Promotion de la santé et prévention": "fa-heart-pulse",
  "Protection sanitaire et gestion des risques": "fa-shield-alt",
  "Accès aux services et aux moyens": "fa-hospital",
  "Contexte": "fa-landmark"
};

const subjectColors = new Map();

function getIconForCategory(cat) {
  return fixedCategoryIcons[cat] || "fa-circle";
}

function generateColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 60%, 60%)`;
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
    document.getElementById("event-details-container").innerHTML = `<p style="text-align:center;font-style:italic;color:#555;">Cliquez sur un événement pour accéder à sa fiche détaillée.</p>`;
  })
  .catch(error => console.error("Erreur de chargement :", error));

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
      (!filters.categories.length || (Array.isArray(e.category) ? e.category.some(cat => filters.categories.includes(cat)) : filters.categories.includes(e.category))) &&
      (!filters.subjects.length || filters.subjects.includes(e.subject)) &&
      (!filters.keywords.length || filters.keywords.some(k => e.keywords.includes(k))) &&
      (!filters.search || (
        e.name.toLowerCase().includes(filters.search) ||
        (Array.isArray(e.category) ? e.category.join(", ").toLowerCase() : e.category.toLowerCase()).includes(filters.search) ||
        e.subject.toLowerCase().includes(filters.search) ||
        e.keywords.some(k => k.toLowerCase().includes(filters.search))
      ))
    );

    if (filtered.length) {
      const block = document.createElement("div");
      block.className = "year-block";
      block.innerHTML = `
        <h3>${year}</h3>
        <div class="event-grid">
          ${filtered.map((ev, i) => {
            const id = `event-${year}-${i}`;
            window[id] = ev;
            const icons = (Array.isArray(ev.category) ? ev.category : [ev.category])
              .map(cat => `<i class="fas ${getIconForCategory(cat)}" title="${cat}" style="margin-right:4px; color:#007b7f;"></i>`)
              .join("");
            const color = getColorForSubject(ev.subject);
            const isMulti = ev.start && ev.end && ev.start !== ev.end;
            const isContext = (Array.isArray(ev.category) ? ev.category.includes("Contexte") : ev.category === "Contexte");
            return `<li class="${isContext ? "context-bg" : ""}" onclick='showDetails(window["${id}"], "${year}")'>${icons}<span class="color-box" style="background:${color}; margin-right:6px;"></span>${ev.name}${isMulti ? `<span class="multi-year-badge">Pluriannuel</span>` : ""}</li>`;
          }).join("")}
        </div>
      `;
      container.appendChild(block);
    }
  }
}

function showDetails(ev, year) {
  currentEvents = collectFilteredEvents();
  currentIndex = currentEvents.findIndex(e => e.name === ev.name);
  updateDetails(ev, year);
}

function updateDetails(ev, year) {
  const container = document.getElementById("event-details-container");
  if (!container) return;

  const isMulti = ev.start && ev.end && ev.start !== ev.end;
  const categoryHTML = (Array.isArray(ev.category) ? ev.category : [ev.category])
    .map(cat => `<li><i class="fas ${getIconForCategory(cat)}" style="margin-right:6px;"></i> ${cat}</li>`).join("");
  const subjectColor = getColorForSubject(ev.subject);
  const keywordsHTML = (ev.keywords || []).map(k => `• ${k}`).join("<br>");
  const sources = (ev.sources || []).map(src => src.startsWith("http") ? `<a href="${src}" target="_blank">${src}</a>` : src).join("<br>");

  container.innerHTML = `
    <h2 style="color:#007b7f; font-size:1.8em;">${ev.name}</h2>
    <p><strong>${isMulti ? "Période" : "Année"} :</strong> ${isMulti ? `${ev.start} – ${ev.end}` : year}</p>
    <p><strong>Catégorie(s) :</strong></p><ul style="list-style:none; padding:0;">${categoryHTML}</ul>
    <p><strong>Sujet :</strong> ${ev.subject} <span class="color-box" style="background:${subjectColor}; margin-left:6px;"></span></p>
    <p><strong>Mots-clés :</strong><br>${keywordsHTML}</p>
    <p><strong>Description :</strong><br>${ev.description || "N/A"}</p>
    <p><strong>Sources :</strong><br>${sources || "N/A"}</p>
  `;
}

function getFilters() {
  const getChecked = cls => Array.from(document.querySelectorAll("." + cls + "-filter:checked")).map(e => e.value);
  return {
    categories: getChecked("category"),
    subjects: getChecked("subject"),
    keywords: getChecked("keyword"),
    search: document.getElementById("searchInput").value.toLowerCase()
  };
}

function initDropdowns() {
  const categories = fixedCategories;
  const subjects = new Set();
  const keywords = new Set();

  Object.values(events).flat().forEach(e => {
    subjects.add(e.subject);
    e.keywords.forEach(k => keywords.add(k));
  });

  document.getElementById("categoryDropdown").innerHTML = categories.map(c => {
    const icon = getIconForCategory(c);
    return `<label><input type="checkbox" class="category-filter" value="${c}" onchange="updateTimeline();"> <i class="fas ${icon}" style="margin-right:6px;"></i> ${c}</label><br>`;
  }).join("");

  document.getElementById("subjectDropdown").innerHTML = Array.from(subjects).sort().map(s => {
    const color = getColorForSubject(s);
    return `<label><input type="checkbox" class="subject-filter" value="${s}" onchange="updateTimeline();"><span class="color-box" style="background:${color}; margin-right:6px;"></span>${s}</label><br>`;
  }).join("");

  document.getElementById("keywordDropdown").innerHTML = Array.from(keywords).sort().map(k => {
    return `<label><input type="checkbox" class="keyword-filter" value="${k}" onchange="updateTimeline();"> ${k}</label><br>`;
  }).join("");
}

function collectFilteredEvents() {
  const filters = getFilters();
  return Object.entries(events).flatMap(([year, list]) =>
    list.filter(e =>
      (!filters.categories.length || (Array.isArray(e.category) ? e.category.some(cat => filters.categories.includes(cat)) : filters.categories.includes(e.category))) &&
      (!filters.subjects.length || filters.subjects.includes(e.subject)) &&
      (!filters.keywords.length || filters.keywords.some(k => e.keywords.includes(k))) &&
      (!filters.search || (
        e.name.toLowerCase().includes(filters.search) ||
        (Array.isArray(e.category) ? e.category.join(", ").toLowerCase() : e.category.toLowerCase()).includes(filters.search) ||
        e.subject.toLowerCase().includes(filters.search) ||
        e.keywords.some(k => k.toLowerCase().includes(filters.search))
      ))
    )
  );
}

function navigateEvent(direction) {
  if (currentEvents.length === 0 || currentIndex === -1) return;
  currentIndex = (currentIndex + direction + currentEvents.length) % currentEvents.length;
  const next = currentEvents[currentIndex];
  updateDetails(next, Object.keys(events).find(year => events[year].some(e => e.name === next.name)));
}
