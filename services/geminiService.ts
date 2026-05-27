import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { DesignPromptJson, ContentBrief, BrandDNA, AspectRatio, UsageLog, CharacterDNA, CharacterArtStyle, PromptData, GeminiModel, ModelPreference, AudioDNA, PlannedSlide } from "../types";


const PRICING = {
  'flash': { input: 0.075 / 1000000, output: 0.30 / 1000000 },
  'image': { flat: 0.04 },
};

const USD_TO_IDR = 15500;

export const recordUsage = async (
  feature: UsageLog['feature'],
  model: string,
  response: GenerateContentResponse
): Promise<UsageLog> => {
  const usage = response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
  const input = usage.promptTokenCount || 0;
  const output = usage.candidatesTokenCount || 0;

  let costUSD = 0;
  if (model.includes('image')) {
    costUSD = PRICING.image.flat;
  } else {
    costUSD = (input * PRICING.flash.input) + (output * PRICING.flash.output);
  }

  const log: UsageLog = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    feature,
    model,
    inputTokens: input,
    outputTokens: output,
    costUSD,
    costIDR: Math.ceil(costUSD * USD_TO_IDR)
  };

  try {
    await fetch('/api/usage_logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log)
    });
  } catch (e) {
    console.error("Failed to save usage log", e);
  }

  return log;
};

export interface GeminiModelInfo {
  name: string;          // e.g. "models/gemini-2.0-flash"
  displayName: string;
  description?: string;
  supportedGenerationMethods: string[];
}

export const listAvailableModels = async (): Promise<GeminiModelInfo[]> => {
  const key = localStorage.getItem('IKHSAN_LAB_KEY') || import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error("No API key configured.");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${key}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to list models');
  return (data.models || []) as GeminiModelInfo[];
};

const getAI = () => {
  // Priority 1: localStorage (persists across sessions, set via UI Settings)
  // Priority 2: Vite Environment variable (Local Dev .env)
  const key = localStorage.getItem('IKHSAN_LAB_KEY') || import.meta.env.VITE_GEMINI_API_KEY;

  if (!key) {
    throw new Error("No API Key found. Please configure your key in Settings.");
  }

  return new GoogleGenAI({ apiKey: key });
};

// Builds the right generation config for a given model.
// Dedicated image-gen models (e.g. gemini-*-image-*) support imageConfig.aspectRatio.
// Flash/multimodal models do NOT support imageConfig — they use responseModalities instead,
// and the aspect ratio is conveyed via text prompt (all prompt builders already include it).
const buildImageConfig = (modelName: string, ratio: AspectRatio): Record<string, any> => {
  if (modelName.includes('-image-') || modelName.includes('imagen')) {
    return { imageConfig: { aspectRatio: ratio } };
  }
  return { responseModalities: ['image'] };
};

const MODEL_MAP = {
  flash: {
    text: 'gemini-2.5-flash',
    image: 'gemini-2.5-flash-image'
  },
  'flash-latest': {
    text: 'gemini-2.5-flash',
    image: 'gemini-2.5-flash-image'
  },
  pro: {
    text: 'gemini-2.5-pro',
    image: 'gemini-2.5-flash-image'
  },
  'pro-3': {
    text: 'gemini-2.5-pro',
    image: 'gemini-2.5-flash-image'
  },
  custom: {
    get text() { return localStorage.getItem('ikhsan_model_text') || 'gemini-2.5-flash'; },
    get image() { return localStorage.getItem('ikhsan_model_image') || 'gemini-2.5-flash-image'; }
  }
};

const extractJsonFromText = (text: string): string => {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }
  return text.trim();
};

// Carousel Batch Planning - AI breaks down a single brief into per-slide content
export const planCarouselContent = async (
  blueprintSpec: DesignPromptJson,
  brief: string,
  slideCount: number,
  brandDNA?: BrandDNA,
  characterDNA?: CharacterDNA
): Promise<{ slides: PlannedSlide[], usage: UsageLog }> => {
  const ai = getAI();

  const brandContext = brandDNA
    ? `Brand: "${brandDNA.brand_name}" with vibe: ${brandDNA.brand_vibe}`
    : "No specific brand guidelines.";

  const characterContext = characterDNA
    ? `Character/Mascot: "${characterDNA.character_name}" - ${characterDNA.physical_features}`
    : "No character/mascot to include.";

  const prompt = `You are a Content Strategist for social media carousels.

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
3. poseInstruction: ${characterDNA ? "REQUIRED - describe the character's pose, action, expression, or scene. Each slide should have a DIFFERENT pose that matches the slide's message. Be specific: 'waving hello', 'pointing at text', 'sitting and thinking', 'jumping with excitement', 'holding a sign', etc." : "null (no character)"}

CAROUSEL STRUCTURE BEST PRACTICES:
- Slide 1: Hook/attention-grabber (character could be waving, gesturing 'stop', or looking curious)
- Middle slides: Core content points (character demonstrates, points, or reacts to content)
- Last slide: CTA or conclusion (character could be thumbs up, waving goodbye, or celebratory)

Return ONLY a JSON array with exactly ${slideCount} objects:
[
  { "slideNumber": 1, "copyBrief": "...", "visualContext": "...", "poseInstruction": "..." },
  { "slideNumber": 2, "copyBrief": "...", "visualContext": "...", "poseInstruction": "..." }
]`;

  const textModel = MODEL_MAP.flash.text;
  const response = await ai.models.generateContent({
    model: textModel,
    contents: { parts: [{ text: prompt }] },
    config: { responseMimeType: "application/json" }
  });

  const text = response.text || '';
  if (!text.trim()) throw new Error("No response from carousel planner.");

  try {
    // Handle both array and object with slides property
    let parsed = JSON.parse(text.trim());
    let slidesArray: any[] = Array.isArray(parsed) ? parsed : (parsed.slides || []);

    const slides: PlannedSlide[] = slidesArray.map((s: any, index: number) => ({
      slideNumber: s.slideNumber || index + 1,
      copyBrief: s.copyBrief || '',
      visualContext: s.visualContext || '',
      poseInstruction: s.poseInstruction || null,
      status: 'pending' as const
    }));

    const usageLog = await recordUsage('Post Generator', textModel, response);
    return { slides, usage: usageLog };
  } catch (e) {
    throw new Error("Carousel planner returned invalid JSON format.");
  }
};

export const analyzeDesign = async (imageB64: string, userNotes?: string): Promise<{ markdown: string, json: DesignPromptJson, usage: UsageLog }> => {
  const ai = getAI();
  const imagePart = {
    inlineData: { mimeType: 'image/jpeg', data: imageB64.split(',')[1] || imageB64 }
  };

  const textPart = {
    text: `You are a World-Class Design Engineer.
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
  
  IMPORTANT: The 'has_character_slot' should be TRUE if there is a mascot/person.` };

  const textModel = MODEL_MAP.flash.text;
  const response = await ai.models.generateContent({
    model: textModel,
    contents: { parts: [imagePart, textPart] },
  });

  const raw = response.text || '';
  if (!raw.includes('---JSON_START---')) {
    throw new Error("The AI failed to generate a structural blueprint. Please try a clearer image.");
  }

  const parts = raw.split('---JSON_START---');
  const markdown = parts[0] || '';
  const jsonPartRaw = parts[1] || '';

  try {
    const cleanedJsonStr = extractJsonFromText(jsonPartRaw);
    const jsonData = JSON.parse(cleanedJsonStr) as DesignPromptJson;

    if (!jsonData.structural_rules) {
      jsonData.structural_rules = {
        layout_archetype: "Modern Graphic",
        typography_system: "Bold Sans-Serif",
        composition_map: "Centered Headline, Bottom Illustration",
        dark_theme_adaptation: "Deep slate background, neon blue accents, white text",
        light_theme_adaptation: "Pale grey background, royal blue accents, navy text"
      };
    }

    if (!jsonData.content_registry) {
      jsonData.content_registry = [
        { id: 'headline', label: 'Main Headline', type: 'text', description: 'Primary focal text' }
      ];
    }

    // Legacy cleanup
    jsonData.base_visual_dna_prompt = "IGNORE THIS FIELD. VISUAL ANCHOR ACTIVE.";

    const usageLog = await recordUsage('Design Builder DNA', textModel, response);
    return { markdown: markdown.trim(), json: jsonData, usage: usageLog };
  } catch (e) {
    throw new Error("DNA Sequence Error: The system failed to parse the structural logic.");
  }
};

export const analyzeBrand = async (imageB64: string): Promise<{ dna: BrandDNA, usage: UsageLog }> => {
  const ai = getAI();
  const prompt = `Analyze this brand asset. Extract Brand DNA. 
  Return ONLY a JSON object: { 
    "brand_name": "string", 
    "primary_colors": ["hex codes"], 
    "color_logic": "string", 
    "brand_vibe": "string", 
    "typography_notes": "string", 
    "forbidden_styles": [],
    "dark_mode_colors": ["hex codes for dark theme backgrounds/accents"],
    "light_mode_colors": ["hex codes for light theme backgrounds/accents"]
  }`;

  const textModel = MODEL_MAP.flash.text;
  const response = await ai.models.generateContent({
    model: textModel,
    contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: imageB64.split(',')[1] || imageB64 } }, { text: prompt }] },
    config: { responseMimeType: "application/json" }
  });

  const text = response.text || '';
  if (!text.trim()) throw new Error("No response from Brand Lab.");

  try {
    const usageLog = await recordUsage('Brand Lab', textModel, response);
    return { dna: JSON.parse(extractJsonFromText(text)), usage: usageLog };
  } catch (e) {
    throw new Error("Brand Lab returned invalid JSON format.");
  }
};

export const generateTemplateImage = async (jsonSpec: DesignPromptJson, ratio: AspectRatio, modelType: GeminiModel = 'flash'): Promise<{ image: string, usage: UsageLog }> => {
  const ai = getAI();
  const modelName = MODEL_MAP[modelType].image;
  const templatePrompt = `Create a high-fidelity design mockup.
  The layout is a ${jsonSpec.structural_rules.layout_archetype}.
  Element placement: ${jsonSpec.structural_rules.composition_map}.
  Typography vibe: ${jsonSpec.structural_rules.typography_system}.
  Include placeholder text that says 'YOUR CONTENT HERE'.
  Aspect Ratio: ${ratio}. Compose the image to fit a ${ratio} frame. Clean, professional social media graphic.`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts: [{ text: templatePrompt }] },
    config: buildImageConfig(modelName, ratio),
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("Image generation failed.");

  const usageLog = await recordUsage('Design Builder Visual', modelName, response);
  for (const part of parts) {
    if (part.inlineData) return { image: `data:image/png;base64,${part.inlineData.data}`, usage: usageLog };
  }
  throw new Error("Validation render failed.");
};

export const getPostPromptData = (
  reference: DesignPromptJson,
  brief: ContentBrief,
  intensity: string,
  brandOverride?: BrandDNA,
  characterDNA?: CharacterDNA,
  theme: 'dark' | 'light' | 'auto' = 'auto',
  referenceImageB64?: string
): PromptData => {
  const brandContext = brandOverride
    ? `BRAND RULES: ${JSON.stringify(brandOverride)}`
    : "Use original design colors.";

  const carouselCtx = brief.slide_number ? `This is slide ${brief.slide_number} of a ${brief.total_slides} slide carousel. Adapt layout accordingly.` : "";

  // Optimize Character DNA for text prompt (remove heavy base64 images)
  let characterCtx = "";
  if (characterDNA) {
    const { reference_images, ...dnaLite } = characterDNA;
    characterCtx = `CHARACTER DNA: ${JSON.stringify(dnaLite)}. You MUST include this character in the design. Use its physical description and color palette. This is an IDENTITY LOCKED generation for the character. Reference its features from the provided visual DNA.`;
  }

  const text = `Create a new post remix. 
  SOURCE DNA: ${JSON.stringify(reference)}
  NEW BRIEF: ${JSON.stringify(brief)}
  ${carouselCtx}
  ${brandContext}
  ${characterCtx}
  INTENSITY: ${intensity}
  THEME MODE: ${theme}

  THEME ADAPTATION RULES:
  ${theme === 'dark' ? (reference.structural_rules.dark_theme_adaptation || "Use deep charcoal/black backgrounds with high contrast white/light text. Invert standard colors.") : ''}
  ${theme === 'light' ? (reference.structural_rules.light_theme_adaptation || "Use smooth white/light gray backgrounds with dark text. Clean, airy look.") : ''}

  FUNCTIONAL WIREFRAME INSTRUCTIONS:
  You have been provided with a Source Image (Image 1) and a Content Registry (in Source DNA).
  1. Your GOAL is to perform a text-swap and content-fill while preserving the EXACT structure and aesthetic of Image 1.
  2. For each item in the 'content_registry' or 'structured_content', identify that specific element in Image 1.
  3. Replace the text/content of that element with the new content provided in the BRIEF.
  4. DO NOT hallucinate new layouts. Stick to the grid, spacing, and font hierarchy of Image 1.
  
  Return a production report then ---PROMPT_START--- then a single-line visual prompt that includes the layout logic of the source DNA but with the new content from the brief.
  
  ${brief.structured_content ? `PRIORITY CONTENT MAPPING: The user provided specific text for these slots. Use them exactly: ${JSON.stringify(brief.structured_content)}` : ''}
  `;

  // If we have a visual anchor, we strip away the "Text Noise" to prevent drift
  if (referenceImageB64) {
    return {
      text: `VISUAL ANCHOR: I have attached the original blueprint as Image 1. 
          
          TASK: Create a pixel-perfect remix of Image 1.
          - Copy the Composition: 100% Match.
          - Copy the Lighting/Vibe: 100% Match.
          - Copy the Typography Style: 100% Match.
          
          CHANGE ONLY THE CONTENT:
          ${brief.structured_content
          ? `Map the following specific new text into the layout's existing slots:\n${JSON.stringify(brief.structured_content, null, 2)}`
          : `Update the text content to match this brief: "${brief.elements_to_display}"`
        }

          ${characterCtx}
          ${brandContext}
          ${carouselCtx}
          
          OUTPUT INSTRUCTION: Return a brief production analysis, then the separator "---PROMPT_START---", followed by a precise visual prompt description that tells the image generator to "Reproduce Image 1 exactly, but with the text changed to [New Text]".`,
      images: [referenceImageB64]
    };
  }

  return { text, images: referenceImageB64 ? [referenceImageB64] : [] };
};

export const generatePostFromReference = async (
  reference: DesignPromptJson,
  brief: ContentBrief,
  intensity: string,
  brandOverride?: BrandDNA,
  characterDNA?: CharacterDNA,
  modelType: GeminiModel = 'flash',
  theme: 'dark' | 'light' | 'auto' = 'auto',
  referenceImageB64?: string
): Promise<{ report: string, finalVisualPrompt: string, usage: UsageLog }> => {
  const ai = getAI();
  const promptData = getPostPromptData(reference, brief, intensity, brandOverride, characterDNA, theme, referenceImageB64);
  const modelName = MODEL_MAP[modelType].text;

  const parts: any[] = [];
  if (promptData.images.length > 0) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: promptData.images[0].split(',')[1] || promptData.images[0]
      }
    });
    // Visual anchor text is already set in getPostPromptData for this case
  }
  parts.push({ text: promptData.text });

  // Use parts structure for stability
  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts }
  });

  const raw = response.text || '';
  const usageLog = await recordUsage('Post Generator', modelName, response);
  const [report, finalPrompt] = raw.split('---PROMPT_START---');
  return { report: report.trim(), finalVisualPrompt: finalPrompt?.trim() || '', usage: usageLog };
};

export const getRemixPromptData = (visualPrompt: string, ratio: AspectRatio): PromptData => {
  return {
    text: `${visualPrompt}. Aspect Ratio: ${ratio}. Professional graphic design.`,
    images: []
  };
};

export const generateRemixImage = async (
  visualPrompt: string,
  ratio: AspectRatio,
  characterDNA?: CharacterDNA,
  modelType: GeminiModel = 'flash',
  poseContext?: string | null
): Promise<{ image: string, usage: UsageLog }> => {
  const ai = getAI();
  const promptData = getRemixPromptData(visualPrompt, ratio);
  const modelName = MODEL_MAP[modelType].image;

  const parts: any[] = [];

  // CHARACTER IDENTITY LOCK: Inject reference images if mascot is selected
  if (characterDNA?.reference_images && characterDNA.reference_images.length > 0) {
    const primaryRef = characterDNA.reference_images[0];
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: primaryRef.split(',')[1] || primaryRef
      }
    });

    // Build character deployment prompt with optional pose context
    const poseDirective = poseContext
      ? `\n\nCHARACTER POSE/ACTION: The character MUST be shown ${poseContext}. This is NOT optional - depict this specific pose/action while maintaining the character's identity from Image 1.`
      : '';

    promptData.text = `DEPLOY CHARACTER: Use the provided reference image (Image 1) as the SOURCE OF TRUTH for the character appearance. Match the character's face, colors, and style EXACTLY.${poseDirective}\n\n${promptData.text}`;
  }

  parts.push({ text: promptData.text });

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config: buildImageConfig(modelName, ratio),
  });

  const resParts = response.candidates?.[0]?.content?.parts;
  if (!resParts) throw new Error("Remix generation failed.");

  const usageLog = await recordUsage('Post Generator', modelName, response);
  for (const part of resParts) {
    if (part.inlineData) return { image: `data:image/png;base64,${part.inlineData.data}`, usage: usageLog };
  }
  throw new Error("Remix failed to render.");
};

export const refinePostImage = async (
  currentImageB64: string,
  instruction: string,
  ratio: AspectRatio,
  refImageB64?: string,
  isAnnotation: boolean = false,
  modelType: GeminiModel = 'flash'
): Promise<{ image: string, usage: UsageLog }> => {
  const ai = getAI();
  const modelName = MODEL_MAP[modelType].image;

  const parts: any[] = [
    { inlineData: { mimeType: 'image/png', data: currentImageB64.split(',')[1] || currentImageB64 } }
  ];

  if (refImageB64) {
    parts.push({ inlineData: { mimeType: 'image/png', data: refImageB64.split(',')[1] || refImageB64 } });
  }

  // ENHANCED RETOUCH PROTOCOL
  const baseInstruction = isAnnotation
    ? "PERFORM STRUCTURAL CORRECTION ONLY. Lock all other pixels. Move or resize based on the instruction."
    : "PERFORM SPECIFIC CONTENT EDIT ONLY. Preserve the exact layout, background, character, and aesthetic of the source image.";

  const preservationDirective = `
    PRESERVATION RULES:
    1. DO NOT change the background or illustration.
    2. DO NOT change the layout or alignment of elements that aren't mentioned in the instruction.
    3. If the instruction is about text (like translation or case change), ONLY change that specific text. Keep the font and color the same.
    4. Maintain 100% visual consistency with the provided source image.
    5. Treat this as a surgical update, not a new generation.
  `;

  parts.push({
    text: `${baseInstruction}

    INSTRUCTION: ${instruction}

    ${refImageB64 ? 'Use the second image ONLY as a reference for the new element to be added, do not let it override the core layout of image 1.' : ''}

    ${preservationDirective}

    Ratio: ${ratio}. Compose the output for a ${ratio} frame. Output the final modified image.`
  });

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config: buildImageConfig(modelName, ratio),
  });

  const resultParts = response.candidates?.[0]?.content?.parts;
  if (!resultParts) throw new Error("Refinement failed.");

  const usageLog = await recordUsage('Production Studio', modelName, response);
  for (const part of resultParts) {
    if (part.inlineData) return { image: `data:image/png;base64,${part.inlineData.data}`, usage: usageLog };
  }
  throw new Error("Refinement failed to render.");
};

export const analyzeCharacter = async (imagesB64: string[]): Promise<{ dna: CharacterDNA, usage: UsageLog }> => {
  const ai = getAI();

  const imageParts = imagesB64.map(img => ({
    inlineData: { mimeType: 'image/jpeg', data: img.split(',')[1] || img }
  }));

  const textPart = {
    text: `You are an expert Character Designer. 
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
    }`
  };

  const textModel = MODEL_MAP.flash.text;
  const response = await ai.models.generateContent({
    model: textModel,
    contents: { parts: [...imageParts, textPart] },
    config: { responseMimeType: "application/json" }
  });

  const text = response.text || '';
  if (!text.trim()) throw new Error("No response from Character Lab.");

  try {
    const dna = JSON.parse(extractJsonFromText(text)) as CharacterDNA;
    dna.reference_images = imagesB64;
    const usageLog = await recordUsage('Character Lab', textModel, response);
    return { dna, usage: usageLog };
  } catch (e) {
    throw new Error("Character Lab returned invalid JSON format.");
  }
};

export const getTurnaroundPromptData = (
  characterDNA: CharacterDNA,
  aspectRatio: AspectRatio = '1:1'
): PromptData => {
  const colorConstraint = `
STRICT COLOR ENFORCEMENT:
- You MUST USE these colors: ${characterDNA.color_palette.join(', ')}
- DO NOT introduce erratic colors unless explicitly listed.
- The character MUST appear exactly as described in the palette.
- Lighting should be neutral.`;

  const artStyleLogic = characterDNA.assigned_art_style && characterDNA.assigned_art_style !== 'original'
    ? `ART STYLE TRANSFORMATION: Transform the character into a ${characterDNA.assigned_art_style} version. 
- Preserve the core character traits (facial structure, specific accessories, personality).
- Adapt the medium to ${characterDNA.assigned_art_style}${characterDNA.assigned_art_style === 'claymorphism' ? ' (high-quality 3D claymorphic style. Soft, matte textures, rounded edges, simplified shapes, and tactile clay-like surfaces. Professional 3D render aesthetics)' : ''}.`
    : `ART STYLE: Maintain the original art style from the reference images.`;

  const text = `
CHARACTER SPECIFICATIONS:
- Name: ${characterDNA.character_name}
- Physical Features: ${characterDNA.physical_features}
- Visual Details: ${characterDNA.visual_details}
- Color Palette: ${characterDNA.color_palette.join(', ')}
- Style: ${characterDNA.style_notes}

${colorConstraint}
${artStyleLogic}

IDENTITY LOCK: This is an "Identity Locked" generation. The character's face and signature features MUST NOT deviate from the primary reference image.

REQUIRED: Generate a professional 2x4 grid turnaround reference sheet (8 views: front, back, side, 3/4 angles).
Maintain 100% character consistency across all 8 views. Clean background. Professional quality.

Aspect Ratio: ${aspectRatio}`;

  return { text, images: characterDNA.reference_images || [] };
};

export const generateCharacterTurnaround = async (
  characterDNA: CharacterDNA,
  aspectRatio: AspectRatio = '1:1',
  modelType: GeminiModel = 'flash'
): Promise<{ image: string, usage: UsageLog }> => {
  const ai = getAI();
  const modelName = MODEL_MAP[modelType].image;
  const promptData = getTurnaroundPromptData(characterDNA, aspectRatio);

  const parts: any[] = [];
  if (promptData.images.length > 0) {
    const primaryRef = promptData.images[0];
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: primaryRef.split(',')[1] || primaryRef
      }
    });
  }

  parts.push({ text: promptData.text });

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config: buildImageConfig(modelName, aspectRatio),
  });

  const resultParts = response.candidates?.[0]?.content?.parts;
  if (!resultParts) throw new Error("Turnaround generation failed.");

  const usageLog = await recordUsage('Character Lab', modelName, response);
  for (const part of resultParts) {
    if (part.inlineData) return { image: `data:image/png;base64,${part.inlineData.data}`, usage: usageLog };
  }
  throw new Error("Turnaround generation failed to render.");
};

export const getBrandEvolutionPromptData = (
  characterDNA: CharacterDNA,
  brandDNA: BrandDNA,
  aspectRatio: AspectRatio = '16:9'
): PromptData => {
  // Merge brand colors into character - brand takes priority
  const mergedPalette = [
    ...(brandDNA.primary_colors || []),
    ...characterDNA.color_palette.slice(0, 2) // Keep up to 2 original accent colors
  ].slice(0, 6);

  const text = `
BRAND-ALIGNED CHARACTER EVOLUTION

CHARACTER BASE IDENTITY (PRESERVE THESE):
- Name: ${characterDNA.character_name}
- Physical Features: ${characterDNA.physical_features}
- Visual Details: ${characterDNA.visual_details}
- Original Art Style: ${characterDNA.style_notes}

BRAND DNA TO APPLY:
- Brand: ${brandDNA.brand_name}
- Brand Colors: ${brandDNA.primary_colors.join(', ')}
- Brand Vibe: ${brandDNA.brand_vibe}
- Color Logic: ${brandDNA.color_logic}
- Typography Notes: ${brandDNA.typography_notes}

EVOLUTION RULES:
1. IDENTITY LOCK: The character's face, body structure, and signature features MUST remain 100% consistent with the reference image.
2. COLOR TRANSFORMATION: Replace the character's color palette with the brand colors: ${mergedPalette.join(', ')}
3. STYLE ADAPTATION: Infuse the brand's visual vibe (${brandDNA.brand_vibe}) into the character's aesthetic while maintaining their core identity.
4. The character should now "belong" to this brand visually.

FORBIDDEN:
${brandDNA.forbidden_styles && brandDNA.forbidden_styles.length > 0 ? `- Do NOT use these styles: ${brandDNA.forbidden_styles.join(', ')}` : '- No specific restrictions'}

OUTPUT: Generate a professional 2x4 grid turnaround reference sheet (8 views: front, back, side, 3/4 angles).
The character should appear with the BRAND'S color scheme and visual identity while maintaining their structural identity.
Clean background. Professional quality.

Aspect Ratio: ${aspectRatio}`;

  return { text, images: characterDNA.reference_images || [] };
};

export const evolveCharacterWithBrand = async (
  characterDNA: CharacterDNA,
  brandDNA: BrandDNA,
  aspectRatio: AspectRatio = '16:9',
  modelType: GeminiModel = 'flash'
): Promise<{ image: string, evolvedDNA: CharacterDNA, usage: UsageLog }> => {
  const ai = getAI();
  const modelName = MODEL_MAP[modelType].image;
  const promptData = getBrandEvolutionPromptData(characterDNA, brandDNA, aspectRatio);

  const parts: any[] = [];
  if (promptData.images.length > 0) {
    const primaryRef = promptData.images[0];
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: primaryRef.split(',')[1] || primaryRef
      }
    });
  }

  parts.push({ text: promptData.text });

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config: buildImageConfig(modelName, aspectRatio),
  });

  const resultParts = response.candidates?.[0]?.content?.parts;
  if (!resultParts) throw new Error("Brand evolution generation failed.");

  const usageLog = await recordUsage('Character Lab', modelName, response);

  // Create evolved DNA with merged brand colors
  const evolvedDNA: CharacterDNA = {
    ...characterDNA,
    color_palette: [
      ...(brandDNA.primary_colors || []),
      ...characterDNA.color_palette.slice(0, 2)
    ].slice(0, 6),
    linked_brand_id: undefined, // Will be set when saving
    style_notes: `${characterDNA.style_notes} | Brand-aligned: ${brandDNA.brand_vibe}`
  };

  for (const part of resultParts) {
    if (part.inlineData) {
      const newImage = `data:image/png;base64,${part.inlineData.data}`;
      evolvedDNA.reference_images = [newImage, ...(characterDNA.reference_images || []).slice(0, 2)];
      return { image: newImage, evolvedDNA, usage: usageLog };
    }
  }
  throw new Error("Brand evolution failed to render.");
};

export const getPosePromptData = (
  characterDNA: CharacterDNA,
  poseReference?: string,
  posePrompt?: string,
  aspectRatio: AspectRatio = '1:1'
): PromptData => {
  const colorConstraint = `
STRICT COLOR ENFORCEMENT:
- You MUST USE these colors: ${characterDNA.color_palette.join(', ')}
- The character MUST appear exactly as described in the palette.`;

  const artStyleLogic = characterDNA.assigned_art_style && characterDNA.assigned_art_style !== 'original'
    ? `ART STYLE: ${characterDNA.assigned_art_style}. Preserve core face/identity but in this style medium.${characterDNA.assigned_art_style === 'claymorphism' ? ' 3D claymorphic style: matte textures, rounded edges, tactile clay surfaces.' : ''}`
    : `STYLE: ${characterDNA.style_notes}`;

  const characterDescription = `
CHARACTER SPECIFICATIONS:
- Name: ${characterDNA.character_name}
- Physical Features: ${characterDNA.physical_features}
- Visual Details: ${characterDNA.visual_details}
- Color Palette: ${characterDNA.color_palette.join(', ')}
${artStyleLogic}
${colorConstraint}

IDENTITY LOCK: Maintain 100% character consistency. Use the provided Character Reference image as the source of truth for face and features.
  `;

  let poseInstruction = '';
  const images: string[] = [];

  if (characterDNA.reference_images && characterDNA.reference_images.length > 0) {
    images.push(characterDNA.reference_images[0]);
  }

  if (poseReference) {
    images.push(poseReference);
    poseInstruction = `Recreate the character (from image 1) in the EXACT POSE shown in image 2.`;
  } else if (posePrompt) {
    poseInstruction = `Pose the character (from image 1) as follows: ${posePrompt}`;
  } else {
    poseInstruction = `Show the character (from image 1) in a neutral standing pose.`;
  }

  const text = `${characterDescription}\n\nPOSE INSTRUCTION:\n${poseInstruction}\n\nClean background. Aspect Ratio: ${aspectRatio}`;
  return { text, images };
};

export const generateCharacterPose = async (
  characterDNA: CharacterDNA,
  poseReference?: string,
  posePrompt?: string,
  aspectRatio: AspectRatio = '1:1',
  modelType: GeminiModel = 'flash'
): Promise<{ image: string, usage: UsageLog }> => {
  const ai = getAI();
  const modelName = MODEL_MAP[modelType].image;
  const promptData = getPosePromptData(characterDNA, poseReference, posePrompt, aspectRatio);

  const parts: any[] = [];
  promptData.images.forEach((img) => {
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: img.split(',')[1] || img }
    });
  });

  parts.push({ text: promptData.text });

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config: buildImageConfig(modelName, aspectRatio),
  });

  const resultParts = response.candidates?.[0]?.content?.parts;
  if (!resultParts) throw new Error("Character pose generation failed.");

  const usageLog = await recordUsage('Character Studio', modelName, response);
  for (const part of resultParts) {
    if (part.inlineData) return { image: `data:image/png;base64,${part.inlineData.data}`, usage: usageLog };
  }
  throw new Error("Character pose generation failed to render.");
};

// Brand Studio: compose an asset image + brief + brand DNA into a finished post.
// The asset (e.g. a 3D icon) is the hero visual. The model applies the brand aesthetic
// and overlays the message as a bold headline.
export const generateFromAsset = async (
  assetImageB64: string,
  brief: string,
  brandDNA: BrandDNA,
  blueprintSpec?: DesignPromptJson | null,
  ratio: AspectRatio = '4:5',
  modelType: GeminiModel = 'flash'
): Promise<{ image: string, usage: UsageLog }> => {
  const ai = getAI();
  const modelName = MODEL_MAP[modelType].image;

  const bgGuide = brandDNA.dark_mode_colors?.length
    ? `Background colors: ${brandDNA.dark_mode_colors.join(', ')}`
    : `Background: near-black / very dark. Accent: ${brandDNA.primary_colors.slice(0, 2).join(', ')}.`;

  const layoutGuide = blueprintSpec
    ? `LAYOUT: ${blueprintSpec.structural_rules.layout_archetype}. ${blueprintSpec.structural_rules.composition_map}. Typography: ${blueprintSpec.structural_rules.typography_system}.`
    : `LAYOUT: Bold headline text top-center (2-3 lines max). Hero asset center-to-bottom half. Optional CTA pill at very bottom.`;

  const forbidden = brandDNA.forbidden_styles?.length
    ? `FORBIDDEN STYLES: ${brandDNA.forbidden_styles.join(', ')}.`
    : '';

  const prompt = `BRAND POST COMPOSITION — ${brandDNA.brand_name}

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

Aspect Ratio: ${ratio}. Output a complete finished post.`;

  const parts: any[] = [
    { inlineData: { mimeType: 'image/jpeg', data: assetImageB64.split(',')[1] || assetImageB64 } },
    { text: prompt }
  ];

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config: buildImageConfig(modelName, ratio),
  });

  const resParts = response.candidates?.[0]?.content?.parts;
  if (!resParts) throw new Error("Brand post generation failed.");

  const usageLog = await recordUsage('Post Generator', modelName, response);
  for (const part of resParts) {
    if (part.inlineData) return { image: `data:image/png;base64,${part.inlineData.data}`, usage: usageLog };
  }
  throw new Error("Brand post generation produced no image.");
};

export const generateAudio = async (text: string, dna: AudioDNA): Promise<{ audioData: string, usage: UsageLog }> => {
  // Mock implementation for UI flow testing
  // In reality, this would call Gemini 2.0 Flash Exp or fallback to Browser TTS

  console.log("Simulating Audio Gen for:", text, dna);

  // Simulate API delay
  await new Promise(r => setTimeout(r, 1000));

  // For now we assume the browser will handle the playback if we return a success signal or empty.
  // However, the UI expects a URL/Base64. 
  // Since we are "Exploratory", let's return a dummy that triggers the UI's "Ready" state, 
  // but actual playback might need to handle "if dummy, use TTS". 
  // Actually, let's just use Browser TTS inside this function if possible? 
  // No, `window` is available in frontend but this is a service file. It should be fine.

  // Return a dummy base64 MP3 (silence) to satisfy the type.
  const mockAudio = "data:audio/mp3;base64,//uQRAAAAWMSLwUIYAPAAA";

  return {
    audioData: mockAudio,
    usage: {
      id: Date.now().toString(),
      timestamp: Date.now(),
      feature: 'Audio Lab' as any,
      model: 'gemini-voice-preview',
      inputTokens: 100,
      outputTokens: 500,
      costUSD: 0.01,
      costIDR: 155
    }
  };
};
