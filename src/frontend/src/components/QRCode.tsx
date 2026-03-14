// Simple SVG QR code placeholder
export default function QRCode({
  value,
  size = 120,
}: { value: string; size?: number }) {
  const cells = 21;
  const cell = size / cells;
  const hash = value.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const grid: boolean[][] = Array.from({ length: cells }, (_, r) =>
    Array.from({ length: cells }, (_, c) => {
      if (
        (r < 7 && c < 7) ||
        (r < 7 && c >= cells - 7) ||
        (r >= cells - 7 && c < 7)
      )
        return true;
      return (hash * (r + 1) * (c + 1)) % 3 === 0;
    }),
  );
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ background: "white" }}
      role="img"
      aria-label={`QR Code: ${value}`}
    >
      {grid.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect
              key={`cell-${r * cells + c}`}
              x={c * cell}
              y={r * cell}
              width={cell}
              height={cell}
              fill="black"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
