import {
  deleteObjects,
  getSignedDownloadUrl,
  uploadObject,
} from "@vyrel/storage/object-storage";
import { Effect } from "effect";

export class ObjectStorage extends Effect.Service<ObjectStorage>()(
  "@vyrel/api/effect/infrastructure/object-storage.service/ObjectStorage",
  {
    succeed: {
      deleteMany: deleteObjects,
      signedUrl: getSignedDownloadUrl,
      upload: uploadObject,
    },
  }
) {}
