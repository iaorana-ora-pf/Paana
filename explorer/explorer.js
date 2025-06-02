let events = {};
let currentEvents = [];
let currentIndex = -1;

// 🧠 Cartes automatiques pour les icônes et les couleurs
const categoryIcons = new Map();
const subjectColors = new Map();

// Liste d'icônes FontAwesome disponibles (tu peux en ajouter)
const availableIcons = [
  "fa-landmark", "fa-shield-alt", "fa-lightbulb", "fa-database", 
  "fa-leaf", "fa-heart-pulse", "fa-globe", "fa-users", "fa-scale-balanced"
];
let iconIndex = 0;

// Génère une couleur vive et lisible automatiquement
function generateColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 60%, 60%)`;
}

// Attribue une icône à une nouvelle catégorie
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

// Attribue une couleur à un nouveau thème (sujet)
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
        
        // Ajoute une copie de l’événement
        expanded[yStr].push({ ...event });
      }
    });
  }

  return expanded;
}

function toggleDropdown(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === "block" ? "none" : "block";
}

function resetFilters() {
  document.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false);
  document.getElementById("searchInput").value = "";
  updateTimeline();
  updateActiveFilterBadges(); // ✅ important ici
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

function updateActiveFilterBadges() {
  const filters = getFilters();
  const activeFiltersDiv = document.getElementById("active-filters");
  const section = document.getElementById("active-filters-section");
  activeFiltersDiv.innerHTML = "";

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
    activeFiltersDiv.appendChild(badge);
  });

  document.querySelectorAll(".remove-badge").forEach(span => {
    span.addEventListener("click", () => {
      const type = span.dataset.type;
      const value = span.dataset.value;
      const selector = `.${type}-filter[value="${value}"]`;
      const checkbox = document.querySelector(selector);
      if (checkbox) {
        checkbox.checked = false;
        updateTimeline();
        updateDependentFilters();
        updateActiveFilterBadges();
      }
    });
  });
}

function updateTimeline() {
  const container = document.getElementById("timeline");
  container.innerHTML = ""; // ✅ vide la frise avant de regénérer
  const filters = getFilters();


  for (const year in events) {
    const filtered = events[year].filter(e =>
      (!filters.categories.length || filters.categories.includes(e.category)) &&
      (!filters.subjects.length || filters.subjects.includes(e.subject)) &&
      (!filters.keywords.length || filters.keywords.some(k => e.keywords.includes(k))) &&
      (!filters.search || (
        e.name.toLowerCase().includes(filters.search) ||
        e.category.toLowerCase().includes(filters.search) ||
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

      const iconClass = getIconForCategory(ev.category);
      const color = getColorForSubject(ev.subject);
      const isMultiYear = ev.start && ev.end && ev.start !== ev.end;

      return `
        <li data-uid="${ev.name}-${year}" onclick='showDetails(window["${id}"], "${year}")'>
          <i class="fas ${iconClass}" style="margin-right:6px; color:#007b7f;" title="${ev.category}"></i>
          <span class="color-box" style="background:${color}" title="${ev.subject}"></span> 
           <span>${ev.name}</span>
           ${isMultiYear ? `<span class="multi-year-badge">Pluriannuel</span>` : ""}
        </div>`;
    }).join("")}
  </div>
`;

      
      container.appendChild(block);
    }
  }
   updateDependentFilters();
  updateActiveFilterBadges(); // ✅ ici aussi
  }

function showDetails(ev, year) {
  currentEvents = collectFilteredEvents();
  currentIndex = currentEvents.findIndex(e => e.name === ev.name);
  updateDetails(ev, year);
}

function updateDetails(ev, year) {
  const detailContainer = document.getElementById("detail-title");
  detailContainer.innerText = ev.name;

  // Supprime la surbrillance de tous les événements
  document.querySelectorAll(".year-block li").forEach(li => {
    li.classList.remove("selected-event");
  });

  // Ajoute la surbrillance à celui qui est sélectionné
  const selectedLi = document.querySelector(`li[data-uid="${ev.name}-${year}"]`);
  if (selectedLi) selectedLi.classList.add("selected-event");
}

function navigateEvent(direction) {
  if (currentEvents.length === 0 || currentIndex === -1) return;
  currentIndex = (currentIndex + direction + currentEvents.length) % currentEvents.length;
  const next = currentEvents[currentIndex];
  updateDetails(next, Object.keys(events).find(year => events[year].some(e => e.name === next.name)));
}

function collectFilteredEvents() {
  const filters = getFilters();
  return Object.entries(events).flatMap(([year, list]) =>
    list.filter(e =>
      (!filters.categories.length || filters.categories.includes(e.category)) &&
      (!filters.subjects.length || filters.subjects.includes(e.subject)) &&
      (!filters.keywords.length || filters.keywords.some(k => e.keywords.includes(k))) &&
      (!filters.search || (
        e.name.toLowerCase().includes(filters.search) ||
        e.category.toLowerCase().includes(filters.search) ||
        e.subject.toLowerCase().includes(filters.search) ||
        e.keywords.some(k => k.toLowerCase().includes(filters.search))
      ))
    )
  );
}

function initDropdowns() {
  const subjects = new Set();
  const keywords = new Set();
  const categories = new Set();

  Object.values(events).flat().forEach(e => {
    subjects.add(e.subject);
    e.keywords.forEach(k => keywords.add(k));
    categories.add(e.category);
  });

document.getElementById("subjectDropdown").innerHTML =
    Array.from(subjects).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })).map(s => `
      <label><input type="checkbox" class="subject-filter" value="${s}" onchange="updateTimeline(); updateDependentFilters(); updateActiveFilterBadges()"> ${s}</label><br>
    `).join("");

  document.getElementById("keywordDropdown").innerHTML =
    Array.from(keywords).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })).map(k => `
      <label><input type="checkbox" class="keyword-filter" value="${k}" onchange="updateTimeline(); updateDependentFilters(); updateActiveFilterBadges()"> ${k}</label><br>
    `).join("");

  document.getElementById("categoryDropdown").innerHTML =
    Array.from(categories).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })).map(c => `
      <label><input type="checkbox" class="category-filter" value="${c}" onchange="updateTimeline(); updateDependentFilters(); updateActiveFilterBadges()"> ${c}</label><br>
    `).join("");

}

function updateDependentFilters() {
  const checkedCategories = Array.from(document.querySelectorAll(".category-filter:checked")).map(cb => cb.value);
  const checkedKeywords = Array.from(document.querySelectorAll(".keyword-filter:checked")).map(cb => cb.value);
  const checkedSubjects = Array.from(document.querySelectorAll(".subject-filter:checked")).map(cb => cb.value);

  const visibleSubjects = new Set();
  const visibleKeywords = new Set();
  const visibleCategories = new Set();

  const noFilter = checkedCategories.length === 0 && checkedKeywords.length === 0 && checkedSubjects.length === 0;

  // Si aucun filtre sélectionné, on reset toutes les couleurs à noir
  if (noFilter) {
    document.querySelectorAll(".category-filter, .subject-filter, .keyword-filter").forEach(cb => {
      cb.parentElement.style.color = "black";
    });
    return;
  }

  // Parcours des événements pour récupérer les éléments liés aux filtres actifs
  Object.values(events).flat().forEach(event => {
    const matchCategory = checkedCategories.length === 0 || checkedCategories.includes(event.category);
    const matchKeyword = checkedKeywords.length === 0 || event.keywords.some(k => checkedKeywords.includes(k));
    const matchSubject = checkedSubjects.length === 0 || checkedSubjects.includes(event.subject);

    if (matchCategory && matchKeyword && matchSubject) {
      visibleSubjects.add(event.subject);
      event.keywords.forEach(k => visibleKeywords.add(k));
      visibleCategories.add(event.category);
    }
  });

  // Mise à jour des couleurs des filtres (noirs si pertinents, gris sinon)
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





