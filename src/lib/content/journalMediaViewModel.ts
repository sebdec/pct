import type { LocalizedPhoto, MediaAsset, Photo } from "./schemas.ts";
import { sourceLocale } from "./locales.ts";

export interface PublishedJournalPhotoViewModel {
  state: "published";
  placement: Photo;
  asset: MediaAsset;
  copy: LocalizedPhoto;
}

export interface PlaceholderJournalPhotoViewModel {
  state: "placeholder";
  placement: Photo;
  asset: MediaAsset | null;
  copy: LocalizedPhoto | null;
}

export type JournalPhotoViewModel =
  PublishedJournalPhotoViewModel | PlaceholderJournalPhotoViewModel;

function hasCompletePublicVariants(asset: MediaAsset): boolean {
  return asset.variants.every(({ url }) => Boolean(url));
}

export function buildJournalPhotoViewModels({
  photos,
  mediaAssets,
  localizedPhotos,
  locale,
}: {
  photos: readonly Photo[];
  mediaAssets: readonly MediaAsset[];
  localizedPhotos: readonly LocalizedPhoto[];
  locale: LocalizedPhoto["locale"];
}): JournalPhotoViewModel[] {
  const assetByKey = new Map(
    mediaAssets.map((asset) => [asset.assetKey, asset]),
  );
  const copyByPhotoId = new Map(
    localizedPhotos
      .filter((copy) => copy.locale === locale)
      .map((copy) => [copy.photoId, copy]),
  );
  const sourceCopyByPhotoId = new Map(
    localizedPhotos
      .filter((copy) => copy.locale === sourceLocale)
      .map((copy) => [copy.photoId, copy]),
  );

  return photos.map((placement) => {
    const asset = assetByKey.get(placement.assetKey) ?? null;
    const copy =
      copyByPhotoId.get(placement.id) ??
      sourceCopyByPhotoId.get(placement.id) ??
      null;

    if (
      placement.published &&
      asset?.published &&
      copy &&
      hasCompletePublicVariants(asset)
    ) {
      return { state: "published", placement, asset, copy };
    }

    return { state: "placeholder", placement, asset, copy };
  });
}
