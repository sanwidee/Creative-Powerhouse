# Creative Powerhouse - Prompt Engineering Reference

This document contains all prompts used in the application for AI-powered content generation.

---

## Design DNA Extraction

### analyzeDesign Prompt

Used in: `Builder.tsx` → `services/geminiService.ts:analyzeDesign()`

```
You are a World-Class Design Engineer.
Task: Deconstruct the provided social media post into a FUNCTIONAL WIREFRAME.

User Focus Notes: ${userNotes || 'Standard analysis'}.

GOAL: We need to know "What Goes Where" so we can swap text/images while keeping the layout EXACTLY the same.

1. IDENTIFY THE ARCHETYPE: Headline Listicle, Product Showcase, Quote, etc.
2. MAP THE CONTENT SLOTS: Identify EVERY piece of text and its location.

Output Format:
1. Detailed Markdown Report.
2. The string "---JSON_START---".
3. A JSON object:
{
  "template_name": "Name of layout",
  "structural_rules": {
    "layout_archetype": "Category",
    "typography_system": "Font weights/styles used",
    "composition_map": "Brief description of element placement",
    "has_character_slot": true,
    "dark_theme_adaptation": "Dark mode rule",
    "light_theme_adaptation": "Light mode rule"
  },
  "layout_constraints": {
    "forbidden_elements": ["What breaks the layout"],
    "mandatory_anchors": ["What must stay fixed"],
    "white_space_logic": "Breathing room description"
  },
  "content_registry": [
    { 
      "id": "headline_1", 
      "label": "Main Title", 
      "placeholder": "Current text in image", 
      "type": "text", 
      "description": "Top center, large bold sans-serif" 
    }
  ],
  "base_visual_dna_prompt": "IGNORE THIS FIELD. VISUAL ANCHOR ACTIVE."
}

IMPORTANT: The 'has_character_slot' should be TRUE if there is a mascot/person.
```

**Purpose:** Deconstruct a design into a reusable structural blueprint

**Output:** Markdown report + JSON structural DNA

---

## Brand DNA Extraction

### analyzeBrand Prompt

Used in: `BrandLab.tsx` → `services/geminiService.ts:analyzeBrand()`

```
Analyze this brand asset. Extract Brand DNA. 
Return ONLY a JSON object: { 
  "brand_name": "string", 
  "primary_colors": ["hex codes"], 
  "color_logic": "string", 
  "brand_vibe": "string", 
  "typography_notes": "string", 
  "forbidden_styles": [],
  "dark_mode_colors": ["hex codes for dark theme backgrounds/accents"],
  "light_mode_colors": ["hex codes for light theme backgrounds/accents"]
}
```

**Purpose:** Extract brand identity guidelines from logo/moodboard

**Output:** JSON with colors, vibe, typography, constraints

---

## Character DNA Extraction

### analyzeCharacter Prompt

Used in: `CharacterLab.tsx` → `services/geminiService.ts:analyzeCharacter()`

```
You are an expert Character Designer. 
Analyze the provided images to extract a consistent CHARACTER DNA profile. 
Focus on identifying the SAME character across all images.

Output Format:
Return ONLY a JSON object:
{
  "character_name": "string",
  "physical_features": "Detailed description",
  "visual_details": "Facial features, accessories, textures",
  "color_palette": ["#hex1", "#hex2"],
  "style_notes": "Art style, rendering technique",
  "reference_images": []
}
```

**Purpose:** Extract consistent character identity from multiple reference images

**Output:** JSON with physical features, color palette, style notes

---

## Validation Mockup Generation

### generateTemplateImage Prompt

Used in: `Builder.tsx` → `services/geminiService.ts:generateTemplateImage()`

```
Create a high-fidelity design mockup.
The layout is a ${jsonSpec.structural_rules.layout_archetype}.
Element placement: ${jsonSpec.structural_rules.composition_map}.
Typography vibe: ${jsonSpec.structural_rules.typography_system}.
Include placeholder text that says 'YOUR CONTENT HERE'.
Aspect Ratio: ${ratio}. Compose the image to fit a ${ratio} frame. Clean, professional social media graphic.
```

**Purpose:** Generate a validation mockup to verify blueprint accuracy

**Output:** Generated image with placeholder content

---

## Post Generation

### getPostPromptData (Without Visual Anchor)

Used in: `Generator.tsx` → `services/geminiService.ts:getPostPromptData()`

```
Create a new post remix. 
SOURCE DNA: ${JSON.stringify(reference)}
NEW BRIEF: ${JSON.stringify(brief)}
${carouselCtx}
${brandContext}
${characterCtx}
INTENSITY: ${intensity}
THEME MODE: ${theme}

THEME ADAPTATION RULES:
${theme === 'dark' ? (reference.structural_rules.dark_theme_adaptation || "...") : ''}
${theme === 'light' ? (reference.structural_rules.light_theme_adaptation || "...") : ''}

FUNCTIONAL WIREFRAME INSTRUCTIONS:
You have been provided with a Source Image (Image 1) and a Content Registry (in Source DNA).
1. Your GOAL is to perform a text-swap and content-fill while preserving the EXACT structure and aesthetic of Image 1.
2. For each item in the 'content_registry' or 'structured_content', identify that specific element in Image 1.
3. Replace the text/content of that element with the new content provided in the BRIEF.
4. DO NOT hallucinate new layouts. Stick to the grid, spacing, and font hierarchy of Image 1.

Return a production report then ---PROMPT_START--- then a single-line visual prompt...

${brief.structured_content ? `PRIORITY CONTENT MAPPING: The user provided specific text for these slots...` : ''}
```

### getPostPromptData (With Visual Anchor)

```
VISUAL ANCHOR: I have attached the original blueprint as Image 1. 
    
TASK: Create a pixel-perfect remix of Image 1.
- Copy the Composition: 100% Match.
- Copy the Lighting/Vibe: 100% Match.
- Copy the Typography Style: 100% Match.

CHANGE ONLY THE CONTENT:
${brief.structured_content ? `Map the following specific new text...` : `Update the text content to match this brief...`}

${characterCtx}
${brandContext}
${carouselCtx}

OUTPUT INSTRUCTION: Return a brief production analysis, then the separator "---PROMPT_START---", followed by a precise visual prompt...
```

**Purpose:** Generate new post content while maintaining blueprint structure

**Key Variables:**
- `intensity`: strict | light | heavy
- `theme`: dark | light | auto
- `brandContext`: Brand DNA if selected
- `characterCtx`: Character DNA if selected

---

## Carousel Planning

### planCarouselContent Prompt

Used in: `CarouselGenerator.tsx` → `services/geminiService.ts:planCarouselContent()`

```
You are a Content Strategist for social media carousels.

TASK: Break down this carousel brief into ${slideCount} individual slides.

CAROUSEL BRIEF: "${brief}"

BLUEPRINT TYPE: ${blueprintSpec.template_name} (${blueprintSpec.structural_rules.layout_archetype})

CONTEXT:
- ${brandContext}
- ${characterContext}

OUTPUT REQUIREMENTS:
For each slide, provide:
1. copyBrief: The main text/headline for this slide (1-2 sentences max)
2. visualContext: What should be visually emphasized on this slide
3. poseInstruction: ${characterDNA ? "REQUIRED - describe the character's pose, action, expression, or scene..." : "null (no character)"}

CAROUSEL STRUCTURE BEST PRACTICES:
- Slide 1: Hook/attention-grabber (character could be waving, gesturing 'stop', or looking curious)
- Middle slides: Core content points (character demonstrates, points, or reacts to content)
- Last slide: CTA or conclusion (character could be thumbs up, waving goodbye, or celebratory)

Return ONLY a JSON array with exactly ${slideCount} objects:
[
  { "slideNumber": 1, "copyBrief": "...", "visualContext": "...", "poseInstruction": "..." },
  ...
]
```

**Purpose:** AI-planned content breakdown for multi-slide carousels

**Output:** Array of slide plans with copy, visual context, and pose instructions

---

## Post Retouching

### refinePostImage Prompt

Used in: `Library.tsx` (Production Studio) → `services/geminiService.ts:refinePostImage()`

```
${baseInstruction}

INSTRUCTION: ${instruction}

${refImageB64 ? 'Use the second image ONLY as a reference...' : ''}

PRESERVATION RULES:
1. DO NOT change the background or illustration.
2. DO NOT change the layout or alignment of elements that aren't mentioned in the instruction.
3. If the instruction is about text, ONLY change that specific text. Keep the font and color the same.
4. Maintain 100% visual consistency with the provided source image.
5. Treat this as a surgical update, not a new generation.

Ratio: ${ratio}. Compose the output for a ${ratio} frame. Output the final modified image.
```

**Purpose:** Surgical retouching of generated images

**Input Types:**
- Text instruction: Natural language modification
- Visual reference: Reference image for style matching
- Annotation: Marked areas for modification

---

## Character Generation

### getTurnaroundPromptData Prompt

Used in: `CharacterLab.tsx` → `services/geminiService.ts:getTurnaroundPromptData()`

```
CHARACTER SPECIFICATIONS:
- Name: ${characterDNA.character_name}
- Physical Features: ${characterDNA.physical_features}
- Visual Details: ${characterDNA.visual_details}
- Color Palette: ${characterDNA.color_palette.join(', ')}
- Style: ${characterDNA.style_notes}

STRICT COLOR ENFORCEMENT:
- You MUST USE these colors: ${characterDNA.color_palette.join(', ')}
- DO NOT introduce erratic colors unless explicitly listed.
- The character MUST appear exactly as described in the palette.
- Lighting should be neutral.

${artStyleLogic}

IDENTITY LOCK: This is an "Identity Locked" generation. The character's face and signature features MUST NOT deviate from the primary reference image.

REQUIRED: Generate a professional 2x4 grid turnaround reference sheet (8 views: front, back, side, 3/4 angles).
Maintain 100% character consistency across all 8 views. Clean background. Professional quality.

Aspect Ratio: ${aspectRatio}
```

**Purpose:** Generate turnaround reference sheet for character consistency

**Art Styles:** original, plushy, pixel_art, chibi, animated, futuristic_robot, claymorphism

---

### getPosePromptData Prompt

Used in: `CharacterStudio.tsx` → `services/geminiService.ts:getPosePromptData()`

```
CHARACTER SPECIFICATIONS:
- Name: ${characterDNA.character_name}
- Physical Features: ${characterDNA.physical_features}
- Visual Details: ${characterDNA.visual_details}
- Color Palette: ${characterDNA.color_palette.join(', ')}
${artStyleLogic}

STRICT COLOR ENFORCEMENT:
- You MUST USE these colors: ${characterDNA.color_palette.join(', ')}
- The character MUST appear exactly as described in the palette.

IDENTITY LOCK: Maintain 100% character consistency. Use the provided Character Reference image as the source of truth for face and features.

POSE INSTRUCTION:
${poseInstruction}

Clean background. Aspect Ratio: ${aspectRatio}
```

**Purpose:** Generate character in specific poses for content

**Input:** Character DNA + Pose description

---

## Brand Studio Generation

### generateFromAsset Prompt

Used in: `BrandStudio.tsx` → `services/geminiService.ts:generateFromAsset()`

```
BRAND POST COMPOSITION — ${brandDNA.brand_name}

ASSET (Image 1): This is the hero visual. Keep it as the dominant element. Enhance it subtly with the brand's atmospheric glow and particle/ember effects to make it feel native to the brand.

BRAND IDENTITY:
- Colors: ${brandDNA.primary_colors.join(', ')}
- Vibe: ${brandDNA.brand_vibe}
- Style logic: ${brandDNA.color_logic}
- ${bgGuide}
${forbidden}

CONTENT MESSAGE: "${brief}"

${layoutGuide}

EXECUTION RULES:
1. Dark atmospheric background — apply the brand's dark palette with subtle texture or particle dust
2. The asset from Image 1 is the hero visual, placed in the lower/center area with brand-matching glow
3. Derive a bold, punchy headline (max 3 lines) from the content message — place at top with high contrast
4. If the message has a secondary point or CTA, add it as smaller body text or a rounded pill button
5. Typography: bold weight, clean, matches brand vibe — no decorative fonts unless on-brand
6. Overall quality: cinematic, premium, production-ready social media post

Aspect Ratio: ${ratio}. Output a complete finished post.
```

**Purpose:** Quick branded post generation from asset + brand identity

**Use Case:** Fast campaign creation without full blueprint workflow

---

## Remix Prompt (Secondary Generation)

### getRemixPromptData Prompt

Used for: Secondary image generation with refined prompt

```
${visualPrompt}. Aspect Ratio: ${ratio}. Professional graphic design.
```

**Purpose:** Append technical specifications to visual prompt

---

## Prompt Engineering Patterns

### 1. JSON Extraction Pattern
```
Return ONLY a JSON object: { ... }
```
Used to get structured output from text models.

### 2. Separator Pattern
```
Output: report then ---PROMPT_START--- then prompt
```
Used to separate analysis from generation instructions.

### 3. Identity Lock Pattern
```
IDENTITY LOCK: Maintain 100% consistency...
```
Used for character consistency across generations.

### 4. Preservation Rules Pattern
```
PRESERVATION RULES:
1. DO NOT change...
2. DO NOT change...
```
Used for surgical edits without affecting unrelated elements.

### 5. Color Enforcement Pattern
```
STRICT COLOR ENFORCEMENT:
- You MUST USE these colors: ...
- DO NOT introduce erratic colors...
```
Used to prevent color drift in character generation.

### 6. Visual Anchor Pattern
```
VISUAL ANCHOR: I have attached the original blueprint as Image 1.
- Copy the Composition: 100% Match.
- Copy the Lighting/Vibe: 100% Match.
```
Used when reference image is provided for style matching.

---

## Prompt Variables Reference

| Variable | Type | Description |
|----------|------|-------------|
| `${userNotes}` | string | User's focus notes for analysis |
| `${reference}` | DesignPromptJson | Blueprint structural DNA |
| `${brief}` | ContentBrief | Content to generate |
| `${brandContext}` | string | Formatted brand DNA |
| `${characterCtx}` | string | Formatted character DNA |
| `${intensity}` | RemixIntensity | strict/light/heavy |
| `${theme}` | string | dark/light/auto |
| `${ratio}` | AspectRatio | 1:1, 9:16, 16:9, etc. |
| `${slideCount}` | number | Number of carousel slides |
| `${poseInstruction}` | string | Character pose description |
| `${artStyleLogic}` | string | Art style transformation rules |
