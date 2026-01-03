# Implementation Plan: Functional Wireframe DNA Strategy

## Goal
Implement the "Functional Wireframe DNA" strategy to eliminate "Generation Entropy" (quality drift) in the Post Generator. This involves prioritizing the Blueprint Image as a strict "Visual Anchor" and using functional slot mapping instead of detailed aesthetic text descriptions during generation.

## User Review Required
> [!IMPORTANT]
> This change fundamentally alters how Blueprints are "seen" by the AI. Old Blueprints will still work but might benefit from being "Re-analyzed" in the Builder to populate the new strict slot registry if they lack detailed slot logic.

## Proposed Changes

### 1. Update `types.ts`
We need to ensure `DesignPromptJson` explicitly supports the new Functional DNA concepts.
*   **Add** `description` to `ExtractedField` interface.
*   **Mark** `base_visual_dna_prompt` as optional/deprecated.
*   The `structural_rules` field will focus on *constraints* (what NOT to do) rather than *description*.

### 2. Update `components/Library.tsx` (Migration UI)
*   **Modify** the "Refresh/Upgrade" button logic.
*   **Logic**: If `jsonSpec.base_visual_dna_prompt` does NOT contain the flag string "IGNORE THIS FIELD", identify it as a "Legacy Blueprint".
*   **UI Reference**: Display a "⚠ Upgrade DNA" badge for Legacy Blueprints to prompt the user to re-analyze them with the new Functional Wireframe logic.

### 3. Update `services/geminiService.ts`

#### A. Modify `analyzeDesign` (Builder)
*   **Prompt Update**: Change the analysis prompt to focus less on "flowery aesthetic descriptions" and more on "Logic & Structure".
*   **Prompt Directive**: "Extract a functional slot registry. Identify EVERY text block. Do not analyze the 'vibe' for reproduction purposes, only for classification."
*   **Output**: Ensure `base_visual_dna_prompt` follows the new format "IGNORE THIS FIELD...".

#### B. Modify `generatePostFromReference` (Generator)
*   **Strategy Shift**: Implement the "Visual Anchor + Functional Logic" strategy.
*   **Prompt Construction**: 
    *   **IF** `referenceImageB64` is provided (Visual Anchor):
        *   Directive: "VISUAL REFERENCE: Use the provided image (Image 1) as the STRUCTURAL and AESTHETIC SOURCE OF TRUTH. Mimic its layout, spacing, and vibe exactly."
        *   **CRITICAL**: Do NOT inject `reference.base_visual_dna_prompt` or `structural_rules.aesthetic_motifs` into the prompt. This removes the "Text Noise" that causes drift.
        *   **Logic Injection**: Iterate through `content_registry` or `brief.structured_content` to create explicit replace instructions:
            *   "In Image 1, there is text at [Location described by AI]. Replace it with: '[New Text]'. Keep font/color exactly the same."

## Verification Plan

### Migration Verification
1.  **Check Library**: Open the Library page.
2.  **Verify Badges**: Ensure existing blueprints show the "Upgrade DNA" or "Refresh to Upgrade" badge.
3.  **Perform Upgrade**: Click the refresh button on a blueprint.
4.  **Verify Data**: Check the updated JSON in "Machine DNA Data" view. It should show the new "IGNORE THIS FIELD" text in the Visual DNA Prompt box.

### Generation Verification
1.  **Generate a Post**: Use the upgraded blueprint in the Generator.
2.  **Verify Fidelity**: result should match the original layout perfectly (no drift).
