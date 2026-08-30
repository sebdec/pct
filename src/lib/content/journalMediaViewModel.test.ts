import { describe, expect, it } from "vitest";

import { createValidContentModel } from "./contentFixtures.ts";
import { buildJournalPhotoViewModels } from "./journalMediaViewModel.ts";
import {
  localizedPhotoSchema,
  mediaAssetSchema,
  photoSchema,
} from "./schemas.ts";

function createSource() {
  const source = createValidContentModel();

  return {
    photos: photoSchema.array().parse(source.photos),
    mediaAssets: mediaAssetSchema.array().parse(source.mediaAssets),
    localizedPhotos: localizedPhotoSchema.array().parse(source.localizedPhotos),
  };
}

describe("journal media view models", () => {
  it("publishes a complete localized responsive asset", () => {
    const source = createSource();
    const [photo] = buildJournalPhotoViewModels({ ...source, locale: "fr" });

    expect(photo).toMatchObject({
      state: "published",
      placement: { id: "photo-001001" },
      asset: { id: "media-0123456789abcdef" },
      copy: { alt: "Le monument du terminus sud à Campo" },
    });
  });

  it("falls back to source locale copy when translation is missing", () => {
    const source = createSource();
    const [photo] = buildJournalPhotoViewModels({
      ...source,
      localizedPhotos: source.localizedPhotos.filter((copy) => copy.locale !== "en"),
      locale: "en",
    });

    expect(photo).toMatchObject({
      state: "published",
      placement: { id: "photo-001001" },
      asset: { id: "media-0123456789abcdef" },
      copy: { locale: "fr", alt: "Le monument du terminus sud à Campo" },
    });
  });

  it.each([
    ["unpublished placement", { published: false }, undefined, undefined],
    ["unpublished asset", undefined, { published: false }, undefined],
    ["missing localization", undefined, undefined, []],
    ["missing public URL", undefined, { variants: [] }, undefined],
  ])(
    "keeps an intentional placeholder for %s",
    (_label, photoOverride, assetOverride, localizedOverride) => {
      const source = createSource();
      const mediaAssets = source.mediaAssets.map((asset) => ({
        ...asset,
        ...assetOverride,
        variants:
          assetOverride && "variants" in assetOverride
            ? asset.variants.map(({ format, width, height, bytes, path }) => ({
                format,
                width,
                height,
                bytes,
                path,
              }))
            : asset.variants,
      }));
      const [photo] = buildJournalPhotoViewModels({
        photos: source.photos.map((placement) => ({
          ...placement,
          ...photoOverride,
        })),
        mediaAssets,
        localizedPhotos: localizedOverride ?? source.localizedPhotos,
        locale: "fr",
      });

      expect(photo).toMatchObject({ state: "placeholder" });
    },
  );
});
