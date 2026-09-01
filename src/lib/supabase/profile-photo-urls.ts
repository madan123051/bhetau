import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PROFILE_PHOTO_BUCKET, PROFILE_PHOTO_PUBLISH_STATE } from "@/lib/profile-photo";

type ProfilePhotoRow = {
  user_id: string;
  storage_path: string;
};

type SignedPhotoRow = {
  path: string;
  signedUrl: string;
};

function reportPhotoUrlFailure(stage: "metadata" | "signing", error: unknown) {
  const details = error && typeof error === "object"
    ? error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown }
    : null;
  console.error(JSON.stringify({
    event: "profile_photo_url_failed",
    stage,
    code: details?.code,
    message: details?.message,
    details: details?.details,
    hint: details?.hint,
  }));
}

export function mapSignedProfilePhotoUrls(photos: ProfilePhotoRow[], signedPhotos: SignedPhotoRow[]) {
  const signedByPath = new Map(signedPhotos.map((photo) => [photo.path, photo.signedUrl]));
  return new Map(photos.flatMap((photo) => {
    const signedUrl = signedByPath.get(photo.storage_path);
    return signedUrl ? [[photo.user_id, signedUrl] as const] : [];
  }));
}

export async function loadSignedProfilePhotoUrls(
  supabase: SupabaseClient,
  userIds: string[],
  expiresInSeconds = 60 * 60,
) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueUserIds.length) return new Map<string, string>();

  const { data: photos, error: photoError } = await supabase
    .from("profile_photos")
    .select("user_id, storage_path")
    .in("user_id", uniqueUserIds)
    .eq("position", 1)
    .eq("moderation_state", PROFILE_PHOTO_PUBLISH_STATE);

  if (photoError) {
    reportPhotoUrlFailure("metadata", photoError);
    return new Map<string, string>();
  }

  const photoRows = (photos ?? []) as ProfilePhotoRow[];
  if (!photoRows.length) return new Map<string, string>();

  const { data: signedPhotos, error: signingError } = await supabase.storage
    .from(PROFILE_PHOTO_BUCKET)
    .createSignedUrls(photoRows.map((photo) => photo.storage_path), expiresInSeconds);

  if (signingError) {
    reportPhotoUrlFailure("signing", signingError);
    return new Map<string, string>();
  }

  return mapSignedProfilePhotoUrls(
    photoRows,
    (signedPhotos ?? []).flatMap((photo) => photo.path && photo.signedUrl ? [{ path: photo.path, signedUrl: photo.signedUrl }] : []),
  );
}
