import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
          borderRadius: 8,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="3.5" r="2" fill="white" />
          <circle cx="3.5" cy="14.5" r="2" fill="white" />
          <circle cx="14.5" cy="14.5" r="2" fill="white" />
          <line x1="9" y1="5.5" x2="3.5" y2="12.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="9" y1="5.5" x2="14.5" y2="12.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
