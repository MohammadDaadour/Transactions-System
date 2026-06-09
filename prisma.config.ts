import "dotenv/config";
import { defineConfig } from "@prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        seed: 'ts-node --compilerOptions {"module":"CommonJS"} ./prisma/seed.ts',
    },
    datasource: {
        url: "postgresql://postgres:123@localhost:5432/hawala"
    }
});
