import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";

// Mock environment variables required by components that transitively import getEnv()
process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.BETTER_AUTH_SECRET = "test-secret-32-chars-long!!";
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.SMTP_HOST = "localhost";
process.env.SMTP_PORT = "1025";
process.env.EMAIL_FROM = "test@example.com";
process.env.S3_ENDPOINT = "http://localhost:9000";
process.env.S3_REGION = "auto";
process.env.S3_ACCESS_KEY_ID = "test";
process.env.S3_SECRET_ACCESS_KEY = "test";
process.env.S3_BUCKET_PRIVATE = "test-private";
process.env.S3_BUCKET_PUBLIC = "test-public";
process.env.S3_PUBLIC_BASE_URL = "http://localhost:9000/test-public";

afterEach(() => {
	cleanup();
});
