import { useRef, useState } from "react";

interface RecordCryProps {
  onRecordingComplete: (blob: Blob) => void;
}

export default function RecordCry({ onRecordingComplete }: RecordCryProps) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onRecordingComplete(blob);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      recorder.start();
      setRecording(true);

      // Max 5 secondi
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
          setRecording(false);
        }
      }, 5000);
    } catch (err) {
      alert("Microfono non disponibile o permesso negato");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {recording ? (
          <button type="button" className="danger" onClick={stopRecording}>
            STOP (MAX 5s)
          </button>
        ) : (
          <button type="button" onClick={startRecording}>
            REGISTRA GRIDO
          </button>
        )}
        {audioUrl && (
          <audio controls src={audioUrl} style={{ height: 24, width: 150 }} />
        )}
      </div>
      {recording && (
        <p style={{ color: "#cc3333", fontSize: 8, marginTop: 4 }}>
          Registrazione in corso...
        </p>
      )}
    </div>
  );
}
