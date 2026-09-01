export const PROFILE_PHOTO_BUCKET = "profile-photos";
export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

type ProfilePhotoCandidate = {
  size: number;
  type: string;
};

export function validateProfilePhoto(candidate: ProfilePhotoCandidate) {
  if (!PROFILE_PHOTO_TYPES.includes(candidate.type as (typeof PROFILE_PHOTO_TYPES)[number])) {
    return "Choose a JPEG, PNG, or WebP image.";
  }
  if (candidate.size <= 0) return "That image is empty. Choose another photo.";
  if (candidate.size > PROFILE_PHOTO_MAX_BYTES) return "Keep your profile photo under 5 MB.";
  return null;
}

export function profilePhotoExtension(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return null;
}

export function hasSupportedProfilePhotoSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
  }
  if (mimeType === "image/webp") {
    return bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}
