# CSIR-CSIO AgNER Studio — Figma Design Suite

High-fidelity Figma UI design system and artboard files for the **CSIR-CSIO Agricultural Named Entity Recognition (AgNER) Annotation Platform**.

Designed in alignment with the **`frontend-design`** skill:
- **Domain**: Agro-Informatics & Scientific Instrumentation (CSIR-Central Scientific Instruments Organisation).
- **Core Aesthetic**: Precision scientific instrument aesthetic — crisp contrast, botanical emerald anchor (`#047857`), clean clinical slate canvas (`#F8FAFC`), and distinct diagnostic entity tags.
- **Fatigue Reduction**: Optimized for high-throughput annotators reviewing hundreds of sentences a day.

---

## 📁 Included Figma Files & Artboards

| # | File Name | Screen / Artboard | Dimensions | Description |
|---|---|---|---|---|
| **1** | [`CSIO_AgNER_01_Dashboard.svg`](./CSIO_AgNER_01_Dashboard.svg) | **Corpus & Advisory Repository** | 1440 × 960 px | Ingestion zone for `.json` & `.jsonl`, corpus table, model confidence stats, active PAU/IMD bulletins. |
| **2** | [`CSIO_AgNER_02_Focus_Annotation_Studio.svg`](./CSIO_AgNER_02_Focus_Annotation_Studio.svg) | **1-Line Focus Annotation Studio (Flagship)** | 1440 × 960 px | 18px focus reading card, categorized 36-entity drawer, keyboard shortcuts (1–8), and Model AI vs Human provenance. |
| **3** | [`CSIO_AgNER_03_Full_Document_Matrix.svg`](./CSIO_AgNER_03_Full_Document_Matrix.svg) | **Full Document Matrix & Quality Audit** | 1440 × 960 px | Multi-line advisory reader, section outline tree, class distribution analytics, and offset validation checklist. |
| **4** | [`CSIO_AgNER_04_Export_Data_Station.svg`](./CSIO_AgNER_04_Export_Data_Station.svg) | **Curated Dataset Export & Telemetry** | 1440 × 960 px | Clean cards for **JSON file** and **JSONL file** export with syntax-highlighted live payload diff and provenance breakdown. |
| **Tokens** | [`csio_figma_design_tokens.json`](./csio_figma_design_tokens.json) | **Figma Design Tokens** | Token Studio JSON | W3C / Figma Tokens Studio compatible token set (colors, typography, spacing, entity styles). |
| **Web Preview** | [`index.html`](./index.html) | **Interactive Preview App** | Standalone HTML | Interactive viewer to preview all 4 screens with instant switching and direct download buttons. |

---

## 🎨 How to Open & Edit in Figma

1. Open **[Figma](https://www.figma.com)** (desktop app or browser).
2. Create a new design file or open an existing project.
3. **Drag & Drop** any of the `.svg` files (`CSIO_AgNER_01_Dashboard.svg`, `02`, `03`, `04`) directly onto your Figma canvas.
   - Alternatively: Click the **Figma Menu** (top left) → **File** → **Place Image...** (or `Ctrl + Shift + K`) and choose the SVG files.
4. Figma instantly parses the vector structure into native **Frames, Rectangles, Text Layers, Vectors, and Color Styles** ready for editing, prototype linking, and component extraction.
5. To import design tokens, install the **Tokens Studio for Figma** plugin and import `csio_figma_design_tokens.json`.

---

## 🌐 Quick Browser Preview

You can also view the full design suite immediately in any browser by opening [`figma-designs/index.html`](./index.html).
