import type { ComponentType } from 'react';
import type { AspectRatio } from '../types';

export type SlotType = 'text' | 'longtext';

export interface Slot {
  id: string;
  label: string;
  type: SlotType;
  required: boolean;
  maxLength?: number;
  placeholder?: string;
  helper?: string;
}

export type TokenType = 'color' | 'select';

export interface Token {
  id: string;
  label: string;
  type: TokenType;
  defaultValue: string;
  options?: { value: string; label: string }[];
}

export type SlotValues = Record<string, string>;
export type TokenValues = Record<string, string>;

export interface TemplateProps {
  slots: SlotValues;
  tokens: TokenValues;
  ratio: AspectRatio;
}

export interface TemplateManifest {
  id: string;
  name: string;
  description: string;
  category: 'quote' | 'stat' | 'listicle' | 'cta' | 'hero';
  defaultRatio: AspectRatio;
  supportedRatios: AspectRatio[];
  slots: Slot[];
  tokens: Token[];
  Component: ComponentType<TemplateProps>;
}

export const RENDER_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '4:3': { width: 1440, height: 1080 },
  '3:4': { width: 1080, height: 1440 },
};
