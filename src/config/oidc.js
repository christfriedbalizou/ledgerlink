export function buildOidcConfig({ port, nodeEnv }) {
  return {
    authRequired: false,
    auth0Logout: false,
    issuerBaseURL: process.env.OIDC_ISSUER_URL,
    baseURL: `http://localhost:${port}`,
    clientID: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    secret: process.env.SESSION_SECRET,
    authorizationParams: { response_type: "code", scope: "openid email profile" },
    routes: { login: false, callback: "/auth/callback" },
  };
}

export default buildOidcConfig;
