import { describe, expect, it } from "vitest";
import { mapSignedProfilePhotoUrls } from "./profile-photo-urls";

describe("profile photo URL mapping", () => {
  it("maps each approved photo owner to the matching signed URL", () => {
    const urls = mapSignedProfilePhotoUrls(
      [
        { user_id: "user-a", storage_path: "user-a/photo.webp" },
        { user_id: "user-b", storage_path: "user-b/photo.jpg" },
      ],
      [
        { path: "user-b/photo.jpg", signedUrl: "https://storage.test/user-b" },
        { path: "user-a/photo.webp", signedUrl: "https://storage.test/user-a" },
      ],
    );

    expect(urls.get("user-a")).toBe("https://storage.test/user-a");
    expect(urls.get("user-b")).toBe("https://storage.test/user-b");
  });

  it("does not attach an unrelated or failed signed URL", () => {
    const urls = mapSignedProfilePhotoUrls(
      [{ user_id: "user-a", storage_path: "user-a/photo.webp" }],
      [{ path: "someone-else/photo.webp", signedUrl: "https://storage.test/other" }],
    );

    expect(urls.has("user-a")).toBe(false);
  });
});
