import {
  ApolloClient,
  registerApolloClient,
} from "@apollo/client-integration-nextjs";
import { cookies } from "next/headers";

import { createApolloCache } from "./cache";
import { defaultApolloOptions, devtoolsOptions } from "./defaults";
import { createApolloLink } from "./links";

function makeRscClient(): ApolloClient {
  return new ApolloClient({
    cache: createApolloCache(),
    defaultOptions: defaultApolloOptions,
    devtools: devtoolsOptions,
    link: createApolloLink({
      getExtraHeaders: async () => {
        const cookieStore = await cookies();
        return {
          cookie: cookieStore.toString(),
        };
      },
    }),
  });
}

export const { PreloadQuery } = registerApolloClient(makeRscClient);
