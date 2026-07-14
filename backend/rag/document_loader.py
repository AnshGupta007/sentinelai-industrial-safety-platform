import os
import re
from typing import List, Dict

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_core.documents import Document
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False

REGULATIONS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "regulations")

REGULATION_DOCS = {
    "oisd_guidelines.txt": "OISD-105 Guidelines for Industrial Safety",
    "factory_act_safety.txt": "Factory Act 1948 - Safety Provisions",
    "dgms_mining_safety.txt": "DGMS Mining Safety Technical Circulars",
}

def load_regulation_documents() -> List[Dict]:
    docs = []
    for filename, title in REGULATION_DOCS.items():
        filepath = os.path.join(REGULATIONS_DIR, filename)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            docs.append({"title": title, "source": filename, "content": content, "type": "regulation"})
        except FileNotFoundError:
            docs.append({"title": title, "source": filename, "content": f"Simulated content for {title}.", "type": "regulation"})
    return docs

def load_incident_documents() -> List[Dict]:
    try:
        from data.simulator import HISTORICAL_INCIDENTS
        docs = []
        for inc in HISTORICAL_INCIDENTS:
            content = f"INCIDENT {inc['incident_id']}: {inc['type']} at {inc['plant']} ({inc['date']}). Zone: {inc['zone']}. Fatalities: {inc['fatalities']}, Injuries: {inc['injuries']}.\n\n"
            content += f"Description: {inc['description']}\n\n"
            content += f"Root Causes:\n" + "\n".join(f"- {c}" for c in inc['root_causes']) + "\n\n"
            content += f"Warning Signs Missed:\n" + "\n".join(f"- {w}" for w in inc['warning_signs_missed']) + "\n\n"
            content += f"Regulatory Violations:\n" + "\n".join(f"- {v}" for v in inc['regulatory_violations']) + "\n\n"
            content += f"Prevention Measures:\n" + "\n".join(f"- {m}" for m in inc['prevention_measures'])
            docs.append({
                "title": f"{inc['incident_id']} - {inc['type']} at {inc['plant']}",
                "source": inc["incident_id"],
                "content": content,
                "type": "incident",
                "metadata": {
                    "incident_id": inc["incident_id"],
                    "date": inc["date"],
                    "plant": inc["plant"],
                    "zone": inc["zone"],
                    "incidentType": inc["type"],
                    "fatalities": inc["fatalities"],
                }
            })
        return docs
    except Exception:
        return []

def chunk_documents(docs: List[Dict], chunk_size: int = 500, overlap: int = 50) -> List[Dict]:
    chunks = []
    for doc in docs:
        text = doc["content"]
        paragraphs = re.split(r'\n\n+', text)
        current_chunk = ""
        for para in paragraphs:
            if len(current_chunk) + len(para) > chunk_size and current_chunk:
                chunks.append({
                    "title": doc["title"],
                    "source": doc["source"],
                    "content": current_chunk.strip(),
                    "type": doc.get("type", "regulation"),
                    "metadata": doc.get("metadata", {}),
                })
                current_chunk = para
            else:
                current_chunk += ("\n\n" + para if current_chunk else para)
        if current_chunk.strip():
            chunks.append({
                "title": doc["title"],
                "source": doc["source"],
                "content": current_chunk.strip(),
                "type": doc.get("type", "regulation"),
                "metadata": doc.get("metadata", {}),
            })
    return chunks

def load_all_documents() -> List[Dict]:
    docs = load_regulation_documents()
    docs.extend(load_incident_documents())
    return docs

def load_documents_as_langchain() -> List:
    if not LANGCHAIN_AVAILABLE:
        return []
    docs = load_all_documents()
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\nSECTION", "\n\n", "\n", ". ", " ", ""],
    )
    lc_docs = []
    for doc in docs:
        metadata = {"title": doc["title"], "source": doc["source"], "type": doc.get("type", "regulation")}
        for k, v in doc.get("metadata", {}).items():
            if k != "type":
                metadata[k] = str(v)
        chunks = splitter.split_text(doc["content"])
        for chunk in chunks:
            lc_docs.append(Document(page_content=chunk, metadata=metadata.copy()))
    return lc_docs
