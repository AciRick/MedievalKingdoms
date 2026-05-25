import multer from "multer";
import path from "path";
import { env } from "../env";

const facesDir = path.resolve(env.UPLOADS_DIR, "faces");
const criesDir = path.resolve(env.UPLOADS_DIR, "cries");

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === "face") {
      cb(null, facesDir);
    } else if (file.fieldname === "cry") {
      cb(null, criesDir);
    } else {
      cb(new Error("Campo file non riconosciuto"), "");
    }
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (file.fieldname === "face") {
    const allowed = ["image/jpeg", "image/png"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Solo JPEG e PNG sono accettati per il volto"));
    }
  } else if (file.fieldname === "cry") {
    const allowed = ["audio/webm", "audio/ogg", "audio/opus", "audio/mpeg"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Solo audio WebM/Ogg/Opus sono accettati per il grido"));
    }
  } else {
    cb(new Error("Campo file non riconosciuto"));
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB max per volto
  },
});

export const uploadCry = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1 * 1024 * 1024, // 1 MB max per grido
  },
});
