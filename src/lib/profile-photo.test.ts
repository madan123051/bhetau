import { describe, expect, it } from "vitest";
import { hasSupportedProfilePhotoSignature, PROFILE_PHOTO_MAX_BYTES, profilePhotoExtension, validateProfilePhoto } from "./profile-photo";

describe("profile photo validation", () => {
  it("accepts a small supported portrait", () => {
    expect(validateProfilePhoto({ type: "image/webp", size: 120_000 })).toBeNull();
    expect(profilePhotoExtension("image/jpeg")).toBe("jpg");
  });

  it("rejects oversized and unsupported files", () => {
    expect(validateProfilePhoto({ type: "image/png", size: PROFILE_PHOTO_MAX_BYTES + 1 })).toMatch(/under 5 MB/);
    expect(validateProfilePhoto({ type: "image/gif", size: 12_000 })).toMatch(/JPEG, PNG, or WebP/);
    expect(profilePhotoExtension("image/gif")).toBeNull();
  });

  it("checks the actual file signature instead of trusting the MIME label", () => {
    expect(hasSupportedProfilePhotoSignature(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg")).toBe(true);
    expect(hasSupportedProfilePhotoSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png")).toBe(true);
    expect(hasSupportedProfilePhotoSignature(new TextEncoder().encode("RIFF0000WEBP"), "image/webp")).toBe(true);
    expect(hasSupportedProfilePhotoSignature(new TextEncoder().encode("not-an-image"), "image/png")).toBe(false);
  });
});
