

## Plan: Agronomic Knowledge Graph

### Overview
Build a structured knowledge graph database that maps relationships between crops, pests, treatments, soil types, seasons, and regions. The AI assistant will query this graph to deliver hyper-specific, context-aware advice. Every user interaction (scans, activities, harvests) enriches the graph over time.

### Database Schema

**3 new tables:**

1. **`knowledge_nodes`** — Entities in the graph (e.g., "Maize", "Fall Armyworm", "Neem Oil", "Clay Soil", "Summer", "Limpopo")
   - `id`, `node_type` (crop | pest | disease | treatment | soil_type | season | region), `name`, `aliases` (jsonb array for alternate names/languages), `properties` (jsonb for type-specific metadata like NPK needs, temperature ranges, application rates), `confidence_score` (how validated the data is), `interaction_count` (times referenced by users), `created_at`, `updated_at`

2. **`knowledge_edges`** — Relationships between nodes
   - `id`, `source_node_id` (FK), `target_node_id` (FK), `relationship` (enum: affects | treats | grows_in | thrives_in | companion_to | incompatible_with | seasonal_for | found_in), `weight` (strength/relevance 0-1), `metadata` (jsonb — dosage, timing, conditions), `reported_by_count` (number of users who confirmed this relationship), `created_at`, `updated_at`

3. **`knowledge_contributions`** — User interaction log that feeds the graph
   - `id`, `user_id` (FK), `contribution_type` (scan_confirmation | activity_log | harvest_report | manual_feedback), `source_node_id`, `target_node_id`, `edge_relationship`, `context` (jsonb — location, season, outcome), `created_at`

RLS: knowledge_nodes and knowledge_edges are publicly readable (SELECT for all authenticated users). knowledge_contributions are user-scoped (users see/create only their own). Only service role can INSERT/UPDATE nodes and edges.

### Edge Function: `knowledge-graph-query`

A new edge function that:
1. Accepts a user query context (crop, location, season, soil type — extracted from their profile and current question)
2. Queries the knowledge graph using multi-hop traversal (e.g., crop → pests that affect it → treatments for those pests → soil compatibility)
3. Returns structured context that gets injected into the AI assistant's system prompt
4. Weights results by `confidence_score`, `interaction_count`, and regional relevance

### Edge Function: `knowledge-graph-ingest`

A new edge function that:
1. Receives contributions from pest scans, soil scans, farm activities, and harvests
2. Matches entities to existing nodes (fuzzy matching on name/aliases)
3. Creates new nodes if no match found (low initial confidence)
4. Creates or strengthens edges (increments `weight` and `reported_by_count`)
5. Called automatically after successful AI scans and manually via feedback buttons

### AI Assistant Enhancement

Modify `supabase/functions/ai-assistant/index.ts` to:
1. Before calling the LLM, invoke `knowledge-graph-query` with extracted context from the user's message
2. Inject the graph results as structured context in the system prompt (e.g., "KNOWLEDGE GRAPH CONTEXT: Maize in Clay Soil during Summer in Eswatini — common pests: Fall Armyworm (confidence: 0.92), Stem Borer (0.85). Recommended treatments: ...")
3. This makes responses hyper-specific rather than generic

### Seed Data

Pre-populate the knowledge graph with ~50 crop nodes, ~80 pest/disease nodes, ~60 treatment nodes, ~10 soil types, ~6 seasons, and ~30 African regions with known relationships. This gives the graph immediate value before user contributions accumulate.

### Frontend Integration Points

1. **AIChatbot.tsx** — Add a small "Was this helpful? / Confirm / Correct" feedback UI after each AI response. Confirmations strengthen graph edges; corrections create new contributions.
2. **PestScanner / SoilScanner / AnimalDiseaseScanner** — After each successful scan, auto-submit a contribution to the knowledge graph with the identified entity, location, and season.
3. **FarmActivities** — When logging activities, auto-link crop + treatment + soil data as contributions.

### Changes Summary

| File | Change |
|---|---|
| DB Migration | Create `knowledge_nodes`, `knowledge_edges`, `knowledge_contributions` tables + seed data |
| `supabase/functions/knowledge-graph-query/index.ts` | New — multi-hop graph traversal endpoint |
| `supabase/functions/knowledge-graph-ingest/index.ts` | New — contribution processing and graph enrichment |
| `supabase/functions/ai-assistant/index.ts` | Inject knowledge graph context before LLM call |
| `src/components/AIChatbot.tsx` | Add feedback buttons (confirm/correct) after AI responses |
| `src/components/PestScanner.tsx` | Auto-submit scan results as graph contributions |
| `src/components/SoilScanner.tsx` | Auto-submit scan results as graph contributions |
| `src/components/AnimalDiseaseScanner.tsx` | Auto-submit scan results as graph contributions |
| `supabase/config.toml` | Add new function entries |

### Why This Creates a Moat

Every scan, every activity log, every harvest report strengthens the graph. After thousands of interactions from farmers across Africa, the knowledge graph becomes a proprietary dataset of real-world agricultural relationships — localized, seasonally accurate, and validated by actual outcomes. No competitor can replicate this without the same user base and interaction history.

