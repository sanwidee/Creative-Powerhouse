# Creative Powerhouse - Technical Specifications

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    React 19 + Vite                       │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │
│  │  │ Builder │  │Generator│  │Library  │  │Settings │    │    │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │    │
│  │       │            │            │            │          │    │
│  │       └────────────┴────────────┴────────────┘          │    │
│  │                          │                               │    │
│  │              ┌───────────┴───────────┐                  │    │
│  │              │   geminiService.ts    │                  │    │
│  │              │   voiceService.ts     │                  │    │
│  │              └───────────┬───────────┘                  │    │
│  └──────────────────────────┼──────────────────────────────┘    │
└─────────────────────────────┼───────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │ Gemini API  │  │Storage API  │  │ Voice API   │
     │ (Google)    │  │ (Express)   │  │ (FastAPI)   │
     │ Port: N/A   │  │ Port: 3001  │  │ Port: 8000  │
     └─────────────┘  └──────┬──────┘  └─────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    database/    │
                    │  (JSON Files)   │
                    └─────────────────┘
```

### Three-Server Architecture

| Server | Port | Technology | Purpose |
|--------|------|------------|---------|
| Frontend | 3000 | Vite + React 19 | SPA development server with HMR |
| Storage API | 3001 | Express (Node.js) | JSON file persistence layer |
| Voice API | 8000 | FastAPI (Python) | Coqui XTTS voice cloning (optional) |

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.3 | UI framework |
| TypeScript | 5.8.2 | Type safety |
| Vite | 6.2.0 | Build tool & dev server |
| Tailwind CSS | (inline) | Styling |
| Lucide React | 0.562.0 | Icon library |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Express | 5.2.1 | Storage API server |
| FastAPI | (Python) | Voice cloning server |
| Coqui XTTS | v2 | Voice synthesis |

### AI/ML

| Technology | Purpose |
|------------|---------|
| Google Gemini 2.0 Flash | Text analysis & image generation (free tier) |
| Gemini 2.5 Pro | Advanced reasoning (paid tier) |
| Imagen 3.0 | High-quality image generation (paid tier) |

### Utilities

| Library | Purpose |
|---------|---------|
| @google/genai | Gemini API SDK |
| file-saver | File downloads |
| jszip | ZIP file creation |
| concurrently | Run multiple servers |

---

## Data Flow

### State Management Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                              │
│  (Single Source of Truth - No Redux/Zustand)                │
│                                                              │
│  State Collections:                                          │
│  ├── references: DesignReference[]                          │
│  ├── brands: BrandReference[]                               │
│  ├── generatedPosts: GeneratedPost[]                        │
│  ├── generatedCarousels: GeneratedCarousel[]                │
│  ├── characters: CharacterReference[]                       │
│  ├── characterPoses: GeneratedCharacterPose[]               │
│  ├── audioVoices: AudioReference[]                          │
│  └── presets: Preset[]                                      │
│                                                              │
│  Handlers (passed to components):                           │
│  ├── saveReference()                                        │
│  ├── saveBrand()                                            │
│  ├── savePost()                                             │
│  ├── deleteReference()                                      │
│  └── ...                                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
    ┌─────────┐      ┌─────────┐      ┌─────────┐
    │setState │      │saveData │      │fetchData│
    │(local)  │      │(persist)│      │(load)   │
    └─────────┘      └────┬────┘      └─────────┘
                          │
                          ▼
              POST /api/{collection}
                          │
                          ▼
                 ┌────────────────┐
                 │ Express Server │
                 │   (port 3001)  │
                 └───────┬────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ database/{col}.json │
              └─────────────────────┘
```

### Mutation Pattern

Every data mutation follows this sequence:

1. **User Action** → Component triggers handler
2. **Local Update** → `setState()` updates React state immediately
3. **Persistence** → `saveData(collection, data)` calls Storage API
4. **Confirmation** → UI reflects saved state

```typescript
const saveReference = async (ref: DesignReference) => {
  const updated = [...references, ref];
  setReferences(updated);           // 1. Local state update
  await saveData('references', updated); // 2. Persist to API
};
```

---

## API Specifications

### Storage API (Express - Port 3001)

#### GET /api/:collection
Fetch all items in a collection.

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

**Collections:** `references`, `brands`, `posts`, `carousels`, `characters`, `character_poses`, `audio_voices`, `presets`, `usage_logs`

#### POST /api/:collection
Save/overwrite collection data.

**Request Body:**
```json
[...array of items...]
```

**Response:**
```json
{
  "success": true,
  "message": "Data saved successfully"
}
```

#### POST /api/usage_logs
Append a usage log entry (special append mode).

**Request Body:**
```json
{
  "id": "uuid",
  "timestamp": 1234567890,
  "feature": "Post Generator",
  "model": "gemini-2.0-flash",
  "inputTokens": 1500,
  "outputTokens": 800,
  "costUSD": 0.00,
  "costIDR": 0
}
```

### Voice API (FastAPI - Port 8000) - Optional

#### GET /health
Check server and model status.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

#### POST /extract-embedding
Extract speaker embedding from audio sample.

**Request:** `multipart/form-data` with audio file

**Response:**
```json
{
  "voice_id": "uuid",
  "name": "voice_name",
  "sample_rate": 22050,
  "duration_sec": 10.5
}
```

#### POST /generate-speech
Generate speech using cloned voice.

**Request Body:**
```json
{
  "text": "Hello, this is a test.",
  "voice_id": "uuid"
}
```

**Response:** Audio file (WAV)

---

## Data Models

### Core Types Hierarchy

```
AppTool (enum)
├── LANDING, BUILDER, BRAND_LAB, CHARACTER_LAB
├── CHARACTER_STUDIO, GENERATOR, CAROUSEL_GENERATOR
├── BRAND_STUDIO, LIBRARY, AUDIO_LAB, SETTINGS, DOCS

DesignReference
├── id: string
├── name: string
├── imageSource: string (base64)
├── templateImage?: string (base64)
├── markdownBrief: string
├── jsonSpec: DesignPromptJson
├── aspectRatio: AspectRatio
├── category?: BlueprintCategory
└── tags: string[]

DesignPromptJson (Structural DNA)
├── template_name: string
├── blueprint_type?: 'headline' | 'carousel' | 'mixed'
├── structural_rules: VisualStyle
│   ├── layout_archetype: string
│   ├── typography_system: string
│   ├── composition_map: string
│   ├── has_character_slot?: boolean
│   ├── dark_theme_adaptation?: string
│   └── light_theme_adaptation?: string
├── layout_constraints
│   ├── forbidden_elements: string[]
│   ├── mandatory_anchors: string[]
│   └── white_space_logic: string
└── content_registry: ExtractedField[]

BrandReference
├── id: string
├── name: string
├── imageSource: string
├── dna: BrandDNA
│   ├── brand_name: string
│   ├── primary_colors: string[]
│   ├── color_logic: string
│   ├── brand_vibe: string
│   ├── typography_notes: string
│   ├── forbidden_styles: string[]
│   ├── dark_mode_colors?: string[]
│   └── light_mode_colors?: string[]
└── createdAt: number

CharacterReference
├── id: string
├── name: string
├── sourceImages: string[]
├── dna: CharacterDNA
│   ├── character_name: string
│   ├── physical_features: string
│   ├── visual_details: string
│   ├── color_palette: string[]
│   ├── style_notes: string
│   ├── reference_images: string[]
│   ├── linked_brand_id?: string
│   ├── assigned_art_style?: CharacterArtStyle
│   └── identity_lock?: boolean
└── createdAt: number

GeneratedPost
├── id: string
├── name: string
├── imageSource: string
├── history: RetouchHistory[]
├── blueprintId: string
├── brandId?: string
├── characterId?: string
├── aspectRatio: AspectRatio
└── createdAt: number

RetouchHistory
├── id: string
├── timestamp: number
├── instruction: string
├── image: string
└── type: 'text' | 'visual_reference' | 'annotation'

ContentBrief
├── topic: string
├── elements_to_display: string
├── copy_instructions: string
├── target_audience: string
├── aspectRatio: AspectRatio
├── slide_number?: number
├── total_slides?: number
├── structured_content?: Record<string, string>
└── characterId?: string

Preset
├── id: string
├── name: string
├── blueprintId: string
├── brandId?: string
├── characterId?: string
├── aspectRatio?: AspectRatio
├── intensity?: RemixIntensity
├── themeMode?: 'light' | 'dark' | 'auto'
└── createdAt: number

AudioReference
├── id: string
├── name: string
├── type?: 'style' | 'clone'
├── dna?: AudioDNA (Gemini style)
├── voiceDna?: VoiceDNA (Coqui clone)
└── createdAt: number

UsageLog
├── id: string
├── timestamp: number
├── feature: string
├── model: string
├── inputTokens: number
├── outputTokens: number
├── costUSD: number
└── costIDR: number
```

---

## Model Configuration

### MODEL_MAP

```typescript
const MODEL_MAP = {
  flash: {
    text: 'gemini-2.0-flash',
    image: 'gemini-2.0-flash-preview-image-generation'
  },
  'flash-latest': {
    text: 'gemini-flash-latest',
    image: 'gemini-2.0-flash-preview-image-generation'
  },
  pro: {
    text: 'gemini-2.5-pro-preview-05-06',
    image: 'imagen-3.0-generate-002'
  }
};
```

### Image Configuration

```typescript
function buildImageConfig(modelName: string, ratio: string) {
  if (modelName.includes('-image-') || modelName.includes('imagen')) {
    return { imageConfig: { aspectRatio: ratio } };
  }
  return { responseModalities: ['image'] };
}
```

### Default Behavior

- **All image generation defaults to `flash` (free tier)**
- Pro model requires paid API key
- Aspect ratio is included in every text prompt for consistency

---

## Vite Proxy Configuration

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
```

---

## Storage Structure

```
database/
├── references.json      # Design blueprints
├── brands.json          # Brand identities
├── posts.json           # Generated posts
├── carousels.json       # Generated carousels
├── characters.json      # Character references
├── character_poses.json # Generated poses
├── audio_voices.json    # Voice profiles
├── presets.json         # Saved configurations
└── usage_logs.json      # API usage tracking (append-only)
```

---

## Security Considerations

1. **API Key Storage** - Keys stored in localStorage, never transmitted except to Gemini API
2. **Local Persistence** - All data stored locally in JSON files
3. **No Authentication** - Single-user local application
4. **Base64 Images** - All images stored as base64 strings in JSON

---

## Error Handling

### API Errors
- Network failures show user-friendly messages
- Failed generations allow retry
- Usage tracking records both success and failure

### State Recovery
- Data fetched from storage API on app load
- Failed saves revert local state
- Revision history allows rollback

---

## Performance Optimizations

1. **Lazy Loading** - Components loaded on navigation
2. **Base64 Caching** - Images cached in memory
3. **Debounced Saves** - Rapid changes batched before save
4. **Parallel API Calls** - Independent data fetched concurrently
