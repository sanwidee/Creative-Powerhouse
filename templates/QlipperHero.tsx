import React from 'react';
import type { TemplateManifest, TemplateProps } from './types';
import { RENDER_DIMENSIONS } from './types';

/**
 * QlipperHero — Qlipper-style hero post.
 *
 * Light variant: cream/beige bg, dark text, gold hero asset, dark outlined pill CTA
 * Dark variant:  black bg, white text, gold hero asset, white outlined pill CTA
 *
 * Slots:
 *   headline       — top bold headline
 *   subhead        — supporting line under headline (optional)
 *   cta_text       — pill button at the bottom
 *   hero_image_url — data URL for the centered hero asset
 *
 * Tokens:
 *   theme          — dark | light
 *   accent         — accent color (gold default)
 */

const QlipperHero: React.FC<TemplateProps> = ({ slots, tokens, ratio }) => {
  const { width, height } = RENDER_DIMENSIONS[ratio];

  const theme = tokens.theme || 'light';
  const isDark = theme === 'dark';

  const bg = isDark ? '#000000' : (tokens.bg_color || '#EFE8D7');
  const ink = isDark ? '#FFFFFF' : (tokens.text_color || '#1A1410');
  const subInk = isDark ? '#9CA3AF' : '#5A4A3D';
  const ctaBorder = isDark ? '#FFFFFF' : '#1A1410';

  const headline = slots.headline || 'Qlipper v2.0';
  const subhead = slots.subhead || '';
  const cta = slots.cta_text || 'Coba Qlipper sekarang';
  const heroUrl = slots.hero_image_url || '';

  const min = Math.min(width, height);
  const padding = min * 0.075;
  const headlineSize = min * 0.085;
  const subheadSize = min * 0.034;
  const ctaSize = min * 0.032;
  const ctaPaddingX = min * 0.055;
  const ctaPaddingY = min * 0.022;
  const heroMax = min * 0.62;

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: bg,
        color: ink,
        fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        padding: padding,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top text block */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: subheadSize * 0.55,
          marginTop: padding * 0.25,
        }}
      >
        <h1
          style={{
            fontSize: headlineSize,
            fontWeight: 800,
            lineHeight: 1.04,
            letterSpacing: '-0.025em',
            margin: 0,
            whiteSpace: 'pre-wrap',
            maxWidth: '100%',
            wordBreak: 'break-word',
          }}
        >
          {headline}
        </h1>
        {subhead && (
          <p
            style={{
              fontSize: subheadSize,
              fontWeight: 400,
              lineHeight: 1.32,
              color: subInk,
              margin: 0,
              maxWidth: '90%',
              whiteSpace: 'pre-wrap',
            }}
          >
            {subhead}
          </p>
        )}
      </div>

      {/* Hero asset, centered, takes remaining space */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${padding * 0.5}px 0`,
          minHeight: 0,
        }}
      >
        {heroUrl ? (
          <img
            src={heroUrl}
            alt=""
            style={{
              maxWidth: heroMax,
              maxHeight: heroMax,
              objectFit: 'contain',
              filter: isDark ? 'drop-shadow(0 10px 40px rgba(212, 175, 55, 0.25))' : 'drop-shadow(0 12px 40px rgba(0, 0, 0, 0.15))',
            }}
          />
        ) : (
          <div
            style={{
              width: heroMax * 0.6,
              height: heroMax * 0.6,
              border: `2px dashed ${ink}40`,
              borderRadius: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: `${ink}60`,
              fontSize: subheadSize * 0.8,
            }}
          >
            (hero asset)
          </div>
        )}
      </div>

      {/* Bottom CTA pill */}
      {cta && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              padding: `${ctaPaddingY}px ${ctaPaddingX}px`,
              border: `1.5px solid ${ctaBorder}`,
              borderRadius: 999,
              fontSize: ctaSize,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: ink,
              backgroundColor: 'transparent',
            }}
          >
            {cta}
          </div>
        </div>
      )}
    </div>
  );
};

export const QlipperHeroManifest: TemplateManifest = {
  id: 'qlipper_hero',
  name: 'Qlipper Hero',
  description: 'Qlipper-style hero post: bold headline, centered gold asset, pill CTA. Dark or light theme.',
  category: 'cta',
  defaultRatio: '4:5',
  supportedRatios: ['4:5', '1:1', '9:16', '3:4'],
  slots: [
    {
      id: 'headline',
      label: 'Headline',
      type: 'longtext',
      required: true,
      maxLength: 80,
      placeholder: 'Qlipper v2.0',
      helper: 'Bold top headline. Press Enter for manual line breaks.',
    },
    {
      id: 'subhead',
      label: 'Subhead',
      type: 'longtext',
      required: false,
      maxLength: 140,
      placeholder: 'Upload video sendiri. AI potong, subtitle, export. Tanpa YouTube.',
      helper: 'Supporting line under headline. Optional.',
    },
    {
      id: 'cta_text',
      label: 'CTA pill text',
      type: 'text',
      required: false,
      maxLength: 40,
      placeholder: 'Coba Qlipper sekarang',
    },
    {
      id: 'hero_image_url',
      label: 'Hero asset (data URL)',
      type: 'longtext',
      required: false,
      placeholder: 'data:image/png;base64,…',
      helper: 'Pick from Brand Assets (the asset picker auto-fills this).',
    },
  ],
  tokens: [
    {
      id: 'theme',
      label: 'Theme',
      type: 'select',
      defaultValue: 'light',
      options: [
        { value: 'light', label: 'Light (cream)' },
        { value: 'dark', label: 'Dark (black)' },
      ],
    },
    {
      id: 'bg_color',
      label: 'Light bg',
      type: 'color',
      defaultValue: '#EFE8D7',
    },
    {
      id: 'text_color',
      label: 'Light text',
      type: 'color',
      defaultValue: '#1A1410',
    },
  ],
  Component: QlipperHero,
};

export default QlipperHero;
