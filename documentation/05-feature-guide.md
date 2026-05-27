# Creative Powerhouse - Feature Guide

## Welcome to Creative Powerhouse

Creative Powerhouse is an AI-powered design platform that helps you create consistent, professional visual content at scale. This guide covers all features available to end users.

---

## Quick Start

1. **Set your API Key** - Go to Settings and enter your Google Gemini API key
2. **Create a Blueprint** - Upload a design you like in Design Builder
3. **Define your Brand** - Extract your brand identity in Brand Lab
4. **Generate Content** - Use the Post Generator to create new posts

---

## Core Features

### 1. Design Builder (Blueprint Creator)

**What it does:** Analyzes any design image and extracts its structural DNA for reuse.

**How to use:**
1. Click "Design Builder" in the sidebar
2. Upload a reference design image
3. (Optional) Add focus notes to guide analysis
4. Click "Analyze DNA"
5. Review the extracted structure
6. Generate a validation mockup
7. Categorize and tag your blueprint
8. Save to Library

**Best for:**
- Creating templates from existing designs
- Maintaining layout consistency
- Building a reusable design system

**Tips:**
- Use high-quality reference images
- Add focus notes to emphasize specific elements
- Generate validation mockups to verify accuracy

---

### 2. Brand Lab

**What it does:** Extracts brand identity (colors, vibe, typography) from logos or moodboards.

**How to use:**
1. Click "Brand Lab" in the sidebar
2. Upload a logo or moodboard image
3. Click "Analyze Brand DNA"
4. Review the extracted brand identity
5. Edit colors and vibe if needed
6. Save Brand Profile

**Extracted Elements:**
- Primary color palette
- Color usage logic
- Brand vibe/voice
- Typography guidelines
- Forbidden styles
- Dark/light mode variants

**Best for:**
- Onboarding new brands quickly
- Ensuring brand consistency
- Managing multiple brand identities

---

### 3. Character Lab

**What it does:** Creates consistent character references from multiple images.

**How to use:**
1. Click "Character Lab" in the sidebar
2. Select existing character OR upload new images
3. Choose an art style (original, plushy, chibi, etc.)
4. (Optional) Link to a brand for color evolution
5. Generate turnaround reference sheet
6. Review and edit DNA fields
7. Save Character

**Available Art Styles:**
| Style | Description |
|-------|-------------|
| Original | Keep source style |
| Plushy | Soft, stuffed toy appearance |
| Pixel Art | Retro pixel game aesthetic |
| Chibi | Cute, small proportions |
| Animated | Cartoon/animation style |
| Futuristic Robot | Mechanical, sci-fi look |
| Claymorphism | 3D clay-like appearance |

**Best for:**
- Creating brand mascots
- Maintaining character consistency
- Generating character variations

---

### 4. Character Studio

**What it does:** Generates character poses for use in content.

**How to use:**
1. Click "Character Studio" in the sidebar
2. Select a saved character
3. Describe the desired pose
4. Choose art style
5. Select aspect ratio
6. Generate pose

**Pose Examples:**
- "Character waving hello"
- "Character pointing at text"
- "Character celebrating with confetti"
- "Character thinking with hand on chin"

**Best for:**
- Creating mascot content
- Social media posts with characters
- Character-driven storytelling

---

### 5. Post Generator

**What it does:** Generates single posts from blueprints with optional brand and character.

**How to use:**
1. Click "Generator" in the sidebar
2. Select a Blueprint (structure)
3. (Optional) Select a Brand (style)
4. (Optional) Select a Character (if blueprint has character slot)
5. Enter your content brief
6. Configure settings:
   - Aspect Ratio: 1:1, 9:16, 16:9, 4:3, 3:4, 4:5
   - Remix Intensity: Strict, Light, Heavy
   - Theme Mode: Dark, Light, Auto
   - Model: Flash (free) or Pro (paid)
7. Click "Deploy"
8. Review and save or retouch

**Remix Intensity Levels:**
| Level | Behavior |
|-------|----------|
| Strict | Follow blueprint exactly |
| Light | Minor creative variations |
| Heavy | More creative interpretation |

**Best for:**
- High-volume content production
- Maintaining brand consistency
- A/B testing variations

---

### 6. Carousel Generator

**What it does:** Creates multi-slide carousels with AI-planned content breakdown.

**How to use:**
1. Click "Carousel Generator" in the sidebar
2. Select Blueprint, Brand, Character
3. Enter batch brief describing entire carousel
4. Set number of slides (3-10)
5. AI plans individual slide content
6. Review and adjust plan
7. Generate all slides sequentially
8. Download as ZIP or save to Library

**Carousel Structure Best Practices:**
- Slide 1: Hook/attention-grabber
- Middle slides: Core content points
- Last slide: CTA or conclusion

**Best for:**
- Educational content
- Story-driven posts
- Product showcases

---

### 7. Brand Studio

**What it does:** Quick branded post generation from asset + brand identity.

**How to use:**
1. Click "Brand Studio" in the sidebar
2. Select brand from dropdown
3. Upload hero asset (3D icon, product shot)
4. Enter message/brief
5. Choose aspect ratio & model
6. Generate branded post
7. Save or download

**Best for:**
- Quick campaign posts
- Product announcements
- Promotional content

---

### 8. Library (Asset Vault)

**What it does:** Central hub for managing all assets and generated content.

**Tabs:**
| Tab | Contents |
|-----|----------|
| Blueprints | Saved design templates |
| Brands | Brand identities |
| Characters | Character references |
| Generated | All generated posts |
| Carousels | Generated carousels |
| Poses | Character poses |
| Presets | Saved configurations |

**Actions:**
- View asset details
- Edit asset information
- Delete assets
- Download images
- Create presets from combinations

**Production Studio (for Generated posts):**
1. Click on a generated post
2. Enter retouch instruction
3. (Or) Draw annotation on image
4. Apply changes
5. View revision history
6. Rollback if needed

---

### 9. Audio Lab

**What it does:** Voice synthesis and cloning for audio content.

**Features:**
- Voice Style Synthesis (Gemini TTS)
- Voice Cloning (Coqui XTTS)
- Audio recording and upload
- Voice DNA management

**How to use (Voice Cloning):**
1. Ensure voice server is running (port 8000)
2. Click "Audio Lab" in sidebar
3. Record or upload voice sample (10+ seconds)
4. Extract voice embedding
5. Enter text to synthesize
6. Generate speech

**Best for:**
- Video voiceovers
- Audio content creation
- Brand voice consistency

---

### 10. Settings

**What it does:** API key management and usage tracking.

**Features:**
- Set/Update Gemini API Key
- View usage logs
- Monitor token consumption
- Track costs (if using Pro model)

**API Key Storage:**
- Keys stored in browser localStorage
- Keys persist across sessions
- Never transmitted except to Gemini API

---

### 11. Presets

**What it does:** Save and reuse common configurations.

**Preset Contains:**
- Blueprint selection
- Brand selection
- Character selection
- Aspect ratio
- Remix intensity
- Theme mode

**How to create:**
1. In Post Generator, configure all settings
2. Click "Save as Preset"
3. Name your preset

**How to use:**
1. In Post Generator, click "Load Preset"
2. Select saved preset
3. All settings auto-populate

---

## Supported Aspect Ratios

| Ratio | Use Case |
|-------|----------|
| 1:1 | Instagram feed, LinkedIn |
| 9:16 | Stories, Reels, TikTok |
| 16:9 | YouTube thumbnails, Twitter |
| 4:3 | Traditional layouts |
| 3:4 | Portrait posts |
| 4:5 | Instagram optimal |

---

## Model Selection

| Model | Cost | Best For |
|-------|------|----------|
| Flash | Free | Most tasks, high volume |
| Flash Latest | Free | Latest features |
| Pro | Paid | Complex reasoning, highest quality |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Escape | Close modals |
| Enter | Confirm in text fields |

---

## Tips for Best Results

1. **High-Quality References** - Use clear, high-resolution source images
2. **Specific Briefs** - Provide detailed content briefs for better results
3. **Consistent Branding** - Always select a brand when generating content
4. **Iterate** - Use retouching to refine generated content
5. **Use Presets** - Save common configurations for efficiency
6. **Review History** - Revision history allows easy rollback
