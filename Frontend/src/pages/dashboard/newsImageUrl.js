import { API_BASE_URL } from "../../lib/api";

export const newsImageUrl = (image) => {
  if (!image || typeof image !== "string") return "";
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith("/") && !image.startsWith("//")) return image;
  return `${API_BASE_URL}/api/assets/uploads/${encodeURIComponent(image)}`;
};
