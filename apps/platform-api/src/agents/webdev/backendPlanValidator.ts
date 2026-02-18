const ALLOWED_TYPES = [
  "String",
  "Int",
  "Boolean",
  "Float",
  "DateTime",
  "Json"
];

const ALLOWED_REL_TYPES = [
  "one-to-one",
  "one-to-many",
  "many-to-one"
];

export function validateBackendPlan(plan: any) {
  if (!Array.isArray(plan.entities)) {
    throw new Error("Missing entities");
  }

  const entityMap = new Map<string, any>();

  for (const entity of plan.entities) {
    if (!entity.name) throw new Error("Entity missing name");

    entityMap.set(entity.name, entity);

    if (!Array.isArray(entity.fields)) {
      throw new Error(`${entity.name} missing fields`);
    }

    let hasId = false;

    for (const field of entity.fields) {
      if (!ALLOWED_TYPES.includes(field.type)) {
        throw new Error(
          `Invalid type ${field.type} in ${entity.name}`
        );
      }

      if (field.isId) hasId = true;
    }

    if (!hasId) {
      throw new Error(`${entity.name} missing id field`);
    }

    if (!Array.isArray(entity.relations)) {
      throw new Error(`${entity.name} missing relations array`);
    }
  }

  // Validate relations
  for (const entity of plan.entities) {
    for (const rel of entity.relations) {

      if (!ALLOWED_REL_TYPES.includes(rel.type)) {
        throw new Error(
          `Invalid relation type ${rel.type}`
        );
      }

      if (!entityMap.has(rel.target)) {
        throw new Error(
          `Relation target ${rel.target} does not exist`
        );
      }

      if (
        rel.type === "many-to-one" ||
        rel.type === "one-to-one"
      ) {
        if (!rel.foreignKey) {
          throw new Error(
            `Missing foreignKey in relation of ${entity.name}`
          );
        }
      }
    }
  }

  return true;
}
