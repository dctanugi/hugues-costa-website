document.addEventListener("DOMContentLoaded", function () {
  const grid = document.querySelector(".masonry-grid");
  if (!grid) return;

  var items = grid.querySelectorAll(".masonry-item");
  var loadedImages = new Set();

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

  // Lazy loading with Intersection Observer
  var imageObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var img = entry.target;
          var picture = img.parentElement;

          // Load the image by setting srcset on sources
          var sources = picture.querySelectorAll("source");
          sources.forEach(function (source) {
            if (source.dataset.srcset) {
              source.srcset = source.dataset.srcset;
              source.removeAttribute("data-srcset");
            }
          });

          // Load the img element
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute("data-src");
          }

          img.addEventListener("load", function () {
            if (!loadedImages.has(img)) {
              loadedImages.add(img);
              layout();
            }
          });

          imageObserver.unobserve(img);
        }
      });
    },
    {
      rootMargin: "200px",
    }
  );

  // Setup lazy loading for images
  items.forEach(function (item) {
    var picture = item.querySelector("picture");
    var img = picture.querySelector("img");

    // Move srcset to data-srcset for lazy loading
    var sources = picture.querySelectorAll("source");
    sources.forEach(function (source) {
      source.dataset.srcset = source.srcset;
      source.removeAttribute("srcset");
    });

    // Move src to data-src
    img.dataset.src = img.src;
    img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E";

    imageObserver.observe(img);
  });

  // Initial layout
  layout();

  // Relayout on resize
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 150);
  });

  // PhotoSwipe lightbox setup
  if (window.PhotoSwipeLightbox) {
    // Build gallery data array
    var galleryData = [];

    items.forEach(function (item, index) {
      var picture = item.querySelector("picture");
      var img = picture.querySelector("img");
      var sources = picture.querySelectorAll("source");

      // Get width/height from img attributes (set by eleventy-img)
      var width = parseInt(img.getAttribute("width")) || 1200;
      var height = parseInt(img.getAttribute("height")) || 900;

      // Find the largest image URL
      var largestSrc = null;

      // Try webp source first
      var webpSource = Array.from(sources).find(function (s) {
        return s.type === "image/webp";
      });

      if (webpSource) {
        var srcset = webpSource.dataset.srcset || webpSource.srcset || "";

        if (srcset && srcset.length > 0) {
          var srcsetParts = srcset.split(",").map(function(s) { return s.trim(); });
          var lastSrcset = srcsetParts[srcsetParts.length - 1];

          // Extract URL and width descriptor (handles filenames with spaces)
          // Format: "/img/path/to/image-1200w.webp 1200w"
          var match = lastSrcset.match(/^(.+\.(?:webp|jpeg|jpg|png))\s+(\d+)w$/);
          if (match) {
            largestSrc = match[1];
            var srcsetWidth = parseInt(match[2]);
            var aspectRatio = height / width;
            width = srcsetWidth;
            height = Math.round(srcsetWidth * aspectRatio);
          } else {
            // Fallback to simple split if regex doesn't match
            largestSrc = lastSrcset.split(/\s+/)[0];
          }
        }
      }

      // Fallback to jpeg source
      if (!largestSrc) {
        var jpegSource = Array.from(sources).find(function (s) {
          return s.type === "image/jpeg";
        });
        if (jpegSource) {
          var srcset = jpegSource.dataset.srcset || jpegSource.srcset || "";

          if (srcset && srcset.length > 0) {
            var srcsetParts = srcset.split(",").map(function(s) { return s.trim(); });
            var lastSrcset = srcsetParts[srcsetParts.length - 1];

            // Extract URL and width descriptor (handles filenames with spaces)
            var match = lastSrcset.match(/^(.+\.(?:webp|jpeg|jpg|png))\s+(\d+)w$/);
            if (match) {
              largestSrc = match[1];
            } else {
              largestSrc = lastSrcset.split(/\s+/)[0];
            }
          }
        }
      }

      // Final fallback
      if (!largestSrc) {
        largestSrc = img.dataset.src || img.src;
      }

      // URL-encode the src to handle spaces in filenames
      var encodedSrc = largestSrc ? largestSrc.replace(/ /g, '%20') : largestSrc;

      var itemData = {
        src: encodedSrc,
        width: width,
        height: height,
        alt: img.alt || ""
      };

      galleryData.push(itemData);

      // Make items clickable
      item.style.cursor = "pointer";
    });

    // Initialize PhotoSwipe lightbox
    const lightbox = new window.PhotoSwipeLightbox({
      pswpModule: window.PhotoSwipe,
      arrowKeys: true,
      closeOnVerticalDrag: true,
      zoom: false,
      dataSource: galleryData
    });

    lightbox.init();

    // Manually handle clicks on gallery items
    items.forEach(function (item, index) {
      item.addEventListener('click', function(e) {
        e.preventDefault();
        lightbox.loadAndOpen(index);
      });
    });
  }
});
