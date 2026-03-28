# GENERATOR EXTRACT PASS 0 — Source Material Extraction
# Run this BEFORE Pass 1 when adapting an existing IP, universe, or creative work.
# Pass 1 (free-text pitch) is for original game concepts.
# Extract Pass 0 + Translate Pass are for adapting existing source material.
#
# Input:  guild-engine/generator/source/          (folder containing source files)
# Output: guild-engine/generator/source-analysis.json
#         guild-engine/generator/translation-flags.md (items needing designer decisions)
#
# Supported formats: .txt .md .markdown .html .htm .rtf .csv .json .yaml .docx .odt .epub
# NOT supported: .pdf (convert to .txt first using Acrobat, pdftotext, or Calibre)

---

## Before doing anything else

Read these files:
1. `guild-engine/schema/project.schema.json` — know what the game can represent
2. `guild-engine/expedition-spec-v2.1.md` — know how the game systems work
3. `guild-engine/docs/WIKI.md` — full system reference
4. `guild-engine/generator/CHANGELOG.md` — what the generator currently supports

---

## Step 1 — Discover and read source files

Scan `guild-engine/generator/source/` for all supported files.
Print what you find:
```
SOURCE FILES FOUND:
  [filename] ([format], [approximate size])
  ...
```

For each file, extract its full text content using the appropriate method:

### Extraction methods by format

**.txt .md .markdown**
Read directly. No processing needed.

**.html .htm**
Strip all HTML tags. Keep text content and alt attributes from images.
Remove script, style, nav, header, footer tags entirely.

**.rtf**
Strip RTF control codes. Keep plain text content.
Use: `python3 -c "import striprtf; print(striprtf.rtf_to_text(open('file.rtf').read()))"`
Or install: `pip install striprtf --break-system-packages`

**.docx**
Extract using python-docx:
```python
from docx import Document
doc = Document('file.docx')
text = '\n'.join([p.text for p in doc.paragraphs])
```
Install if needed: `pip install python-docx --break-system-packages`

**.odt**
Extract using odfpy:
```python
from odf import text, teletype
from odf.opendocument import load
doc = load('file.odt')
text_content = teletype.extractText(doc.text)
```
Install if needed: `pip install odfpy --break-system-packages`

**.epub**
Extract using ebooklib:
```python
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
book = epub.read_epub('file.epub')
texts = []
for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
    soup = BeautifulSoup(item.get_content(), 'html.parser')
    texts.append(soup.get_text())
text = '\n'.join(texts)
```
Install if needed: `pip install ebooklib beautifulsoup4 --break-system-packages`

**.csv**
Read as structured data. Identify columns and summarize content.
Useful for: faction lists, character rosters, equipment tables, stat blocks.

**.json .yaml**
Read as structured data. Summarize top-level keys and content shape.
Useful for: wiki exports, structured lore databases.

If a file fails to extract, log the error and continue with other files.
Do not stop the entire pass for one failed extraction.

---

## Step 2 — Identify the source type

After reading all source material, determine what kind of source this is:

```
SOURCE TYPE ANALYSIS:
  Primary type: [tabletop RPG sourcebook | novel | manga/comic | film/TV tie-in | 
                 video game lore | historical/mythology | original world document |
                 game design document | wikipedia/wiki export | other]
  IP/franchise: [name if known, "original" if not]
  Setting:      [genre and world description in 1-2 sentences]
  Scope:        [how much of the IP is covered — full universe | single city | 
                 one adventure | character backstory | etc.]
  Estimated richness: [sparse | moderate | rich | extremely rich]
    sparse = few factions, characters, or locations mentioned
    rich = multiple factions, extensive geography, detailed power systems
```

---

## Step 3 — Extract using the 8 universal translation questions

For each question, extract answers ONLY from the source material.
Use direct quotes where possible (keep under 15 words per quote per source).
Note page numbers or section headers if available.
Mark confidence: HIGH (explicitly stated) | MEDIUM (implied) | LOW (inferred)

### Q1: What does the protagonist accumulate?
What resources, currencies, power, influence, or collectibles does the protagonist
(or the player's faction) gather over time?

```json
"accumulates": [
  {
    "name": "string — source term",
    "description": "string — what it is in source terms",
    "how_gained": "string — how it's obtained",
    "how_spent": "string — what it's used for",
    "is_finite": true | false,
    "degrades": true | false,
    "source_quote": "string — direct quote under 15 words",
    "confidence": "HIGH | MEDIUM | LOW"
  }
]
```

### Q2: What drives the protagonist to act?
What are the narrative motivations, goals, contracts, missions, or pressures
that cause the protagonist to take risks and venture into danger?

```json
"motivations": [
  {
    "name": "string",
    "description": "string",
    "reward_type": "resource | power | story | political | survival",
    "source_quote": "string",
    "confidence": "HIGH | MEDIUM | LOW"
  }
]
```

### Q3: Who are the power factions?
What groups, organizations, clans, houses, or political entities exist?
What is the relationship between them (allied, rival, neutral, hierarchical)?

```json
"factions": [
  {
    "name": "string",
    "description": "string — role and nature of this faction",
    "alignment": "ally | rival | neutral | complex",
    "power_level": "minor | moderate | major | dominant",
    "what_they_control": "string — territory, resource, or information they own",
    "relationship_to_others": ["string — faction name: relationship"],
    "source_quote": "string",
    "confidence": "HIGH | MEDIUM | LOW"
  }
]
```

### Q4: What roles exist in this world?
What archetypes, classes, professions, castes, or specializations define
different kinds of protagonists or followers?

```json
"roles": [
  {
    "name": "string",
    "description": "string",
    "combat_archetype": "tank | damage | support | hybrid | non-combat",
    "defining_traits": ["string — key characteristic"],
    "special_powers": ["string — signature ability or skill"],
    "social_standing": "string — their place in the world's hierarchy",
    "source_quote": "string",
    "confidence": "HIGH | MEDIUM | LOW"
  }
]
```

### Q5: What dangerous places exist?
What locations, territories, zones, dungeons, or situations do protagonists
venture into that carry risk and promise reward?

```json
"dangerous_places": [
  {
    "name": "string",
    "description": "string",
    "danger_type": "combat | political | environmental | supernatural | social",
    "who_or_what_opposes_them": "string — the threat",
    "what_can_be_gained": "string — the reward",
    "narrative_region": "string — act/chapter/district this belongs to",
    "difficulty_feel": "trivial | easy | moderate | hard | lethal",
    "source_quote": "string",
    "confidence": "HIGH | MEDIUM | LOW"
  }
]
```

### Q6: What objects matter in this world?
What items, artifacts, equipment, tools, or collectibles are significant?
Both mundane (swords, currency) and legendary (named artifacts).

```json
"significant_objects": [
  {
    "name": "string",
    "description": "string",
    "category": "weapon | armor | accessory | relic | material | currency | consumable",
    "rarity_feel": "common | uncommon | rare | epic | legendary",
    "who_uses_it": "string — which role or faction",
    "what_it_does": "string — mechanical or narrative effect",
    "source_quote": "string",
    "confidence": "HIGH | MEDIUM | LOW"
  }
]
```

### Q7: What skills or powers define protagonists?
What abilities, disciplines, magic systems, technologies, or training
give protagonists their edge?

```json
"powers": [
  {
    "name": "string",
    "description": "string",
    "who_has_it": "string — which role or faction",
    "trigger": "passive | active | situational",
    "effect_feel": "string — what it does in narrative terms",
    "cost": "string — what using it costs (blood, mana, stamina, nothing)",
    "source_quote": "string",
    "confidence": "HIGH | MEDIUM | LOW"
  }
]
```

### Q8: What does progression look like?
How do protagonists grow, advance, or evolve over time?
What separates a novice from a master in this world?

```json
"progression": {
  "advancement_system": "string — how growth works in source terms",
  "novice_description": "string — what a beginner looks like",
  "master_description": "string — what a master looks like",
  "stages": ["string — named tiers of advancement"],
  "what_unlocks_at_each_stage": ["string"],
  "hard_limits": "string — if any ceiling exists (generation cap, etc.)",
  "source_quote": "string",
  "confidence": "HIGH | MEDIUM | LOW"
}
```

---

## Step 4 — Extract world structure

Beyond the 8 questions, capture structural elements useful for act design:

```json
"world_structure": {
  "geographic_regions": [
    {
      "name": "string",
      "description": "string",
      "narrative_role": "starting area | mid-game | endgame | hub | hidden",
      "controlling_faction": "string or null"
    }
  ],
  "narrative_arc": {
    "inciting_event": "string — what starts the story",
    "rising_tension": "string — what escalates",
    "climax_feel": "string — what the ultimate confrontation is",
    "resolution_type": "victory | survival | sacrifice | ambiguous"
  },
  "tone_markers": ["string — adjectives that capture the world's feel"],
  "unique_mechanics": ["string — things this world has that most worlds don't"]
}
```

---

## Step 5 — Coverage assessment

After extraction, assess what was found vs what the game needs:

```
COVERAGE ASSESSMENT:
  Resources found:      [N] — [quality: sparse/adequate/rich]
  Factions found:       [N] — [quality]
  Roles/classes found:  [N] — [quality]
  Dangerous places:     [N] — [quality]
  Items/objects:        [N] — [quality]
  Powers/abilities:     [N] — [quality]
  Progression system:   [found/partial/missing]
  World structure:      [found/partial/missing]

GAPS (things the game needs that weren't found in source):
  [list each gap]

RICHNESS SCORE: [1-10]
  1-3:  Source is sparse. Translate Pass will invent most mechanics.
  4-6:  Source covers half the systems. Mix of extraction and invention.
  7-9:  Source is rich. Translate Pass mostly maps, rarely invents.
  10:   Source is a full game design document. Minimal invention needed.
```

---

## Step 6 — Write source-analysis.json

Write complete extraction to `guild-engine/generator/source-analysis.json`:

```json
{
  "meta": {
    "source_files": ["list of files read"],
    "source_type": "string",
    "ip_name": "string",
    "extracted_at": "ISO timestamp",
    "richness_score": 0,
    "extractor_notes": "string — anything unusual about this source"
  },
  "accumulates": [...],
  "motivations": [...],
  "factions": [...],
  "roles": [...],
  "dangerous_places": [...],
  "significant_objects": [...],
  "powers": [...],
  "progression": {...},
  "world_structure": {...},
  "coverage_assessment": {
    "gaps": ["string"],
    "richness_score": 0
  }
}
```

---

## Step 7 — Print summary and hand off

```
✓ Source extraction complete
  guild-engine/generator/source-analysis.json written

  [IP name] — [source type]
  ─────────────────────────────────────────
  Richness score:  [N]/10
  Resources found: [N]
  Factions:        [N]  
  Roles:           [N]
  Danger zones:    [N]
  Items:           [N]
  Powers:          [N]
  Gaps:            [N] — [list]
  ─────────────────────────────────────────

Next step:
  Run TRANSLATEPASS.md to map source terms to game schema.
  
  If richness score is below 4, consider supplementing with additional
  source files before translating — add more files to source/ and re-run.

PDF note: If your source is a PDF, convert it first:
  - Adobe Acrobat: File → Export → Text
  - Command line: pdftotext yourfile.pdf yourfile.txt
  - Calibre (GUI): open PDF, convert to TXT
  Then add the .txt file to guild-engine/generator/source/
```

---

## Critical rules

1. Extract ONLY what is in the source. Do not invent during this pass.
2. Use direct quotes under 15 words to support each extraction.
3. Mark confidence honestly — LOW is fine and useful.
4. If two source files contradict each other, note the contradiction and include both versions.
5. If the source is fiction (novel, manga), extract the world's internal logic, not the plot summary.
6. Do not map to game terms yet — that is Translate Pass's job.
7. If a file fails to extract, log the error and continue.
