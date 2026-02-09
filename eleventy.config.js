import path from "node:path";
import fs from "node:fs";
import Image from "@11ty/eleventy-img";
import CleanCSS from "clean-css";
import { minify } from "terser";

export default async function (eleventyConfig) {
  // --- Passthrough copies ---
  eleventyConfig.addPassthroughCopy("./src/js");

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
      formats: ["webp", "jpeg"],
      urlPath: "/img/",
      outputDir: ".cache/@11ty/img/",
      filenameFormat: function (id, src, width, format) {
        const name = path.basename(src, path.extname(src));
        // Include parent directory to avoid collisions (e.g. varanasi/IMG001 vs kathmandu/IMG001)
        const parentDir = path.basename(path.dirname(src));
        return `${parentDir}-${name}-${width}w.${format}`;
      },
    });

    const lowsrc = metadata.jpeg[0];
    const highsrc = metadata.jpeg[metadata.jpeg.length - 1];

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

  // --- Copy cached images to output after build ---
  eleventyConfig.on("eleventy.after", () => {
    const cacheDir = ".cache/@11ty/img/";
    const outputDir = path.join("_site", "img");
    if (fs.existsSync(cacheDir)) {
      fs.cpSync(cacheDir, outputDir, { recursive: true });
    }
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
