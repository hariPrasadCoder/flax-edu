import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: '#473FCF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 12 12" fill="none">
          <path d="M6 1L10.5 9H1.5L6 1Z" fill="white" fillOpacity="0.9" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
