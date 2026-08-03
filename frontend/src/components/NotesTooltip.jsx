import { useRef, useState } from "react";
import { createPortal } from "react-dom";

// Hover/focus shows `preview` (an already-truncated string — truncation is
// the caller's job, this component only handles positioning/display).
// Click fires `onClick`, meant to open a full-text view. The preview box
// is rendered via a portal into document.body and positioned with JS
// (getBoundingClientRect), not plain CSS `position: absolute` — that's
// deliberate: a CSS-only version nested inside .table-card got clipped and
// covered by sibling rows, because .table-card's overflow-x: auto (needed
// for the horizontal-scroll mobile fix) forces overflow-y to clip too.
// A portal escapes that clipped ancestor entirely.
export default function NotesTooltip({ preview, onClick }) {
  const triggerRef = useRef(null);
  const [pos, setPos] = useState(null); // null = hidden

  function show() {
    const rect = triggerRef.current.getBoundingClientRect();
    const left = Math.min(rect.left, window.innerWidth - 280);
    setPos({ left: Math.max(8, left), top: rect.bottom + 6 });
  }

  function hide() {
    setPos(null);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="icon-btn"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={onClick}
      >
        📝
      </button>
      {pos &&
        createPortal(
          <div className="notes-tooltip-portal" style={{ left: pos.left, top: pos.top }}>
            {preview}
          </div>,
          document.body
        )}
    </>
  );
}
