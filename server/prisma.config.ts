import { defineConfig } from 'prisma/config';

export default defineConfig({
  sql: {
    schema: './prisma/schema.prisma',
  },
});
