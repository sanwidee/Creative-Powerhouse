# Creative Powerhouse - User Guidelines

## Introduction

This guide provides best practices and guidelines for using Creative Powerhouse effectively. Follow these recommendations to get the best results from the AI-powered design system.

---

## Getting Started Checklist

Before you begin:

- [ ] Obtain Google Gemini API key from [AI Studio](https://aistudio.google.com/)
- [ ] Add API key in Settings
- [ ] Verify storage server is running (`npm run server`)
- [ ] Create your first brand profile
- [ ] Create your first blueprint

---

## Design Builder Guidelines

### Reference Image Selection

**DO:**
- Use high-resolution images (min 1000px width)
- Choose designs with clear, distinct layouts
- Select designs that match your content goals
- Use images with readable text elements

**DON'T:**
- Use blurry or pixelated images
- Reference overly complex multi-layer designs
- Use screenshots with UI elements
- Reference designs with heavy photo backgrounds

### Focus Notes Best Practices

Effective focus notes are specific and actionable:

**Good Examples:**
- "Focus on the headline typography and color blocking"
- "Note the three-column grid structure"
- "Pay attention to how the CTA button is positioned"

**Bad Examples:**
- "Make it look good"
- "Just analyze it"
- (Empty notes)

### Blueprint Organization

Organize your blueprints with clear naming:

```
[Category] - [Style] - [Layout Type]

Examples:
- Quote - Bold - Headline Center
- Product - Minimal - Left Split
- Infographic - Corporate - Grid 3x3
- Story - Playful - Full Image
```

Use tags consistently:
- Platform: `instagram`, `linkedin`, `twitter`
- Style: `minimal`, `bold`, `playful`
- Type: `quote`, `product`, `story`

---

## Brand Lab Guidelines

### Reference Image Selection

**Best sources:**
- Official brand guidelines PDF exports
- Logo on white background
- Moodboard with brand elements
- Existing branded content

### Brand DNA Quality

After extraction, verify and refine:

1. **Primary Colors:** Ensure hex codes are exact brand colors
2. **Color Logic:** Describe how colors should be used
3. **Brand Vibe:** Be specific about emotional tone
4. **Typography Notes:** Include font families if known
5. **Forbidden Styles:** List what doesn't fit the brand

### Managing Multiple Brands

When managing multiple brands:

- Use clear, distinct naming: "Acme Corp - Main" vs "Acme Corp - Sub-brand"
- Document brand differences in the vibe field
- Use consistent tagging across brands
- Consider color-coded naming conventions

---

## Character Lab Guidelines

### Reference Image Guidelines

**Quality over quantity:**
- 3-5 excellent images > 10 mediocre ones
- Consistent style across all images
- Clear character features visible
- Same character, different poses/angles

**Ideal image set:**
1. Front-facing clear shot
2. Side profile
3. Action/pose variation
4. Close-up on details
5. Full body shot

### Art Style Selection

| Style | When to Use |
|-------|-------------|
| Original | When keeping source style |
| Plushy | Soft, friendly brand mascots |
| Pixel Art | Gaming, retro, tech brands |
| Chibi | Playful, youthful brands |
| Animated | Storytelling, character content |
| Futuristic Robot | Tech, innovation brands |
| Claymorphism | Unique, memorable brands |

### Character-Brand Linking

Link character to brand when:
- Character is a brand mascot
- Character should use brand colors
- You want themed character variations

Don't link when:
- Character has distinct established colors
- Character is for one-off content
- Character is a generic figure

---

## Post Generator Guidelines

### Content Brief Writing

**Structure your brief:**

```
[Main Headline/Message]
[Supporting Content]
[Call to Action]
[Visual Context]
```

**Good Example:**
```
Headline: "5 Ways AI Transforms Your Workflow"
Supporting: "Discover how automation saves 10+ hours weekly"
CTA: "Start Free Trial"
Visual: Use icons representing efficiency and technology
```

**Bad Example:**
```
Make a post about AI
```

### Structured Content

When available, use structured content for precise text mapping:

```json
{
  "headline_1": "Your Main Title Here",
  "body_text": "Supporting description",
  "cta_button": "Click Here"
}
```

This maps directly to blueprint content registry slots.

### Remix Intensity Selection

| Use Strict When | Use Light When | Use Heavy When |
|-----------------|----------------|----------------|
| Brand guidelines are rigid | Want slight freshness | Exploring new directions |
| Creating templates | A/B testing variations | Creative brainstorming |
| Legal compliance needed | Regular content rotation | Seasonal campaigns |

### Theme Mode Selection

| Choose Dark | Choose Light | Choose Auto |
|-------------|--------------|-------------|
| Tech/gaming brands | Lifestyle brands | Match original blueprint |
| Evening content | Daytime content | Unknown preference |
| Dramatic visuals | Clean aesthetics | Testing both |

---

## Carousel Generator Guidelines

### Brief Structure

Write comprehensive carousel briefs:

```
[Topic/Theme]
[Number of Key Points]
[Audience]
[Goal/CTA]

Example:
"Tips for Remote Work Productivity
5 key tips for professionals
Target: Remote workers aged 25-40
Goal: Sign up for productivity tool"
```

### Slide Count Recommendations

| Purpose | Recommended Slides |
|---------|-------------------|
| Quick tips | 3-5 |
| Tutorials | 5-7 |
| Listicles | 7-10 |
| Stories | 5-8 |
| Product features | 4-6 |

### Carousel Flow

Structure your carousel for engagement:

1. **Slide 1 (Hook):** Attention-grabbing headline, character waving/pointing
2. **Slides 2-N (Content):** One key point per slide, character reacting/demonstrating
3. **Last Slide (CTA):** Clear call-to-action, character celebrating/gesturing

---

## Production Studio Guidelines

### Effective Retouch Instructions

**Good Instructions:**
- "Change headline to 'New Summer Collection'"
- "Make the background color darker"
- "Move the CTA button to the bottom right"
- "Update the price from $99 to $79"

**Bad Instructions:**
- "Fix it"
- "Make it better"
- "Change everything"

### Annotation Usage

Use annotations for:
- Circling elements to modify
- Drawing arrows to indicate movement
- Highlighting areas for color changes
- Marking regions to remove

### Revision Management

- Generate new versions sparingly
- Use descriptive names for versions
- Rollback if changes aren't improvements
- Keep a "final" version clearly marked

---

## Workflow Recommendations

### Daily Workflow

```
1. Review briefs/content calendar
2. Select appropriate blueprints
3. Generate initial drafts
4. Retouch as needed
5. Save and organize
6. Export for publishing
```

### Weekly Workflow

```
1. Review generated content performance
2. Identify successful patterns
3. Create new blueprints from successful posts
4. Update brand DNA based on learnings
5. Organize and clean library
```

### Monthly Workflow

```
1. Audit all assets
2. Remove unused blueprints
3. Update brand profiles
4. Create seasonal presets
5. Review usage and optimize costs
```

---

## Quality Checklist

Before publishing generated content:

### Visual Quality
- [ ] Text is readable
- [ ] Colors match brand
- [ ] Layout is balanced
- [ ] No visual artifacts
- [ ] Aspect ratio correct

### Content Quality
- [ ] Message is clear
- [ ] CTA is visible
- [ ] Tone matches brand
- [ ] No typos
- [ ] Character looks consistent (if used)

### Technical Quality
- [ ] Resolution is sufficient
- [ ] File size is reasonable
- [ ] Format is correct for platform

---

## Common Mistakes to Avoid

### Blueprint Mistakes
- ❌ Using low-quality reference images
- ❌ Skipping validation mockup
- ❌ Not categorizing blueprints
- ❌ Creating too many similar blueprints

### Generation Mistakes
- ❌ Vague content briefs
- ❌ Wrong aspect ratio for platform
- ❌ Ignoring remix intensity
- ❌ Not selecting brand profile

### Character Mistakes
- ❌ Too few reference images
- ❌ Inconsistent style in references
- ❌ Wrong art style selection
- ❌ Not using identity lock

### Workflow Mistakes
- ❌ Not saving presets
- ❌ Ignoring revision history
- ❌ Disorganized library
- ❌ No backup of blueprints

---

## Performance Tips

### Faster Generation
- Use Flash model for speed
- Batch similar content together
- Pre-configure presets
- Use structured content

### Better Quality
- Use Pro model for complexity
- Provide detailed briefs
- Use validation mockups
- Iterate with retouching

### Cost Optimization
- Default to Flash model
- Batch plan before generating
- Reuse blueprints extensively
- Create efficient presets

---

## Platform-Specific Guidelines

### Instagram Feed
- Use 1:1 or 4:5 aspect ratio
- Bold, attention-grabbing visuals
- Strong visual hierarchy
- Character content performs well

### Instagram Stories/Reels
- Use 9:16 aspect ratio
- Vertical-first design
- Quick, punchy content
- Include interactive elements

### LinkedIn
- Use 1:1 or 16:9 aspect ratio
- Professional, clean design
- Data-driven content
- Subtle branding

### Twitter/X
- Use 16:9 or 1:1 aspect ratio
- Bold, simple designs
- Text-forward content
- Memes and quotes perform well

---

## Export & Publishing

### Download Options
- Individual images: PNG format
- Carousels: ZIP bundle
- All include metadata

### Naming Convention
```
[Date]_[Platform]_[Campaign]_[Version]

Example:
2024-01-15_Instagram_SummerSale_v1.png
```

### Quality Settings
- Web: 72 DPI, compressed
- Print: 300 DPI, full quality
- Social: Platform-optimized

---

## Support & Resources

### In-App Help
- Click "Docs" in sidebar
- Hover over icons for tooltips
- Check Settings for usage logs

### External Resources
- [Google AI Studio](https://aistudio.google.com/) - API key management
- [Gemini Documentation](https://ai.google.dev/docs) - API reference

### Community
- Report bugs via GitHub Issues
- Request features with "enhancement" label
- Share feedback for improvements
