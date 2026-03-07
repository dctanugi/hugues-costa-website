import path from "node:path";
import fs from "node:fs";
import Image from "@11ty/eleventy-img";
import sharp from "sharp";
import CleanCSS from "clean-css";
import { minify } from "terser";

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default async function (eleventyConfig) {
  // --- Passthrough copies ---
  eleventyConfig.addPassthroughCopy("./src/js");
  eleventyConfig.addPassthroughCopy({ "./src/images/og-image.png": "img/og-image.png" });

  // --- Filters ---
  eleventyConfig.addFilter("cssmin", (code) => {
    return new CleanCSS({}).minify(code).styles;
  });

  eleventyConfig.addNunjucksAsyncFilter("jsmin", async (code, callback) => {
    try {
      const minified = await minify(code);
      callback(null, minified.code);
    } catch (err) {
      console.error("Terser error:", err);
      callback(null, code);
    }
  });

  // --- Shortcodes ---
  eleventyConfig.addShortcode("year", () => new Date().getFullYear().toString());

  // --- Image shortcode ---
  eleventyConfig.addShortcode("img", async function ({
    src,
    alt,
    widths,
    className,
    gallerySlug,
    sizes = "100vw",
    loading = "lazy",
  }) {
    if (alt === undefined) {
      throw new Error(`Missing "alt" on responsive image from: ${src}`);
    }

    const imgPath = gallerySlug
      ? `./src/images/${gallerySlug}/${src}`
      : `./src/images/${src}`;

    const metadata = await Image(imgPath, {
      widths: widths || [300, 600, 900, 1200],
      formats: ["webp"],
      urlPath: "/img/",
      outputDir: ".cache/@11ty/img/",
      filenameFormat: function (id, src, width, format) {
        const name = path.basename(src, path.extname(src));
        // Include parent directory to avoid collisions (e.g. varanasi/IMG001 vs kathmandu/IMG001)
        const parentDir = path.basename(path.dirname(src));
        return `${parentDir}-${name}-${width}w.${format}`;
      },
    });

    const lowsrc = metadata.webp[0];
    const highsrc = metadata.webp[metadata.webp.length - 1];

    const sources = Object.values(metadata)
      .map((imageFormat) => {
        return `<source type="${imageFormat[0].sourceType}" srcset="${imageFormat.map((e) => e.srcset).join(", ")}" sizes="${sizes}">`;
      })
      .join("\n");

    return `<picture>
${sources}
<img
  src="${lowsrc.url}"
  width="${highsrc.width}"
  height="${highsrc.height}"
  alt="${alt}"
  loading="${loading}"
  decoding="async"
  class="${className || ""}">
</picture>`;
  });

  // --- Gallery collection: auto-detect from filesystem + merge with metadata ---
  eleventyConfig.addCollection("galleries", function () {
    const imagesDir = "./src/images";
    let galleriesData = { galleries: [] };

    try {
      galleriesData = JSON.parse(
        fs.readFileSync("./src/_data/galleries.json", "utf-8")
      );
    } catch {
      // No galleries.json yet, that's fine
    }

    const galleriesMap = new Map();
    for (const g of galleriesData.galleries) {
      galleriesMap.set(g.slug, g);
    }

    let subdirs;
    try {
      subdirs = fs
        .readdirSync(imagesDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    } catch {
      return [];
    }

    const galleries = subdirs.map((slug) => {
      const meta = galleriesMap.get(slug) || {};
      const folderPath = path.join(imagesDir, slug);
      const imageFiles = fs
        .readdirSync(folderPath)
        .filter((f) => /\.(jpe?g|png|webp|tiff?)$/i.test(f))
        .sort();

      return {
        slug,
        order: meta.order ?? 999,
        coverImage: meta.coverImage || imageFiles[0] || null,
        title:
          meta.title ||
          slug
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
        description: meta.description || "",
        date: meta.date || "",
        location: meta.location || "",
        imageCount: imageFiles.length,
        images: imageFiles,
      };
    });

    galleries.sort(
      (a, b) => a.order - b.order || a.slug.localeCompare(b.slug)
    );

    return galleries;
  });

  // --- Copy cached images to output after build, optionally watermark 900w/1200w ---
  eleventyConfig.on("eleventy.after", async ({ runMode }) => {
    const cacheDir = ".cache/@11ty/img/";
    const watermarkCacheDir = ".cache/watermarked/";
    const outputDir = path.join("_site", "img");

    if (!fs.existsSync(cacheDir)) return;

    fs.mkdirSync(outputDir, { recursive: true });

    // Skip watermarking in dev/serve mode for faster builds
    if (runMode === "serve" || runMode === "watch") {
      fs.cpSync(cacheDir, outputDir, { recursive: true });
      console.log("[watermark] Skipped in dev mode for faster builds");
      return;
    }

    // Read watermark config
    let siteData;
    try {
      siteData = JSON.parse(fs.readFileSync("./src/_data/site.json", "utf-8"));
    } catch {
      fs.cpSync(cacheDir, outputDir, { recursive: true });
      return;
    }

    if (!siteData.watermark?.enabled) {
      fs.cpSync(cacheDir, outputDir, { recursive: true });
      return;
    }

    fs.mkdirSync(watermarkCacheDir, { recursive: true });

    const watermarkText =
      siteData.watermark.text || "© 2026 — Estate of Hugues Costa";

    const allFiles = fs.readdirSync(cacheDir);
    const needsWatermark = (f) =>
      (f.includes("-900w.") || f.includes("-1200w.")) && f.endsWith(".webp");

    // Copy non-watermarked files (300w, 600w) directly to output
    for (const file of allFiles) {
      if (!needsWatermark(file)) {
        fs.copyFileSync(path.join(cacheDir, file), path.join(outputDir, file));
      }
    }

    // For watermark candidates, check if a cached watermarked version is up-to-date
    const watermarkFiles = allFiles.filter(needsWatermark);
    const toProcess = [];

    for (const file of watermarkFiles) {
      const srcPath = path.join(cacheDir, file);
      const cachedPath = path.join(watermarkCacheDir, file);

      if (fs.existsSync(cachedPath)) {
        const srcMtime = fs.statSync(srcPath).mtimeMs;
        const cachedMtime = fs.statSync(cachedPath).mtimeMs;

        if (cachedMtime >= srcMtime) {
          // Watermarked version is up-to-date, copy from cache
          fs.copyFileSync(cachedPath, path.join(outputDir, file));
          continue;
        }
      }

      toProcess.push(file);
    }

    if (toProcess.length === 0) {
      console.log(`[watermark] All ${watermarkFiles.length} images up to date, nothing to process.`);
      return;
    }

    console.log(`[watermark] Processing ${toProcess.length} of ${watermarkFiles.length} images (${watermarkFiles.length - toProcess.length} cached)...`);

    const BATCH_SIZE = 20;
    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      const batch = toProcess.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (file) => {
          const filePath = path.join(cacheDir, file);
          try {
            const metadata = await sharp(filePath).metadata();
            const width = metadata.width;
            const height = metadata.height;

            const fontSize = Math.round(width * 0.022);
            const padding = Math.round(width * 0.015);

            // Dual-text SVG: dark shadow underneath, white text on top
            const svgText = `
              <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <text
                  x="${padding + 1}"
                  y="${height - padding + 1}"
                  font-family="Arial, Helvetica, sans-serif"
                  font-size="${fontSize}px"
                  fill="rgba(0, 0, 0, 0.6)"
                >${escapeXml(watermarkText)}</text>
                <text
                  x="${padding}"
                  y="${height - padding}"
                  font-family="Arial, Helvetica, sans-serif"
                  font-size="${fontSize}px"
                  fill="rgba(255, 255, 255, 0.8)"
                >${escapeXml(watermarkText)}</text>
              </svg>`;

            const watermarked = await sharp(filePath)
              .composite([{ input: Buffer.from(svgText) }])
              .toBuffer();

            const ext = path.extname(file).slice(1);
            const output =
              ext === "webp"
                ? await sharp(watermarked).webp({ quality: 80 }).toBuffer()
                : await sharp(watermarked).jpeg({ quality: 80 }).toBuffer();

            // Save to both watermark cache and output
            fs.writeFileSync(path.join(watermarkCacheDir, file), output);
            fs.writeFileSync(path.join(outputDir, file), output);
          } catch (err) {
            console.error(
              `[watermark] Failed to watermark ${file}:`,
              err.message
            );
          }
        })
      );
    }

    console.log(`[watermark] Done.`);
  });
}

export const config = {
  dir: {
    input: "src",
    output: "_site",
    includes: "_includes",
    layouts: "_includes/layouts",
    data: "_data",
  },
  templateFormats: ["njk", "md"],
  markdownTemplateEngine: "njk",
  htmlTemplateEngine: "njk",
};
