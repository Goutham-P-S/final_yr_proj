export function generatePrismaSchema(plan: any) {
  let schema = `
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
`;

  for (const entity of plan.entities) {
    schema += `\nmodel ${entity.name} {\n`;

    // Fields
    for (const field of entity.fields) {
      if (field.isId) {
        schema += `  ${field.name} ${field.type} @id @default(autoincrement())\n`;
      } else if (field.isUnique) {
        schema += `  ${field.name} ${field.type} @unique\n`;
      } else {
        schema += `  ${field.name} ${field.type}\n`;
      }
    }

    // Relations
    for (const rel of entity.relations) {
      if (rel.type === "many-to-one") {
        schema += `  ${rel.field} ${rel.target} @relation(fields: [${rel.foreignKey}], references: [id])\n`;
      }

      if (rel.type === "one-to-many") {
        schema += `  ${rel.field} ${rel.target}[]\n`;
      }

      if (rel.type === "one-to-one") {
        schema += `  ${rel.field} ${rel.target}? @relation(fields: [${rel.foreignKey}], references: [id])\n`;
      }
    }

    schema += `}\n`;
  }

  return schema;
}
