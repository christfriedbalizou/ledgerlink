export function buildOidcConfig({ port }) {
  return {
    authRequired: false,
    auth0Logout: false,
    issuerBaseURL: process.env.OIDC_ISSUER_URL,
    baseURL: `https://laughing-lamp-6pqrw4p447h5vqr-3000.app.github.dev`,
    clientID: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    secret: process.env.SESSION_SECRET,
    authorizationParams: { response_type: "code", scope: "openid email profile" },
    routes: { login: false, callback: "/auth/callback" },
  };
}

export default buildOidcConfig;
