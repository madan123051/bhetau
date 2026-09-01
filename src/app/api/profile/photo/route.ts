import { NextResponse } from "next/server";
import { checkPrototypeRateLimit } from "@/lib/rate-limit";
import { hasSupportedProfilePhotoSignature, PROFILE_PHOTO_BUCKET, profilePhotoExtension, validateProfilePhoto } from "@/lib/profile-photo";
import { getUserScopedServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const privateResponse = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const rateLimitKey = request.headers.get("x-forwarded-for") ?? "local";
  if (!checkPrototypeRateLimit(`profile-photo:${rateLimitKey}`, 12, 60 * 60_000).allowed) {
    return NextResponse.json({ error: "Too many photo uploads. Try again later." }, { status: 429, headers: privateResponse });
  }

  const formData = await request.formData().catch(() => null);
  const photo = formData?.get("photo");
  if (!(photo instanceof File)) {
    return NextResponse.json({ error: "Choose a profile photo to upload." }, { status: 400, headers: privateResponse });
  }

  const validationError = validateProfilePhoto(photo);
  const extension = profilePhotoExtension(photo.type);
  if (validationError || !extension) {
    return NextResponse.json({ error: validationError ?? "Unsupported profile photo." }, { status: 400, headers: privateResponse });
  }

  const bytes = new Uint8Array(await photo.arrayBuffer());
  if (!hasSupportedProfilePhotoSignature(bytes, photo.type)) {
    return NextResponse.json({ error: "The selected file is not a valid image." }, { status: 400, headers: privateResponse });
  }

  const supabase = await getUserScopedServerClient(request);
  if (!supabase) {
    return NextResponse.json({ demo: true, uploaded: true }, { status: 201, headers: privateResponse });
  }

  const { data: auth } = await supabase.auth.getClaims();
  const userId = typeof auth?.claims?.sub === "string" ? auth.claims.sub : null;
  if (!userId) {
    return NextResponse.json({ error: "Sign in before uploading a profile photo." }, { status: 401, headers: privateResponse });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileError || !profile) {
    return NextResponse.json({ error: "Complete your profile before adding a photo." }, { status: 409, headers: privateResponse });
  }

  const { data: currentPhoto, error: currentPhotoError } = await supabase
    .from("profile_photos")
    .select("id, storage_path")
    .eq("user_id", userId)
    .eq("position", 1)
    .maybeSingle();
  if (currentPhotoError) {
    return NextResponse.json({ error: "Your current photo could not be checked." }, { status: 500, headers: privateResponse });
  }

  const storagePath = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_PHOTO_BUCKET)
    .upload(storagePath, bytes, {
      cacheControl: "31536000",
      contentType: photo.type,
      upsert: false,
    });
  if (uploadError) {
    return NextResponse.json({ error: "Photo upload failed. Please retry." }, { status: 400, headers: privateResponse });
  }

  const metadata = {
    storage_path: storagePath,
    derivative_path: null,
    bytes: photo.size,
    mime_type: photo.type,
    moderation_state: "pending",
  };
  const metadataResult = currentPhoto
    ? await supabase.from("profile_photos").update(metadata).eq("id", currentPhoto.id).select("id").single()
    : await supabase.from("profile_photos").insert({
      ...metadata,
      user_id: userId,
      profile_id: profile.id,
      position: 1,
    }).select("id").single();

  if (metadataResult.error) {
    await supabase.storage.from(PROFILE_PHOTO_BUCKET).remove([storagePath]);
    return NextResponse.json({ error: "Photo metadata could not be saved." }, { status: 400, headers: privateResponse });
  }

  if (currentPhoto?.storage_path && currentPhoto.storage_path !== storagePath) {
    await supabase.storage.from(PROFILE_PHOTO_BUCKET).remove([currentPhoto.storage_path]);
  }

  const { data: signedPhoto, error: signedPhotoError } = await supabase.storage
    .from(PROFILE_PHOTO_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  return NextResponse.json({
    uploaded: true,
    thumbnailUrl: signedPhotoError ? null : signedPhoto.signedUrl,
    moderationState: "pending",
  }, { status: 201, headers: privateResponse });
}
