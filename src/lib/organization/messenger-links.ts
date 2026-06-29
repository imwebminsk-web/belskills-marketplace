export type MessengerKey = "telegram" | "viber" | "whatsapp";

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/** Builds a clickable href for a messenger field (URL, @handle, or phone). */
export function messengerContactHref(
  key: MessengerKey,
  raw: string,
): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (isHttpUrl(value)) {
    return value;
  }

  if (key === "telegram") {
    const handle = value.replace(/^@/, "").replace(/^t\.me\//i, "");
    return handle ? `https://t.me/${handle}` : null;
  }

  if (key === "whatsapp") {
    const digits = value.replace(/\D/g, "");
    return digits ? `https://wa.me/${digits}` : null;
  }

  if (key === "viber") {
    const digits = value.replace(/\D/g, "");
    return digits ? `viber://chat?number=%2B${digits}` : null;
  }

  return null;
}

export function websiteContactHref(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (isHttpUrl(value)) return value;
  return `https://${value}`;
}
