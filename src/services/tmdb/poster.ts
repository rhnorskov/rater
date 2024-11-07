import { config } from "./config";

export function getPosterUrl(
  posterPath: string,
  size: (typeof config)["images"]["poster_sizes"][number],
) {
  return `${config.images.secure_base_url}${size}${posterPath}`;
}
