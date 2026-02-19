function toSingular(name: string) {
  if (name.endsWith("sses")) return name.slice(0, -2);
  if (name.endsWith("ies")) return name.slice(0, -3) + "y";
  if (name.endsWith("s") && !name.endsWith("ss")) return name.slice(0, -1);
  return name;
}

function toCamel(str: string) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function pluralize(name: string) {
  if (name.endsWith("s")) return name.toLowerCase();
  return name.toLowerCase() + "s";
}

export function generatePrismaSchema(plan: any) {
  let schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
`;

  const modelMap = new Map<string, any>();

  //
  // 1️⃣ Normalize and register models
  //
  for (const entity of plan.entities) {
    const cleanName = toSingular(entity.name);

    modelMap.set(cleanName, {
      ...entity,
      name: cleanName,
      inverseRelations: []
    });
  }

  //
  // 2️⃣ Build inverse metadata (ONLY for many-to-one & one-to-one)
  //
  for (const entity of modelMap.values()) {
    for (const rel of entity.relations || []) {
      const targetName = toSingular(rel.target);
      const target = modelMap.get(targetName);
      if (!target) continue;

      const relationName = `${entity.name}_${targetName}`;

      if (rel.type === "many-to-one") {
        target.inverseRelations.push({
          field: pluralize(entity.name),
          type: `${entity.name}[]`,
          relationName
        });
      }

      if (rel.type === "one-to-one") {
        target.inverseRelations.push({
          field: toCamel(entity.name),
          type: `${entity.name}?`,
          relationName
        });
      }
    }
  }

  //
  // 3️⃣ Build schema
  //
  for (const entity of modelMap.values()) {
    schema += `\nmodel ${entity.name} {\n`;

    // ID
    schema += `  id Int @id @default(autoincrement())\n`;

    // Business fields
    for (const field of entity.fields || []) {
      const name = field.name.toLowerCase();

      if (name === "id") continue;
      if (name.endsWith("id")) continue;

      schema += `  ${field.name} ${field.type}\n`;
    }

    // Forward relations
    const writtenFields = new Set<string>();

// After writing ID and business fields
writtenFields.add("id");

for (const field of entity.fields || []) {
  writtenFields.add(field.name);
}

// Forward relations
for (const rel of entity.relations || []) {
  const targetName = toSingular(rel.target);
  const relationName = `${entity.name}_${targetName}`;
  const fk = toCamel(targetName) + "Id";

  if (rel.type === "many-to-one") {
    schema += `  ${fk} Int\n`;
    schema += `  ${toCamel(targetName)} ${targetName} @relation("${relationName}", fields: [${fk}], references: [id])\n`;

    writtenFields.add(fk);
    writtenFields.add(toCamel(targetName));
  }

  if (rel.type === "one-to-one") {
    schema += `  ${fk} Int @unique\n`;
    schema += `  ${toCamel(targetName)} ${targetName}? @relation("${relationName}", fields: [${fk}], references: [id])\n`;

    writtenFields.add(fk);
    writtenFields.add(toCamel(targetName));
  }
}

// Inverse relations
for (const inv of entity.inverseRelations || []) {
  if (!writtenFields.has(inv.field)) {
    schema += `  ${inv.field} ${inv.type} @relation("${inv.relationName}")\n`;
    writtenFields.add(inv.field);
  }
}

    schema += `}\n`;
  }

  return schema;
}
