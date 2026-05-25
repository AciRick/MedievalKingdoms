interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "CONFERMA",
  cancelLabel = "ANNULLA",
}: ConfirmDialogProps) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{title}</h2>
        <p style={{ fontSize: 8, textAlign: "center", marginBottom: 12 }}>{message}</p>
        <div className="modal-actions">
          <button onClick={onCancel}>{cancelLabel}</button>
          <button className="danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
