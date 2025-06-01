let events = {};
let currentEvents = [];
let currentIndex = -1;

fetch('./explorer.json')
  .then(response => response.json())
  .then(data => {
    events = data;
    initDropdowns();
    updateTimeline();
  })
  .catch(error => {
    console.error("Erreur lors du chargement des événements :", error);
  });

function toggleDropdown(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === "block" ? "none" : "block";
}

function resetFilters() {
  document.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false);
  document.getElementById("searchInput").value = "";
  updateTimeline();
  renderActiveFilters();
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
      block.innerHTML = "<h3>" + year + "</h3><ul>" + 
        filtered.map(ev => {
          return `<li onclick='showDetails(${JSON.stringify(ev)}, ${year})'>
                    <span class="color-box" style="background:#ccc"></span> ${ev.name}
                  </li>`;
        }).join("") + "</ul>";
      container.appendChild(block);
    }
  }
   updateDependentFilters();
  renderActiveFilters();
}

function showDetails(ev, year) {
  currentEvents = collectFilteredEvents();
  currentIndex = currentEvents.findIndex(e => e.name === ev.name);
  updateDetails(ev, year);
}

function updateDetails(ev, year) {
  document.getElementById("detail-title").innerText = ev.name;
  document.getElementById("detail-year").innerText = year;
  document.getElementById("detail-category").innerText = ev.category;
  document.getElementById("detail-subject").innerText = ev.subject;
  document.getElementById("detail-keywords").innerText = ev.keywords.join(", ");
  document.getElementById("detail-description").innerText = ev.description;
  document.getElementById("detail-sources").innerText = ev.sources ? ev.sources.join(", ") : "N/A";
  document.getElementById("detail-files").innerText = ev.files ? ev.files.join(", ") : "N/A";
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
    Array.from(subjects).sort().map(s => `
      <label><input type="checkbox" class="subject-filter" value="${s}" onchange="updateTimeline(); renderActiveFilters(); updateDependentFilters()"> ${s}</label><br>
    `).join("");

  document.getElementById("keywordDropdown").innerHTML =
    Array.from(keywords).sort().map(k => `
      <label><input type="checkbox" class="keyword-filter" value="${k}" onchange="updateTimeline(); renderActiveFilters(); updateDependentFilters()"> ${k}</label><br>
    `).join("");

  document.getElementById("categoryDropdown").innerHTML =
    Array.from(categories).sort().map(c => `
      <label><input type="checkbox" class="category-filter" value="${c}" onchange="updateTimeline(); renderActiveFilters(); updateDependentFilters()"> ${c}</label><br>
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

function updateActiveBadges() {
  const container = document.getElementById("activeFilters");
  container.innerHTML = "";
  const filters = getFilters();

  const createBadge = (label, type) => {
    const badge = document.createElement("div");
    badge.className = "filter-badge";
    badge.innerText = label;
    const btn = document.createElement("button");
    btn.innerText = "✖";
    btn.onclick = () => {
      // Décoche la case liée
      const selector = `.${type}-filter[value="${label}"]`;
      const checkbox = document.querySelector(selector);
      if (checkbox) checkbox.checked = false;
      updateTimeline(); // recharge frise
      updateDependentFilters(); // recharge filtres
    };
    badge.appendChild(btn);
    return badge;
  };

  filters.categories.forEach(cat => container.appendChild(createBadge(cat, "category")));
  filters.subjects.forEach(sub => container.appendChild(createBadge(sub, "subject")));
  filters.keywords.forEach(kw => container.appendChild(createBadge(kw, "keyword")));
}

function renderActiveFilters() {
  const filters = getFilters();
  const container = document.getElementById("activeFilters");
  container.innerHTML = ""; // Réinitialise les badges

  const makeBadge = (label, value) =>
    `<span class="filter-badge">${label} : ${value}</span>`;

  const badges = [];

  filters.categories.forEach(val => badges.push(makeBadge("Catégorie", val)));
  filters.subjects.forEach(val => badges.push(makeBadge("Sujet", val)));
  filters.keywords.forEach(val => badges.push(makeBadge("Mot-clé", val)));
  if (filters.search) {
    badges.push(makeBadge("Recherche", filters.search));
  }

  container.innerHTML = badges.join(" ");
}
