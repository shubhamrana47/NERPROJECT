import os
import json

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# DESIGN TOKENS
# ---------------------------------------------------------------------------
TOKENS = {
    "name": "CSIR-CSIO AgNER Design System Tokens",
    "version": "2.0.0",
    "organization": "CSIR-Central Scientific Instruments Organisation",
    "domain": "Agro-Informatics & Named Entity Recognition",
    "colors": {
        "brand": {
            "csio_navy": "#0B1528",
            "csio_blue": "#1E3A8A",
            "csio_emerald": "#047857",
            "csio_emerald_light": "#10B981",
            "csio_gold": "#D97706"
        },
        "canvas": {
            "background": "#F8FAFC",
            "surface_card": "#FFFFFF",
            "surface_subtle": "#F1F5F9",
            "surface_elevated": "#FFFFFF"
        },
        "border": {
            "hairline": "#E2E8F0",
            "medium": "#CBD5E1",
            "strong": "#94A3B8",
            "accent": "#047857"
        },
        "text": {
            "primary": "#0F172A",
            "secondary": "#475569",
            "muted": "#94A3B8",
            "inverse": "#FFFFFF",
            "brand": "#047857"
        },
        "entities": {
            "crop": {"bg": "#ECFDF5", "border": "#A7F3D0", "text": "#065F46", "badge": "#059669"},
            "chemical": {"bg": "#F5F3FF", "border": "#DDD6FE", "text": "#5B21B6", "badge": "#7C3AED"},
            "pest": {"bg": "#FEF2F2", "border": "#FECACA", "text": "#991B1B", "badge": "#DC2626"},
            "stage": {"bg": "#EFF6FF", "border": "#BFDBFE", "text": "#1E40AF", "badge": "#2563EB"},
            "fertilizer": {"bg": "#FFFBEB", "border": "#FDE68A", "text": "#92400E", "badge": "#D97706"},
            "soil_weather": {"bg": "#ECFEFF", "border": "#A5F3FC", "text": "#155E75", "badge": "#0891B2"}
        },
        "provenance": {
            "model": {"bg": "#F8FAFC", "border": "#CBD5E1", "text": "#334155", "badge": "#64748B"},
            "manual": {"bg": "#F0FDF4", "border": "#86EFAC", "text": "#166534", "badge": "#16A34A"}
        }
    },
    "typography": {
        "font_family_ui": "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        "font_family_mono": "JetBrains Mono, 'Fira Code', monospace",
        "scales": {
            "display": "24px",
            "h1": "20px",
            "h2": "16px",
            "body": "14px",
            "annotation_focus": "18px",
            "caption": "12px",
            "micro": "10px"
        }
    }
}

# Write tokens JSON
tokens_path = os.path.join(OUTPUT_DIR, "csio_figma_design_tokens.json")
with open(tokens_path, "w", encoding="utf-8") as f:
    json.dump(TOKENS, f, indent=2)
print(f"Generated: {tokens_path}")

# ---------------------------------------------------------------------------
# SCREEN 1: DASHBOARD & REPOSITORY (1440 x 960)
# ---------------------------------------------------------------------------
def generate_screen_1():
    svg = """<svg width="1440" height="960" viewBox="0 0 1440 960" fill="none" xmlns="http://www.w3.org/2000/svg" style="background:#0B132B; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <filter id="cardShadow" x="-10" y="-5" width="100%" height="100%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="#0F172A" flood-opacity="0.06"/>
    </filter>
    <filter id="modalShadow" x="-20" y="-10" width="100%" height="100%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="16" stdDeviation="32" flood-color="#0B132B" flood-opacity="0.18"/>
    </filter>
    <linearGradient id="primaryGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#047857"/>
      <stop offset="100%" stop-color="#10B981"/>
    </linearGradient>
    <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0B1528"/>
      <stop offset="100%" stop-color="#162A45"/>
    </linearGradient>
    <linearGradient id="cardGlow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F8FAFC"/>
      <stop offset="100%" stop-color="#FFFFFF"/>
    </linearGradient>
  </defs>

  <!-- Background Canvas -->
  <rect width="1440" height="960" fill="#F8FAFC"/>

  <!-- Top Navigation Bar -->
  <rect width="1440" height="70" fill="url(#headerGrad)"/>
  <line x1="0" y1="70" x2="1440" y2="70" stroke="#1E293B" stroke-width="1"/>

  <!-- CSIR-CSIO Logo & Title -->
  <g transform="translate(40, 16)">
    <!-- Scientific Emblem Icon -->
    <rect x="0" y="0" width="38" height="38" rx="8" fill="#047857"/>
    <path d="M19 8L29 14V24L19 30L9 24V14L19 8Z" stroke="#FFFFFF" stroke-width="2" fill="none"/>
    <circle cx="19" cy="19" r="4" fill="#34D399"/>
    
    <text x="48" y="18" fill="#FFFFFF" font-size="16" font-weight="700" letter-spacing="0.5">CSIR-CSIO</text>
    <text x="134" y="18" fill="#10B981" font-size="14" font-weight="600">AgNER Studio</text>
    <text x="48" y="32" fill="#94A3B8" font-size="11" font-weight="400">Agricultural Named Entity Recognition Platform • Central Scientific Instruments Organisation</text>
  </g>

  <!-- Model Badge -->
  <g transform="translate(760, 20)">
    <rect x="0" y="0" width="280" height="30" rx="15" fill="#1E293B" stroke="#334155" stroke-width="1"/>
    <circle cx="16" cy="15" r="4" fill="#10B981"/>
    <text x="28" y="19" fill="#E2E8F0" font-size="11" font-weight="500">AgRoBERTa-512 Base</text>
    <text x="148" y="19" fill="#94A3B8" font-size="11">|</text>
    <text x="160" y="19" fill="#38BDF8" font-size="11" font-weight="500">Threshold: 0.85</text>
    <text x="245" y="19" fill="#4ADE80" font-size="11" font-weight="600">92% Acc</text>
  </g>

  <!-- Annotator Profile -->
  <g transform="translate(1220, 18)">
    <rect x="0" y="0" width="180" height="34" rx="17" fill="#1E293B"/>
    <circle cx="18" cy="17" r="12" fill="#047857"/>
    <text x="14" y="21" fill="#FFFFFF" font-size="11" font-weight="600">AS</text>
    <text x="38" y="16" fill="#F8FAFC" font-size="11" font-weight="600">Dr. A. Sharma</text>
    <text x="38" y="28" fill="#94A3B8" font-size="10">Lead Annotator</text>
  </g>

  <!-- Subheader Breadcrumb / Navigation -->
  <rect x="0" y="70" width="1440" height="48" fill="#FFFFFF"/>
  <line x1="0" y1="118" x2="1440" y2="118" stroke="#E2E8F0" stroke-width="1"/>
  <g transform="translate(40, 85)">
    <rect x="0" y="0" width="130" height="26" rx="6" fill="#ECFDF5"/>
    <text x="14" y="17" fill="#047857" font-size="12" font-weight="700">Corpus Library</text>
    <text x="160" y="17" fill="#64748B" font-size="12" font-weight="500">Annotation Studio</text>
    <text x="290" y="17" fill="#64748B" font-size="12" font-weight="500">Model Telemetry</text>
    <text x="410" y="17" fill="#64748B" font-size="12" font-weight="500">Export &amp; Training Data</text>
  </g>

  <!-- Metric KPI Cards -->
  <g transform="translate(40, 140)">
    <!-- KPI 1 -->
    <rect x="0" y="0" width="320" height="96" rx="12" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
    <text x="20" y="32" fill="#64748B" font-size="12" font-weight="600">TOTAL BULLETINS</text>
    <text x="20" y="68" fill="#0F172A" font-size="28" font-weight="700">42</text>
    <text x="75" y="66" fill="#047857" font-size="12" font-weight="600">+6 uploaded today</text>
    <rect x="250" y="24" width="48" height="48" rx="10" fill="#ECFDF5"/>
    <path d="M266 40V56M274 40V56M282 40V56" stroke="#047857" stroke-width="2" stroke-linecap="round"/>

    <!-- KPI 2 -->
    <rect x="345" y="0" width="320" height="96" rx="12" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
    <text x="365" y="32" fill="#64748B" font-size="12" font-weight="600">VERIFIED SENTENCES</text>
    <text x="365" y="68" fill="#0F172A" font-size="28" font-weight="700">1,840</text>
    <text x="470" y="66" fill="#64748B" font-size="12">/ 2,410 total</text>
    <rect x="595" y="24" width="48" height="48" rx="10" fill="#EFF6FF"/>
    <circle cx="619" cy="48" r="12" stroke="#2563EB" stroke-width="3" stroke-dasharray="75 25" fill="none"/>

    <!-- KPI 3 -->
    <rect x="690" y="0" width="320" height="96" rx="12" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
    <text x="710" y="32" fill="#64748B" font-size="12" font-weight="600">PROVENANCE BREAKDOWN</text>
    <text x="710" y="68" fill="#047857" font-size="24" font-weight="700">84%</text>
    <text x="765" y="66" fill="#64748B" font-size="12">Model AI</text>
    <text x="825" y="68" fill="#6366F1" font-size="24" font-weight="700">16%</text>
    <text x="875" y="66" fill="#64748B" font-size="12">Manual Human</text>
    <rect x="940" y="24" width="48" height="48" rx="10" fill="#F5F3FF"/>
    <path d="M956 48L968 40L972 56" stroke="#7C3AED" stroke-width="2" fill="none"/>

    <!-- KPI 4 -->
    <rect x="1035" y="0" width="365" height="96" rx="12" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
    <text x="1055" y="32" fill="#64748B" font-size="12" font-weight="600">ACCEPTED ACCURACY</text>
    <text x="1055" y="68" fill="#0F172A" font-size="28" font-weight="700">94.2%</text>
    <text x="1170" y="66" fill="#047857" font-size="12" font-weight="600">&gt; 0.85 Threshold</text>
    <rect x="1330" y="24" width="48" height="48" rx="10" fill="#ECFDF5"/>
    <path d="M1346 48L1352 54L1362 42" stroke="#047857" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>

  <!-- Upload Ingestion Station -->
  <g transform="translate(40, 260)">
    <rect x="0" y="0" width="1360" height="110" rx="16" fill="#FFFFFF" stroke="#047857" stroke-width="1.5" stroke-dasharray="6 6"/>
    
    <!-- Upload Icon Circle -->
    <circle cx="60" cy="55" r="28" fill="#ECFDF5"/>
    <path d="M60 43V67M52 51L60 43L68 51" stroke="#047857" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Upload Instructions -->
    <text x="105" y="46" fill="#0F172A" font-size="16" font-weight="700">Upload Agricultural Advisory Bulletin (JSON or JSONL)</text>
    <text x="105" y="68" fill="#64748B" font-size="13">Drag and drop PAU / Agromet / ICAR bulletins or click to browse. Real-time AgRoBERTa model inference runs immediately.</text>

    <!-- Schema Badges -->
    <g transform="translate(105, 78)">
      <rect x="0" y="0" width="120" height="22" rx="4" fill="#F1F5F9"/>
      <text x="10" y="15" fill="#334155" font-size="11" font-weight="600">.json Structured Doc</text>

      <rect x="130" y="0" width="120" height="22" rx="4" fill="#F1F5F9"/>
      <text x="140" y="15" fill="#334155" font-size="11" font-weight="600">.jsonl Training Lines</text>

      <rect x="260" y="0" width="140" height="22" rx="4" fill="#ECFDF5"/>
      <text x="270" y="15" fill="#047857" font-size="11" font-weight="600">Auto-Detect Sections</text>
    </g>

    <!-- Upload CTA Button -->
    <g transform="translate(1180, 36)">
      <rect x="0" y="0" width="150" height="40" rx="8" fill="#047857"/>
      <text x="32" y="24" fill="#FFFFFF" font-size="13" font-weight="600">Select Files</text>
    </g>
  </g>

  <!-- Repository Document List Header -->
  <g transform="translate(40, 395)">
    <text x="0" y="22" fill="#0F172A" font-size="18" font-weight="700">Active Document Corpus</text>
    <text x="220" y="22" fill="#64748B" font-size="13">4 documents loaded for annotation</text>

    <!-- Search & Filter Bar -->
    <rect x="940" y="0" width="280" height="34" rx="8" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
    <text x="955" y="22" fill="#94A3B8" font-size="12">Search documents by title...</text>
    
    <rect x="1235" y="0" width="125" height="34" rx="8" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
    <text x="1250" y="22" fill="#334155" font-size="12" font-weight="500">Filter: All Status</text>
  </g>

  <!-- Table Container -->
  <g transform="translate(40, 440)">
    <rect x="0" y="0" width="1360" height="480" rx="14" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
    
    <!-- Table Header Row -->
    <rect x="0" y="0" width="1360" height="44" rx="14" fill="#F8FAFC"/>
    <line x1="0" y1="44" x2="1360" y2="44" stroke="#E2E8F0" stroke-width="1"/>
    <text x="24" y="27" fill="#475569" font-size="11" font-weight="700">DOCUMENT TITLE</text>
    <text x="380" y="27" fill="#475569" font-size="11" font-weight="700">FORMAT</text>
    <text x="480" y="27" fill="#475569" font-size="11" font-weight="700">LINES / PROGRESS</text>
    <text x="680" y="27" fill="#475569" font-size="11" font-weight="700">IDENTIFIED ENTITIES</text>
    <text x="960" y="27" fill="#475569" font-size="11" font-weight="700">STATUS</text>
    <text x="1140" y="27" fill="#475569" font-size="11" font-weight="700">ACTIONS</text>

    <!-- Row 1: PAU Wheat Advisory (Active / Focus) -->
    <g transform="translate(0, 44)">
      <rect x="0" y="0" width="1360" height="96" fill="#F0FDF4" opacity="0.6"/>
      <line x1="0" y1="96" x2="1360" y2="96" stroke="#E2E8F0" stroke-width="1"/>
      <rect x="0" y="0" width="4" height="96" fill="#047857"/>

      <text x="24" y="38" fill="#0F172A" font-size="14" font-weight="700">PAU_Ludhiana_Wheat_Advisory_Nov2025.jsonl</text>
      <text x="24" y="58" fill="#64748B" font-size="12">Punjab Agricultural University • Agromet Advisory Bulletin No. 92</text>
      <text x="24" y="78" fill="#047857" font-size="11" font-weight="600">Last edited 5 mins ago by Dr. A. Sharma</text>

      <!-- Format Badge -->
      <rect x="380" y="36" width="60" height="24" rx="4" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="1"/>
      <text x="392" y="52" fill="#065F46" font-size="11" font-weight="700">.JSONL</text>

      <!-- Progress Bar -->
      <text x="480" y="38" fill="#0F172A" font-size="13" font-weight="600">48 / 48 Lines (100%)</text>
      <rect x="480" y="50" width="140" height="8" rx="4" fill="#E2E8F0"/>
      <rect x="480" y="50" width="140" height="8" rx="4" fill="#047857"/>
      <text x="480" y="74" fill="#64748B" font-size="11">4 Pages • All verified</text>

      <!-- Entities Breakdown -->
      <g transform="translate(680, 28)">
        <rect x="0" y="0" width="70" height="24" rx="4" fill="#ECFDF5"/>
        <text x="10" y="16" fill="#065F46" font-size="11" font-weight="600">42 Crops</text>

        <rect x="78" y="0" width="78" height="24" rx="4" fill="#FEF2F2"/>
        <text x="88" y="16" fill="#991B1B" font-size="11" font-weight="600">38 Pests</text>

        <rect x="164" y="0" width="85" height="24" rx="4" fill="#F5F3FF"/>
        <text x="174" y="16" fill="#5B21B6" font-size="11" font-weight="600">54 Chems</text>
      </g>
      <text x="680" y="74" fill="#64748B" font-size="11">Total: 142 tags (118 Model, 24 Manual)</text>

      <!-- Status Badge -->
      <rect x="960" y="36" width="110" height="26" rx="13" fill="#ECFDF5" stroke="#86EFAC" stroke-width="1"/>
      <circle cx="974" cy="49" r="4" fill="#16A34A"/>
      <text x="986" y="53" fill="#166534" font-size="11" font-weight="700">Completed</text>

      <!-- Action Button -->
      <g transform="translate(1140, 32)">
        <rect x="0" y="0" width="115" height="34" rx="6" fill="#047857"/>
        <text x="18" y="21" fill="#FFFFFF" font-size="12" font-weight="600">Open Studio →</text>
      </g>
    </g>

    <!-- Row 2: IMD Agromet Punjab (In Progress) -->
    <g transform="translate(0, 140)">
      <line x1="0" y1="96" x2="1360" y2="96" stroke="#E2E8F0" stroke-width="1"/>

      <text x="24" y="38" fill="#0F172A" font-size="14" font-weight="700">IMD_Agromet_Punjab_Kharif_Bulletin.json</text>
      <text x="24" y="58" fill="#64748B" font-size="12">India Meteorological Department • District Agromet Advisory Service</text>
      <text x="24" y="78" fill="#64748B" font-size="11">Uploaded today at 11:20 AM</text>

      <!-- Format Badge -->
      <rect x="380" y="36" width="55" height="24" rx="4" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1"/>
      <text x="392" y="52" fill="#1E40AF" font-size="11" font-weight="700">.JSON</text>

      <!-- Progress Bar -->
      <text x="480" y="38" fill="#0F172A" font-size="13" font-weight="600">46 / 64 Lines (72%)</text>
      <rect x="480" y="50" width="140" height="8" rx="4" fill="#E2E8F0"/>
      <rect x="480" y="50" width="100" height="8" rx="4" fill="#2563EB"/>
      <text x="480" y="74" fill="#64748B" font-size="11">18 lines remaining</text>

      <!-- Entities Breakdown -->
      <g transform="translate(680, 28)">
        <rect x="0" y="0" width="70" height="24" rx="4" fill="#ECFDF5"/>
        <text x="10" y="16" fill="#065F46" font-size="11" font-weight="600">58 Crops</text>

        <rect x="78" y="0" width="78" height="24" rx="4" fill="#FEF2F2"/>
        <text x="88" y="16" fill="#991B1B" font-size="11" font-weight="600">44 Pests</text>

        <rect x="164" y="0" width="85" height="24" rx="4" fill="#FFFBEB"/>
        <text x="174" y="16" fill="#92400E" font-size="11" font-weight="600">62 Fertils</text>
      </g>
      <text x="680" y="74" fill="#64748B" font-size="11">Total: 198 tags (172 Model, 26 Manual)</text>

      <!-- Status Badge -->
      <rect x="960" y="36" width="115" height="26" rx="13" fill="#EFF6FF" stroke="#93C5FD" stroke-width="1"/>
      <circle cx="974" cy="49" r="4" fill="#2563EB"/>
      <text x="986" y="53" fill="#1E40AF" font-size="11" font-weight="700">In Progress</text>

      <!-- Action Button -->
      <g transform="translate(1140, 32)">
        <rect x="0" y="0" width="115" height="34" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
        <text x="18" y="21" fill="#334155" font-size="12" font-weight="600">Continue →</text>
      </g>
    </g>

    <!-- Row 3: ICAR Mustard Bulletin (Needs Review) -->
    <g transform="translate(0, 236)">
      <line x1="0" y1="96" x2="1360" y2="96" stroke="#E2E8F0" stroke-width="1"/>

      <text x="24" y="38" fill="#0F172A" font-size="14" font-weight="700">ICAR_Mustard_Aphid_Management_Dec.jsonl</text>
      <text x="24" y="58" fill="#64748B" font-size="12">ICAR-Directorate of Rapeseed-Mustard Research • Special Pest Advisory</text>
      <text x="24" y="78" fill="#64748B" font-size="11">Requires confidence review for agrochemicals</text>

      <!-- Format Badge -->
      <rect x="380" y="36" width="60" height="24" rx="4" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="1"/>
      <text x="392" y="52" fill="#065F46" font-size="11" font-weight="700">.JSONL</text>

      <!-- Progress Bar -->
      <text x="480" y="38" fill="#0F172A" font-size="13" font-weight="600">8 / 32 Lines (25%)</text>
      <rect x="480" y="50" width="140" height="8" rx="4" fill="#E2E8F0"/>
      <rect x="480" y="50" width="35" height="8" rx="4" fill="#D97706"/>
      <text x="480" y="74" fill="#64748B" font-size="11">24 lines pending</text>

      <!-- Entities Breakdown -->
      <g transform="translate(680, 28)">
        <rect x="0" y="0" width="70" height="24" rx="4" fill="#ECFDF5"/>
        <text x="10" y="16" fill="#065F46" font-size="11" font-weight="600">22 Crops</text>

        <rect x="78" y="0" width="78" height="24" rx="4" fill="#FEF2F2"/>
        <text x="88" y="16" fill="#991B1B" font-size="11" font-weight="600">45 Pests</text>
      </g>
      <text x="680" y="74" fill="#64748B" font-size="11">Total: 85 tags (68 Model, 17 Manual)</text>

      <!-- Status Badge -->
      <rect x="960" y="36" width="120" height="26" rx="13" fill="#FFFBEB" stroke="#FCD34D" stroke-width="1"/>
      <circle cx="974" cy="49" r="4" fill="#D97706"/>
      <text x="986" y="53" fill="#92400E" font-size="11" font-weight="700">Needs Review</text>

      <!-- Action Button -->
      <g transform="translate(1140, 32)">
        <rect x="0" y="0" width="115" height="34" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
        <text x="24" y="21" fill="#334155" font-size="12" font-weight="600">Review →</text>
      </g>
    </g>

    <!-- Row 4: Horticulture Citrus Advisory -->
    <g transform="translate(0, 332)">
      <text x="24" y="38" fill="#0F172A" font-size="14" font-weight="700">Horticulture_Citrus_Canker_Advisory.json</text>
      <text x="24" y="58" fill="#64748B" font-size="12">Punjab Horticulture Department • Kinnow &amp; Sweet Orange Special Alert</text>
      <text x="24" y="78" fill="#64748B" font-size="11">Uploaded 1 hour ago</text>

      <!-- Format Badge -->
      <rect x="380" y="36" width="55" height="24" rx="4" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1"/>
      <text x="392" y="52" fill="#1E40AF" font-size="11" font-weight="700">.JSON</text>

      <!-- Progress Bar -->
      <text x="480" y="38" fill="#0F172A" font-size="13" font-weight="600">0 / 28 Lines (0%)</text>
      <rect x="480" y="50" width="140" height="8" rx="4" fill="#E2E8F0"/>
      <text x="480" y="74" fill="#64748B" font-size="11">Awaiting review</text>

      <!-- Entities Breakdown -->
      <g transform="translate(680, 28)">
        <rect x="0" y="0" width="140" height="24" rx="4" fill="#F1F5F9"/>
        <text x="12" y="16" fill="#475569" font-size="11" font-weight="600">64 Model Entities</text>
      </g>
      <text x="680" y="74" fill="#64748B" font-size="11">Auto-detected by AgRoBERTa</text>

      <!-- Status Badge -->
      <rect x="960" y="36" width="100" height="26" rx="13" fill="#F1F5F9" stroke="#E2E8F0" stroke-width="1"/>
      <circle cx="974" cy="49" r="4" fill="#64748B"/>
      <text x="986" y="53" fill="#475569" font-size="11" font-weight="700">Queued</text>

      <!-- Action Button -->
      <g transform="translate(1140, 32)">
        <rect x="0" y="0" width="115" height="34" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
        <text x="24" y="21" fill="#334155" font-size="12" font-weight="600">Start →</text>
      </g>
    </g>
  </g>
</svg>"""
    return svg

# Write screen 1
s1_path = os.path.join(OUTPUT_DIR, "CSIO_AgNER_01_Dashboard.svg")
with open(s1_path, "w", encoding="utf-8") as f:
    f.write(generate_screen_1())
print(f"Generated: {s1_path}")

# ---------------------------------------------------------------------------
# SCREEN 2: 1-LINE FOCUS ANNOTATION STUDIO (1440 x 960)
# ---------------------------------------------------------------------------
def generate_screen_2():
    svg = """<svg width="1440" height="960" viewBox="0 0 1440 960" fill="none" xmlns="http://www.w3.org/2000/svg" style="background:#F8FAFC; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <filter id="cardShadow" x="-5" y="-2" width="100%" height="100%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="10" flood-color="#0F172A" flood-opacity="0.05"/>
    </filter>
    <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0B1528"/>
      <stop offset="100%" stop-color="#162A45"/>
    </linearGradient>
  </defs>

  <!-- Top Navigation Header -->
  <rect width="1440" height="64" fill="url(#headerGrad)"/>
  <line x1="0" y1="64" x2="1440" y2="64" stroke="#1E293B" stroke-width="1"/>

  <g transform="translate(32, 14)">
    <!-- Back to Corpus Icon -->
    <rect x="0" y="2" width="32" height="32" rx="6" fill="#1E293B"/>
    <path d="M19 12L13 18L19 24" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    
    <text x="44" y="17" fill="#FFFFFF" font-size="14" font-weight="700">PAU_Ludhiana_Wheat_Advisory_Nov2025.jsonl</text>
    <text x="44" y="31" fill="#94A3B8" font-size="11">CSIR-CSIO Precision Agro-Informatics • AgNER Studio</text>
  </g>

  <!-- Center View Mode Toggle -->
  <g transform="translate(620, 16)">
    <rect x="0" y="0" width="260" height="32" rx="8" fill="#1E293B" stroke="#334155" stroke-width="1"/>
    <!-- Active Tab: 1-Line Focus Mode -->
    <rect x="3" y="3" width="138" height="26" rx="6" fill="#047857"/>
    <text x="14" y="20" fill="#FFFFFF" font-size="11" font-weight="700">1-Line Focus Mode</text>
    <!-- Inactive Tab: Full Overview -->
    <text x="154" y="20" fill="#94A3B8" font-size="11" font-weight="500">Full Overview</text>
  </g>

  <!-- Right Header Actions -->
  <g transform="translate(1180, 16)">
    <rect x="0" y="0" width="110" height="32" rx="6" fill="#1E293B" stroke="#334155" stroke-width="1"/>
    <circle cx="16" cy="16" r="4" fill="#10B981"/>
    <text x="28" y="20" fill="#E2E8F0" font-size="11" font-weight="600">Model: 85%</text>

    <!-- Help Button -->
    <rect x="120" y="0" width="32" height="32" rx="6" fill="#1E293B"/>
    <text x="131" y="21" fill="#94A3B8" font-size="13" font-weight="600">?</text>

    <!-- Close Button -->
    <rect x="160" y="0" width="60" height="32" rx="6" fill="#334155"/>
    <text x="175" y="20" fill="#FFFFFF" font-size="11" font-weight="600">Exit</text>
  </g>

  <!-- Main Workspace Grid: Left Stage (920px), Right Palette (440px) -->
  <g transform="translate(32, 80)">
    
    <!-- LEFT MAIN STAGE -->
    <g transform="translate(0, 0)">
      
      <!-- Top Navigator Bar with Page, Line, and Progress Slider -->
      <rect x="0" y="0" width="910" height="52" rx="10" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
      
      <g transform="translate(16, 12)">
        <!-- Page Indicator -->
        <rect x="0" y="0" width="130" height="28" rx="6" fill="#F1F5F9"/>
        <text x="10" y="18" fill="#475569" font-size="11">Page <tspan font-weight="700" fill="#0F172A">2</tspan> of 4 (2 left)</text>

        <!-- Line Indicator -->
        <rect x="140" y="0" width="165" height="28" rx="6" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1"/>
        <text x="150" y="18" fill="#1E40AF" font-size="11" font-weight="700">Sentence 14 <tspan font-weight="400" fill="#3B82F6">of 48</tspan> (34 left)</text>

        <!-- Section Tag -->
        <rect x="315" y="0" width="220" height="28" rx="6" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1"/>
        <text x="325" y="18" fill="#334155" font-size="11" font-weight="600">Section: Crop Advisory (Wheat)</text>
      </g>

      <!-- Sentence Navigation Mini-Arrows -->
      <g transform="translate(750, 12)">
        <rect x="0" y="0" width="70" height="28" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
        <text x="12" y="18" fill="#334155" font-size="11" font-weight="600">← Prev</text>

        <rect x="80" y="0" width="70" height="28" rx="6" fill="#047857"/>
        <text x="94" y="18" fill="#FFFFFF" font-size="11" font-weight="600">Next →</text>
      </g>

      <!-- PRIMARY ANNOTATION CANVAS (The Focused Sentence) -->
      <g transform="translate(0, 68)">
        <rect x="0" y="0" width="910" height="290" rx="14" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5" filter="url(#cardShadow)"/>
        
        <!-- Active Focus Header -->
        <rect x="0" y="0" width="910" height="40" rx="14" fill="#F8FAFC"/>
        <line x1="0" y1="40" x2="910" y2="40" stroke="#E2E8F0" stroke-width="1"/>
        <text x="20" y="25" fill="#047857" font-size="12" font-weight="700">ACTIVE SENTENCE UNDER ANNOTATION</text>
        <text x="730" y="25" fill="#64748B" font-size="11">Select text with cursor to tag</text>

        <!-- THE SENTENCE WITH EMBEDDED HIGH-CONTRAST TOKENS -->
        <g transform="translate(24, 60)">
          <!-- Plain Text: Apply -->
          <text x="0" y="32" fill="#0F172A" font-size="18" font-weight="500">Apply </text>

          <!-- TOKEN 1: chlorpyriphos 20 EC (Agrochemical) -->
          <g transform="translate(58, 8)">
            <rect x="0" y="0" width="225" height="36" rx="6" fill="#F5F3FF" stroke="#7C3AED" stroke-width="1.5"/>
            <text x="10" y="23" fill="#5B21B6" font-size="16" font-weight="700">chlorpyriphos 20 EC</text>
            <!-- Badge -->
            <rect x="180" y="6" width="38" height="16" rx="3" fill="#7C3AED"/>
            <text x="184" y="18" fill="#FFFFFF" font-size="9" font-weight="700">CHEM</text>
          </g>

          <!-- Plain Text: @ 1 litre per acre with irrigation water for the control of -->
          <text x="290" y="32" fill="#0F172A" font-size="18" font-weight="500"> @ 1 litre per acre with irrigation water for</text>
          <text x="0" y="80" fill="#0F172A" font-size="18" font-weight="500">the control of </text>

          <!-- TOKEN 2: termites (Pest) -->
          <g transform="translate(118, 56)">
            <rect x="0" y="0" width="110" height="36" rx="6" fill="#FEF2F2" stroke="#DC2626" stroke-width="1.5"/>
            <text x="10" y="23" fill="#991B1B" font-size="16" font-weight="700">termites</text>
            <rect x="74" y="6" width="30" height="16" rx="3" fill="#DC2626"/>
            <text x="77" y="18" fill="#FFFFFF" font-size="9" font-weight="700">PEST</text>
          </g>

          <!-- Plain Text: in -->
          <text x="238" y="80" fill="#0F172A" font-size="18" font-weight="500"> in </text>

          <!-- TOKEN 3: late sown wheat (Crop) -->
          <g transform="translate(268, 56)">
            <rect x="0" y="0" width="180" height="36" rx="6" fill="#ECFDF5" stroke="#059669" stroke-width="1.5"/>
            <text x="10" y="23" fill="#065F46" font-size="16" font-weight="700">late sown wheat</text>
            <rect x="138" y="6" width="34" height="16" rx="3" fill="#059669"/>
            <text x="142" y="18" fill="#FFFFFF" font-size="9" font-weight="700">CROP</text>
          </g>

          <!-- Plain Text: during -->
          <text x="458" y="80" fill="#0F172A" font-size="18" font-weight="500"> during </text>

          <!-- TOKEN 4: first irrigation (CRI stage) (Phenology / Manual Tag) -->
          <g transform="translate(528, 56)">
            <rect x="0" y="0" width="295" height="36" rx="6" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.5"/>
            <text x="10" y="23" fill="#1E40AF" font-size="16" font-weight="700">first irrigation (CRI stage)</text>
            <rect x="238" y="6" width="48" height="16" rx="3" fill="#2563EB"/>
            <text x="242" y="18" fill="#FFFFFF" font-size="9" font-weight="700">STAGE</text>
          </g>

          <!-- Plain text closing dot -->
          <text x="828" y="80" fill="#0F172A" font-size="18" font-weight="500">.</text>
        </g>

        <!-- Provenance & Token Quick Status Chips -->
        <g transform="translate(24, 185)">
          <line x1="0" y1="0" x2="862" y2="0" stroke="#F1F5F9" stroke-width="1"/>
          
          <text x="0" y="25" fill="#475569" font-size="11" font-weight="600">TOKENS ON THIS LINE (4 DETECTED):</text>

          <!-- Token summary pills -->
          <g transform="translate(200, 10)">
            <rect x="0" y="0" width="145" height="24" rx="4" fill="#F5F3FF" stroke="#DDD6FE" stroke-width="1"/>
            <circle cx="12" cy="12" r="3" fill="#7C3AED"/>
            <text x="22" y="16" fill="#5B21B6" font-size="11" font-weight="600">chlorpyriphos (98%)</text>

            <rect x="155" y="0" width="110" height="24" rx="4" fill="#FEF2F2" stroke="#FECACA" stroke-width="1"/>
            <circle cx="167" cy="12" r="3" fill="#DC2626"/>
            <text x="177" y="16" fill="#991B1B" font-size="11" font-weight="600">termites (95%)</text>

            <rect x="275" y="0" width="140" height="24" rx="4" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="1"/>
            <circle cx="287" cy="12" r="3" fill="#059669"/>
            <text x="297" y="16" fill="#065F46" font-size="11" font-weight="600">late wheat (99%)</text>

            <rect x="425" y="0" width="140" height="24" rx="4" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1"/>
            <circle cx="437" cy="12" r="3" fill="#2563EB"/>
            <text x="447" y="16" fill="#1E40AF" font-size="11" font-weight="600">CRI stage (Manual)</text>
          </g>
        </g>

        <!-- Line Action Toolbar -->
        <g transform="translate(24, 235)">
          <!-- Save Line Button -->
          <rect x="0" y="0" width="140" height="38" rx="8" fill="#047857"/>
          <text x="22" y="24" fill="#FFFFFF" font-size="13" font-weight="700">Save Line [Ctrl+S]</text>

          <!-- Approve All Button -->
          <rect x="150" y="0" width="150" height="38" rx="8" fill="#F0FDF4" stroke="#86EFAC" stroke-width="1"/>
          <text x="170" y="24" fill="#166534" font-size="12" font-weight="600">✓ Approve All [A]</text>

          <!-- Reset Line Button -->
          <rect x="310" y="0" width="110" height="38" rx="8" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
          <text x="330" y="24" fill="#475569" font-size="12" font-weight="600">Reset Line</text>

          <!-- Keyboard Shortcuts Micro Bar -->
          <text x="560" y="24" fill="#64748B" font-size="11">Shortcuts: <tspan font-weight="600" fill="#334155">←/→ Nav</tspan> • <tspan font-weight="600" fill="#334155">A: Approve</tspan> • <tspan font-weight="600" fill="#334155">1-8: Assign Entity</tspan></text>
        </g>
      </g>

      <!-- VERIFICATION & PROVENANCE INSPECTOR TABLE (Below Canvas) -->
      <g transform="translate(0, 375)">
        <rect x="0" y="0" width="910" height="315" rx="12" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
        
        <!-- Table Header -->
        <rect x="0" y="0" width="910" height="36" rx="12" fill="#F8FAFC"/>
        <line x1="0" y1="36" x2="910" y2="36" stroke="#E2E8F0" stroke-width="1"/>
        <text x="20" y="23" fill="#475569" font-size="11" font-weight="700">ENTITY PHRASE</text>
        <text x="240" y="23" fill="#475569" font-size="11" font-weight="700">TYPE / CLASS</text>
        <text x="390" y="23" fill="#475569" font-size="11" font-weight="700">OFFSETS</text>
        <text x="490" y="23" fill="#475569" font-size="11" font-weight="700">CONFIDENCE</text>
        <text x="610" y="23" fill="#475569" font-size="11" font-weight="700">PROVENANCE</text>
        <text x="760" y="23" fill="#475569" font-size="11" font-weight="700">DECISION</text>

        <!-- Table Row 1: Chlorpyriphos -->
        <g transform="translate(0, 36)">
          <line x1="0" y1="54" x2="910" y2="54" stroke="#F1F5F9" stroke-width="1"/>
          <text x="20" y="32" fill="#0F172A" font-size="13" font-weight="600">chlorpyriphos 20 EC</text>
          
          <rect x="240" y="16" width="90" height="24" rx="4" fill="#F5F3FF" stroke="#DDD6FE" stroke-width="1"/>
          <text x="250" y="32" fill="#5B21B6" font-size="11" font-weight="700">CHEMICAL</text>

          <text x="390" y="32" fill="#64748B" font-size="12" font-family="'JetBrains Mono', monospace">[6 : 25]</text>
          
          <!-- Confidence Gauge -->
          <text x="490" y="32" fill="#047857" font-size="12" font-weight="700">98.4%</text>
          <rect x="540" y="24" width="45" height="6" rx="3" fill="#E2E8F0"/>
          <rect x="540" y="24" width="44" height="6" rx="3" fill="#047857"/>

          <!-- Provenance Badge -->
          <rect x="610" y="16" width="105" height="24" rx="12" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
          <text x="622" y="32" fill="#334155" font-size="11" font-weight="600">⚡ Model AI</text>

          <!-- Action buttons -->
          <rect x="760" y="15" width="60" height="26" rx="4" fill="#ECFDF5"/>
          <text x="772" y="32" fill="#065F46" font-size="11" font-weight="600">Accept</text>
          <rect x="830" y="15" width="55" height="26" rx="4" fill="#FEF2F2"/>
          <text x="842" y="32" fill="#991B1B" font-size="11" font-weight="600">Delete</text>
        </g>

        <!-- Table Row 2: Termites -->
        <g transform="translate(0, 90)">
          <line x1="0" y1="54" x2="910" y2="54" stroke="#F1F5F9" stroke-width="1"/>
          <text x="20" y="32" fill="#0F172A" font-size="13" font-weight="600">termites</text>
          
          <rect x="240" y="16" width="70" height="24" rx="4" fill="#FEF2F2" stroke="#FECACA" stroke-width="1"/>
          <text x="250" y="32" fill="#991B1B" font-size="11" font-weight="700">PEST</text>

          <text x="390" y="32" fill="#64748B" font-size="12" font-family="'JetBrains Mono', monospace">[73 : 81]</text>
          
          <text x="490" y="32" fill="#047857" font-size="12" font-weight="700">95.1%</text>
          <rect x="540" y="24" width="45" height="6" rx="3" fill="#E2E8F0"/>
          <rect x="540" y="24" width="42" height="6" rx="3" fill="#047857"/>

          <rect x="610" y="16" width="105" height="24" rx="12" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
          <text x="622" y="32" fill="#334155" font-size="11" font-weight="600">⚡ Model AI</text>

          <rect x="760" y="15" width="60" height="26" rx="4" fill="#ECFDF5"/>
          <text x="772" y="32" fill="#065F46" font-size="11" font-weight="600">Accept</text>
          <rect x="830" y="15" width="55" height="26" rx="4" fill="#FEF2F2"/>
          <text x="842" y="32" fill="#991B1B" font-size="11" font-weight="600">Delete</text>
        </g>

        <!-- Table Row 3: Late Sown Wheat -->
        <g transform="translate(0, 144)">
          <line x1="0" y1="54" x2="910" y2="54" stroke="#F1F5F9" stroke-width="1"/>
          <text x="20" y="32" fill="#0F172A" font-size="13" font-weight="600">late sown wheat</text>
          
          <rect x="240" y="16" width="70" height="24" rx="4" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="1"/>
          <text x="250" y="32" fill="#065F46" font-size="11" font-weight="700">CROP</text>

          <text x="390" y="32" fill="#64748B" font-size="12" font-family="'JetBrains Mono', monospace">[85 : 100]</text>
          
          <text x="490" y="32" fill="#047857" font-size="12" font-weight="700">99.2%</text>
          <rect x="540" y="24" width="45" height="6" rx="3" fill="#E2E8F0"/>
          <rect x="540" y="24" width="45" height="6" rx="3" fill="#047857"/>

          <rect x="610" y="16" width="105" height="24" rx="12" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
          <text x="622" y="32" fill="#334155" font-size="11" font-weight="600">⚡ Model AI</text>

          <rect x="760" y="15" width="60" height="26" rx="4" fill="#ECFDF5"/>
          <text x="772" y="32" fill="#065F46" font-size="11" font-weight="600">Accept</text>
          <rect x="830" y="15" width="55" height="26" rx="4" fill="#FEF2F2"/>
          <text x="842" y="32" fill="#991B1B" font-size="11" font-weight="600">Delete</text>
        </g>

        <!-- Table Row 4: CRI Stage (Manual Provenance Tag) -->
        <g transform="translate(0, 198)">
          <rect x="0" y="0" width="910" height="54" fill="#F0FDF4" opacity="0.6"/>
          <line x1="0" y1="54" x2="910" y2="54" stroke="#F1F5F9" stroke-width="1"/>
          <text x="20" y="32" fill="#0F172A" font-size="13" font-weight="700">first irrigation (CRI stage)</text>
          
          <rect x="240" y="16" width="85" height="24" rx="4" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1"/>
          <text x="250" y="32" fill="#1E40AF" font-size="11" font-weight="700">STAGE</text>

          <text x="390" y="32" fill="#64748B" font-size="12" font-family="'JetBrains Mono', monospace">[122 : 148]</text>
          
          <text x="490" y="32" fill="#166534" font-size="12" font-weight="700">100%</text>
          <rect x="540" y="24" width="45" height="6" rx="3" fill="#E2E8F0"/>
          <rect x="540" y="24" width="45" height="6" rx="3" fill="#16A34A"/>

          <!-- Manual Provenance Badge -->
          <rect x="610" y="16" width="125" height="24" rx="12" fill="#DCFCE7" stroke="#86EFAC" stroke-width="1"/>
          <text x="622" y="32" fill="#166534" font-size="11" font-weight="700">✍ Annotator</text>

          <!-- Verified state -->
          <rect x="760" y="15" width="75" height="26" rx="4" fill="#047857"/>
          <text x="770" y="32" fill="#FFFFFF" font-size="11" font-weight="600">✓ Saved</text>
        </g>
      </g>
    </g>

    <!-- RIGHT SIDEBAR: CATEGORIZED 36 ENTITY TYPES PALETTE (450px) -->
    <g transform="translate(930, 0)">
      <rect x="0" y="0" width="445" height="690" rx="14" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
      
      <!-- Palette Header -->
      <rect x="0" y="0" width="445" height="50" rx="14" fill="#F8FAFC"/>
      <line x1="0" y1="50" x2="445" y2="50" stroke="#E2E8F0" stroke-width="1"/>
      <text x="20" y="30" fill="#0F172A" font-size="13" font-weight="700">AgNER Entity Palette</text>
      <text x="320" y="30" fill="#047857" font-size="11" font-weight="600">36 Entity Types</text>

      <!-- Search Input -->
      <g transform="translate(16, 62)">
        <rect x="0" y="0" width="413" height="36" rx="8" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
        <text x="14" y="23" fill="#94A3B8" font-size="12">Search entities by name or type... [/]</text>
      </g>

      <!-- Semantic Category Tabs -->
      <g transform="translate(16, 110)">
        <rect x="0" y="0" width="60" height="26" rx="6" fill="#047857"/>
        <text x="18" y="17" fill="#FFFFFF" font-size="11" font-weight="700">All</text>

        <rect x="68" y="0" width="70" height="26" rx="6" fill="#ECFDF5"/>
        <text x="78" y="17" fill="#065F46" font-size="11" font-weight="600">Crops (8)</text>

        <rect x="146" y="0" width="70" height="26" rx="6" fill="#FEF2F2"/>
        <text x="156" y="17" fill="#991B1B" font-size="11" font-weight="600">Pests (8)</text>

        <rect x="224" y="0" width="75" height="26" rx="6" fill="#F5F3FF"/>
        <text x="234" y="17" fill="#5B21B6" font-size="11" font-weight="600">Chems (6)</text>

        <rect x="307" y="0" width="65" height="26" rx="6" fill="#EFF6FF"/>
        <text x="317" y="17" fill="#1E40AF" font-size="11" font-weight="600">Stages</text>

        <rect x="380" y="0" width="50" height="26" rx="6" fill="#FFFBEB"/>
        <text x="390" y="17" fill="#92400E" font-size="11" font-weight="600">Soil</text>
      </g>

      <!-- Entity Grid List -->
      <g transform="translate(16, 150)">
        
        <!-- Category 1: Crops & Varieties -->
        <text x="0" y="16" fill="#64748B" font-size="10" font-weight="700">CROPS &amp; BOTANICAL VARIETIES</text>
        <g transform="translate(0, 26)">
          <!-- CROP -->
          <rect x="0" y="0" width="195" height="34" rx="6" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="1"/>
          <rect x="8" y="6" width="22" height="22" rx="4" fill="#059669"/>
          <text x="15" y="21" fill="#FFFFFF" font-size="10" font-weight="700">1</text>
          <text x="36" y="21" fill="#065F46" font-size="12" font-weight="700">CROP</text>
          <text x="145" y="21" fill="#047857" font-size="10">Wheat...</text>

          <!-- VARIETY -->
          <rect x="210" y="0" width="195" height="34" rx="6" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="1"/>
          <rect x="218" y="6" width="22" height="22" rx="4" fill="#059669"/>
          <text x="225" y="21" fill="#FFFFFF" font-size="10" font-weight="700">2</text>
          <text x="246" y="21" fill="#065F46" font-size="12" font-weight="700">VARIETY</text>
          <text x="350" y="21" fill="#047857" font-size="10">PBW-725</text>
        </g>

        <!-- Category 2: Pathogens, Pests & Weeds -->
        <text x="0" y="86" fill="#64748B" font-size="10" font-weight="700">PESTS, PATHOGENS &amp; WEEDS</text>
        <g transform="translate(0, 96)">
          <!-- PEST -->
          <rect x="0" y="0" width="195" height="34" rx="6" fill="#FEF2F2" stroke="#FECACA" stroke-width="1"/>
          <rect x="8" y="6" width="22" height="22" rx="4" fill="#DC2626"/>
          <text x="15" y="21" fill="#FFFFFF" font-size="10" font-weight="700">3</text>
          <text x="36" y="21" fill="#991B1B" font-size="12" font-weight="700">PEST</text>
          <text x="145" y="21" fill="#DC2626" font-size="10">Aphid...</text>

          <!-- DISEASE -->
          <rect x="210" y="0" width="195" height="34" rx="6" fill="#FEF2F2" stroke="#FECACA" stroke-width="1"/>
          <rect x="218" y="6" width="22" height="22" rx="4" fill="#DC2626"/>
          <text x="225" y="21" fill="#FFFFFF" font-size="10" font-weight="700">4</text>
          <text x="246" y="21" fill="#991B1B" font-size="12" font-weight="700">DISEASE</text>
          <text x="345" y="21" fill="#DC2626" font-size="10">Yellow Rust</text>
        </g>

        <!-- Category 3: Agrochemicals & Fertilizers -->
        <text x="0" y="156" fill="#64748B" font-size="10" font-weight="700">AGROCHEMICALS &amp; NUTRIENTS</text>
        <g transform="translate(0, 166)">
          <!-- CHEMICAL -->
          <rect x="0" y="0" width="195" height="34" rx="6" fill="#F5F3FF" stroke="#DDD6FE" stroke-width="1"/>
          <rect x="8" y="6" width="22" height="22" rx="4" fill="#7C3AED"/>
          <text x="15" y="21" fill="#FFFFFF" font-size="10" font-weight="700">5</text>
          <text x="36" y="21" fill="#5B21B6" font-size="12" font-weight="700">CHEMICAL</text>
          <text x="135" y="21" fill="#7C3AED" font-size="10">Pesticide</text>

          <!-- FERTILIZER -->
          <rect x="210" y="0" width="195" height="34" rx="6" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1"/>
          <rect x="218" y="6" width="22" height="22" rx="4" fill="#D97706"/>
          <text x="225" y="21" fill="#FFFFFF" font-size="10" font-weight="700">6</text>
          <text x="246" y="21" fill="#92400E" font-size="12" font-weight="700">FERTILIZER</text>
          <text x="350" y="21" fill="#D97706" font-size="10">Urea, DAP</text>
        </g>

        <!-- Category 4: Phenology & Agricultural Operations -->
        <text x="0" y="226" fill="#64748B" font-size="10" font-weight="700">PHENOLOGY &amp; OPERATIONS</text>
        <g transform="translate(0, 236)">
          <!-- STAGE -->
          <rect x="0" y="0" width="195" height="34" rx="6" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1"/>
          <rect x="8" y="6" width="22" height="22" rx="4" fill="#2563EB"/>
          <text x="15" y="21" fill="#FFFFFF" font-size="10" font-weight="700">7</text>
          <text x="36" y="21" fill="#1E40AF" font-size="12" font-weight="700">STAGE</text>
          <text x="140" y="21" fill="#2563EB" font-size="10">CRI, Tillering</text>

          <!-- OPERATION -->
          <rect x="210" y="0" width="195" height="34" rx="6" fill="#ECFEFF" stroke="#A5F3FC" stroke-width="1"/>
          <rect x="218" y="6" width="22" height="22" rx="4" fill="#0891B2"/>
          <text x="225" y="21" fill="#FFFFFF" font-size="10" font-weight="700">8</text>
          <text x="246" y="21" fill="#155E75" font-size="12" font-weight="700">OPERATION</text>
          <text x="345" y="21" fill="#0891B2" font-size="10">Irrigation</text>
        </g>

        <!-- Category 5: Soil, Weather & Dosage -->
        <text x="0" y="296" fill="#64748B" font-size="10" font-weight="700">SOIL, WEATHER &amp; MEASUREMENTS</text>
        <g transform="translate(0, 306)">
          <rect x="0" y="0" width="130" height="32" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
          <text x="12" y="20" fill="#334155" font-size="11" font-weight="600">DOSAGE (g/ha)</text>

          <rect x="140" y="0" width="130" height="32" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
          <text x="152" y="20" fill="#334155" font-size="11" font-weight="600">WEATHER</text>

          <rect x="280" y="0" width="125" height="32" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
          <text x="292" y="20" fill="#334155" font-size="11" font-weight="600">SOIL_TYPE</text>
        </g>

        <!-- Category 6: Livestock & Veterinary -->
        <text x="0" y="366" fill="#64748B" font-size="10" font-weight="700">LIVESTOCK &amp; ANIMAL HUSBANDRY</text>
        <g transform="translate(0, 376)">
          <rect x="0" y="0" width="130" height="32" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
          <text x="12" y="20" fill="#334155" font-size="11" font-weight="600">ANIMAL_BREED</text>

          <rect x="140" y="0" width="130" height="32" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
          <text x="152" y="20" fill="#334155" font-size="11" font-weight="600">VET_VACCINE</text>

          <rect x="280" y="0" width="125" height="32" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
          <text x="292" y="20" fill="#334155" font-size="11" font-weight="600">FODDER</text>
        </g>

        <!-- Quick Help Note -->
        <g transform="translate(0, 440)">
          <rect x="0" y="0" width="413" height="70" rx="8" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1"/>
          <text x="14" y="24" fill="#047857" font-size="11" font-weight="700">💡 Tip for Fast Annotation:</text>
          <text x="14" y="42" fill="#475569" font-size="11">Highlight any word or phrase with cursor, then tap keys [1] - [8]</text>
          <text x="14" y="58" fill="#475569" font-size="11">to immediately apply that entity tag without lifting hands from keyboard.</text>
        </g>
      </g>
    </g>
  </g>

  <!-- STICKY ANNOTATION BOTTOM BAR (Export & Status Station) -->
  <g transform="translate(32, 880)">
    <rect x="0" y="0" width="1376" height="64" rx="14" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" filter="url(#cardShadow)"/>
    
    <!-- Left: Status Counters -->
    <g transform="translate(20, 16)">
      <!-- Page Badge -->
      <rect x="0" y="0" width="130" height="32" rx="6" fill="#F1F5F9"/>
      <text x="10" y="20" fill="#475569" font-size="12">Page <tspan font-weight="700" fill="#0F172A">2</tspan> of 4 (2 left)</text>

      <!-- Line Badge -->
      <rect x="140" y="0" width="170" height="32" rx="6" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1"/>
      <text x="150" y="20" fill="#1E40AF" font-size="12" font-weight="700">Line 14 <tspan font-weight="400">of 48</tspan> (34 remaining)</text>

      <!-- Annotations Done -->
      <rect x="320" y="0" width="270" height="32" rx="6" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="1"/>
      <text x="330" y="20" fill="#065F46" font-size="12" font-weight="700">Done: 34 <tspan font-weight="400">(6 manual, 28 model)</tspan></text>
    </g>

    <!-- Center: Progress Bar -->
    <g transform="translate(680, 22)">
      <text x="0" y="14" fill="#64748B" font-size="12">Progress:</text>
      <rect x="65" y="4" width="140" height="10" rx="5" fill="#E2E8F0"/>
      <rect x="65" y="4" width="67" height="10" rx="5" fill="#047857"/>
      <text x="215" y="14" fill="#0F172A" font-size="12" font-weight="700">48%</text>
    </g>

    <!-- Right: EXPORT BUTTONS (Only JSON file and JSONL file) -->
    <g transform="translate(1030, 14)">
      <!-- Primary Download JSON file -->
      <rect x="0" y="0" width="160" height="36" rx="8" fill="#047857"/>
      <path d="M18 18V24M14 20L18 24L22 20" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
      <text x="28" y="23" fill="#FFFFFF" font-size="12" font-weight="700">Download JSON file</text>

      <!-- Dropdown Split / JSONL Trigger -->
      <rect x="170" y="0" width="160" height="36" rx="8" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
      <path d="M188 18V24M184 20L188 24L192 20" stroke="#334155" stroke-width="2" stroke-linecap="round"/>
      <text x="200" y="23" fill="#0F172A" font-size="12" font-weight="600">Download JSONL file</text>
    </g>
  </g>
</svg>"""
    return svg

# Write screen 2
s2_path = os.path.join(OUTPUT_DIR, "CSIO_AgNER_02_Focus_Annotation_Studio.svg")
with open(s2_path, "w", encoding="utf-8") as f:
    f.write(generate_screen_2())
print(f"Generated: {s2_path}")

# ---------------------------------------------------------------------------
# SCREEN 3: FULL DOCUMENT MATRIX & AUDIT (1440 x 960)
# ---------------------------------------------------------------------------
def generate_screen_3():
    svg = """<svg width="1440" height="960" viewBox="0 0 1440 960" fill="none" xmlns="http://www.w3.org/2000/svg" style="background:#F8FAFC; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <filter id="cardShadow" x="-5" y="-2" width="100%" height="100%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="10" flood-color="#0F172A" flood-opacity="0.05"/>
    </filter>
    <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0B1528"/>
      <stop offset="100%" stop-color="#162A45"/>
    </linearGradient>
  </defs>

  <!-- Top Navigation Header -->
  <rect width="1440" height="64" fill="url(#headerGrad)"/>
  <line x1="0" y1="64" x2="1440" y2="64" stroke="#1E293B" stroke-width="1"/>

  <g transform="translate(32, 14)">
    <rect x="0" y="2" width="32" height="32" rx="6" fill="#1E293B"/>
    <path d="M19 12L13 18L19 24" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    
    <text x="44" y="17" fill="#FFFFFF" font-size="14" font-weight="700">PAU_Ludhiana_Wheat_Advisory_Nov2025.jsonl</text>
    <text x="44" y="31" fill="#94A3B8" font-size="11">Document Full Overview &amp; Verification Audit • CSIR-CSIO</text>
  </g>

  <!-- Center View Mode Toggle -->
  <g transform="translate(620, 16)">
    <rect x="0" y="0" width="260" height="32" rx="8" fill="#1E293B" stroke="#334155" stroke-width="1"/>
    <!-- Inactive Tab: 1-Line Focus Mode -->
    <text x="24" y="20" fill="#94A3B8" font-size="11" font-weight="500">1-Line Focus Mode</text>
    <!-- Active Tab: Full Overview -->
    <rect x="135" y="3" width="122" height="26" rx="6" fill="#047857"/>
    <text x="146" y="20" fill="#FFFFFF" font-size="11" font-weight="700">Full Overview</text>
  </g>

  <!-- Right Actions -->
  <g transform="translate(1180, 16)">
    <rect x="0" y="0" width="140" height="32" rx="6" fill="#047857"/>
    <text x="16" y="20" fill="#FFFFFF" font-size="11" font-weight="600">Export Training Data</text>
    <rect x="150" y="0" width="60" height="32" rx="6" fill="#334155"/>
    <text x="165" y="20" fill="#FFFFFF" font-size="11" font-weight="600">Exit</text>
  </g>

  <!-- Document Matrix Layout: Left Section Tree (260px), Center Reader (780px), Right Quality Audit (340px) -->
  <g transform="translate(32, 80)">
    
    <!-- LEFT RAIL: SECTION TREE & BULLETINS -->
    <g transform="translate(0, 0)">
      <rect x="0" y="0" width="250" height="780" rx="12" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
      
      <rect x="0" y="0" width="250" height="44" rx="12" fill="#F8FAFC"/>
      <line x1="0" y1="44" x2="250" y2="44" stroke="#E2E8F0" stroke-width="1"/>
      <text x="16" y="26" fill="#0F172A" font-size="12" font-weight="700">DOCUMENT SECTIONS</text>

      <!-- Section Items -->
      <g transform="translate(12, 56)">
        <!-- Section 1: Active -->
        <rect x="0" y="0" width="226" height="60" rx="8" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="1"/>
        <text x="14" y="24" fill="#065F46" font-size="12" font-weight="700">1. Crop Specific Advisory</text>
        <text x="14" y="44" fill="#047857" font-size="11">Wheat, Mustard, Gram (24 lines)</text>

        <!-- Section 2 -->
        <g transform="translate(0, 70)">
          <rect x="0" y="0" width="226" height="60" rx="8" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
          <text x="14" y="24" fill="#0F172A" font-size="12" font-weight="600">2. Horticulture Advisory</text>
          <text x="14" y="44" fill="#64748B" font-size="11">Citrus, Guava, Mango (12 lines)</text>
        </g>

        <!-- Section 3 -->
        <g transform="translate(0, 140)">
          <rect x="0" y="0" width="226" height="60" rx="8" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
          <text x="14" y="24" fill="#0F172A" font-size="12" font-weight="600">3. Livestock Advisory</text>
          <text x="14" y="44" fill="#64748B" font-size="11">Cattle, Fodder, Vaccines (8 lines)</text>
        </g>

        <!-- Section 4 -->
        <g transform="translate(0, 210)">
          <rect x="0" y="0" width="226" height="60" rx="8" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
          <text x="14" y="24" fill="#0F172A" font-size="12" font-weight="600">4. Weather &amp; Warnings</text>
          <text x="14" y="44" fill="#64748B" font-size="11">Frost &amp; Cold Wave Alert (4 lines)</text>
        </g>
      </g>
    </g>

    <!-- CENTER PANE: FULL MULTI-LINE DOCUMENT READER -->
    <g transform="translate(265, 0)">
      <rect x="0" y="0" width="770" height="780" rx="12" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
      
      <!-- Reader Header Bar -->
      <rect x="0" y="0" width="770" height="44" rx="12" fill="#F8FAFC"/>
      <line x1="0" y1="44" x2="770" y2="44" stroke="#E2E8F0" stroke-width="1"/>
      <text x="20" y="26" fill="#0F172A" font-size="13" font-weight="700">Section 1: Crop Specific Advisory (Page 1 &amp; 2)</text>
      <text x="590" y="26" fill="#64748B" font-size="11">Showing 24 sentences</text>

      <!-- Document Content Stream -->
      <g transform="translate(24, 60)">
        
        <!-- Sentence Block 1 -->
        <rect x="0" y="0" width="722" height="120" rx="8" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
        <text x="16" y="24" fill="#64748B" font-size="11" font-weight="700">LINE 13 • WHEAT SOWING</text>
        <g transform="translate(16, 42)">
          <text x="0" y="16" fill="#0F172A" font-size="14" font-weight="400">Complete the sowing of </text>
          
          <rect x="155" y="0" width="130" height="24" rx="4" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="1"/>
          <text x="165" y="16" fill="#065F46" font-size="13" font-weight="700">wheat variety</text>

          <text x="295" y="16" fill="#0F172A" font-size="14" font-weight="400"> </text>
          
          <rect x="305" y="0" width="85" height="24" rx="4" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="1"/>
          <text x="315" y="16" fill="#065F46" font-size="13" font-weight="700">PBW-725</text>

          <text x="400" y="16" fill="#0F172A" font-size="14" font-weight="400"> using seed drill with recommended</text>
          <text x="0" y="44" fill="#0F172A" font-size="14" font-weight="400">seed rate of 40 kg per acre in well prepared fields.</text>
        </g>

        <!-- Sentence Block 2 (Highlighted Line 14) -->
        <g transform="translate(0, 135)">
          <rect x="0" y="0" width="722" height="140" rx="8" fill="#F0FDF4" stroke="#047857" stroke-width="1.5"/>
          <rect x="12" y="12" width="75" height="20" rx="4" fill="#047857"/>
          <text x="18" y="26" fill="#FFFFFF" font-size="10" font-weight="700">ACTIVE LINE 14</text>
          <text x="100" y="26" fill="#047857" font-size="11" font-weight="600">Wheat Termite &amp; Irrigation Advisory</text>

          <g transform="translate(16, 46)">
            <text x="0" y="16" fill="#0F172A" font-size="14" font-weight="500">Apply </text>
            
            <rect x="44" y="0" width="165" height="24" rx="4" fill="#F5F3FF" stroke="#DDD6FE" stroke-width="1"/>
            <text x="52" y="16" fill="#5B21B6" font-size="13" font-weight="700">chlorpyriphos 20 EC</text>

            <text x="220" y="16" fill="#0F172A" font-size="14" font-weight="500"> @ 1 L/acre for control of </text>

            <rect x="390" y="0" width="75" height="24" rx="4" fill="#FEF2F2" stroke="#FECACA" stroke-width="1"/>
            <text x="398" y="16" fill="#991B1B" font-size="13" font-weight="700">termites</text>

            <text x="475" y="16" fill="#0F172A" font-size="14" font-weight="500"> in </text>

            <rect x="495" y="0" width="135" height="24" rx="4" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="1"/>
            <text x="503" y="16" fill="#065F46" font-size="13" font-weight="700">late sown wheat</text>

            <text x="0" y="46" fill="#0F172A" font-size="14" font-weight="500">during </text>

            <rect x="52" y="30" width="220" height="24" rx="4" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1"/>
            <text x="60" y="46" fill="#1E40AF" font-size="13" font-weight="700">first irrigation (CRI stage)</text>

            <text x="278" y="46" fill="#0F172A" font-size="14" font-weight="500">.</text>
          </g>
        </g>

        <!-- Sentence Block 3 -->
        <g transform="translate(0, 290)">
          <rect x="0" y="0" width="722" height="120" rx="8" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
          <text x="16" y="24" fill="#64748B" font-size="11" font-weight="700">LINE 15 • FERTILIZER APPLICATION</text>
          <g transform="translate(16, 42)">
            <text x="0" y="16" fill="#0F172A" font-size="14" font-weight="400">Broadcast half dose of </text>
            
            <rect x="155" y="0" width="60" height="24" rx="4" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1"/>
            <text x="165" y="16" fill="#92400E" font-size="13" font-weight="700">urea</text>

            <text x="225" y="16" fill="#0F172A" font-size="14" font-weight="400"> (65 kg/acre) before first irrigation in </text>
            
            <rect x="465" y="0" width="65" height="24" rx="4" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="1"/>
            <text x="475" y="16" fill="#065F46" font-size="13" font-weight="700">wheat</text>

            <text x="0" y="44" fill="#0F172A" font-size="14" font-weight="400">to enhance tiller formation and vegetative growth.</text>
          </g>
        </g>

        <!-- Sentence Block 4: Mustard Aphids -->
        <g transform="translate(0, 425)">
          <rect x="0" y="0" width="722" height="120" rx="8" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
          <text x="16" y="24" fill="#64748B" font-size="11" font-weight="700">LINE 16 • MUSTARD PEST ALERT</text>
          <g transform="translate(16, 42)">
            <text x="0" y="16" fill="#0F172A" font-size="14" font-weight="400">Monitor </text>
            
            <rect x="58" y="0" width="115" height="24" rx="4" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="1"/>
            <text x="66" y="16" fill="#065F46" font-size="13" font-weight="700">mustard crop</text>

            <text x="180" y="16" fill="#0F172A" font-size="14" font-weight="400"> for appearance of </text>
            
            <rect x="305" y="0" width="120" height="24" rx="4" fill="#FEF2F2" stroke="#FECACA" stroke-width="1"/>
            <text x="315" y="16" fill="#991B1B" font-size="13" font-weight="700">mustard aphid</text>

            <text x="435" y="16" fill="#0F172A" font-size="14" font-weight="400"> colonies on inflorescence;</text>
            <text x="0" y="44" fill="#0F172A" font-size="14" font-weight="400">if population exceeds ETL, spray Rogor 30 EC @ 400 ml in 200 L water.</text>
          </g>
        </g>
      </g>
    </g>

    <!-- RIGHT RAIL: DATASET TELEMETRY & QUALITY AUDIT (340px) -->
    <g transform="translate(1050, 0)">
      <rect x="0" y="0" width="325" height="780" rx="12" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
      
      <rect x="0" y="0" width="325" height="44" rx="12" fill="#F8FAFC"/>
      <line x1="0" y1="44" x2="325" y2="44" stroke="#E2E8F0" stroke-width="1"/>
      <text x="16" y="26" fill="#0F172A" font-size="12" font-weight="700">DATASET TELEMETRY</text>

      <g transform="translate(16, 56)">
        <!-- Metric Box 1 -->
        <rect x="0" y="0" width="293" height="72" rx="8" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1"/>
        <text x="14" y="24" fill="#64748B" font-size="11" font-weight="600">CONFIDENCE THRESHOLD</text>
        <text x="14" y="52" fill="#047857" font-size="22" font-weight="700">0.85 (85%)</text>
        <text x="140" y="50" fill="#64748B" font-size="11">Standard RoBERTa</text>

        <!-- Metric Box 2 -->
        <g transform="translate(0, 84)">
          <rect x="0" y="0" width="293" height="72" rx="8" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1"/>
          <text x="14" y="24" fill="#64748B" font-size="11" font-weight="600">PROVENANCE RATIO</text>
          <text x="14" y="52" fill="#0F172A" font-size="22" font-weight="700">118 : 24</text>
          <text x="110" y="50" fill="#047857" font-size="11" font-weight="600">(83% AI, 17% Human)</text>
        </g>

        <!-- Class Distribution Chart -->
        <g transform="translate(0, 170)">
          <text x="0" y="16" fill="#0F172A" font-size="12" font-weight="700">Class Distribution (142 Entities)</text>

          <!-- Bar 1: Crops -->
          <g transform="translate(0, 28)">
            <text x="0" y="12" fill="#475569" font-size="11">Crops &amp; Varieties</text>
            <text x="245" y="12" fill="#047857" font-size="11" font-weight="700">42 (30%)</text>
            <rect x="0" y="18" width="293" height="8" rx="4" fill="#E2E8F0"/>
            <rect x="0" y="18" width="88" height="8" rx="4" fill="#059669"/>
          </g>

          <!-- Bar 2: Chemicals -->
          <g transform="translate(0, 64)">
            <text x="0" y="12" fill="#475569" font-size="11">Agrochemicals</text>
            <text x="245" y="12" fill="#7C3AED" font-size="11" font-weight="700">54 (38%)</text>
            <rect x="0" y="18" width="293" height="8" rx="4" fill="#E2E8F0"/>
            <rect x="0" y="18" width="112" height="8" rx="4" fill="#7C3AED"/>
          </g>

          <!-- Bar 3: Pests -->
          <g transform="translate(0, 100)">
            <text x="0" y="12" fill="#475569" font-size="11">Pests &amp; Pathogens</text>
            <text x="245" y="12" fill="#DC2626" font-size="11" font-weight="700">38 (27%)</text>
            <rect x="0" y="18" width="293" height="8" rx="4" fill="#E2E8F0"/>
            <rect x="0" y="18" width="79" height="8" rx="4" fill="#DC2626"/>
          </g>

          <!-- Bar 4: Phenology -->
          <g transform="translate(0, 136)">
            <text x="0" y="12" fill="#475569" font-size="11">Stages &amp; Operations</text>
            <text x="245" y="12" fill="#2563EB" font-size="11" font-weight="700">8 (5%)</text>
            <rect x="0" y="18" width="293" height="8" rx="4" fill="#E2E8F0"/>
            <rect x="0" y="18" width="18" height="8" rx="4" fill="#2563EB"/>
          </g>
        </g>

        <!-- Audit Action Checklist -->
        <g transform="translate(0, 360)">
          <text x="0" y="16" fill="#0F172A" font-size="12" font-weight="700">Quality Checklist</text>
          
          <g transform="translate(0, 28)">
            <circle cx="10" cy="10" r="8" fill="#ECFDF5"/>
            <path d="M6 10L9 13L14 7" stroke="#047857" stroke-width="2" fill="none"/>
            <text x="26" y="14" fill="#0F172A" font-size="11" font-weight="600">All token offsets aligned</text>

            <circle cx="10" cy="38" r="8" fill="#ECFDF5"/>
            <path d="M6 38L9 41L14 35" stroke="#047857" stroke-width="2" fill="none"/>
            <text x="26" y="42" fill="#0F172A" font-size="11" font-weight="600">Zero low-confidence review tags</text>

            <circle cx="10" cy="66" r="8" fill="#ECFDF5"/>
            <path d="M6 66L9 69L14 63" stroke="#047857" stroke-width="2" fill="none"/>
            <text x="26" y="70" fill="#0F172A" font-size="11" font-weight="600">Provenance tags embedded</text>
          </g>
        </g>
      </g>
    </g>
  </g>

  <!-- Sticky Bottom Bar -->
  <g transform="translate(32, 880)">
    <rect x="0" y="0" width="1376" height="64" rx="14" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" filter="url(#cardShadow)"/>
    <g transform="translate(20, 16)">
      <rect x="0" y="0" width="130" height="32" rx="6" fill="#F1F5F9"/>
      <text x="10" y="20" fill="#475569" font-size="12">Page 2 of 4 (2 left)</text>
      <rect x="140" y="0" width="170" height="32" rx="6" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1"/>
      <text x="150" y="20" fill="#1E40AF" font-size="12" font-weight="700">Sentence 14 of 48</text>
    </g>
    <g transform="translate(1030, 14)">
      <rect x="0" y="0" width="160" height="36" rx="8" fill="#047857"/>
      <text x="28" y="23" fill="#FFFFFF" font-size="12" font-weight="700">Download JSON file</text>
      <rect x="170" y="0" width="160" height="36" rx="8" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
      <text x="200" y="23" fill="#0F172A" font-size="12" font-weight="600">Download JSONL file</text>
    </g>
  </g>
</svg>"""
    return svg

# Write screen 3
s3_path = os.path.join(OUTPUT_DIR, "CSIO_AgNER_03_Full_Document_Matrix.svg")
with open(s3_path, "w", encoding="utf-8") as f:
    f.write(generate_screen_3())
print(f"Generated: {s3_path}")

# ---------------------------------------------------------------------------
# SCREEN 4: EXPORT & DATASET TELEMETRY STATION (1440 x 960)
# ---------------------------------------------------------------------------
def generate_screen_4():
    svg = """<svg width="1440" height="960" viewBox="0 0 1440 960" fill="none" xmlns="http://www.w3.org/2000/svg" style="background:#0F172A; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <filter id="modalGlow" x="-20" y="-10" width="100%" height="100%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="24" stdDeviation="40" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Dark Backdrop with subtle background grid -->
  <rect width="1440" height="960" fill="#0B132B"/>
  <circle cx="200" cy="200" r="300" fill="#047857" opacity="0.08"/>
  <circle cx="1200" cy="800" r="400" fill="#1E3A8A" opacity="0.08"/>

  <!-- Top Ambient Banner -->
  <g transform="translate(60, 40)">
    <text x="0" y="24" fill="#34D399" font-size="12" font-weight="700" letter-spacing="1">CSIR-CSIO AGNER PLATFORM</text>
    <text x="0" y="54" fill="#FFFFFF" font-size="28" font-weight="700">Export Curated Agricultural Training Dataset</text>
    <text x="0" y="78" fill="#94A3B8" font-size="14">Curated output from PAU_Ludhiana_Wheat_Advisory_Nov2025.jsonl • Fully tagged with Model vs Manual provenance</text>
  </g>

  <!-- MAIN EXPORT MODAL / ARTBOARD (1320 x 780) -->
  <g transform="translate(60, 130)">
    <rect x="0" y="0" width="1320" height="770" rx="16" fill="#FFFFFF" filter="url(#modalGlow)"/>

    <!-- Modal Header -->
    <rect x="0" y="0" width="1320" height="64" rx="16" fill="#F8FAFC"/>
    <line x1="0" y1="64" x2="1320" y2="64" stroke="#E2E8F0" stroke-width="1"/>
    
    <text x="32" y="38" fill="#0F172A" font-size="16" font-weight="700">Select Export Format</text>
    <text x="210" y="38" fill="#64748B" font-size="13">• Only verified sentence formats (JSON &amp; JSONL)</text>
    
    <!-- Dataset Summary Pill -->
    <rect x="1000" y="18" width="290" height="28" rx="14" fill="#ECFDF5" stroke="#86EFAC" stroke-width="1"/>
    <text x="1015" y="36" fill="#065F46" font-size="11" font-weight="600">✓ 48 Lines • 142 Tagged Entities Verified</text>

    <!-- TWO FORMAT SELECTION CARDS -->
    <g transform="translate(32, 90)">
      
      <!-- CARD 1: JSON File -->
      <g transform="translate(0, 0)">
        <rect x="0" y="0" width="600" height="190" rx="12" fill="#FFFFFF" stroke="#047857" stroke-width="2"/>
        <rect x="20" y="20" width="44" height="44" rx="10" fill="#ECFDF5"/>
        <path d="M38 34V50M32 40L38 34L44 40" stroke="#047857" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

        <text x="80" y="38" fill="#0F172A" font-size="18" font-weight="700">JSON file (.json)</text>
        <text x="80" y="58" fill="#047857" font-size="12" font-weight="600">Recommended for web, inspection &amp; hierarchical pipelines</text>

        <text x="20" y="96" fill="#475569" font-size="12">Structured array of sentence records containing full character offsets, entity class,</text>
        <text x="20" y="116" fill="#475569" font-size="12">confidence probability, and explicit <tspan font-weight="700" fill="#0F172A">source: "model"</tspan> vs <tspan font-weight="700" fill="#0F172A">source: "manual"</tspan> provenance.</text>

        <!-- Download Button -->
        <g transform="translate(20, 134)">
          <rect x="0" y="0" width="220" height="38" rx="8" fill="#047857"/>
          <text x="40" y="24" fill="#FFFFFF" font-size="13" font-weight="700">Download JSON file</text>
          <text x="260" y="24" fill="#64748B" font-size="12">File size: ~48 KB</text>
        </g>
      </g>

      <!-- CARD 2: JSONL File -->
      <g transform="translate(640, 0)">
        <rect x="0" y="0" width="616" height="190" rx="12" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5"/>
        <rect x="20" y="20" width="44" height="44" rx="10" fill="#F1F5F9"/>
        <path d="M38 34V50M32 40L38 34L44 40" stroke="#334155" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

        <text x="80" y="38" fill="#0F172A" font-size="18" font-weight="700">JSONL file (.jsonl)</text>
        <text x="80" y="58" fill="#334155" font-size="12" font-weight="600">Standard for Hugging Face Datasets &amp; PyTorch DataLoader</text>

        <text x="20" y="96" fill="#475569" font-size="12">Newline-delimited JSON stream where each line is an independent sentence training</text>
        <text x="20" y="116" fill="#475569" font-size="12">sample. Ideal for batch training and high-throughput LLM fine-tuning without memory overhead.</text>

        <!-- Download Button -->
        <g transform="translate(20, 134)">
          <rect x="0" y="0" width="220" height="38" rx="8" fill="#0F172A"/>
          <text x="35" y="24" fill="#FFFFFF" font-size="13" font-weight="700">Download JSONL file</text>
          <text x="260" y="24" fill="#64748B" font-size="12">File size: ~42 KB</text>
        </g>
      </g>
    </g>

    <!-- LIVE DATASET PAYLOAD PREVIEW -->
    <g transform="translate(32, 310)">
      <rect x="0" y="0" width="1256" height="420" rx="12" fill="#0B132B"/>
      
      <!-- Code Window Topbar -->
      <rect x="0" y="0" width="1256" height="36" rx="12" fill="#1E293B"/>
      <circle cx="20" cy="18" r="5" fill="#EF4444"/>
      <circle cx="36" cy="18" r="5" fill="#F59E0B"/>
      <circle cx="52" cy="18" r="5" fill="#10B981"/>
      <text x="75" y="22" fill="#94A3B8" font-size="11" font-family="'JetBrains Mono', monospace">PAU_Ludhiana_Wheat_Advisory_Nov2025_training_data.json [LIVE PREVIEW]</text>
      
      <rect x="1100" y="6" width="140" height="24" rx="4" fill="#334155"/>
      <text x="1115" y="21" fill="#E2E8F0" font-size="10" font-family="'JetBrains Mono', monospace">Copy Payload (JSON)</text>

      <!-- Formatted Code Sample -->
      <g transform="translate(24, 60)" font-family="'JetBrains Mono', monospace" font-size="12">
        <text x="0" y="20" fill="#94A3B8">[</text>
        <text x="20" y="44" fill="#94A3B8">{</text>
        <text x="40" y="68" fill="#38BDF8">"document"</text><text x="130" y="68" fill="#94A3B8">: </text><text x="150" y="68" fill="#34D399">"PAU_Ludhiana_Wheat_Advisory_Nov2025.jsonl"</text><text x="560" y="68" fill="#94A3B8">,</text>
        <text x="40" y="92" fill="#38BDF8">"line"</text><text x="90" y="92" fill="#94A3B8">: </text><text x="110" y="92" fill="#FBBF24">14</text><text x="130" y="92" fill="#94A3B8">, </text><text x="150" y="92" fill="#38BDF8">"page"</text><text x="200" y="92" fill="#94A3B8">: </text><text x="220" y="92" fill="#FBBF24">2</text><text x="230" y="92" fill="#94A3B8">,</text>
        <text x="40" y="116" fill="#38BDF8">"sentence"</text><text x="125" y="116" fill="#94A3B8">: </text><text x="145" y="116" fill="#34D399">"Apply chlorpyriphos 20 EC @ 1 L/acre for control of termites in late sown wheat during CRI stage."</text><text x="980" y="116" fill="#94A3B8">,</text>
        
        <text x="40" y="140" fill="#38BDF8">"entities"</text><text x="125" y="140" fill="#94A3B8">: [</text>
        
        <!-- Entity 1: Model Tag -->
        <text x="60" y="164" fill="#94A3B8">{ </text>
        <text x="80" y="164" fill="#F472B6">"text"</text><text x="125" y="164" fill="#94A3B8">: </text><text x="145" y="164" fill="#34D399">"chlorpyriphos 20 EC"</text><text x="330" y="164" fill="#94A3B8">, </text>
        <text x="350" y="164" fill="#F472B6">"label"</text><text x="400" y="164" fill="#94A3B8">: </text><text x="420" y="164" fill="#A78BFA">"CHEMICAL"</text><text x="505" y="164" fill="#94A3B8">, </text>
        <text x="525" y="164" fill="#F472B6">"source"</text><text x="585" y="164" fill="#94A3B8">: </text><text x="605" y="164" fill="#38BDF8">"model"</text><text x="665" y="164" fill="#94A3B8">, </text>
        <text x="685" y="164" fill="#F472B6">"confidence"</text><text x="785" y="164" fill="#94A3B8">: </text><text x="805" y="164" fill="#FBBF24">0.984</text><text x="850" y="164" fill="#94A3B8">, </text>
        <text x="870" y="164" fill="#F472B6">"status"</text><text x="935" y="164" fill="#94A3B8">: </text><text x="955" y="164" fill="#34D399">"accepted"</text>
        <text x="1035" y="164" fill="#94A3B8"> },</text>

        <!-- Entity 2: Model Tag -->
        <text x="60" y="188" fill="#94A3B8">{ </text>
        <text x="80" y="188" fill="#F472B6">"text"</text><text x="125" y="188" fill="#94A3B8">: </text><text x="145" y="188" fill="#34D399">"termites"</text><text x="235" y="188" fill="#94A3B8">, </text>
        <text x="255" y="188" fill="#F472B6">"label"</text><text x="305" y="188" fill="#94A3B8">: </text><text x="325" y="188" fill="#F87171">"PEST"</text><text x="375" y="188" fill="#94A3B8">, </text>
        <text x="395" y="188" fill="#F472B6">"source"</text><text x="455" y="188" fill="#94A3B8">: </text><text x="475" y="188" fill="#38BDF8">"model"</text><text x="535" y="188" fill="#94A3B8">, </text>
        <text x="555" y="188" fill="#F472B6">"confidence"</text><text x="655" y="188" fill="#94A3B8">: </text><text x="675" y="188" fill="#FBBF24">0.951</text><text x="720" y="188" fill="#94A3B8">, </text>
        <text x="740" y="188" fill="#F472B6">"status"</text><text x="805" y="188" fill="#94A3B8">: </text><text x="825" y="188" fill="#34D399">"accepted"</text>
        <text x="905" y="188" fill="#94A3B8"> },</text>

        <!-- Entity 3: Manual Added Tag -->
        <text x="60" y="212" fill="#94A3B8">{ </text>
        <text x="80" y="212" fill="#F472B6">"text"</text><text x="125" y="212" fill="#94A3B8">: </text><text x="145" y="212" fill="#34D399">"CRI stage"</text><text x="245" y="212" fill="#94A3B8">, </text>
        <text x="265" y="212" fill="#F472B6">"label"</text><text x="315" y="212" fill="#94A3B8">: </text><text x="335" y="212" fill="#60A5FA">"PHENOLOGY"</text><text x="430" y="212" fill="#94A3B8">, </text>
        <text x="450" y="212" fill="#F472B6">"source"</text><text x="510" y="212" fill="#94A3B8">: </text><text x="530" y="212" fill="#4ADE80" font-weight="700">"manual"</text><text x="605" y="212" fill="#94A3B8">, </text>
        <text x="625" y="212" fill="#F472B6">"annotator"</text><text x="715" y="212" fill="#94A3B8">: </text><text x="735" y="212" fill="#34D399">"dr_sharma"</text><text x="835" y="212" fill="#94A3B8">, </text>
        <text x="855" y="212" fill="#F472B6">"status"</text><text x="920" y="212" fill="#94A3B8">: </text><text x="940" y="212" fill="#34D399">"approved"</text>
        <text x="1020" y="212" fill="#94A3B8"> }</text>

        <text x="40" y="236" fill="#94A3B8">]</text>
        <text x="20" y="260" fill="#94A3B8">}</text>
        <text x="0" y="284" fill="#94A3B8">]</text>
      </g>
    </g>
  </g>
</svg>"""
    return svg

# Write screen 4
s4_path = os.path.join(OUTPUT_DIR, "CSIO_AgNER_04_Export_Data_Station.svg")
with open(s4_path, "w", encoding="utf-8") as f:
    f.write(generate_screen_4())
print(f"Generated: {s4_path}")

# ---------------------------------------------------------------------------
# HTML PREVIEW SUITE
# ---------------------------------------------------------------------------
def generate_html_preview():
    html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSIR-CSIO AgNER Studio • Figma Design Suite</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0B132B;
      --surface: #111E3D;
      --card: #FFFFFF;
      --primary: #047857;
      --primary-light: #10B981;
      --text: #F8FAFC;
      --text-muted: #94A3B8;
      --border: #1E293B;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: #070D1E;
      border-bottom: 1px solid var(--border);
      padding: 18px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-logo {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #047857, #10B981);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 16px;
      color: white;
    }
    .brand-title {
      font-size: 17px;
      font-weight: 700;
      color: #FFFFFF;
    }
    .brand-subtitle {
      font-size: 12px;
      color: var(--text-muted);
    }
    .tab-bar {
      display: flex;
      gap: 8px;
      background: #111E3D;
      padding: 4px;
      border-radius: 10px;
      border: 1px solid var(--border);
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-btn.active {
      background: var(--primary);
      color: #FFFFFF;
      box-shadow: 0 2px 8px rgba(4, 120, 87, 0.4);
    }
    .tab-btn:hover:not(.active) {
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.05);
    }
    .actions {
      display: flex;
      gap: 12px;
    }
    .btn {
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn-primary {
      background: var(--primary);
      color: white;
      border: none;
    }
    .btn-secondary {
      background: #1E293B;
      color: #E2E8F0;
      border: 1px solid #334155;
    }
    main {
      flex: 1;
      padding: 28px 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .screen-container {
      width: 100%;
      max-width: 1440px;
      background: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      position: relative;
    }
    .screen-img {
      width: 100%;
      height: auto;
      display: block;
    }
    .meta-bar {
      width: 100%;
      max-width: 1440px;
      margin-top: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--surface);
      padding: 16px 24px;
      border-radius: 12px;
      border: 1px solid var(--border);
    }
    .meta-title {
      font-size: 15px;
      font-weight: 700;
      color: #FFFFFF;
    }
    .meta-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .figma-instructions {
      width: 100%;
      max-width: 1440px;
      margin-top: 24px;
      background: rgba(4, 120, 87, 0.1);
      border: 1px solid rgba(4, 120, 87, 0.3);
      border-radius: 12px;
      padding: 20px 24px;
    }
    .figma-instructions h3 {
      font-size: 15px;
      color: #34D399;
      margin-bottom: 8px;
    }
    .figma-instructions p {
      font-size: 13px;
      color: #E2E8F0;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-logo">CSIO</div>
      <div>
        <div class="brand-title">CSIR-CSIO AgNER Studio</div>
        <div class="brand-subtitle">Figma Design System &amp; High-Fidelity Mockup Suite</div>
      </div>
    </div>

    <div class="tab-bar">
      <button class="tab-btn active" onclick="switchTab(1)">1. Corpus Dashboard</button>
      <button class="tab-btn" onclick="switchTab(2)">2. 1-Line Focus Studio</button>
      <button class="tab-btn" onclick="switchTab(3)">3. Full Document Matrix</button>
      <button class="tab-btn" onclick="switchTab(4)">4. Dataset Export Station</button>
    </div>

    <div class="actions">
      <a id="downloadBtn" href="CSIO_AgNER_01_Dashboard.svg" download class="btn btn-primary">
        ↓ Download Figma SVG
      </a>
      <a href="csio_figma_design_tokens.json" download class="btn btn-secondary">
        Tokens (.json)
      </a>
    </div>
  </header>

  <main>
    <div class="screen-container">
      <img id="screenDisplay" src="CSIO_AgNER_01_Dashboard.svg" alt="Figma Screen View" class="screen-img">
    </div>

    <div class="meta-bar">
      <div>
        <div id="metaTitle" class="meta-title">Screen 1: Ingestion &amp; Advisory Corpus Repository</div>
        <div id="metaDesc" class="meta-desc">Dual .json and .jsonl ingestion zone, live RoBERTa confidence metrics, corpus management matrix.</div>
      </div>
      <div>
        <span style="font-size:12px; color:#34D399; background:rgba(4,120,87,0.2); padding:6px 12px; border-radius:6px; font-weight:600;">
          Figma Ready • Native Vector SVG
        </span>
      </div>
    </div>

    <div class="figma-instructions">
      <h3>🎨 How to open in Figma:</h3>
      <p>
        1. Click <strong>"Download Figma SVG"</strong> above (or grab the files from the <code>figma-designs/</code> directory).<br>
        2. Open <strong>Figma</strong> (desktop app or browser at figma.com).<br>
        3. Simply <strong>drag &amp; drop the .svg files onto your Figma canvas</strong>, or select <strong>File → Place Image</strong>.<br>
        4. Figma automatically imports the vector layers, text nodes, grouped frames, color tokens, and layout artboards as 100% native, editable components!
      </p>
    </div>
  </main>

  <script>
    const screens = [
      {
        file: "CSIO_AgNER_01_Dashboard.svg",
        title: "Screen 1: Ingestion & Advisory Corpus Repository",
        desc: "Dual .json and .jsonl ingestion zone, live RoBERTa confidence metrics, and active bulletin corpus overview."
      },
      {
        file: "CSIO_AgNER_02_Focus_Annotation_Studio.svg",
        title: "Screen 2: 1-Line Focus Annotation Studio (Flagship Screen)",
        desc: "18px high-contrast typography, categorized 36-entity palette, keyboard shortcuts (1-8), and Provenance tracking (Model AI vs Human)."
      },
      {
        file: "CSIO_AgNER_03_Full_Document_Matrix.svg",
        title: "Screen 3: Full Document Matrix & Quality Audit",
        desc: "Multi-line reading view with highlighted entity tokens, section tree navigation, and class distribution analytics."
      },
      {
        file: "CSIO_AgNER_04_Export_Data_Station.svg",
        title: "Screen 4: Curated Dataset Export & Telemetry Station",
        desc: "Dedicated download options for JSON file and JSONL file with live payload diff and dataset provenance breakdown."
      }
    ];

    function switchTab(num) {
      const idx = num - 1;
      const data = screens[idx];
      document.getElementById('screenDisplay').src = data.file;
      document.getElementById('downloadBtn').href = data.file;
      document.getElementById('metaTitle').innerText = data.title;
      document.getElementById('metaDesc').innerText = data.desc;

      const buttons = document.querySelectorAll('.tab-btn');
      buttons.forEach((btn, i) => {
        if (i === idx) btn.classList.add('active');
        else btn.classList.remove('active');
      });
    }
  </script>
</body>
</html>
"""
    return html

html_path = os.path.join(OUTPUT_DIR, "index.html")
with open(html_path, "w", encoding="utf-8") as f:
    f.write(generate_html_preview())
print(f"Generated: {html_path}")
print("ALL FIGMA FILES GENERATED SUCCESSFULLY!")
