"""AgNER-BERTa inference service.

POST /predict  {"segments": [{"id": 0, "text": "..."}]}
-> per-segment entities with character offsets and confidence (softmax prob,
   averaged over the tokens that make up the entity).
"""
import json
import os
import re
from typing import List

import torch
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoModelForTokenClassification, AutoTokenizer

BASE = os.path.dirname(os.path.abspath(__file__))

# Auto-detect model directory: checks python-ai-service/model, NERPROJECT/NER-roberta-base_512, or MODEL_DIR env
candidate_dirs = [
    os.environ.get("MODEL_DIR"),
    os.path.join(BASE, "model"),
    os.path.abspath(os.path.join(BASE, "..", "..", "NER-roberta-base_512")),
    os.path.abspath(os.path.join(BASE, "..", "model")),
]
MODEL_DIR = os.path.join(BASE, "model")
for cdir in candidate_dirs:
    if cdir and os.path.exists(os.path.join(cdir, "model.safetensors")):
        MODEL_DIR = cdir
        break

LABELS_FILE = os.path.join(BASE, "labels.json")
CHUNK_WORDS = int(os.environ.get("CHUNK_WORDS", 200))  # words per model call (<512 tokens)

tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR, add_prefix_space=True)
model = AutoModelForTokenClassification.from_pretrained(MODEL_DIR, low_cpu_mem_usage=True).eval()

# The checkpoint only has LABEL_0..LABEL_72 = "O" + 36 types x (B, I).
# Layout inferred from predictions: id 2k-1 = B- of type k, id 2k = I- of type k.
# Put real names in types.json ({"20": "Crop"}); unnamed types show as TYPE_<k>.
TYPES_FILE = os.path.join(BASE, "types.json")
type_names = {}
if os.path.exists(TYPES_FILE):
    with open(TYPES_FILE, encoding="utf-8") as f:
        type_names = {int(k): v for k, v in json.load(f).items() if not k.startswith("_")}

id2label = {0: "O"}
for _id in range(1, model.config.num_labels):
    k = (_id + 1) // 2
    id2label[_id] = f"{'B' if _id % 2 else 'I'}-{type_names.get(k, f'TYPE_{k}')}"
# Optional full per-id overrides, e.g. {"1": "B-CROP"}
if os.path.exists(LABELS_FILE):
    with open(LABELS_FILE, encoding="utf-8") as f:
        id2label.update({int(k): v for k, v in json.load(f).items()})
OUTSIDE_IDS = {i for i, l in id2label.items() if l == "O"} or {0}

app = FastAPI(title="AgNER-BERTa service")


class Segment(BaseModel):
    id: int
    text: str


class PredictRequest(BaseModel):
    segments: List[Segment]


def split_chunks(text):
    """Yield lists of (word, start, end) with at most CHUNK_WORDS words."""
    words = [(m.group(), m.start(), m.end()) for m in re.finditer(r"\S+", text)]
    for i in range(0, len(words), CHUNK_WORDS):
        yield words[i:i + CHUNK_WORDS]


def split_label(label):
    if len(label) > 2 and label[1] == "-" and label[0] in "BIES":
        return label[0], label[2:]
    return None, label


@torch.no_grad()
def predict_chunk(words):
    enc = tokenizer([w[0] for w in words], is_split_into_words=True,
                    return_tensors="pt", truncation=True, max_length=512)
    probs = torch.softmax(model(**enc).logits[0], dim=-1)
    word_ids = enc.word_ids()
    seen, per_word = set(), {}
    for tok_idx, wid in enumerate(word_ids):
        if wid is None or wid in seen:  # first sub-token represents the word
            continue
        seen.add(wid)
        p = probs[tok_idx]
        conf, lid = torch.max(p, dim=-1)
        per_word[wid] = (int(lid), float(conf))
    return per_word


def extract_entities(text):
    entities = []
    for words in split_chunks(text):
        per_word = predict_chunk(words)
        cur = None
        for wid in range(len(words)):
            if wid not in per_word:
                continue
            lid, conf = per_word[wid]
            if lid in OUTSIDE_IDS:
                cur = None
                continue
            prefix, etype = split_label(id2label[lid])
            _, start, end = words[wid]
            # continue the entity if same type and not an explicit new "B-"
            if cur and cur["label"] == etype and prefix != "B":
                cur["end"] = end
                cur["_confs"].append(conf)
            else:
                cur = {"label": etype, "start": start, "end": end, "_confs": [conf]}
                entities.append(cur)
    out = []
    for e in entities:
        confs = e.pop("_confs")
        while e["end"] > e["start"] + 1 and text[e["end"] - 1] in ".,;:!?)\"'":
            e["end"] -= 1
        e["text"] = text[e["start"]:e["end"]]
        e["confidence"] = round(sum(confs) / len(confs), 4)
        out.append(e)
    return out


@app.get("/health")
def health():
    unique_entities = sorted({l.split("-", 1)[1] for l in id2label.values() if l != "O"})
    return {
        "status": "ok",
        "model": "AgNER-BERTa",
        "base_model": "roberta-base",
        "architecture": model.config.architectures[0] if model.config.architectures else "RobertaForTokenClassification",
        "labels_count": len(id2label),
        "entities_count": len(unique_entities),
    }


@app.get("/model-info")
def model_info():
    unique_entities = sorted({l.split("-", 1)[1] for l in id2label.values() if l != "O"})
    return {
        "model_name": "AgNER-BERTa",
        "checkpoint": "NER-roberta-base_512",
        "paper": "Fine-tuned encoder models with data augmentation beat ChatGPT in agricultural named entity recognition and relation extraction (ESWA 2025)",
        "num_labels": len(id2label),
        "entity_types": unique_entities,
    }


@app.post("/predict")
def predict(req: PredictRequest):
    return {"results": [{"id": s.id, "entities": extract_entities(s.text)} for s in req.segments]}
