import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "bhetau — Meet someone worth meeting",
    short_name: "bhetau",
    description: "Personality-first dating and connection for Nepal.",
    start_url: "/discover",
    display: "standalone",
    background_color: "#FFF9F6",
    theme_color: "#E83C5B",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
