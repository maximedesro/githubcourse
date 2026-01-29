# Copilot Instructions for githubcourse Repository

## Repository Overview

This is a **static website project** for learning Git and GitHub. It contains a retro gaming blog called "8.BIT.BLOG" with a nostalgic NES-inspired design. The repository is small (~264KB) with 7 main source files and serves as a learning/demonstration project.

**Repository:** maximedesro/githubcourse  
**Default Branch:** core  
**Project Type:** Static HTML/CSS website (no build system required)  
**Languages:** HTML, CSS, minimal JavaScript

## Technology Stack

- **HTML5** - Static web pages
- **CSS3** - Styling with custom CSS (no preprocessors)
- **JavaScript** - Empty script.js file (placeholder)
- **External Dependencies:** Google Fonts (Jersey 10, Inter) loaded via CDN in CSS
- **No build tools** - This is a static site that runs directly in a browser
- **No package manager** - No npm, webpack, or bundler required

## Repository Structure

```
githubcourse/
├── .github/              # GitHub configuration (created for Copilot)
├── .git/                 # Git repository data
├── .gitignore           # Ignores: notes.txt, .vscode/, .DS_Store, node_modules/, .env, dist/, .idea/, *.log
├── README.md            # Basic project description from Net Ninja course
├── index.html           # Home page with blog cards and gaming content (265 lines)
├── about.html           # About page describing the blog mission (~150 lines)
├── contact.html         # Contact page with form (~250 lines)
├── new.html             # Quebec Gaming Convention 2026 event page (~300 lines)
└── src/
    ├── script.js        # Empty JavaScript file (0 bytes)
    └── styles.css       # All styling (916 lines) - includes responsive design
```

### Key Files

**HTML Files (4):** All follow the same structure:
- Navbar with links to index.html, about.html, contact.html
- Content section with two-column layout (blog content + sidebar)
- Footer with branding and links
- All reference `src/styles.css` for styling

**CSS File:**
- Single comprehensive stylesheet (`src/styles.css`)
- Uses CSS custom properties (`:root` variables) for theming
- Retro gaming color scheme: reds (#d32f2f), grays, white
- Fully responsive with mobile breakpoints at 768px
- Imports Google Fonts: "Jersey 10" (headings) and "Inter" (body text)

**JavaScript:**
- `src/script.js` exists but is empty (no functionality)
- No JavaScript is actually loaded in any HTML file

## How to Build, Test, and Run

### Prerequisites

**None required.** This is a static website with no build process or dependencies to install.

### Running the Website Locally

The website can be viewed by:

**Option 1: Direct File Opening** (may have font loading issues)
```bash
# Open directly in browser (file:// protocol)
open index.html  # macOS
xdg-open index.html  # Linux
start index.html  # Windows
```

**Option 2: Simple HTTP Server** (recommended - fonts load properly)
```bash
# Using Python 3 (always available)
cd /home/runner/work/githubcourse/githubcourse
python3 -m http.server 8080 --bind 127.0.0.1

# Then open browser to: http://127.0.0.1:8080/
# Test all pages: index.html, about.html, contact.html, new.html
# Kill server when done: kill <PID>  (get PID from ps aux | grep http.server)
```

**Option 3: Using Node.js http-server** (if Node.js is available)
```bash
# Install globally (only needed once)
npm install -g http-server

# Run server
cd /home/runner/work/githubcourse/githubcourse
http-server -p 8080

# Open: http://127.0.0.1:8080/
```

### Testing Changes

**Manual Testing Process:**
1. Make HTML/CSS changes
2. Refresh browser (no build step required)
3. Test on all four pages: index.html, about.html, contact.html, new.html
4. Verify responsive design by resizing browser window
5. Check navigation links work between pages
6. Verify external font loading (requires HTTP server)

**No automated tests exist** in this repository. All testing is manual visual inspection.

### Build Commands

**There are NO build commands.** This repository requires no compilation, bundling, or preprocessing.

- ❌ No `npm install` needed
- ❌ No `npm run build` needed
- ❌ No `npm test` to run
- ❌ No linting configured (no ESLint, Prettier, Stylelint)
- ❌ No package.json file

### Validation

**HTML Validation:**
```bash
# All HTML files are valid HTML5
# Can validate using: https://validator.w3.org/
# Or with CLI tools if needed:
# npm install -g html-validator-cli
# html-validator --file=index.html
```

**CSS Validation:**
```bash
# CSS uses modern features (CSS Grid, Flexbox, custom properties)
# Can validate at: https://jigsaw.w3.org/css-validator/
```

**Link Checking:**
```bash
# All internal links use relative paths (index.html, about.html, contact.html)
# External links: Google Fonts CDN, Element.how, GitHub docs
```

## GitHub Workflows

**Two GitHub Actions workflows exist** (dynamically created by GitHub Copilot features):

1. **Copilot code review** (ID: 227675744)
   - Path: `dynamic/copilot-pull-request-reviewer/copilot-pull-request-reviewer`
   - Purpose: Automated code review on pull requests
   - State: Active

2. **Copilot coding agent** (ID: 228127564)
   - Path: `dynamic/copilot-swe-agent/copilot`
   - Purpose: Coding agent automation
   - State: Active

**Important:** These workflows are managed by GitHub Copilot and do not have traditional `.github/workflows/*.yml` files in the repository.

## Common Tasks

### Adding a New Page

1. Create new HTML file in repository root (e.g., `blog.html`)
2. Copy structure from existing page (index.html is best template)
3. Update navbar links in all pages if adding to navigation
4. Update footer links if needed
5. Test navigation between all pages

### Modifying Styles

1. Edit `src/styles.css` directly
2. Use existing CSS custom properties from `:root` for colors
3. Follow established class naming conventions
4. Test responsive breakpoints (desktop and <768px mobile)
5. No build step - changes are immediate

### Changing Colors/Theme

1. Edit CSS custom properties in `src/styles.css` `:root` section:
   - `--retro-dark`, `--retro-grey`, `--retro-light`
   - `--retro-red`, `--retro-white`, `--retro-shadow`
2. Refresh browser to see changes

## Important Notes for Coding Agents

### Critical Information

- **NO BUILD PROCESS EXISTS** - Do not try to run npm install, npm build, or any build commands
- **NO PACKAGE.JSON** - Do not create one unless explicitly requested
- **STATIC SITE ONLY** - Files run directly in browser or via simple HTTP server
- **EMPTY JAVASCRIPT** - The script.js file is empty and not loaded by any HTML file
- **FONTS ARE EXTERNAL** - Google Fonts loaded via CSS @import, requires HTTP server to work (not file://)

### Common Mistakes to Avoid

❌ **Don't** add build tooling (webpack, babel, etc.) unless explicitly requested  
❌ **Don't** add package.json or node_modules  
❌ **Don't** try to compile/transpile anything  
❌ **Don't** add testing frameworks without explicit request  
❌ **Don't** add linting tools unless requested  
❌ **Don't** modify script.js unless JavaScript functionality is requested  

### What Works

✅ **Do** edit HTML files directly  
✅ **Do** edit CSS in src/styles.css directly  
✅ **Do** test with Python's http.server  
✅ **Do** test all navigation links after changes  
✅ **Do** preserve the retro gaming aesthetic  
✅ **Do** maintain responsive design patterns  
✅ **Do** test on mobile viewport (< 768px)  

### Typical Workflow

1. Make changes to HTML/CSS files
2. Start Python HTTP server: `python3 -m http.server 8080`
3. Open http://127.0.0.1:8080/ in browser
4. Test all modified pages
5. Test navigation between pages
6. Test responsive design (resize browser)
7. Kill server process
8. Commit changes

## File Size and Performance

- Total repository: ~264KB
- Largest file: `new.html` (~12KB)
- CSS file: `src/styles.css` (~16KB)
- All files: 36 files total (including .git)
- Source files: 7 files (4 HTML, 1 CSS, 1 JS, 1 README)

The site is extremely lightweight with no dependencies or external libraries (except fonts).

## Trust These Instructions

These instructions have been validated by exploring the entire repository, testing the website, and verifying all commands. **Only perform a search if:**

1. You need to find a specific code snippet or pattern
2. These instructions are incomplete for your specific task
3. You discover these instructions are incorrect

For routine changes to HTML/CSS, trust these instructions and proceed directly with the changes.
