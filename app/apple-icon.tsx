import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
        }}
      >
        <div
          style={{
            width: 80,
            height: 104,
            border: "14px solid white",
            borderRadius: 10,
            transform: "rotate(-8deg)",
          }}
        />
      </div>
    ),
    size
  );
}
