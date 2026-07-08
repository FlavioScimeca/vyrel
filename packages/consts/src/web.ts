import { env } from "@vyrel/env/web";

export const TOKEN_GQL = "vyrel_gql_jwt";
export const TOKEN_GQL_LS_KEY = "vyrel_auth_jwt";

export const GRAPHQL_URI = `${env.NEXT_PUBLIC_SERVER_URL.replace(/\/$/, "")}/api/graphql`;
