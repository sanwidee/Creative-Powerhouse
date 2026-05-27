# Implementation Plan: UX Productivity Overhaul

## Goal

Fundamentally improve the speed and usability of Weed Labs to make it **faster than raw ChatGPT prompting** for repetitive content creation. This involves 4 major features:

1.  **Quick Mode**: Bypass library selection; paste image + type brief = instant generation.
2.  **Preset Combos**: Save `Blueprint + Brand + Character` combos as one-click workflow presets.
3.  **Batch Generation**: Input multiple briefs for a single blueprint, generate all with one click.
4.  **Smart Labels/Tags**: Add categories and tags to blueprints for faster filtering.

---

## User Review Required

> [!IMPORTANT]
> This is a significant UX overhaul. The Generator UI will look different. Please review the changes below and confirm you're happy with the scope before I begin implementation.

> [!WARNING]
> **Preset Combos** will add a new data type (`Preset`) stored in the database. Old data will not be affected, but this is new infrastructure.

---

## Proposed Changes

### 1. Data Layer

#### [MODIFY] [types.ts](file:///Users/sanwidi/Desktop/1.Project/Creative%20Powerhouse/types.ts)

*   **Add `Preset` interface**:
    ```typescript
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
    ```
*   **Add `category` and `tags` fields to `DesignReference`**:
    ```typescript
    // Inside DesignReference
    category?: 'quote' | 'infographic' | 'product' | 'story' | 'carousel' | 'other';
    tags?: string[];
    ```

---

#### [MODIFY] [App.tsx](file:///Users/sanwidi/Desktop/1.Project/Creative%20Powerhouse/App.tsx)

*   **State Management**: Add `presets` state array.
*   **API Integration**: Add `savePreset`, `deletePreset` functions that persist to `/api/presets`.
*   **Props Passing**: Pass `presets`, `onSavePreset`, `onDeletePreset` down to `Generator.tsx` and `CarouselGenerator.tsx`.

---

### 2. Generator Overhaul

#### [MODIFY] [Generator.tsx](file:///Users/sanwidi/Desktop/1.Project/Creative%20Powerhouse/components/Generator.tsx)

This is the **core change**. The UI will gain two new modes:

```
┌─────────────────────────────────────────────────────────────┐
│  [ QUICK ]  [ LIBRARY ]  [ BATCH ]           ← Mode Tabs   │
├─────────────────────────────────────────────────────────────┤
│  (Content changes based on active mode)                     │
└─────────────────────────────────────────────────────────────┘
```

**A. Quick Mode (New Section)**
*   Add a toggle or tab at the top: `Quick | Library | Batch`.
*   In Quick Mode:
    *   Hide the Blueprint/Brand/Character picker carousels.
    *   Show:
        *   `[Paste Image Dropzone]` → Calls `analyzeDesign()` on-the-fly when image is dropped.
        *   `[Brief Textarea]` → For the generation prompt.
        *   `[Deploy Button]` → Generates immediately using the ad-hoc analyzed DNA.
    *   The generated image is saved to "My Files" as usual.

**B. Presets Panel (Library Mode Enhancement)**
*   Add a new section: "My Presets" above the Blueprints picker.
*   Horizontally scrollable list of saved presets (styled like Blueprint cards).
*   Clicking a preset auto-selects Blueprint, Brand, Character, Intensity.
*   Add a "Save Current as Preset" button next to the Deploy button.
    *   Opens a small modal to name the preset.
    *   Saves the current config combo to `presets` state.

**C. Batch Mode (New Section)**
*   In Batch Mode:
    *   The user selects Blueprint/Brand/Character/Intensity **once**.
    *   A large `<textarea>` appears for multi-line input (one brief per line), or a list-based input.
    *   "Deploy All" button iterates through each line and generates a post.
    *   A progress indicator shows `"Generating 3 of 10..."`.
    *   Results are displayed in a grid below and can be saved individually or all at once.

---

### 3. Library Filtering

#### [MODIFY] [components/Library.tsx](file:///Users/sanwidi/Desktop/1.Project/Creative%20Powerhouse/components/Library.tsx)

*   **Category Filter Bar**: Add buttons/chips above the grid:
    `All | Quote | Infographic | Product | Story | Carousel`.
*   **Tag Display**: Show assigned tags on Blueprint cards.
*   **CRUD for Tags in Detail Modal**: Allow editing category and tags when viewing a Blueprint's detail.

---

#### [MODIFY] [components/Builder.tsx](file:///Users/sanwidi/Desktop/1.Project/Creative%20Powerhouse/components/Builder.tsx) (Minor)

*   After DNA analysis, add UI for user to assign a `category` and `tags` before saving.
*   Default category can be AI-suggested based on `blueprint_type` (e.g., "carousel" → "Carousel").

---

### 4. Carousel Generator Alignment

#### [MODIFY] [CarouselGenerator.tsx](file:///Users/sanwidi/Desktop/1.Project/Creative%20Powerhouse/components/CarouselGenerator.tsx)

*   **Presets Panel**: Same as Generator—show and load presets.
*   **Batch Mode is Inherent**: The Carousel Generator already works in batch (multiple slides). No changes needed for batch logic, but the Presets feature applies.

---

## Summary of Files Changed

| File | Change Type | Key Additions |
| :--- | :--- | :--- |
| `types.ts` | Modify | `Preset` interface, `category/tags` on `DesignReference` |
| `App.tsx` | Modify | `presets` state, save/delete preset functions |
| `Generator.tsx` | Modify (Major) | Mode tabs, Quick Mode dropzone, Presets panel, Batch Mode |
| `Library.tsx` | Modify | Category/Tag filter UI |
| `Builder.tsx` | Modify (Minor) | Category/Tag assignment UI |
| `CarouselGenerator.tsx` | Modify | Presets panel |

---

## Verification Plan

### Automated Tests
*   **N/A**: This project does not appear to have an automated test suite. All verification will be manual.

### Manual Verification

#### Feature 1: Quick Mode
1.  Open the Generator.
2.  Click the "Quick" mode tab.
3.  Drag and drop a design screenshot into the dropzone.
4.  Observe: The app should show a loading state while analyzing the DNA.
5.  Type a brief and click "Deploy".
6.  Observe: A post should be generated.

#### Feature 2: Presets
1.  Open the Generator in "Library" mode.
2.  Select a Blueprint, Brand, and set Intensity.
3.  Click "Save as Preset".
4.  Name it "My Quote Preset" and save.
5.  Return to the Generator landing.
6.  Observe: "My Quote Preset" should appear in the Presets carousel.
7.  Click it.
8.  Observe: Blueprint, Brand, and Intensity should auto-select.

#### Feature 3: Batch Mode
1.  Open the Generator.
2.  Click the "Batch" mode tab.
3.  Select a Blueprint.
4.  Enter 3 briefs, one per line in the text area.
5.  Click "Deploy All".
6.  Observe: A progress indicator should show generation status.
7.  Observe: 3 generated images should appear in a results grid.

#### Feature 4: Smart Labels
1.  Open the Builder.
2.  Upload an image and analyze it.
3.  Observe: A Category dropdown and Tags input should appear.
4.  Select "Quote" and add tags "promo, sale".
5.  Save the Blueprint.
6.  Go to "My Files" -> Blueprints.
7.  Observe: The category filter bar should be visible.
8.  Click "Quote".
9.  Observe: Only the newly created blueprint should be visible.
