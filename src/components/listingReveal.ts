/** Room kept above and below Pako when the listing column brings him into view. */
const REVEAL_MARGIN = 12;

/** A block in the column's content, measured from the top of that content. */
type Block = { top: number; height: number };

/** How much of the column shows, and how far its content reaches. */
type Column = { height: number; scrollHeight: number };

/**
 * The scroll position that shows the whole block with the least scrolling from
 * `from`, or the block's top when it is taller than the column, kept within the
 * column's scroll range.
 */
export function revealTop(block: Block, column: Column, from: number) {
  const room = column.height - 2 * REVEAL_MARGIN;
  const shownTop = from + REVEAL_MARGIN;
  const bottom = block.top + block.height;
  const top =
    block.height > room || block.top < shownTop
      ? block.top - REVEAL_MARGIN
      : bottom > shownTop + room
        ? bottom - room - REVEAL_MARGIN
        : from;
  return Math.min(Math.max(top, 0), column.scrollHeight - column.height);
}
