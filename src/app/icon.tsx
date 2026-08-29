import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFF9F6" }}><div style={{ position: "relative", width: 310, height: 270, display: "flex" }}><div style={{ position: "absolute", left: 0, top: 0, width: 240, height: 180, borderRadius: "70px 70px 70px 20px", background: "linear-gradient(135deg,#FF5A72,#D72C55)" }}/><div style={{ position: "absolute", right: 0, bottom: 0, width: 240, height: 180, borderRadius: "70px 20px 70px 70px", background: "#FFF9F6", border: "28px solid #8F1837" }}/></div></div>, size);
}
