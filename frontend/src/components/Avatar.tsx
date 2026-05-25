interface AvatarProps {
  faceImagePath: string | null;
  seed: string;
  size?: number;
}

export default function Avatar({ faceImagePath, seed, size = 48 }: AvatarProps) {
  const src = faceImagePath
    ? `/uploads/${faceImagePath}`
    : `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(seed)}`;

  return (
    <div className="avatar" style={{ width: size, height: size }}>
      <img
        src={src}
        alt="Avatar"
        onError={(e) => {
          // Fallback se il caricamento fallisce completamente
          const target = e.currentTarget;
          if (!target.dataset.fallback) {
            target.dataset.fallback = "1";
            target.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="%231a1a2e"/><text x="24" y="30" text-anchor="middle" fill="%23c9a44b" font-size="20" font-family="monospace">?</text></svg>`;
          }
        }}
      />
    </div>
  );
}
