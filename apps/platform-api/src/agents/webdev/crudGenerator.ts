import fs from "fs";
import path from "path";

function mapPrismaTypeToZod(type: string) {
  switch (type) {
    case "String":
      return "z.string()";
    case "Int":
      return "z.number().int()";
    case "Boolean":
      return "z.boolean()";
    case "Float":
      return "z.number()";
    case "DateTime":
      return "z.string().datetime()";
    case "Json":
      return "z.any()";
    default:
      return "z.any()";
  }
}

export function generateCrudForEntity(
  backendPath: string,
  entity: any
) {
  const model = entity.name;
  const lower = model.toLowerCase();
  const srcPath = path.join(backendPath, "src");

  const servicesDir = path.join(srcPath, "services");
  const controllersDir = path.join(srcPath, "controllers");
  const routesDir = path.join(srcPath, "routes");
  const validationDir = path.join(srcPath, "validation");

  //
  // 🧠 Build Zod schema
  //
  const zodFields = entity.fields
    .filter((f: any) => !f.isId)
    .map((f: any) => {
      const zodType = mapPrismaTypeToZod(f.type);
      const optional = f.isOptional ? ".optional()" : "";
      return `  ${f.name}: ${zodType}${optional},`;
    })
    .join("\n");

  fs.writeFileSync(
    path.join(validationDir, `${lower}.schema.ts`),
`
import { z } from "zod";

export const create${model}Schema = z.object({
${zodFields}
});

export const update${model}Schema = create${model}Schema.partial();
`
  );

  //
  // 🧠 Detect relation includes
  //
  const includeRelations =
    entity.relations && entity.relations.length > 0
      ? `include: { ${entity.relations
          .map((r: any) => `${r.field}: true`)
          .join(", ")} }`
      : "";

  //
  // 🧠 Service Layer
  //
  fs.writeFileSync(
    path.join(servicesDir, `${lower}.service.ts`),
`
import { prisma } from "../db";

export const ${model}Service = {

  create: (data: any) =>
    prisma.${lower}.create({
      data,
      ${includeRelations}
    }),

  findAll: async (query: any) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;

    const data = await prisma.${lower}.findMany({
      skip: (page - 1) * limit,
      take: limit,
      ${includeRelations}
    });

    const total = await prisma.${lower}.count();

    return {
      data,
      meta: {
        page,
        limit,
        total
      }
    };
  },

  findOne: (id: number) =>
    prisma.${lower}.findUnique({
      where: { id },
      ${includeRelations}
    }),

  update: (id: number, data: any) =>
    prisma.${lower}.update({
      where: { id },
      data,
      ${includeRelations}
    }),

  delete: (id: number) =>
    prisma.${lower}.delete({
      where: { id }
    })
};
`
  );

  //
  // 🧠 Controller
  //
  fs.writeFileSync(
    path.join(controllersDir, `${lower}.controller.ts`),
`
import { Request, Response } from "express";
import { ${model}Service } from "../services/${lower}.service";
import { success } from "../utils/apiResponse";

export const ${model}Controller = {

  create: async (req: Request, res: Response) => {
    const result = await ${model}Service.create(req.body);
    res.json(success(result));
  },

  findAll: async (req: Request, res: Response) => {
    const result = await ${model}Service.findAll(req.query);
    res.json(success(result.data, result.meta));
  },

  findOne: async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await ${model}Service.findOne(id);
    res.json(success(result));
  },

  update: async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await ${model}Service.update(id, req.body);
    res.json(success(result));
  },

  delete: async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await ${model}Service.delete(id);
    res.json(success(result));
  }
};
`
  );

  //
  // 🧠 Routes
  //
  fs.writeFileSync(
    path.join(routesDir, `${lower}.routes.ts`),
`
import { Router } from "express";
import { ${model}Controller } from "../controllers/${lower}.controller";
import { validate } from "../middleware/validate";
import {
  create${model}Schema,
  update${model}Schema
} from "../validation/${lower}.schema";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/roleMiddleware";
const router = Router();

router.post(
  "/",
  authenticate,
  authorize("admin"), // remove if you want open creation
  validate(create${model}Schema),
  asyncHandler(${model}Controller.create)
);

router.get(
  "/",
  authenticate, // remove if public
  asyncHandler(${model}Controller.findAll)
);

router.get(
  "/:id",
  authenticate, // remove if public
  asyncHandler(${model}Controller.findOne)
);

router.put(
  "/:id",
  authenticate,
  validate(update${model}Schema),
  asyncHandler(${model}Controller.update)
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  asyncHandler(${model}Controller.delete)
);

export default router;
`
  );

  //
  // 🧠 Auto-mount route in index.ts
  //
  const indexPath = path.join(srcPath, "index.ts");
  let indexContent = fs.readFileSync(indexPath, "utf-8");

  const importStatement = `import ${lower}Routes from "./routes/${lower}.routes";`;
  const useStatement = `app.use("/api/${lower}", ${lower}Routes);`;

  if (!indexContent.includes(importStatement)) {
    indexContent =
      importStatement +
      "\n" +
      indexContent.replace(
        "// Routes auto-mounted later by CRUD generator",
        `${useStatement}\n// Routes auto-mounted later by CRUD generator`
      );

    fs.writeFileSync(indexPath, indexContent);
  }

  console.log(`✅ CRUD generated for ${model}`);
}
