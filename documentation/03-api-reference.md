# Creative Powerhouse - API Reference

## Storage API (Express - Port 3001)

Base URL: `http://localhost:3001/api`

---

### GET /api/:collection

Fetch all items in a collection.

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| collection | path | string | Yes | Collection name |

**Available Collections:**
- `references` - Design blueprints
- `brands` - Brand identities
- `posts` - Generated posts
- `carousels` - Generated carousels
- `characters` - Character references
- `character_poses` - Generated poses
- `audio_voices` - Voice profiles
- `presets` - Saved configurations
- `usage_logs` - API usage logs

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

**Example:**
```bash
curl http://localhost:3001/api/references
```

---

### POST /api/:collection

Save/overwrite collection data.

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| collection | path | string | Yes | Collection name |

**Request Body:**
```json
[
  { "id": "1", "name": "Item 1", ... },
  { "id": "2", "name": "Item 2", ... }
]
```

**Response:**
```json
{
  "success": true,
  "message": "Data saved successfully"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/references \
  -H "Content-Type: application/json" \
  -d '[{"id":"1","name":"Test"}]'
```

---

### POST /api/usage_logs

Append a usage log entry. This endpoint uses append mode instead of overwrite.

**Request Body:**
```json
{
  "id": "uuid-string",
  "timestamp": 1234567890000,
  "feature": "Post Generator",
  "model": "gemini-2.0-flash",
  "inputTokens": 1500,
  "outputTokens": 800,
  "costUSD": 0.00,
  "costIDR": 0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Usage log appended"
}
```

---

## Voice API (FastAPI - Port 8000)

Base URL: `http://localhost:8000`

*Note: This server is optional and only required for voice cloning features.*

---

### GET /health

Check server and model status.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

**Example:**
```bash
curl http://localhost:8000/health
```

---

### POST /extract-embedding

Extract speaker embedding from audio sample for voice cloning.

**Request:**
- Content-Type: `multipart/form-data`
- Fields:
  - `audio`: Audio file (WAV, MP3, etc.)
  - `name`: Voice name (optional)

**Response:**
```json
{
  "voice_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Voice",
  "source_type": "upload",
  "source_duration_sec": 10.5,
  "sample_rate": 22050,
  "model_version": "XTTS v2"
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/extract-embedding \
  -F "audio=@voice_sample.wav" \
  -F "name=My Voice"
```

---

### POST /generate-speech

Generate speech using a cloned voice.

**Request Body:**
```json
{
  "text": "Hello, this is a test of the cloned voice.",
  "voice_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
- Content-Type: `audio/wav`
- Body: Audio file

**Example:**
```bash
curl -X POST http://localhost:8000/generate-speech \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","voice_id":"550e8400-e29b-41d4-a716-446655440000"}' \
  --output speech.wav
```

---

### GET /voice-dna

List all saved Voice DNA assets.

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Voice",
    "created_at": 1234567890000,
    "source_type": "upload",
    "source_duration_sec": 10.5
  }
]
```

---

### DELETE /voice-dna/{voice_id}

Delete a Voice DNA asset.

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| voice_id | path | string | Yes | Voice ID to delete |

**Response:**
```json
{
  "success": true,
  "message": "Voice DNA deleted"
}
```

---

### GET /voice-dna/{voice_id}/export

Export Voice DNA embedding file.

**Parameters:**
| Name | In | Type | Required | Description |
|------|-----|------|----------|-------------|
| voice_id | path | string | Yes | Voice ID to export |

**Response:**
- Content-Type: `application/octet-stream`
- Body: Embedding file

---

## Gemini Service Functions

### analyzeDesign(imageBase64: string, userNotes?: string): Promise<DesignPromptJson>

Extract structural DNA from a design image.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| imageBase64 | string | Yes | Base64-encoded image |
| userNotes | string | No | Additional context for analysis |

**Returns:** `DesignPromptJson` with structural rules, layout constraints, and content registry

---

### analyzeBrand(imageBase64: string): Promise<BrandDNA>

Extract brand identity from logo/moodboard.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| imageBase64 | string | Yes | Base64-encoded brand image |

**Returns:** `BrandDNA` with colors, vibe, typography, and constraints

---

### analyzeCharacter(images: string[]): Promise<CharacterDNA>

Extract character DNA from reference images.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| images | string[] | Yes | Array of base64-encoded images |

**Returns:** `CharacterDNA` with physical features, visual details, and color palette

---

### generateTemplateImage(jsonSpec: DesignPromptJson, ratio: AspectRatio): Promise<string>

Generate validation mockup from structural DNA.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| jsonSpec | DesignPromptJson | Yes | Structural DNA |
| ratio | AspectRatio | Yes | Target aspect ratio |

**Returns:** Base64-encoded image

---

### generatePost(reference: DesignPromptJson, brief: ContentBrief, options): Promise<{ image: string, prompt: string }>

Generate a new post from blueprint and brief.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| reference | DesignPromptJson | Yes | Blueprint structural DNA |
| brief | ContentBrief | Yes | Content to generate |
| options.brandDna | BrandDNA | No | Brand identity |
| options.characterDna | CharacterDNA | No | Character to include |
| options.visualAnchor | string | No | Reference image base64 |
| options.intensity | RemixIntensity | No | Remix intensity |
| options.theme | string | No | Theme mode |
| options.modelType | GeminiModel | No | Model to use |

**Returns:** Object with generated image and prompt

---

### refinePostImage(sourceImage: string, instruction: string, options): Promise<string>

Retouch an existing image with instructions.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| sourceImage | string | Yes | Base64-encoded source image |
| instruction | string | Yes | Retouch instruction |
| options.ratio | AspectRatio | No | Aspect ratio |
| options.referenceImage | string | No | Visual reference for retouch |
| options.modelType | GeminiModel | No | Model to use |

**Returns:** Base64-encoded retouched image

---

### planCarouselContent(brief: string, slideCount: number, options): Promise<CarouselSlidePlan[]>

AI-planned carousel content breakdown.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| brief | string | Yes | Overall carousel brief |
| slideCount | number | Yes | Number of slides |
| options.blueprintSpec | DesignPromptJson | No | Blueprint structure |
| options.brandDna | BrandDNA | No | Brand identity |
| options.characterDna | CharacterDNA | No | Character reference |

**Returns:** Array of slide plans with copyBrief, visualContext, and poseInstruction

---

### getTurnaroundPromptData(characterDNA: CharacterDNA, artStyle: CharacterArtStyle): Promise<{ prompt: string }>

Generate turnaround reference sheet prompt.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| characterDNA | CharacterDNA | Yes | Character DNA |
| artStyle | CharacterArtStyle | Yes | Art style to apply |

**Returns:** Object with prompt string

---

### getPosePromptData(characterDNA: CharacterDNA, poseInstruction: string, artStyle: CharacterArtStyle): Promise<{ prompt: string }>

Generate character pose prompt.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| characterDNA | CharacterDNA | Yes | Character DNA |
| poseInstruction | string | Yes | Pose description |
| artStyle | CharacterArtStyle | Yes | Art style to apply |

**Returns:** Object with prompt string

---

### generateFromAsset(assetImage: string, brandDna: BrandDNA, brief: string, options): Promise<string>

Generate branded post from asset image.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| assetImage | string | Yes | Base64-encoded asset image |
| brandDna | BrandDNA | Yes | Brand identity |
| brief | string | Yes | Content message |
| options.ratio | AspectRatio | No | Aspect ratio |
| options.modelType | GeminiModel | No | Model to use |

**Returns:** Base64-encoded generated image

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 404 | Not Found - Collection or item not found |
| 500 | Internal Server Error - Server-side error |

## Rate Limits

- Gemini API: Subject to Google's rate limits
- Storage API: No limits (local)
- Voice API: Limited by GPU memory
