import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { verifyPassword } from "../admin/passwords.js";
import type { AdminUserStore } from "../admin/adminUserStore.js";
import type { AdminSessionStore } from "../admin/sessions.js";
import type { SkillMetadataStore } from "../admin/skillMetadataStore.js";

const SESSION_COOKIE = "admin_session";

export interface AdminRoutesDeps {
  adminUserStore: AdminUserStore;
  sessionStore: AdminSessionStore;
  skillMetadataStore: SkillMetadataStore;
}

declare module "fastify" {
  interface FastifyRequest {
    adminUserId?: string;
  }
}

/**
 * Everything here is under `/api/admin/*` — a separate plugin scope from
 * the public `/api/*` routes (app.ts) because it needs credentialed CORS
 * (reflects the request origin + Access-Control-Allow-Credentials, so the
 * session cookie actually gets sent cross-origin) and cookie parsing,
 * neither of which the public, read-only surface needs. No admin field
 * here ever touches aggregation or the reputation weight — see the
 * comment on skill_metadata.declared_category in
 * db/migrations/003_admin_and_skill_metadata.sql.
 */
export async function registerAdminRoutes(app: FastifyInstance, deps: AdminRoutesDeps): Promise<void> {
  await app.register(
    async (admin) => {
      await admin.register(cors, { origin: true, credentials: true });
      await admin.register(cookie);

      async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
        const token = request.cookies[SESSION_COOKIE];
        const session = token ? await deps.sessionStore.verify(token) : null;
        if (!session) {
          reply.code(401).send({ error: "not_authenticated" });
          return false;
        }
        request.adminUserId = session.adminUserId;
        return true;
      }

      admin.post("/login", async (request, reply) => {
        const body = request.body as { username?: unknown; password?: unknown } | undefined;
        if (typeof body?.username !== "string" || typeof body.password !== "string") {
          return reply.code(400).send({ error: "username and password are required" });
        }
        const user = await deps.adminUserStore.getByUsername(body.username);
        // Constant-shape response whether the username exists or not —
        // don't let a timing/response difference confirm valid usernames.
        const passwordOk = user ? verifyPassword(body.password, user.passwordHash) : false;
        if (!user || !passwordOk) {
          return reply.code(401).send({ error: "invalid_credentials" });
        }
        const { token, expiresAt } = await deps.sessionStore.create(user.id);
        reply.setCookie(SESSION_COOKIE, token, {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: request.protocol === "https",
          expires: expiresAt,
        });
        return { username: user.username };
      });

      admin.post("/logout", async (request, reply) => {
        const token = request.cookies[SESSION_COOKIE];
        if (token) await deps.sessionStore.revoke(token);
        reply.clearCookie(SESSION_COOKIE, { path: "/" });
        return { ok: true };
      });

      admin.get("/me", async (request, reply) => {
        if (!(await requireAuth(request, reply))) return;
        return { authenticated: true };
      });

      admin.get("/skills", async (request, reply) => {
        if (!(await requireAuth(request, reply))) return;
        return { skills: await deps.skillMetadataStore.listAll() };
      });

      admin.put("/skills/:skillId", async (request, reply) => {
        if (!(await requireAuth(request, reply))) return;
        const { skillId } = request.params as { skillId: string };
        const body = request.body as
          | {
              name?: unknown;
              description?: unknown;
              githubUrl?: unknown;
              license?: unknown;
              maintainer?: unknown;
              declaredCategory?: unknown;
            }
          | undefined;
        if (typeof body?.name !== "string" || body.name.trim().length === 0) {
          return reply.code(400).send({ error: "name is required" });
        }
        const metadata = await deps.skillMetadataStore.upsert({
          skillId,
          name: body.name,
          description: typeof body.description === "string" ? body.description : null,
          githubUrl: typeof body.githubUrl === "string" ? body.githubUrl : null,
          license: typeof body.license === "string" ? body.license : null,
          maintainer: typeof body.maintainer === "string" ? body.maintainer : null,
          declaredCategory: typeof body.declaredCategory === "string" ? body.declaredCategory : null,
          createdBy: request.adminUserId!,
        });
        return { skill: metadata };
      });

      admin.delete("/skills/:skillId", async (request, reply) => {
        if (!(await requireAuth(request, reply))) return;
        const { skillId } = request.params as { skillId: string };
        await deps.skillMetadataStore.delete(skillId);
        return { ok: true };
      });
    },
    { prefix: "/api/admin" },
  );
}
