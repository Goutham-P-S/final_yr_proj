import fs from "fs";
import path from "path";

export function generateBackendScaffold(
  backendPath: string,
  prismaSchema: string
) {
  //
  // Ensure base folders
  //
  fs.mkdirSync(backendPath, { recursive: true });
  fs.mkdirSync(path.join(backendPath, "prisma"), { recursive: true });
  fs.mkdirSync(path.join(backendPath, "src"), { recursive: true });

  const srcPath = path.join(backendPath, "src");
  fs.mkdirSync(path.join(srcPath, "seed"), { recursive: true });

  const folders = [
    "routes",
    "controllers",
    "services",
    "middleware",
    "validation",
    "utils"
  ];

  folders.forEach(folder => {
    fs.mkdirSync(path.join(srcPath, folder), { recursive: true });
  });

  //
  // 1️⃣ package.json
  //
  const packageJson = {
    name: "startup-backend",
    version: "1.0.0",
    private: true,
    scripts: {
      dev: "ts-node-dev --respawn --transpile-only src/index.ts",
      build: "tsc",
      start: "node dist/index.js",
      generate: "prisma generate",
      migrate: "prisma migrate deploy"
    },
    dependencies: {
    express: "^4.18.2",
    cors: "^2.8.5",
    "@prisma/client": "^5.0.0",
    zod: "^3.22.4",
    bcryptjs: "^2.4.3",
    jsonwebtoken: "^9.0.0"
    },

    devDependencies: {
      typescript: "^5.0.0",
      prisma: "^5.0.0",
      "ts-node-dev": "^2.0.0",
      "@types/express": "^4.17.0"
    }
  };

  fs.writeFileSync(
    path.join(backendPath, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );

  //
  // 2️⃣ tsconfig.json
  //
  fs.writeFileSync(
    path.join(backendPath, "tsconfig.json"),
`{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}`
  );

  //
  // 3️⃣ Prisma schema
  //
  fs.writeFileSync(
    path.join(backendPath, "prisma", "schema.prisma"),
    prismaSchema
  );

  //
  // 4️⃣ db.ts
  //
  fs.writeFileSync(
    path.join(srcPath, "db.ts"),
`
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function connectDB() {
  try {
    await prisma.$connect();
    console.log("✅ Prisma connected");
  } catch (err) {
    console.error("❌ Prisma connection failed", err);
    process.exit(1);
  }
}
`
  );

  //
  // 5️⃣ utils/apiResponse.ts
  //
  fs.writeFileSync(
    path.join(srcPath, "utils", "apiResponse.ts"),
`
export function success(data: any, meta?: any) {
  return { success: true, data, meta };
}

export function failure(message: string) {
  return { success: false, error: { message } };
}
`
  );

  //
  // 6️⃣ utils/asyncHandler.ts
  //
  fs.writeFileSync(
    path.join(srcPath, "utils", "asyncHandler.ts"),
`
export function asyncHandler(fn: any) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
`
  );

fs.writeFileSync(
  path.join(srcPath, "utils", "jwt.ts"),
`
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

export function signToken(payload: any) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET);
}
`
);

  //
  // 7️⃣ middleware/validate.ts
  //
  fs.writeFileSync(
    path.join(srcPath, "middleware", "validate.ts"),
`
export function validate(schema: any) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    req.body = result.data;
    next();
  };
}
`
  );

  //
  // 8️⃣ middleware/errorHandler.ts
  //
  fs.writeFileSync(
    path.join(srcPath, "middleware", "errorHandler.ts"),
`
import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("❌ Error:", err);

  res.status(500).json({
    success: false,
    error: {
      message: err.message || "Internal Server Error"
    }
  });
}
`
  );
//
// src/middleware/authMiddleware.ts
//
fs.writeFileSync(
  path.join(srcPath, "middleware", "authMiddleware.ts"),
`
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

export function authenticate(req: any, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ success: false, error: { message: "Unauthorized" } });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, error: { message: "Invalid token" } });
  }
}
`
);
//
//src/middleware/roleMiddleware.ts
//
fs.writeFileSync(
  path.join(srcPath, "middleware", "roleMiddleware.ts"),
`
import { Request, Response, NextFunction } from "express";

export function authorize(...roles: string[]) {
  return (req: any, res: Response, next: NextFunction) => {
    const userRoles = req.user?.roles || [];

    const allowed = roles.some(r => userRoles.includes(r));

    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: { message: "Forbidden" }
      });
    }

    next();
  };
}
`
);
//
// src/auth/auth.service.ts
fs.mkdirSync(path.join(srcPath, "auth"), { recursive: true });

fs.writeFileSync(
  path.join(srcPath, "auth", "auth.service.ts"),
`
import { prisma } from "../db";
import bcrypt from "bcryptjs";
import { signToken } from "../utils/jwt";

export const AuthService = {

  register: async (email: string, password: string) => {
    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, password: hashed }
    });

    return user;
  },

  login: async (email: string, password: string) => {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: { include: { role: true } }
      }
    });

    if (!user) throw new Error("User not found");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error("Invalid password");

    const roles = user.roles.map(r => r.role.name);

    const token = signToken({
      id: user.id,
      email: user.email,
      roles
    });

    return { token };
  }
};
`
);
//
// src/auth/auth.controller.ts
//
fs.writeFileSync(
  path.join(srcPath, "auth", "auth.controller.ts"),
`
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { success } from "../utils/apiResponse";

export const AuthController = {

  register: async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const user = await AuthService.register(email, password);
    res.json(success(user));
  },

  login: async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(success(result));
  }
};
`
);
//
// src/auth/auth.routes.ts
//
fs.writeFileSync(
  path.join(srcPath, "auth", "auth.routes.ts"),
`
import { Router } from "express";
import { AuthController } from "./auth.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/register", asyncHandler(AuthController.register));
router.post("/login", asyncHandler(AuthController.login));

export default router;
`
);
//
//seed Admin
//
fs.writeFileSync(
  path.join(srcPath, "seed", "seedAdmin.ts"),
`
import { prisma } from "../db";
import bcrypt from "bcryptjs";

export async function seedAdmin() {
  const existingRoles = await prisma.role.count();

  if (existingRoles > 0) {
    console.log("🌱 Roles already seeded");
    return;
  }

  console.log("🌱 Seeding roles and admin user...");

  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "admin123";

  const adminRole = await prisma.role.create({
    data: { name: "admin" }
  });

  const userRole = await prisma.role.create({
    data: { name: "user" }
  });

  const hashed = await bcrypt.hash(password, 10);

  const adminUser = await prisma.user.create({
    data: {
      email,
      password: hashed
    }
  });

  await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: adminRole.id
    }
  });

  console.log("✅ Default admin created:");
  console.log("📧 Email:", email);
}
`
);


//
// 9️⃣ index.ts
//
fs.writeFileSync(
  path.join(srcPath, "index.ts"),
`
import express from "express";
import cors from "cors";
import { connectDB } from "./db";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./auth/auth.routes";
import { seedAdmin } from "./seed/seedAdmin";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);

// CRUD routes auto-mounted later

app.use(errorHandler);

async function start() {
  await connectDB();
  await seedAdmin();

  app.listen(4000, () => {
    console.log("🚀 Backend running on port 4000");
  });
}

start();
`
);


  console.log("📦 Backend scaffold generated successfully");
}
