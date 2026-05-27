# Creative Powerhouse - FAQ

## General Questions

### What is Creative Powerhouse?

Creative Powerhouse is an AI-powered design platform that helps you create consistent, professional visual content at scale. It uses Google Gemini AI to analyze designs, extract structural DNA, and generate new content while maintaining brand consistency.

---

### Do I need an API key?

Yes. You need a Google Gemini API key to use the AI features. You can get one for free from [Google AI Studio](https://aistudio.google.com/).

---

### Is Creative Powerhouse free to use?

The application itself is free. The AI features use Google Gemini, which offers a generous free tier (Flash models). Pro models require a paid API key.

---

### What browsers are supported?

Creative Powerhouse works best on modern browsers:
- Chrome (recommended)
- Firefox
- Safari
- Edge

---

### Where is my data stored?

All data is stored locally on your computer in JSON files. Nothing is sent to external servers except:
- API calls to Google Gemini
- (Optional) Voice server on localhost

---

## Getting Started

### How do I set up my API key?

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/)
2. Open Creative Powerhouse
3. Go to Settings (gear icon)
4. Enter your API key
5. Click Save

You can also set the key in a `.env` file:
```
VITE_GEMINI_API_KEY=your_key_here
```

---

### What should I create first?

Recommended order:
1. **Brand Profile** - Define your brand identity
2. **Blueprints** - Create design templates
3. **Characters** (optional) - If you use mascots
4. **Generate Content** - Start creating posts

---

### How do I start the application?

```bash
# Start everything (frontend + storage server)
npm run dev

# Or start individually
npm run client   # Frontend on :3000
npm run server   # Storage API on :3001
```

---

## Design Builder

### What makes a good reference image?

Good reference images have:
- Clear, high resolution
- Distinct layout structure
- Readable text elements
- Professional design quality

Avoid:
- Blurry or low-quality images
- Overly complex layouts
- Screenshots with UI elements

---

### What are focus notes?

Focus notes help guide the AI's analysis. Use them to:
- Emphasize specific elements
- Clarify ambiguous design choices
- Provide context

Example: "Focus on the typography hierarchy and color blocking"

---

### What is a validation mockup?

A validation mockup is a generated image showing your blueprint with placeholder content. It helps verify that the extracted structure is accurate before you use it for content generation.

---

### What is the content registry?

The content registry is a list of all text/content slots in your blueprint. Each slot has:
- ID (for structured content mapping)
- Label (human-readable name)
- Type (text, number, call-to-action)
- Description (position and style)

---

## Brand Lab

### Can I have multiple brands?

Yes. Create as many brand profiles as you need. Each brand has its own identity and can be selected when generating content.

---

### What is brand vibe?

Brand vibe describes the emotional tone of your brand:
- Professional & Corporate
- Playful & Fun
- Luxurious & Premium
- Minimalist & Clean
- Bold & Energetic

The AI uses this to inform content generation style.

---

### What are forbidden styles?

Forbidden styles are design approaches that don't fit your brand:
- "No gradients"
- "No drop shadows"
- "No decorative fonts"
- "No cartoon illustrations"

---

## Character Lab

### How many reference images do I need?

- **Minimum:** 1 clear image of the character
- **Recommended:** 3-5 images showing different angles/poses
- **Best:** 5-10 images with consistent style

More images = better consistency across generations.

---

### What is a turnaround sheet?

A turnaround sheet shows your character from 8 different angles:
- Front
- Back
- Left side
- Right side
- Four 3/4 angles

This helps maintain character consistency in different poses.

---

### What is Identity Lock?

Identity Lock ensures the character's core features (face, body type, signature elements) remain consistent across all generations. The AI will not deviate from the reference.

---

### What is brand linking?

When you link a character to a brand, the character's color palette can evolve to match the brand's colors. This is useful for:
- Brand mascots
- Product characters
- Themed variations

---

## Content Generation

### What's the difference between Remix Intensity levels?

| Level | Behavior | Use When |
|-------|----------|----------|
| Strict | Follow blueprint exactly | Brand guidelines are rigid |
| Light | Minor creative variations | Want slight freshness |
| Heavy | More creative interpretation | Exploring new directions |

---

### What is Theme Mode?

| Mode | Behavior |
|------|----------|
| Dark | Generates dark-themed content |
| Light | Generates light-themed content |
| Auto | Uses blueprint's original theme |

---

### Should I use Flash or Pro model?

| Model | Best For |
|-------|----------|
| Flash | Most tasks, high volume, free tier |
| Pro | Complex reasoning, highest quality, paid |

Start with Flash. Switch to Pro if you need better results.

---

### Why is my generation taking long?

Generation time depends on:
- AI model load
- Image complexity
- Current API traffic

Typical times:
- Analysis: 10-15 seconds
- Single image: 15-30 seconds
- Carousel: 30-60 seconds per slide

---

### Can I generate multiple variations at once?

Yes. In the Post Generator, you can generate multiple variations by:
1. Running generation multiple times
2. Changing the remix intensity
3. Modifying the brief slightly

---

## Carousel Generator

### How does carousel planning work?

1. You provide an overall brief
2. AI breaks it down into individual slides
3. Each slide gets:
   - Main text/headline
   - Visual context
   - Character pose (if applicable)
4. You review and adjust the plan
5. All slides generate sequentially

---

### How many slides should a carousel have?

- **Minimum:** 3 slides
- **Recommended:** 5-7 slides
- **Maximum:** 10 slides

Best engagement is typically 5-7 slides.

---

### Can I edit the carousel plan?

Yes. After AI planning, you can edit each slide's:
- Copy brief
- Visual context
- Pose instruction

before generating.

---

## Production Studio (Retouching)

### What can I retouch?

- Text content
- Colors
- Element positions
- Small visual details

### What can't I retouch?

Major structural changes may require re-generation. Retouching is for refinements, not redesigns.

---

### What is annotation?

Annotation lets you draw on an image to mark areas for modification. Use it to:
- Highlight elements to change
- Circle areas for adjustment
- Draw arrows or marks

---

### How does revision history work?

Every retouch creates a new version. You can:
- View all previous versions
- Rollback to any version
- Compare versions
- Download any version

---

## Audio Lab

### Do I need the voice server?

The voice server is optional. You only need it for:
- Voice cloning features
- Coqui XTTS synthesis

Voice style synthesis (Gemini TTS) works without it.

---

### How long should a voice sample be?

- **Minimum:** 10 seconds
- **Recommended:** 30-60 seconds
- **Best:** 1-2 minutes of clear speech

Longer samples = better voice quality.

---

### What audio formats are supported?

- WAV (recommended)
- MP3
- M4A
- OGG

---

## Troubleshooting

### "API key not found" error

1. Go to Settings
2. Enter your API key
3. Click Save
4. Refresh the page

### "Rate limit exceeded" error

- Wait a few minutes
- Try again with smaller requests
- Consider upgrading to paid tier

### Generated images look wrong

1. Try different remix intensity
2. Provide more specific briefs
3. Check that blueprint is accurate
4. Generate validation mockup first

### App is slow

- Clear browser cache
- Check internet connection
- Close unused browser tabs

### Data not saving

1. Check storage server is running (`npm run server`)
2. Check port 3001 is available
3. Check `database/` folder exists

---

## Security & Privacy

### Is my API key safe?

- Keys stored in browser localStorage
- Keys never transmitted except to Gemini API
- Keys persist across sessions
- Clear browser data to remove keys

### Is my content private?

- All data stored locally on your computer
- Only API calls go to Google Gemini
- No data sent to third parties
- Generated images are yours

---

## Getting Help

### Where can I find documentation?

1. In-app: Click "Docs" in sidebar
2. `/documentation` folder in project

### How do I report bugs?

Report issues at: [GitHub Issues](https://github.com/anomalyco/opencode/issues)

### Can I request features?

Yes! Submit feature requests via GitHub Issues with the "enhancement" label.
