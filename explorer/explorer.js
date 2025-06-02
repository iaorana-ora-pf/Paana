// === Fichier JavaScript complet avec catégories fixes et gestion du filtre ===

let events = {};
let currentEvents = [];
let currentIndex = -1;

// Catégories fixes avec icônes associées
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

function generateColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 60%, 60%)`;
}

function getIconForCategory(cat) {
  return fixedCategoryIcons[cat] || "fa-circle";
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
  .then(r => r.json())
  .then(data => {
    events = expandMultiYearEvents(data);
    initDropdowns();
    updateTimeline();
    document.getElementById("event-details-container").innerHTML = `<p style="text-align:center; font-style:italic; color:#555;">Cliquez sur un événement pour accéder à sa fiche détaillée.</p>`;
  })
  .catch(err => console.error("Erreur de chargement :", err));

function expandMultiYearEvents(data) {
  const expanded = {};
  for (const year in data) {
    data[year].forEach(ev => {
      const start = parseInt(ev.start || year);
      const end = parseInt(ev.end || year);
      for (let y = start; y <= end; y++) {
        const yStr = y.toString();
        if (!expanded[yStr].some(e => e.name === event.name)) {
  expanded[yStr].push({ ...event });
}
    });
  }
  return expanded;
}

function getFilters() {
  const getChecked = cls => [...document.querySelectorAll('.' + cls + '-filter:checked')].map(e => e.value);
  return {
    categories: getChecked("category"),
    subjects: getChecked("subject"),
    keywords: getChecked("keyword"),
    search: document.getElementById("searchInput").value.toLowerCase()
  };
}

function updateTimeline() {
  const container = document.getElementById("timeline");
  container.innerHTML = "";
  const filters = getFilters();

  for (const year in events) {
    const filtered = events[year].filter(e =>
      (!filters.categories.length || (Array.isArray(e.category) ? e.category.some(c => filters.categories.includes(c)) : filters.categories.includes(e.category))) &&
      (!filters.subjects.length || filters.subjects.includes(e.subject)) &&
      (!filters.keywords.length || filters.keywords.some(k => e.keywords.includes(k))) &&
      (!filters.search || (
        e.name.toLowerCase().includes(filters.search) ||
        (Array.isArray(e.category) ? e.category.join(',').toLowerCase() : e.category.toLowerCase()).includes(filters.search) ||
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
            const isMulti = ev.start && ev.end && ev.start !== ev.end;
            const isContext = Array.isArray(ev.category) ? ev.category.includes("Contexte") : ev.category === "Contexte";
            const contextClass = isContext ? "context-event" : "";
            const iconHTML = (Array.isArray(ev.category) ? ev.category : [ev.category])
              .map(cat => `<i class="fas ${getIconForCategory(cat)}" title="${cat}" style="margin-right:4px;color:#007b7f"></i>`).join("");
            const color = getColorForSubject(ev.subject);
            return `<li class="${contextClass}" data-uid="${ev.name}-${year}" onclick='showDetails(window["${id}"], "${year}")'>${iconHTML}<span class="color-box" style="background:${color}" title="${ev.subject}"></span> <span>${ev.name}</span>${isMulti ? `<span class="multi-year-badge">Pluriannuel</span>` : ""}</li>`;
          }).join("")}
        </div>`;
      container.appendChild(block);
    }
  }
  updateDependentFilters();
  updateActiveFilterBadges();
}

function updateDependentFilters() {
  const filters = getFilters();
  const visibleSubjects = new Set();
  const visibleKeywords = new Set();
  const visibleCategories = new Set();

  Object.values(events).flat().forEach(ev => {
    const matchCat = !filters.categories.length || (Array.isArray(ev.category) ? ev.category.some(cat => filters.categories.includes(cat)) : filters.categories.includes(ev.category));
    const matchSub = !filters.subjects.length || filters.subjects.includes(ev.subject);
    const matchKey = !filters.keywords.length || ev.keywords.some(k => filters.keywords.includes(k));
    if (matchCat && matchSub && matchKey) {
      visibleSubjects.add(ev.subject);
      ev.keywords.forEach(k => visibleKeywords.add(k));
      (Array.isArray(ev.category) ? ev.category : [ev.category]).forEach(cat => visibleCategories.add(cat));
    }
  });

  document.querySelectorAll(".subject-filter").forEach(cb => {
    cb.parentElement.style.color = visibleSubjects.has(cb.value) ? "black" : "#999";
  });
  document.querySelectorAll(".keyword-filter").forEach(cb => {
    cb.parentElement.style.color = visibleKeywords.has(cb.value) ? "black" : "#999";
  });
  document.querySelectorAll(".category-filter").forEach(cb => {
    cb.parentElement.style.color = visibleCategories.has(cb.value) ? "black" : "#999";
  });
}

function initDropdowns() {
  const subjects = new Set();
  const keywords = new Set();
  const categories = new Set();

  Object.values(events).flat().forEach(e => {
    subjects.add(e.subject);
    e.keywords.forEach(k => keywords.add(k));
    fixedCategories.forEach(cat => categories.add(cat));
  });

  document.getElementById("categoryDropdown").innerHTML =
    fixedCategories.map(c => {
    const iconClass = getIconForCategory(c);
    return `<label>
      <input type="checkbox" class="category-filter" value="${c}" onchange="updateTimeline(); updateDependentFilters(); updateActiveFilterBadges()">
      <i class="fas ${iconClass}" style="margin-right:6px;"></i> ${c}
    </label><br>`;
  }).join("");
}

function showDetails(ev, year) {
  currentEvents = collectFilteredEvents();
  currentIndex = currentEvents.findIndex(e => e.name === ev.name);
  const container = document.getElementById("event-details-container");
  const isMulti = ev.start && ev.end && ev.start !== ev.end;
  const subjectColor = getColorForSubject(ev.subject);
  const catList = (Array.isArray(ev.category) ? ev.category : [ev.category]).map(cat => `<li><i class="fas ${getIconForCategory(cat)}"></i> ${cat}</li>`).join("");
  const sourceList = (ev.sources || []).map(src => src.startsWith("http") ? `<a href="${src}" target="_blank">${src}</a>` : src).join("<br>");
  const keywordList = (ev.keywords || []).map(k => `• ${k}`).join("<br>");

  container.innerHTML = `
    <h2 style="color:#007b7f">${ev.name}</h2>
    <p><strong>${isMulti ? "Période" : "Année"} :</strong> ${isMulti ? `${ev.start} – ${ev.end}` : year}</p>
    <div><strong>Catégories :</strong><ul>${catList}</ul></div>
    <p><strong>Sujet :</strong> ${ev.subject} <span class="color-box" style="background:${subjectColor}"></span></p>
    <p><strong>Mots-clés :</strong><br>${keywordList}</p>
    <p><strong>Description :</strong><br>${ev.description || "N/A"}</p>
    <p><strong>Sources :</strong><br>${sourceList || "N/A"}</p>`;

  document.querySelectorAll(".year-block li").forEach(li => li.classList.remove("selected-event"));
  const selected = document.querySelector(`li[data-uid="${ev.name}-${year}"]`);
  if (selected) selected.classList.add("selected-event");
}

function navigateEvent(dir) {
  if (currentEvents.length === 0 || currentIndex === -1) return;
  currentIndex = (currentIndex + dir + currentEvents.length) % currentEvents.length;
  const next = currentEvents[currentIndex];
  updateDetails(next, Object.keys(events).find(year => events[year].some(e => e.name === next.name)));
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
        (Array.isArray(e.category) ? e.category.join(',').toLowerCase() : e.category.toLowerCase()).includes(filters.search) ||
        e.subject.toLowerCase().includes(filters.search) ||
        e.keywords.some(k => k.toLowerCase().includes(filters.search))
      ))
    )
  );
}

function updateActiveFilterBadges() {
  const filters = getFilters();
  const container = document.getElementById("active-filters");
  const section = document.getElementById("active-filters-section");
  container.innerHTML = "";
  const all = [
    ...filters.categories.map(c => ({ type: "category", value: c })),
    ...filters.subjects.map(s => ({ type: "subject", value: s })),
    ...filters.keywords.map(k => ({ type: "keyword", value: k }))
  ];
  if (all.length === 0) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";
  all.forEach(({ type, value }) => {
    const badge = document.createElement("span");
    badge.className = "filter-badge";
    badge.innerHTML = `${type === "category" ? "Catégorie" : type === "subject" ? "Sujet" : "Mot-clé"} : ${value} <span class="remove-badge" data-type="${type}" data-value="${value}">&times;</span>`;
    container.appendChild(badge);
  });
  document.querySelectorAll(".remove-badge").forEach(span => {
    span.addEventListener("click", () => {
      const type = span.dataset.type;
      const value = span.dataset.value;
      const selector = `.${type}-filter[value="${value}"]`;
      const cb = document.querySelector(selector);
      if (cb) {
        cb.checked = false;
        updateTimeline();
        updateDependentFilters();
        updateActiveFilterBadges();
      }
    });
  });
}

function resetFilters() {
  document.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false);
  document.getElementById("searchInput").value = "";
  updateTimeline();
  updateActiveFilterBadges();
}
