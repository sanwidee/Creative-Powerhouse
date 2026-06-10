
export type AspectRatio = '1:1' | '9:16' | '16:9' | '4:3' | '3:4' | '4:5';
export type CharacterArtStyle = 'original' | 'plushy' | 'pixel_art' | 'chibi' | 'animated' | 'futuristic_robot' | 'claymorphism';
export type BlueprintCategory = 'quote' | 'infographic' | 'product' | 'story' | 'carousel' | 'other';

// Preset: A saved combination of Blueprint + Brand + Character + Settings
export interface Preset {
  id: string;
  name: string;
  blueprintId: string;
  brandId?: string;
  characterId?: string;
  aspectRatio?: AspectRatio;
  intensity?: RemixIntensity;
  themeMode?: 'light' | 'dark' | 'auto';
  createdAt: number;
}


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
  type: 'text' | 'number' | 'call_to_action';
  description?: string; // NEW: Precise location/context for the functional map
}

export interface VisualStyle {
  layout_archetype: string;
  typography_system: string;
  composition_map: string; // Keep this as it describes structure
  // aesthetic_motifs: string; // REMOVED: Causes drift. We rely on the image.
  has_character_slot?: boolean;
  dark_theme_adaptation?: string;
  light_theme_adaptation?: string;
}

export interface BrandDNA {
  brand_name: string;
  primary_colors: string[];
  color_logic: string;
  brand_vibe: string;
  typography_notes: string;
  forbidden_styles: string[];
  dark_mode_colors?: string[]; // NEW: Specific hex codes for dark mode
  light_mode_colors?: string[]; // NEW: Specific hex codes for light mode
}

export interface DesignPromptJson {
  template_name: string;
  blueprint_type?: 'headline' | 'carousel' | 'mixed';
  structural_rules: VisualStyle;
  layout_constraints: {
    forbidden_elements: string[];
    mandatory_anchors: string[];
    white_space_logic: string;
  };
  // placeholder_map: Removed as it was redundant/confusing
  content_registry: ExtractedField[];
  base_visual_dna_prompt?: string; // DEPRECATED: Optional legacy field
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

// Planned slide for batch carousel generation
export interface PlannedSlide {
  slideNumber: number;
  copyBrief: string;
  visualContext: string;
  poseInstruction?: string | null;
  status: 'pending' | 'generating' | 'done' | 'error';
  generatedImage?: string;
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

export interface FeedPreviewProfile {
  handle: string;
  displayName: string;
  bio: string;
  website: string;
  avatarDataUrl?: string;
  igTheme?: 'light' | 'dark';
}

// Instagram-style profile feed preview (client-side drafting)
export interface FeedPreviewState {
  version: 1;
  profile: FeedPreviewProfile;
  postIds: string[];
  captions: Record<string, string>;
  updatedAt: number;
}

export interface FeedPreviewProject {
  id: string;
  name: string;
  state: FeedPreviewState;
  createdAt: number;
}

export interface DesignReference {
  id: string;
  name: string;
  tags: string[];
  category?: BlueprintCategory;
  imageSource: string;
  templateImage?: string;
  markdownBrief: string;
  jsonSpec: DesignPromptJson;
  aspectRatio: AspectRatio;
  createdAt: number;
}

export interface BrandVisualIdentity {
  bg_dark: string;          // hex, e.g. '#000000' for dark theme bg
  bg_light: string;         // hex, e.g. '#EFE8D7' for light theme bg
  ink_dark: string;         // text on dark bg
  ink_light: string;        // text on light bg
  sub_ink_dark?: string;    // muted text on dark
  sub_ink_light?: string;   // muted text on light
  accent_color: string;     // primary accent (CTA, highlights)
  accent_color_2?: string;  // secondary accent
  cta_text_default: string; // e.g. "Coba Qlipper sekarang"
  font_family_serif?: string;
  font_family_sans?: string;
}

export interface BrandVoiceProfile {
  tagline?: string;
  signature_phrases?: string[];
  banned_phrases?: string[];
  target_audience?: string;
  language_default?: 'bahasa' | 'english' | 'mixed';
  tone?: string; // free-form description
}

export interface BrandReference {
  id: string;
  name: string;
  imageSource: string;
  dna: BrandDNA;
  guidelines?: string;
  visual_identity?: BrandVisualIdentity;
  voice_profile?: BrandVoiceProfile;
  createdAt: number;
}

export type SocialPlatform = 'instagram' | 'tiktok' | 'twitter' | 'threads' | 'linkedin';

export interface SocialAccount {
  id: string;
  brand_id: string;
  platform: SocialPlatform;
  handle: string;            // e.g. 'qlipper.ai'
  account_id: string;        // for IG: IG Business Account ID, e.g. '17841...'
  access_token: string;
  fb_page_id?: string;       // for IG/FB
  api_version?: string;      // e.g. 'v21.0'
  enabled: boolean;
  created_at: number;
}

export type BrandAssetSource = 'upload' | 'gemini-gen';

export interface BrandAsset {
  id: string;
  brand_id: string;
  name: string;
  dataUrl: string;
  source: BrandAssetSource;
  prompt?: string;
  tags: string[];
  createdAt: number;
}

export type PostIdeaFormat = 'quote' | 'stat' | 'listicle' | 'hook' | 'cta' | 'carousel';
export type PostIdeaTheme = 'dark' | 'light';
export type PostIdeaStatus = 'draft' | 'approved' | 'rendered' | 'scheduled' | 'published' | 'failed';
// SocialPlatform defined earlier alongside SocialAccount

export type SlideType = 'cover' | 'body';
export type BodySlideStyle = 'explainer' | 'bullets' | 'stat' | 'testimonial';

export interface ChatMessage {
  from: 'incoming' | 'outgoing';
  sender?: string;      // shown above bubble for group-style (optional)
  text: string;
  time: string;         // formatted, e.g. "10:07 PM"
  checks?: boolean;     // double-blue read receipt for outgoing
}

export interface PostSlide {
  slide_index: number;
  slide_type: SlideType;
  theme: PostIdeaTheme;
  body_style?: BodySlideStyle;
  // Cover content
  headline?: string;
  subhead?: string;
  cta_text?: string;
  // Body content
  body_label?: string;     // small uppercase label at top of body slide
  body_heading?: string;   // bold heading on body slide
  body_text?: string;      // long-form for 'explainer' style
  body_bullets?: string[]; // for 'bullets' style
  body_stat?: string;      // big number for 'stat' style
  body_stat_label?: string; // text under/around the stat
  // Testimonial content
  testimonial_label?: string;          // small uppercase header, e.g. "ASLI DARI USER"
  testimonial_messages?: ChatMessage[]; // 2-5 chat bubbles
  // Asset hint (renderer picks if not specified)
  asset_keyword?: string;
  rendered_post_id?: string;
}

export interface PostIdea {
  id: string;
  topic: string;
  headline: string;
  format: PostIdeaFormat;
  theme: PostIdeaTheme;
  caption_draft: string;
  hashtags: string[];
  scheduled_at?: number;
  scheduled_at_iso?: string;
  target_platforms?: SocialPlatform[];
  status: PostIdeaStatus;
  rendered_post_id?: string;
  // When present, this is a multi-slide carousel. The cover slide may mirror the
  // top-level headline/theme for back-compat.
  slides?: PostSlide[];
}

export interface ContentPlan {
  id: string;
  name: string;
  brief: string;
  brand_id: string | null;
  schedule?: {
    posts_per_day?: number;
    days?: number;
    start_utc?: number;
    timezone?: string;
    morning_slot_wib?: string;
    evening_slot_wib?: string;
  };
  ideas: PostIdea[];
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

export interface AudioDNA {
  voice_id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  tone: string;
  age: string;
  accent: string;
  style_prompt: string;
}

export interface AudioReference {
  id: string;
  name: string;
  type?: 'style' | 'clone';  // NEW: Distinguish voice types
  dna?: AudioDNA;            // For style voices (Gemini)
  voiceDna?: VoiceDNA;       // For cloned voices (Coqui)
  createdAt: number;
}

// Voice DNA for cloned voices (Coqui XTTS)
export interface VoiceDNA {
  id: string;
  name: string;
  created_at: number;
  source_type: 'microphone' | 'upload';
  source_duration_sec: number;
  sample_rate: number;
  model_version: string;
}

export enum AppTool {
  LANDING = 'landing',
  STUDIO = 'studio',
  BRAND_STUDIO = 'brand_studio',
  BUILDER = 'builder',
  LIBRARY = 'library',
  GENERATOR = 'generator',
  FEED_PREVIEW = 'feed_preview',
  CAROUSEL_GENERATOR = 'carousel_generator',
  BRAND_LAB = 'brand_lab',
  BRAND_ASSETS = 'brand_assets',
  PLAN_QUEUE = 'plan_queue',
  CHARACTER_LAB = 'character_lab',
  CHARACTER_STUDIO = 'character_studio',
  AUDIO_LAB = 'audio_lab',
  SETTINGS = 'settings',
  DOCS = 'docs'
}

export type RemixIntensity = 'strict' | 'light' | 'heavy';

export type GeminiModel = 'flash' | 'flash-latest' | 'pro' | 'pro-3' | 'custom';

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
