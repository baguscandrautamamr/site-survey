export function clientPointToNormalized(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): { x: number; y: number } {
  const x = (clientX - rect.left) / rect.width
  const y = (clientY - rect.top) / rect.height
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  }
}
