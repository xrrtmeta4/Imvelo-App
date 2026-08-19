import express from 'express';

export const app = express();

// Capture the raw body so webhook routes can verify HMAC signatures.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf.toString('utf8');
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

export default app;
