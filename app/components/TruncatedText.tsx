"use client";

import { useState } from "react";

/**
 * Truncates text to a single line with ellipsis.
 * Tap/click to expand and see the full text.
 */
export default function TruncatedText({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={className}
      onClick={() => setExpanded(!expanded)}
      style={{
        cursor: "pointer",
        ...style,
        ...(expanded
          ? { wordBreak: "break-word" as const }
          : {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap" as const,
            }),
      }}
      title={expanded ? "Click to collapse" : text}
    >
      {text}
    </div>
  );
}
