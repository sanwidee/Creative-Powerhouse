# Creative Powerhouse - Documentation Index

Welcome to the Creative Powerhouse documentation. This index helps you navigate all available documentation files.

---

## Documentation Files

| File | Description | Audience |
|------|-------------|----------|
| [01-product-requirements.md](./01-product-requirements.md) | Product Requirements Document (PRD) | Product Managers, Stakeholders |
| [02-technical-specs.md](./02-technical-specs.md) | Technical architecture and specifications | Developers, Engineers |
| [03-api-reference.md](./03-api-reference.md) | API endpoints and service functions | Developers |
| [04-prompt-engineering.md](./04-prompt-engineering.md) | All AI prompts used in the system | Prompt Engineers, Developers |
| [05-feature-guide.md](./05-feature-guide.md) | Feature documentation for end users | End Users |
| [06-faq.md](./06-faq.md) | Frequently Asked Questions | All Users |
| [07-guidelines.md](./07-guidelines.md) | Best practices and user guidelines | End Users |

---

## Quick Navigation

### For Developers

1. **Getting Started:** Read [02-technical-specs.md](./02-technical-specs.md) for architecture overview
2. **API Integration:** See [03-api-reference.md](./03-api-reference.md) for endpoints
3. **AI Prompts:** Check [04-prompt-engineering.md](./04-prompt-engineering.md) for prompt customization

### For Product Managers

1. **Product Overview:** Start with [01-product-requirements.md](./01-product-requirements.md)
2. **Feature Scope:** Review [05-feature-guide.md](./05-feature-guide.md)

### For End Users

1. **Learn Features:** Read [05-feature-guide.md](./05-feature-guide.md)
2. **Best Practices:** Follow [07-guidelines.md](./07-guidelines.md)
3. **Troubleshooting:** Check [06-faq.md](./06-faq.md)

---

## System Overview

```
Creative Powerhouse
├── Frontend (React + Vite)
│   ├── Design Builder      - Blueprint creation
│   ├── Brand Lab          - Brand identity
│   ├── Character Lab      - Character management
│   ├── Generator          - Content generation
│   └── Library            - Asset management
│
├── Storage API (Express)
│   └── JSON file persistence
│
├── Voice API (FastAPI) [Optional]
│   └── Coqui XTTS voice cloning
│
└── AI Services (Gemini)
    ├── Design analysis
    ├── Brand extraction
    ├── Content generation
    └── Image generation
```

---

## Key Concepts

### Blueprint
A reusable design template extracted from a reference image. Contains structural DNA (layout, typography, composition) and content slots.

### Brand DNA
Extracted brand identity including colors, typography, vibe, and constraints. Applied to generated content for brand consistency.

### Character DNA
Consistent character profile extracted from multiple images. Includes physical features, color palette, and style notes.

### Content Brief
Input for content generation. Can be simple text or structured content mapping to blueprint slots.

### Remix Intensity
Controls how strictly the AI follows the blueprint:
- **Strict:** 100% match
- **Light:** Minor variations
- **Heavy:** Creative interpretation

### Preset
Saved configuration of blueprint + brand + character + settings for quick reuse.

---

## Data Collections

| Collection | Description |
|------------|-------------|
| `references` | Design blueprints |
| `brands` | Brand identities |
| `posts` | Generated posts |
| `carousels` | Generated carousels |
| `characters` | Character references |
| `character_poses` | Generated poses |
| `audio_voices` | Voice profiles |
| `presets` | Saved configurations |
| `usage_logs` | API usage tracking |

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Storage API | Express (Node.js) |
| Voice API | FastAPI (Python) |
| AI | Google Gemini 2.0 Flash / 2.5 Pro |
| Icons | Lucide React |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Current | Initial release with all core features |

---

## Contributing

To contribute to documentation:

1. Follow existing markdown formatting
2. Keep files focused on their audience
3. Update this index when adding new files
4. Use clear, concise language

---

## Support

- **In-App Documentation:** Click "Docs" in sidebar
- **Bug Reports:** GitHub Issues
- **Feature Requests:** GitHub Issues with "enhancement" label
