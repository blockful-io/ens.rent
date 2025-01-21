import { ImageResponse } from "next/og";
import React from "react";

export const runtime = "edge";
export const alt = "ENS Rent";
export const size = {
  width: 1200,
  height: 630,
} as const;

export default async function Image(): Promise<ImageResponse> {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(to bottom, #3b82f6, #1d4ed8)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
          }}
        >
          {/* ENS Logo */}
          <svg width="80" height="80" viewBox="0 0 293 293" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M147 0C65.7 0 0 65.7 0 147C0 228.3 65.7 294 147 294C228.3 294 294 228.3 294 147C294 65.7 228.3 0 147 0Z"
              fill="#FFFFFF"
            />
            <path d="M190.6 88.7H102.4V128.3H190.6V88.7Z" fill="#3B82F6" />
            <path d="M190.6 147.9H102.4V187.5H190.6V147.9Z" fill="#3B82F6" />
            <path d="M190.6 207.1H102.4V246.7H190.6V207.1Z" fill="#3B82F6" />
          </svg>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <h1
              style={{
                fontSize: "80px",
                fontWeight: "bold",
                color: "white",
                margin: 0,
                lineHeight: 1,
              }}
            >
              ENS Rent
            </h1>
            <p
              style={{
                fontSize: "32px",
                color: "rgba(255, 255, 255, 0.9)",
                margin: 0,
                marginTop: "12px",
              }}
            >
              Rent and List ENS Domains
            </p>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
