export interface PublicContactInfo {
  slug: string;
  brandName?: string | { bn: string; en: string };
  phone?: string;
  messengerPageUsername?: string;
}

// Fallback registry for public contacts used in error boundaries
const KNOWN_CONTACTS: Record<string, PublicContactInfo> = {
  "demo-brand": {
    slug: "demo-brand",
    brandName: {
      bn: "বুনন",
      en: "Bunon Atelier",
    },
    phone: "01711002233",
    messengerPageUsername: "bunonatelier.bd",
  },
};

export function getPublicContactBySlug(slug?: string): PublicContactInfo | null {
  if (!slug) return null;
  return KNOWN_CONTACTS[slug] || null;
}
