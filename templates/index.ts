import type { TemplateManifest } from './types';
import { QuoteCardEditorialManifest } from './QuoteCardEditorial';
import { QlipperHeroManifest } from './QlipperHero';

export const TEMPLATES: TemplateManifest[] = [
  QlipperHeroManifest,
  QuoteCardEditorialManifest,
];

export const getTemplate = (id: string): TemplateManifest | undefined =>
  TEMPLATES.find((t) => t.id === id);

export type { TemplateManifest, Slot, Token, TemplateProps, SlotValues, TokenValues } from './types';
export { RENDER_DIMENSIONS } from './types';
