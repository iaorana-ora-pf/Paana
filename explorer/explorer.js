let events = {};

fetch("explorer.json")
  .then(response => response.json())
  .then(data => {
    events = data;
    initDropdowns();
    updateTimeline();
  });

// Remainder of the script omitted for brevity.

