# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start everything (frontend + storage server concurrently)
npm run dev

# Individual servers
npm run client      # Vite frontend on :3000
npm run server      # Express storage API on :3001

# Build for production
npm run build
npm run preview

# Voice server (optional, Python/FastAPI on :8000)
cd voice_server
python main.py
```

No test suite is configured in this project.

## Chat-driven workflow (when Claude is the operator)

You — Claude in this folder — are a parallel client to the app. The user can drive Creative Powerhouse via UI OR by chatting with you. Both clients share the same backend: the Express storage on `:3001` reading/writing JSON files in `database/`.

**The CLI: `tools/powerhouse.mjs`**

This is your primary interface for read/write/generate. It speaks to the storage API and Gemini.

```bash
# Read state
node tools/powerhouse.mjs list brands
node tools/powerhouse.mjs list brand_assets
node tools/powerhouse.mjs get-brand qlipper        # by id or name substring

# Plan content (Gemini text-gen)
node tools/powerhouse.mjs plan-ideas --brief "AI productivity tips" --count 10
node tools/powerhouse.mjs plan-ideas --brief "..." --count 14 --brand <brand_id> --save

# Generate a brand asset (Gemini image-gen, saved to brand_assets)
node tools/powerhouse.mjs gen-asset --brand <brand_id> \
  --name "Scissor cut icon" \
  --brief "minimal scissor silhouette, brand-aligned"
# Add --dry-run to preview the prompt without spending quota.
```

**Collections** (all in `database/*.json`, persisted via POST /api/<name>):

| Collection | Purpose |
|---|---|
| `references` | DesignReference[] — templates extracted from inspiration |
| `brands` | BrandReference[] — brand DNAs |
| `brand_assets` | BrandAsset[] — reusable visual elements per brand (logo, motif, decoration) |
| `characters` | CharacterReference[] |
| `character_poses` | GeneratedCharacterPose[] |
| `posts` | GeneratedPost[] |
| `carousels` | GeneratedCarousel[] |
| `audio_voices` | AudioReference[] |
| `presets` | Preset[] |
| `feed_previews` | FeedPreviewProject[] |
| `content_plans` | (new) Saved batch-idea plans |
| `usage_logs` | Append-only Gemini usage log |

Shapes are declared in `types.ts`.

**Rules of engagement**:

- **Ask before generating > 5 items in one call.** Each gen call costs the user quota/money. For one-off ideas (count ≤ 5) just go.
- **Image generation is expensive.** Always confirm before `gen-asset`, and prefer `--dry-run` first if uncertain.
- **Never write directly to `database/*.json`** — always POST through the storage API. Direct writes race with the running app.
- **Reads via GET /api/<collection>** are safe and instant.
- **The user's API key may be expired.** If a Gemini call 401/403s, tell the user to renew at https://aistudio.google.com/apikey and update `.env` — don't try other keys.
- **Captions/copy must follow the humanizer rules** baked into `tools/powerhouse.mjs` (no em-dashes, no AI-tells, contractions on, vary sentence length).
- **After writing data**, the user can see changes by reloading the relevant screen in the running app (or revisiting it).

**Common chat patterns**:

> "Hey Claude, give me 20 post ideas for the next 2 weeks about [topic]"
→ Run `plan-ideas --brief "<topic>" --count 20`. Show ideas in chat. Ask if they want to `--save`.

> "Hey Claude, list my Qlipper brand assets"
→ Run `list brand_assets` and filter by brand, OR `get-brand qlipper`.

> "Hey Claude, generate 3 more Qlipper assets that don't duplicate existing"
→ Run `get-brand qlipper` to see existing → propose 3 distinct briefs → ask user to confirm → run `gen-asset` once per brief.

> "Hey Claude, what's in my Library?"
→ Run `list posts`, `list carousels`. Summarize.

## API Key Setup

The app requires a Google Gemini API key. In development, create a `.env` file at the root:

```
VITE_GEMINI_API_KEY=your_key_here
```

The key resolution order in `services/geminiService.ts`: `localStorage['IKHSAN_LAB_KEY']` → `import.meta.env.VITE_GEMINI_API_KEY`. The key can be set directly in the app's Settings page and persists across browser sessions.

## Architecture

This is a **React 19 + TypeScript + Vite** single-page app ("Weed Labs / Creative Powerhouse") with two backend servers:

### Three-Server Architecture

| Server | Port | Tech | Purpose |
|--------|------|------|---------|
| Frontend | 3000 | Vite + React | SPA served by Vite dev server |
| Storage API | 3001 | Express (Node) | JSON file persistence (`database/*.json`) |
| Voice API | 8000 | FastAPI (Python) | Coqui XTTS v2 voice cloning (optional) |

The Vite dev server proxies `/api/*` → `localhost:3001`. The storage server reads/writes flat JSON files in `database/`. The voice server is entirely optional and only needed for the Audio Lab's voice cloning feature.

### State Management Pattern

All application state lives in `App.tsx`. There is no Redux/Zustand — `App.tsx` owns all collections (`references`, `brands`, `generatedPosts`, `characters`, etc.) and passes down handlers. Every mutation follows the pattern:

1. Update local React state
2. Immediately call `saveData(collection, updatedArray)` → `POST /api/{collection}` → overwrites the JSON file

On startup, `App.tsx` fetches all collections from the storage API and handles a one-time migration from legacy `localStorage` keys.

### Tool/Module Mapping

Each `AppTool` enum value in `types.ts` maps to a component rendered by `App.tsx`'s `renderTool()` switch:

- `BUILDER` → `Builder.tsx` — Upload reference image, extract "Design DNA" (DesignPromptJson), save as DesignReference blueprint
- `BRAND_LAB` → `BrandLab.tsx` — Extract BrandDNA (colors, typography, vibe) from brand images
- `CHARACTER_LAB` → `CharacterLab.tsx` — Extract CharacterDNA from character images, with art style selection
- `CHARACTER_STUDIO` → `CharacterStudio.tsx` — Generate character poses using saved CharacterReferences
- `GENERATOR` → `Generator.tsx` — Generate single posts from blueprints + brands + characters with remix intensity control
- `CAROUSEL_GENERATOR` → `CarouselGenerator.tsx` — AI-planned multi-slide carousel generation
- `LIBRARY` → `Library.tsx` — Browse/manage all saved references and generated assets
- `AUDIO_LAB` → `AudioLab.tsx` — Voice style synthesis (Gemini TTS) and voice cloning (Coqui XTTS)
- `SETTINGS` → `Settings.tsx` — API key management
- `DOCS` → `Documentation.tsx` — In-app documentation

### AI Service Layer (`services/geminiService.ts`)

All Gemini API calls go through this file. Key patterns:
- Uses `@google/genai` SDK with `GoogleGenAI` client instantiated per-call via `getAI()`
- `MODEL_MAP` at the top maps `flash` / `pro` to actual model IDs. Flash = free tier (`gemini-2.0-flash` text, `gemini-2.0-flash-preview-image-generation` images). Pro = paid (`gemini-2.5-pro-preview-05-06` text, `imagen-3.0-generate-002` images).
- **All image generation defaults to `flash` (free tier).** Functions that generate images all accept an optional `modelType: GeminiModel = 'flash'` parameter.
- `buildImageConfig(modelName, ratio)` decides which generation config to use: dedicated image-gen models (name contains `-image-` or `imagen`) get `{ imageConfig: { aspectRatio } }`; flash/multimodal models get `{ responseModalities: ['image'] }` (aspect ratio is already included in every text prompt).
- Every API call records usage to `database/usage_logs.json` via `recordUsage()`
- JSON responses from Gemini are extracted with `extractJsonFromText()` (finds first `{` to last `}`)
- Images are passed as base64 inline data parts

### Core Data Types (`types.ts`)

- `DesignReference` — A blueprint: reference image + extracted `DesignPromptJson` (structural DNA) + markdown brief
- `BrandReference` — Brand identity: image + `BrandDNA` (colors, vibe, typography)
- `CharacterReference` — Character: source images + `CharacterDNA` (physical features, style)
- `GeneratedPost` — A generated image with full retouch `RetouchHistory[]`
- `Preset` — Saved combination of blueprint + brand + character + settings for quick reuse
- `AudioReference` — Either a Gemini voice style (`AudioDNA`) or a Coqui cloned voice (`VoiceDNA`)

### Storage Collections (flat JSON files in `database/`)

`references`, `brands`, `posts`, `carousels`, `characters`, `character_poses`, `audio_voices`, `presets`, `usage_logs`

The `usage_logs` collection uses append mode; all others use full-overwrite mode.

### UI Conventions

- Tailwind CSS with dark mode via `dark:` prefix (toggled by adding `dark` class to `<html>`)
- Theme preference stored in `localStorage['ikhsan_theme']`
- No Tailwind config file — classes are inlined; dynamic accent colors use a `getAccentClasses()` map in `App.tsx` to avoid Tailwind purging dynamic class strings
- Sidebar navigation is icon-only by default, expands to full labels on hover
- The `AssistantHub` component (`components/AssistantHub.tsx`) is always mounted as a floating overlay
