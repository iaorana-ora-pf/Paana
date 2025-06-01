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
    Array.from(subjects).sort().map(s => `<label><input type="checkbox" class="subject-filter" value="${s}" onchange="updateTimeline(); updateDependentFilters()">

  document.getElementById("keywordDropdown").innerHTML =
    Array.from(keywords).sort().map(k => `<label><input type="checkbox" class="keyword-filter" value="${k}" onchange="updateTimeline(); updateDependentFilters()">

  document.getElementById("categoryDropdown").innerHTML =
    Array.from(categories).sort().map(c => `<label><input type="checkbox" class="category-filter" value="${c}" onchange="updateTimeline(); updateDependentFilters()">
}


function updateDependentFilters() {
  const checkedCategories = Array.from(document.querySelectorAll(".category-filter:checked")).map(cb => cb.value);
  const allSubjects = new Set();
  const allKeywords = new Set();

  if (checkedCategories.length === 0) {
    // Si rien n'est coché, tout reste noir
    document.querySelectorAll(".subject-filter, .keyword-filter").forEach(el => el.style.color = "black");
    return;
  }

  Object.values(events).flat().forEach(event => {
    if (checkedCategories.includes(event.category)) {
      allSubjects.add(event.subject);
      event.keywords.forEach(k => allKeywords.add(k));
    }
  });

  document.querySelectorAll(".subject-filter").forEach(cb => {
    cb.parentElement.style.color = allSubjects.has(cb.value) ? "black" : "#999";
  });

  document.querySelectorAll(".keyword-filter").forEach(cb => {
    cb.parentElement.style.color = allKeywords.has(cb.value) ? "black" : "#999";
  });
}
