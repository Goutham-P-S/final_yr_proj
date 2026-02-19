function sanitizeModelName(name: string) {
  if (name === "User") return "Customer";
  return name;
}

export function normalizeBackendPlan(plan: any) {
  const normalizedEntities = plan.entities.map((entity: any) => {
    const name = sanitizeModelName(entity.name);

    const fields = [
      { name: "id", type: "Int", isId: true },
      ...(entity.fields || []).map((f: string) => ({
        name: f,
        type: "String"
      }))
    ];

    const relations = (entity.relations || []).map((rel: any) => ({
      field: rel.target.charAt(0).toLowerCase() + rel.target.slice(1),
      target: sanitizeModelName(rel.target),
      type: rel.type
    }));

    return { name, fields, relations };
  });

  return { entities: normalizedEntities };
}
