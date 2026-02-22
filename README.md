# Hugues Costa Website

This repository contains the source code for the photography portfolio website of Hugues Costa, hosted at [www.huguescosta.com](https://www.huguescosta.com). This website is created and maintained by David Cohen-Tanugi.

## Project Structure

- **Source Files**: Located in the `src/` directory. This includes:
  - `index.njk`, `about.njk`, `gallery-page.njk`: Main pages of the site written in Nunjucks.
  - `_data/`: JSON files for dynamic data (e.g., `galleries.json`, `site.json`).
  - `_includes/`: Shared components, layouts, and styles.
    - `components/`: Reusable components like `header.njk` and `footer.njk`.
    - `layouts/`: Layout templates for pages.
    - `sass/`: SCSS files for styling, organized into mixins, partials, and variables.
- **Static Assets**: Located in the `img/` and `js/` directories.
- **Build Output**: The `_site/` directory contains the generated static files after the build process.

## Development

### Prerequisites

- Node.js (LTS version recommended)
- npm (comes with Node.js)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/dctanugi/hugues-costa-website.git
   ```
2. Navigate to the project directory:
   ```bash
   cd hugues-costa-website
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Rebuilding the Site

This project uses [Eleventy](https://www.11ty.dev/) as the static site generator. To rebuild the site:

1. Run the Eleventy build command:
   ```bash
   npx eleventy
   ```
2. The generated files will be located in the `_site/` directory.

### Development Server

To start a local development server with live reloading:
```bash
npm run dev
```
The site will be available at `http://localhost:8080`.

## Deployment

The site is hosted on [Netlify](https://www.netlify.com/) under the username `dctanugi`. The production URL is [www.huguescosta.com](https://www.huguescosta.com).

### Deployment Steps

1. Push changes to the `main` branch of this repository.
2. Netlify will automatically detect the changes and trigger a new build.
3. The updated site will be deployed to [www.huguescosta.com](https://www.huguescosta.com).

### Domain Management

The domain name `www.huguescosta.com` is managed via [Cloudflare](https://www.cloudflare.com/).

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## Contact

For any inquiries, please contact the repository owner at `dctanugi` on GitHub.

## Modifying Photo Galleries

The photo galleries on the website can be customized by editing the `galleries.json` file and managing the images in the `/src/images/` directory.

### Editing `galleries.json`

The `galleries.json` file, located in the `src/_data/` directory, contains metadata for the photo galleries. Each gallery is defined as an object with the following properties:

- `title`: The title of the gallery.
- `slug`: The URL-friendly identifier for the gallery.
- `description`: A short description of the gallery.
- `images`: An array of image filenames (relative to the gallery's folder in `/src/img/`).

To add a new gallery:
1. Add a new object to the `galleries.json` file with the required properties.
2. Ensure the `slug` matches the folder name in `/src/img/` where the gallery's images are stored.

### Managing Images

Images for the galleries are stored in the `/src/images/` directory. Each gallery has its own subfolder (e.g., `/src/images/kerala/`, `/src/img/ladakh/`).

To add images to a gallery:
1. Place the image files in the corresponding gallery's folder.
2. Add the filenames to the `images` array in `galleries.json`.

To remove images from a gallery:
1. Delete the image files from the gallery's folder.
2. Remove the filenames from the `images` array in `galleries.json`.

### Preview Changes

After modifying `galleries.json` or adding/removing images, rebuild the site to preview the changes locally:
```bash
npx eleventy --serve
```
The updated galleries will be visible at `http://localhost:8080`.