# Certify — Minimal Client-Side Bulk Certificate Generator

**Certify** is a 100% client-side web application for generating customized, high-resolution bulk certificates from an image template and a participant spreadsheet (.xlsx, .xls, .csv).

Designed with a **focused utility approach** ("Canva-like positioning, without Canva's complexity"): no backend, no database, no accounts, and no data uploaded to external servers.

---

## ✨ Features

- **100% Client-Side Privacy**: Templates, participant rosters, and generated PDFs remain strictly in your browser memory.
- **Visual Drag & Drop Editor**: Position fields naturally on your template with 8-point resize handles and 360° rotation.
- **Normalized Coordinate System**: Coordinates are stored as percentages (`x`, `y`, `width`, `height` from `0.0` to `1.0`), ensuring exact 1:1 visual match between browser preview and final exported PDF.
- **Smart Text Auto-Fit**: Automatically reduces font size smoothly when long participant names (e.g., *"M. Venkateshwaran Subramaniam"*) or department titles would otherwise overflow the text box.
- **Compact Floating Toolbar**: Contextual formatting pill (Font family, Size, Bold, Italic, Alignment, Text Color, Letter Spacing, Auto-Fit toggle, Rotation, Delete) with no distracting sidebars.
- **27 Curated Google Fonts**: Categorized into Sans-Serif, Serif, Display, and Handwriting / Script with real-font search previews.
- **SheetJS Spreadsheet Parsing**: Supports `.xlsx`, `.xls`, and `.csv` files.
- **Automatic Column Matching**: Intelligently matches fields to spreadsheet headers (e.g., `Name` → `Participant Name`, `Reg No` → `Roll Number`, `Dept` → `Department`), falling back to a concise mapping dialog only when ambiguous.
- **Complete Certificate Preview**:
  - **Single Preview**: Large canvas view with Previous/Next navigation, direct jump-to index, and participant metadata summary.
  - **Grid View**: Fast thumbnail grid displaying all participant certificates.
- **Multi-Format Export**:
  - **Export All (ZIP Archive)**: Generates individual sanitized PDFs (`Certificate_001_Arun_Kumar.pdf`) bundled into `Certificates.zip` via JSZip.
  - **Export Combined PDF**: Generates a single multi-page PDF document containing all certificates.
- **Scalable Performance**: Yields to the browser event loop during batch rendering to comfortably process 500+ certificates with animated progress without freezing the tab.

---

## 🚀 Workflow

```text
Upload Template (PNG, JPG, JPEG)
      ↓
Position Fields (Name, Reg No, Department, Event, Date, etc.)
      ↓
Upload Excel (.xlsx, .xls, .csv)
      ↓
Auto-Map Columns (or confirm mappings)
      ↓
Generate Certificates (confirmation modal)
      ↓
Preview ALL Certificates (Single View / Grid View)
      ↓
Export (ZIP Archive or Combined PDF with progress bar)
```

---

## 🛠 Technology Stack

- **HTML5**: Clean semantic layout
- **Tailwind CSS**: Utility-first minimal styling
- **Vanilla JavaScript (ES6+)**: Modular architecture (`TemplateManager`, `FieldManager`, `FontManager`, `Editor`, `ExcelManager`, `MappingManager`, `CertificateRenderer`, `PreviewManager`, `PDFExporter`, `ZipExporter`, `ModalManager`, `App`)
- **SheetJS (`xlsx`)**: Browser-side Excel/CSV parsing
- **jsPDF**: High-resolution PDF document creation matching template dimensions
- **JSZip**: Bulk archive creation
- **Google Fonts**: Open-licensed typography

---

## 📂 Project Structure

```text
Spectrum-Certificates/
├── index.html                   # Main application layout and modal shells
├── app.js                       # Modular Vanilla JS application logic
├── style.css                    # Editor styling, handles, floating toolbar
├── assets/
│   ├── sample-template.jpg      # High-res sample certificate template
│   ├── sample_participants.csv  # 15 sample participant records
│   └── preview_verification.jpg # Verified preview capture
└── README.md                    # Project documentation
```

---

## 🌐 Deploy to GitHub Pages

1. Push this repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Certify application"
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

Open `http://localhost:8000` in your web browser. You can click **"Try with sample template & participants →"** on the initial screen to test all features with one click.
