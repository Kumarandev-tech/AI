# Qoruz AI prototype feature status

This frontend prototype demonstrates five creator-marketing agents with Gemini and Ollama. It intentionally has no backend, Qoruz API calls, database, or external web search.

| Agent | Available behavior | Data shown | Limits |
| --- | --- | --- | --- |
| Influencer Discovery | Understand search criteria and demonstrate creator cards | Fictional, labeled sample creators | No live creator profiles or verified matches |
| Campaign Research | Explain campaign metrics and demonstrate metric/chart rendering | Labeled illustrative sample metrics | No live campaign reports, ROI, or historical results |
| Competitor Intelligence | Create research frameworks and strategic hypotheses | User-provided context and AI suggestions | No verified competitor activity or external search |
| Campaign Planning | Draft briefs, deliverables, budget recommendations, and timelines | User-provided brief; deterministic budget split | No creator rates, forecasts, saved campaigns, or Qoruz writes |
| Content Intelligence | Generate themes, hooks, and formats | AI suggestions | No live posts, saved research, or verified trends |

Provider errors are surfaced in chat. Response JSON is schema-validated and rendered through an allowlist; invalid model output falls back to text. Agent histories and model preferences use browser local storage.
