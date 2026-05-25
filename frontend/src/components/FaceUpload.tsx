import { useState, useRef } from "react";

interface FaceUploadProps {
  onFile: (file: File | null) => void;
}

export default function FaceUpload({ onFile }: FaceUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validazione lato client
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("Solo JPEG e PNG sono accettati");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Il file non può superare 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    onFile(file);
  };

  return (
    <div>
      <button type="button" onClick={() => fileRef.current?.click()} style={{ marginBottom: 4 }}>
        CARICA VOLTO
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFile}
        style={{ display: "none" }}
      />
      {preview && (
        <div className="avatar" style={{ width: 64, height: 64, marginTop: 4 }}>
          <img src={preview} alt="Anteprima volto" />
        </div>
      )}
    </div>
  );
}
