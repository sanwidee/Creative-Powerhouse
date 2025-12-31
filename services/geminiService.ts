import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { DesignPromptJson, ContentBrief, BrandDNA, AspectRatio, UsageLog, CharacterDNA, CharacterArtStyle, PromptData } from "../types";


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

const getAI = () => {
  // Priority 1: Session Storage (Manual Override in UI)
  // Priority 2: Vite Environment variable (Local Dev .env)
  const key = sessionStorage.getItem('IKHSAN_LAB_KEY') || import.meta.env.VITE_GEMINI_API_KEY;

  if (!key) {
    throw new Error("No API Key found. Please configure your key in settings or .env file.");
  }

  return new GoogleGenAI({ apiKey: key });
};

const extractJsonFromText = (text: string): string => {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }
  return text.trim();
};

export const analyzeDesign = async (imageB64: string, userNotes?: string): Promise<{ markdown: string, json: DesignPromptJson, usage: UsageLog }> => {
  const ai = getAI();
  const imagePart = {
    inlineData: { mimeType: 'image/jpeg', data: imageB64.split(',')[1] || imageB64 }
  };

  const textPart = {
    text: `You are a World-Class Creative Director and Design Systems Engineer. 
  Task: Deconstruct the provided social media post into its modular "Design DNA".
  
  User Focus Notes: ${userNotes || 'Standard analysis'}.

  1. IDENTIFY THE ARCHETYPE: Is it a "Headline Listicle", "Minimalist Quote", "Product Showcase", "Infographic Guide", or "Character-Led Story"?
  2. ANALYZE COMPOSITION: Note where the text blocks are anchored, where the focal point (image/illustration) is placed, and the background texture/pattern.
  3. EXTRACT TYPOGRAPHY: Identify font weights (bold/thin), casing (uppercase/mixed), and spacing logic.

  Output Format:
  1. Detailed Markdown Report describing the "Why" of the design.
  2. The string "---JSON_START---".
  3. A JSON object with this exact structure:
  {
    "template_name": "A catchy name for this layout style",
    "structural_rules": {
      "layout_archetype": "Specific category like 'Educational Listicle'",
      "typography_system": "Detailed description of font pairing and weights",
      "color_grammar": "Palette description with hex codes if visible",
      "composition_map": "Map of element positioning (e.g., Top-Left Text, Bottom-Right Graphic)",
      "aesthetic_motifs": "Visual details like 'Grainy texture, 3D elements, paper tear effect'",
      "has_character_slot": true
    },
    "layout_constraints": {
      "forbidden_elements": ["List of things that would break this style"],
      "mandatory_anchors": ["Key elements that must stay in place"],
      "white_space_logic": "How much breathing room is used"
    },
    "placeholder_map": {
      "body_style": "Visual style for subtext",
      "cta_style": "Visual style for buttons/links"
    },
    "content_registry": [
      { "id": "headline", "label": "Main Headline", "placeholder": "The current text found in image", "type": "text" }
    ],
    "base_visual_dna_prompt": "A highly descriptive prompt for an image generator to recreate the LAYOUT and STYLE of this image but without the specific text. Describe the composition, textures, lighting, and placement of elements clearly."
  }
  
  IMPORTANT: The 'has_character_slot' should be TRUE if there is a mascot, character, or prominent human-like figure in the design that serves as a focal point.
  IMPORTANT: Do not use generic words like 'Standard' or 'Unknown'. Be descriptive.` };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
        color_grammar: "High-Contrast Vibrant",
        composition_map: "Centered Headline, Bottom Illustration",
        aesthetic_motifs: "Clean edges, soft shadows"
      };
    }

    if (!jsonData.content_registry) {
      jsonData.content_registry = [
        { id: 'headline', label: 'Main Headline', placeholder: 'Enter headline...', type: 'text' }
      ];
    }

    if (!jsonData.base_visual_dna_prompt || jsonData.base_visual_dna_prompt.includes('UNDEFINED')) {
      jsonData.base_visual_dna_prompt = "A modern professional social media post layout with a clean background, a large bold headline at the top, and a relevant graphic illustration in the center. Studio lighting, high quality graphic design style.";
    }

    const usageLog = await recordUsage('Design Builder DNA', 'gemini-3-flash-preview', response);
    return { markdown: markdown.trim(), json: jsonData, usage: usageLog };
  } catch (e) {
    throw new Error("DNA Sequence Error: The system failed to parse the structural logic.");
  }
};

export const analyzeBrand = async (imageB64: string): Promise<{ dna: BrandDNA, usage: UsageLog }> => {
  const ai = getAI();
  const prompt = `Analyze this brand asset. Extract Brand DNA. 
  Return ONLY a JSON object: { "brand_name": "string", "primary_colors": ["hex codes"], "color_logic": "string", "brand_vibe": "string", "typography_notes": "string", "forbidden_styles": [] }`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: imageB64.split(',')[1] || imageB64 } }, { text: prompt }] },
    config: { responseMimeType: "application/json" }
  });

  const text = response.text || '';
  if (!text.trim()) throw new Error("No response from Brand Lab.");

  try {
    const usageLog = await recordUsage('Brand Lab', 'gemini-3-flash-preview', response);
    return { dna: JSON.parse(extractJsonFromText(text)), usage: usageLog };
  } catch (e) {
    throw new Error("Brand Lab returned invalid JSON format.");
  }
};

export const generateTemplateImage = async (jsonSpec: DesignPromptJson, ratio: AspectRatio): Promise<{ image: string, usage: UsageLog }> => {
  const ai = getAI();
  const templatePrompt = `Create a high-fidelity design mockup based on these rules: ${jsonSpec.base_visual_dna_prompt}. 
  The layout is a ${jsonSpec.structural_rules.layout_archetype}. 
  Element placement: ${jsonSpec.structural_rules.composition_map}. 
  Visual style: ${jsonSpec.structural_rules.aesthetic_motifs}. 
  Typography vibe: ${jsonSpec.structural_rules.typography_system}.
  Include placeholder text that says 'YOUR CONTENT HERE'. 
  Aspect Ratio: ${ratio}. Clean, professional social media graphic.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: templatePrompt }] },
    config: { imageConfig: { aspectRatio: ratio } },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("Image generation failed.");

  const usageLog = await recordUsage('Design Builder Visual', 'gemini-3-pro-image-preview', response);
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
  characterDNA?: CharacterDNA
): PromptData => {
  const brandContext = brandOverride
    ? `BRAND RULES: ${JSON.stringify(brandOverride)}`
    : "Use original design colors.";

  const carouselCtx = brief.slide_number ? `This is slide ${brief.slide_number} of a ${brief.total_slides} slide carousel. Adapt layout accordingly.` : "";

  const characterCtx = characterDNA
    ? `CHARACTER DNA: ${JSON.stringify(characterDNA)}. You MUST include this character in the design. Use its physical description and color palette. This is an IDENTITY LOCKED generation for the character.`
    : "";

  const text = `Create a new post remix. 
  SOURCE DNA: ${JSON.stringify(reference)}
  NEW BRIEF: ${JSON.stringify(brief)}
  ${carouselCtx}
  ${brandContext}
  ${characterCtx}
  INTENSITY: ${intensity}
 
  Return a production report then ---PROMPT_START--- then a single-line visual prompt that includes the layout logic of the source DNA but with the new content from the brief.
  
  ${brief.structured_content ? `PRIORITY CONTENT MAPPING: The user provided specific text for these slots. Use them exactly: ${JSON.stringify(brief.structured_content)}` : ''}
  `;

  return { text, images: [] };
};

export const generatePostFromReference = async (
  reference: DesignPromptJson,
  brief: ContentBrief,
  intensity: string,
  brandOverride?: BrandDNA,
  characterDNA?: CharacterDNA
): Promise<{ report: string, finalVisualPrompt: string, usage: UsageLog }> => {
  const ai = getAI();
  const promptData = getPostPromptData(reference, brief, intensity, brandOverride, characterDNA);

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: promptData.text
  });

  const raw = response.text || '';
  const usageLog = await recordUsage('Post Generator', 'gemini-3-flash-preview', response);
  const [report, finalPrompt] = raw.split('---PROMPT_START---');
  return { report: report.trim(), finalVisualPrompt: finalPrompt?.trim() || '', usage: usageLog };
};

export const getRemixPromptData = (visualPrompt: string, ratio: AspectRatio): PromptData => {
  return {
    text: `${visualPrompt}. Aspect Ratio: ${ratio}. Professional graphic design.`,
    images: []
  };
};

export const generateRemixImage = async (visualPrompt: string, ratio: AspectRatio): Promise<{ image: string, usage: UsageLog }> => {
  const ai = getAI();
  const promptData = getRemixPromptData(visualPrompt, ratio);
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: promptData.text }] },
    config: { imageConfig: { aspectRatio: ratio } },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("Remix generation failed.");

  const usageLog = await recordUsage('Post Generator', 'gemini-3-pro-image-preview', response);
  for (const part of parts) {
    if (part.inlineData) return { image: `data:image/png;base64,${part.inlineData.data}`, usage: usageLog };
  }
  throw new Error("Remix failed to render.");
};

export const refinePostImage = async (
  currentImageB64: string,
  instruction: string,
  ratio: AspectRatio,
  refImageB64?: string,
  isAnnotation: boolean = false
): Promise<{ image: string, usage: UsageLog }> => {
  const ai = getAI();

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
    
    Ratio: ${ratio}. Output the final modified image.`
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
    config: {
      imageConfig: { aspectRatio: ratio },
    }
  });

  const resultParts = response.candidates?.[0]?.content?.parts;
  if (!resultParts) throw new Error("Refinement failed.");

  const usageLog = await recordUsage('Production Studio', 'gemini-3-pro-image-preview', response);
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

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [...imageParts, textPart] },
    config: { responseMimeType: "application/json" }
  });

  const text = response.text || '';
  if (!text.trim()) throw new Error("No response from Character Lab.");

  try {
    const dna = JSON.parse(extractJsonFromText(text)) as CharacterDNA;
    dna.reference_images = imagesB64;
    const usageLog = await recordUsage('Character Lab', 'gemini-3-flash-preview', response);
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
  aspectRatio: AspectRatio = '1:1'
): Promise<{ image: string, usage: UsageLog }> => {
  const ai = getAI();
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
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
    config: { imageConfig: { aspectRatio } },
  });

  const resultParts = response.candidates?.[0]?.content?.parts;
  if (!resultParts) throw new Error("Turnaround generation failed.");

  const usageLog = await recordUsage('Character Lab', 'gemini-3-pro-image-preview', response);
  for (const part of resultParts) {
    if (part.inlineData) return { image: `data:image/png;base64,${part.inlineData.data}`, usage: usageLog };
  }
  throw new Error("Turnaround generation failed to render.");
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
  aspectRatio: AspectRatio = '1:1'
): Promise<{ image: string, usage: UsageLog }> => {
  const ai = getAI();
  const promptData = getPosePromptData(characterDNA, poseReference, posePrompt, aspectRatio);

  const parts: any[] = [];
  promptData.images.forEach((img, idx) => {
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: img.split(',')[1] || img }
    });
  });

  parts.push({ text: promptData.text });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
    config: { imageConfig: { aspectRatio } },
  });

  const resultParts = response.candidates?.[0]?.content?.parts;
  if (!resultParts) throw new Error("Character pose generation failed.");

  const usageLog = await recordUsage('Character Studio', 'gemini-3-pro-image-preview', response);
  for (const part of resultParts) {
    if (part.inlineData) return { image: `data:image/png;base64,${part.inlineData.data}`, usage: usageLog };
  }
  throw new Error("Character pose generation failed to render.");
};
