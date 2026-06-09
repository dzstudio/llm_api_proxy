const JWT_SECRET = process.env.JWT_SECRET || 'llm-api-proxy-dev-secret-change-me';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';
const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_DEFAULT_USERNAME || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'welcome123';

export const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  jwt: {
    secret: JWT_SECRET,
    expiration: JWT_EXPIRATION,
  },
  admin: {
    username: DEFAULT_ADMIN_USERNAME,
    password: DEFAULT_ADMIN_PASSWORD,
  },
};
