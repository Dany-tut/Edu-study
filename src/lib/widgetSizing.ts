// Sizing for the media-style widgets (Science facts / Reactions / Memes) based on
// how many widget blocks share one carousel row. With more columns each block is
// narrower, so the photo/emoji tile shrinks and the type scales down a notch so
// the text keeps a comfortable measure instead of cramping next to a big image.

export type WidgetSizing = {
  /** multiplier applied to every font size in the widget */
  scale: number
  /** photo/emoji tile width (percentage of the block) */
  mediaWidth: string
  mediaMin: number
  mediaMax: number
  /** content padding */
  padX: number
  padY: number
  /** max lines for the body text before it truncates with an ellipsis */
  clampLines: number
  /** line-height for the body text — tighter as the block narrows */
  bodyLeading: number
}

export function getWidgetSizing(columns = 1): WidgetSizing {
  // 4-up: the block is barely wider than the photo, so the type drops a notch
  // further, the leading tightens, and the tile shrinks to leave a readable
  // measure. The smaller, tighter type fits an extra line before clamping.
  if (columns >= 4) return { scale: 0.66, mediaWidth: '26%', mediaMin: 60, mediaMax: 86, padX: 13, padY: 11, clampLines: 5, bodyLeading: 1.26 }
  if (columns >= 3) return { scale: 0.82, mediaWidth: '30%', mediaMin: 92, mediaMax: 124, padX: 16, padY: 14, clampLines: 4, bodyLeading: 1.3 }
  if (columns >= 2) return { scale: 0.9,  mediaWidth: '32%', mediaMin: 110, mediaMax: 152, padX: 18, padY: 16, clampLines: 3, bodyLeading: 1.33 }
  return { scale: 1, mediaWidth: '34%', mediaMin: 140, mediaMax: 240, padX: 22, padY: 18, clampLines: 3, bodyLeading: 1.35 }
}
