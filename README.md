# Certify — Minimal Bulk Certificate Generator

**Certify** is a 100% client-side web application for generating customized, high-resolution bulk certificates from an image template and a participant spreadsheet (`.xlsx`, `.xls`, `.csv`).

Designed as a **minimal editorial document editor**: warm white workspace, crisp typography, restrained indigo accents, and subtle borders. All data processing is strictly client-side—no backend, no database, no accounts, and no data uploaded to external servers.

---

## ✨ Features

- **100% Client-Side Privacy**: Templates, participant rosters, and generated PDFs remain strictly in your browser memory.
- **Visual Drag & Drop Editor**: Position fields naturally on your template with 8-point resize handles and 360° rotation.
- **Normalized Coordinate System**: Coordinates are stored as percentages (`x`, `y`, `width`, `height` from `0.0` to `1.0`), ensuring an exact 1:1 visual match between browser preview and final exported PDF.
- **Smart Text Auto-Fit**: Automatically reduces font size smoothly when long participant names or department titles would otherwise overflow the text box.
- **Compact Floating Toolbar**: Contextual formatting controls (Font family, Size, Bold, Italic, Alignment, Text Color, Letter Spacing, Auto-Fit toggle, Rotation, Delete) with zero distracting sidebars.
- **27 Curated Google Fonts**: Categorized into Sans-Serif, Serif, Display, and Handwriting / Script with real-font search previews.
- **SheetJS Spreadsheet Parsing**: Supports `.xlsx`, `.xls`, and `.csv` files.
- **Automatic Column Matching**: Intelligently matches fields to spreadsheet headers (e.g., `Name` → `Participant Name`, `Reg No` → `Roll Number`, `Dept` → `Department`), falling back to a concise mapping dialog only when ambiguous.
- **Complete Certificate Preview**:
  - **Single Preview**: Canvas view with Previous/Next navigation, direct jump-to index, and participant metadata summary.
  - **Grid View**: Clean thumbnail grid displaying all participant certificates.
- **Multi-Format Export**:
  - **Export All (ZIP Archive)**: Generates individual sanitized PDFs bundled into a single ZIP archive.
  - **Export Combined PDF**: Generates a single multi-page PDF document containing all certificates.
- **Scalable Performance**: Yields to the browser event loop during batch rendering to comfortably process large rosters without freezing the tab.

---

## 🚀 Workflow

1. **Open Certify**: Open the application in your browser.
2. **Upload Certificate Template**: Upload your certificate background image (`.png`, `.jpg`, `.jpeg`).
3. **Position the Fields**: Add, drag, resize, rotate, and style your certificate fields (Name, Reg No, Department, S.No, Event Name, Date, Custom).
4. **Upload Participant Excel**: Upload your participant file (`.xlsx`, `.xls`, or `.csv`).
5. **Generate Certificates**: Confirm and generate certificates with automatic column mapping.
6. **Review the Certificates**: Inspect all generated certificates in Single Preview or Grid View.
7. **Export**: Export all certificates as a ZIP archive of individual PDFs or as a combined multi-page PDF document.

---

## 🛠 Technology Stack

- **HTML5**: Semantic layout
- **Tailwind CSS**: Utility styling with custom design tokens
- **Vanilla JavaScript (ES6+)**: Modular client-side architecture
- **SheetJS (`xlsx`)**: Browser-side Excel/CSV parsing
- **jsPDF**: High-resolution PDF document creation matching template dimensions
- **JSZip**: Bulk archive creation
- **Google Fonts**: Open-licensed typography

---

## 📂 Project Structure

```text
Spectrum-Certificates/
├── index.html       # Main application layout and modal shells
├── app.js           # Modular Vanilla JS application logic
├── style.css        # Minimal editorial styles & canvas handling
└── README.md        # Project documentation
```

---

## 🌐 Deploy to GitHub Pages

1. Push this repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Certify application"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. In your GitHub repository:
   - Go to **Settings** → **Pages**.
   - Under **Build and deployment**, set **Source** to `Deploy from a branch`.
   - Select branch `main` and folder `/ (root)`.
   - Click **Save**.
3. Your app is live at `https://<your-username>.github.io/<repo-name>/`!

---

## 💻 Running Locally

Simply serve the root folder with any static HTTP server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (npx)
npx serve .
```

Open `http://localhost:8000` in your web browser.
