

## Fix: Drag Jitter in InteractiveTextOverlay

**Problem**: The CSS transform order `rotate() translate()` causes jitter because the translation is applied in the rotated coordinate space, making diagonal movements when the element is rotated.

**Fix**: Swap the order to `translate() rotate()` on line 109 so the translation happens in screen space before rotation is applied.

**Change**:
- **File**: `src/components/ui/InteractiveTextOverlay.tsx`, line 109
- **From**: `` `${baseTransform} rotate(${rotation}deg) translate(${dx}px, ${dy}px)` ``
- **To**: `` `${baseTransform} translate(${dx}px, ${dy}px) rotate(${rotation}deg)` ``

This ensures the drag offset is computed in unrotated screen coordinates, eliminating the jitter caused by translating in a rotated frame.

