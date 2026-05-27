import React from 'react';
import type { TemplateManifest, TemplateProps } from './types';
import { RENDER_DIMENSIONS } from './types';

const QuoteCardEditorial: React.FC<TemplateProps> = ({ slots, tokens, ratio }) => {
  const { width, height } = RENDER_DIMENSIONS[ratio];

  const bg = tokens.bg_color || '#FAFAF5';
  const ink = tokens.text_color || '#0A0A0A';
  const accent = tokens.accent_color || '#FF5C8A';
  const layout = tokens.layout || 'left';

  const headline = slots.headline || 'Discipline beats motivation.';
  const attribution = slots.attribution || 'IKHSAN';
  const date = slots.date || '';

  const headlineSize = Math.min(width, height) * 0.105;
  const padding = Math.min(width, height) * 0.085;
  const accentBarWidth = Math.min(width, height) * 0.06;
  const attributionSize = Math.min(width, height) * 0.022;
  const accentDotSize = Math.min(width, height) * 0.012;

  const align: React.CSSProperties =
    layout === 'center'
      ? { alignItems: 'center', textAlign: 'center' }
      : { alignItems: 'flex-start', textAlign: 'left' };

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: bg,
        color: ink,
        padding,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: "'Fraunces', 'Times New Roman', serif",
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...align,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: padding,
          right: padding,
          width: accentDotSize,
          height: accentDotSize,
          borderRadius: '50%',
          backgroundColor: accent,
        }}
      />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', width: '100%' }}>
        <h1
          style={{
            fontSize: headlineSize,
            lineHeight: 1.02,
            fontWeight: 500,
            letterSpacing: '-0.035em',
            margin: 0,
            fontVariationSettings: "'opsz' 144, 'SOFT' 0, 'WONK' 0",
            maxWidth: '100%',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        >
          {headline}
        </h1>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: padding * 0.35,
          width: '100%',
        }}
      >
        <div
          style={{
            width: accentBarWidth,
            height: 3,
            backgroundColor: accent,
            alignSelf: layout === 'center' ? 'center' : 'flex-start',
          }}
        />
        <div
          style={{
            fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
            fontSize: attributionSize,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            fontWeight: 600,
            color: ink,
            opacity: 0.85,
            display: 'flex',
            gap: '0.9em',
            alignItems: 'center',
            justifyContent: layout === 'center' ? 'center' : 'flex-start',
          }}
        >
          <span>{attribution}</span>
          {date && (
            <>
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  backgroundColor: ink,
                  opacity: 0.5,
                }}
              />
              <span>{date}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const QuoteCardEditorialManifest: TemplateManifest = {
  id: 'quote_card_editorial',
  name: 'Quote Card — Editorial',
  description: 'Big serif headline, accent bar, small-caps attribution. The default for punchy quotes.',
  category: 'quote',
  defaultRatio: '4:5',
  supportedRatios: ['4:5', '1:1', '9:16'],
  slots: [
    {
      id: 'headline',
      label: 'Headline',
      type: 'longtext',
      required: true,
      maxLength: 110,
      placeholder: 'Discipline beats motivation.',
      helper: 'Keep it punchy. Under 80 chars is best. Press Enter for manual line breaks.',
    },
    {
      id: 'attribution',
      label: 'Attribution',
      type: 'text',
      required: false,
      maxLength: 40,
      placeholder: 'IKHSAN',
      helper: 'Your name, handle, or source.',
    },
    {
      id: 'date',
      label: 'Date / context',
      type: 'text',
      required: false,
      maxLength: 20,
      placeholder: '2026',
    },
  ],
  tokens: [
    {
      id: 'bg_color',
      label: 'Background',
      type: 'color',
      defaultValue: '#FAFAF5',
    },
    {
      id: 'text_color',
      label: 'Text',
      type: 'color',
      defaultValue: '#0A0A0A',
    },
    {
      id: 'accent_color',
      label: 'Accent',
      type: 'color',
      defaultValue: '#FF5C8A',
    },
    {
      id: 'layout',
      label: 'Alignment',
      type: 'select',
      defaultValue: 'left',
      options: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
      ],
    },
  ],
  Component: QuoteCardEditorial,
};

export default QuoteCardEditorial;
