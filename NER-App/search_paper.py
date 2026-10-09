import pypdf
import re

pdf_path = r"C:\Users\Shubham Rana\Downloads\agner-berta research paper.pdf"
reader = pypdf.PdfReader(pdf_path)
print("Total pages:", len(reader.pages))

full_text = ""
for i, page in enumerate(reader.pages):
    full_text += f"\n=== PAGE {i+1} ===\n" + (page.extract_text() or "")

with open("paper_text.txt", "w", encoding="utf-8") as f:
    f.write(full_text)

print(f"Title / First 500 chars:\n{full_text[:500]}\n")

for kw in ["threshold", "confidence", "cutoff", "cut-off", "probability", "filtering", "active learning"]:
    matches = list(re.finditer(r"\b" + kw + r"\b", full_text, re.IGNORECASE))
    print(f"=== Keyword: '{kw}' ({len(matches)} occurrences) ===")
    for m in matches:
        start = max(0, m.start() - 120)
        end = min(len(full_text), m.end() + 120)
        snippet = full_text[start:end].replace("\n", " ")
        print(f"  ...{snippet}...\n")
