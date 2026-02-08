export type ResourceType =
  | "youtube"
  | "vimeo"
  | "google_slides"
  | "google_drive_pdf"
  | "pdf"
  | "kahoot"
  | "typeform"
  | "generic_link";

export interface DetectedResource {
  type: ResourceType;
  label: string;
  embedUrl: string;
  sourceUrl: string;
}

const RESOURCE_LABELS: Record<ResourceType, string> = {
  youtube: "Video de YouTube",
  vimeo: "Video de Vimeo",
  google_slides: "Google Slides",
  google_drive_pdf: "PDF en Google Drive",
  pdf: "PDF",
  kahoot: "Kahoot",
  typeform: "Formulario Typeform",
  generic_link: "Enlace",
};

export function getResourceLabel(type: ResourceType): string {
  return RESOURCE_LABELS[type] || "Enlace";
}

export function detectAndResolveUrl(rawUrl: string): DetectedResource | null {
  const url = rawUrl.trim();
  if (!url) return null;

  // YouTube: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, youtube.com/embed/
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    return {
      type: "youtube",
      label: RESOURCE_LABELS.youtube,
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
      sourceUrl: url,
    };
  }

  // Vimeo: vimeo.com/VIDEO_ID
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return {
      type: "vimeo",
      label: RESOURCE_LABELS.vimeo,
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      sourceUrl: url,
    };
  }

  // Google Slides: docs.google.com/presentation/d/{ID}
  const slidesMatch = url.match(
    /docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/
  );
  if (slidesMatch) {
    return {
      type: "google_slides",
      label: RESOURCE_LABELS.google_slides,
      embedUrl: `https://docs.google.com/presentation/d/${slidesMatch[1]}/embed?start=false&loop=false`,
      sourceUrl: url,
    };
  }

  // Google Drive PDF: drive.google.com/file/d/{ID}
  const driveMatch = url.match(
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/
  );
  if (driveMatch) {
    return {
      type: "google_drive_pdf",
      label: RESOURCE_LABELS.google_drive_pdf,
      embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
      sourceUrl: url,
    };
  }

  // Typeform: typeform.com/to/XXXXX
  const typeformMatch = url.match(/typeform\.com\/to\/([a-zA-Z0-9]+)/);
  if (typeformMatch) {
    return {
      type: "typeform",
      label: RESOURCE_LABELS.typeform,
      embedUrl: url,
      sourceUrl: url,
    };
  }

  // Kahoot: kahoot.it or create.kahoot.it
  if (/kahoot\.it/i.test(url) || /create\.kahoot\.it/i.test(url)) {
    return {
      type: "kahoot",
      label: RESOURCE_LABELS.kahoot,
      embedUrl: url,
      sourceUrl: url,
    };
  }

  // PDF: URL ending in .pdf
  if (/\.pdf(\?.*)?$/i.test(url)) {
    return {
      type: "pdf",
      label: RESOURCE_LABELS.pdf,
      embedUrl: url,
      sourceUrl: url,
    };
  }

  // Generic link (any valid URL)
  try {
    new URL(url);
    return {
      type: "generic_link",
      label: RESOURCE_LABELS.generic_link,
      embedUrl: url,
      sourceUrl: url,
    };
  } catch {
    return null;
  }
}
