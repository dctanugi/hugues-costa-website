document.addEventListener("DOMContentLoaded", function () {
  const grid = document.querySelector(".masonry-grid");
  if (!grid) return;

  var items = grid.querySelectorAll(".masonry-item");
  var columns = getColumnCount();

  function getColumnCount() {
    return window.innerWidth >= 768 ? 3 : 2;
  }

  function layout() {
    var cols = getColumnCount();
    var columnHeights = new Array(cols).fill(0);
    var gap = 6;
    var gridWidth = grid.clientWidth;
    var colWidth = (gridWidth - gap * (cols - 1)) / cols;

    grid.style.position = "relative";

    items.forEach(function (item) {
      var shortest = 0;
      for (var i = 1; i < cols; i++) {
        if (columnHeights[i] < columnHeights[shortest]) {
          shortest = i;
        }
      }

      var img = item.querySelector("img");
      var aspectRatio = img.naturalHeight / img.naturalWidth;
      if (!aspectRatio || !isFinite(aspectRatio)) {
        aspectRatio = 0.75;
      }
      var itemHeight = colWidth * aspectRatio;

      item.style.position = "absolute";
      item.style.width = colWidth + "px";
      item.style.left = shortest * (colWidth + gap) + "px";
      item.style.top = columnHeights[shortest] + "px";

      columnHeights[shortest] += itemHeight + gap;
    });

    var maxHeight = Math.max.apply(null, columnHeights);
    grid.style.height = maxHeight + "px";
  }

  // Track loaded images and relayout after each one
  var loadedCount = 0;
  var totalImages = items.length;

  items.forEach(function (item) {
    var img = item.querySelector("img");
    if (!img) return;

    if (img.complete && img.naturalWidth > 0) {
      loadedCount++;
      if (loadedCount >= totalImages) {
        layout();
      }
    }

    img.addEventListener("load", function () {
      loadedCount++;
      // Relayout after each image loads so masonry adjusts to real dimensions
      layout();
    });
  });

  // Initial layout
  layout();

  // Relayout on resize
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 150);
  });
});
