
export type AspectRatio = '1:1' | '9:16' | '16:9' | '4:3' | '3:4';
export type CharacterArtStyle = 'original' | 'plushy' | 'pixel_art' | 'chibi' | 'animated' | 'futuristic_robot' | 'claymorphism';


declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export interface ExtractedField {
  id: string;
  label: string;
  placeholder: string;
  type: 'text' | 'number' | 'call_to_action';
}

export interface VisualStyle {
  layout_archetype: string;
  typography_system: string;
  color_grammar: string;
  composition_map: string;
  aesthetic_motifs: string;
  has_character_slot?: boolean; // NEW: Indicates if layout expects a character/mascot
}

export interface BrandDNA {
  brand_name: string;
  primary_colors: string[];
  color_logic: string;
  brand_vibe: string;
  typography_notes: string;
  forbidden_styles: string[];
}

export interface DesignPromptJson {
  template_name: string;
  structural_rules: VisualStyle;
  layout_constraints: {
    forbidden_elements: string[];
    mandatory_anchors: string[];
    white_space_logic: string;
  };
  placeholder_map: {
    headline_style: string;
    body_style: string;
    cta_style: string;
  };
  content_registry: ExtractedField[];
  base_visual_dna_prompt: string;
}

export interface ContentBrief {
  topic: string;
  elements_to_display: string;
  copy_instructions: string;
  target_audience: string;
  aspectRatio: AspectRatio;
  slide_number?: number;
  total_slides?: number;
  structured_content?: Record<string, string>;
  characterId?: string; // Optional character ID for generation
}

export interface CarouselSlide {
  id: string;
  slideNumber: number;
  copyBrief: string;
  styleBrief: string;
  generatedImage?: string;
}

export interface GeneratedCarousel {
  id: string;
  name: string;
  slides: CarouselSlide[];
  blueprintId: string;
  brandId?: string;
  characterId?: string;
  createdAt: number;
}

export interface PromptData {
  text: string;
  images: string[];
}

export interface RetouchHistory {
  id: string;
  timestamp: number;
  instruction: string;
  image: string;
  type: 'text' | 'visual_reference' | 'annotation';
}

export interface GeneratedPost {
  id: string;
  name: string;
  imageSource: string;
  history: RetouchHistory[];
  blueprintId: string;
  brandId?: string;
  aspectRatio: AspectRatio;
  createdAt: number;
}

export interface DesignReference {
  id: string;
  name: string;
  tags: string[];
  imageSource: string;
  templateImage?: string;
  markdownBrief: string;
  jsonSpec: DesignPromptJson;
  aspectRatio: AspectRatio;
  createdAt: number;
}

export interface BrandReference {
  id: string;
  name: string;
  imageSource: string;
  dna: BrandDNA;
  createdAt: number;
}

export interface CharacterDNA {
  character_name: string;
  physical_features: string;
  visual_details: string;
  color_palette: string[];
  style_notes: string;
  reference_images: string[];
  linked_brand_id?: string;
  assigned_art_style?: CharacterArtStyle;
  identity_lock?: boolean;
}

export interface CharacterReference {
  id: string;
  name: string;
  sourceImages: string[];
  dna: CharacterDNA;
  createdAt: number;
}

export interface GeneratedCharacterPose {
  id: string;
  name: string;
  characterId: string;
  poseReference?: string;
  posePrompt?: string;
  generatedImage: string;
  createdAt: number;
}

export enum AppTool {
  LANDING = 'landing',
  BUILDER = 'builder',
  LIBRARY = 'library',
  GENERATOR = 'generator',
  CAROUSEL_GENERATOR = 'carousel_generator',
  BRAND_LAB = 'brand_lab',
  CHARACTER_LAB = 'character_lab',
  CHARACTER_STUDIO = 'character_studio',
  SETTINGS = 'settings'
}

export type RemixIntensity = 'strict' | 'light' | 'heavy';

export type GeminiModel = 'flash' | 'pro';

export interface ModelPreference {
  textModel: GeminiModel;
  imageModel: GeminiModel;
}

export interface UsageLog {
  id: string;
  timestamp: number;
  feature: 'Design Builder DNA' | 'Design Builder Visual' | 'Brand Lab' | 'Post Generator' | 'Production Studio' | 'Character Lab' | 'Character Studio';
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  costIDR: number;
}
