import { Layer } from "effect";

import { Database } from "./database.service";
import { ObjectStorage } from "./object-storage.service";

export const ApiInfrastructureLive = Layer.mergeAll(
  Database.Default,
  ObjectStorage.Default
);
