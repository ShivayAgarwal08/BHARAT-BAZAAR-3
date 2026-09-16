import type { RequestHandler } from 'express';
import type { z } from 'zod';
import type { Database } from '../db/index.js';
import type { Environment } from '../config/env-schema.js';
import type { SafeUser } from '../types/auth.js';
import * as auth from '../services/auth-service.js';
import * as profiles from '../services/profile-service.js';
import * as admin from '../services/admin-service.js';
import { getSessionUser } from '../services/user-service.js';
import type { artisanRegistration, studentRegistration, loginSchema } from '../validators/auth.js';
import type {
  artisanProfileSchema,
  studentProfileSchema,
  skillSelectionSchema,
} from '../validators/profiles.js';
import type {
  assistedSchema,
  assistedFilter,
  studentFilter,
  userFilter,
  statusUpdate,
  reviewSchema,
} from '../validators/admin.js';

// This adapter keeps HTTP response mechanics out of services; routes supply validated inputs.
type HandlerInput<B, Q> = { body: B; query: Q; params: { id: string }; actor: SafeUser };
function action<B = undefined, Q = undefined>(
  work: (input: HandlerInput<B, Q>) => Promise<unknown>,
  status = 200,
): RequestHandler {
  return async (_request, response) => {
    const data = await work({ ...response.locals.validated, actor: response.locals.actor });
    response.status(status).json({ success: true, message: 'Request completed.', data });
  };
}
export function domainControllers(db: Database, config: Environment) {
  return {
    registerArtisan: action<z.output<typeof artisanRegistration>>(
      ({ body }) => auth.register(db, config, 'ARTISAN', body),
      201,
    ),
    registerStudent: action<z.output<typeof studentRegistration>>(
      ({ body }) => auth.register(db, config, 'STUDENT', body),
      201,
    ),
    login: action<z.output<typeof loginSchema>>(({ body }) =>
      auth.login(db, config, body.identifier, body.password),
    ),
    logout: action(async ({ actor }) => {
      await auth.logout(db, actor.id);
      return null;
    }),
    me: action(({ actor }) => getSessionUser(db, actor.id)),
    artisanProfile: action(({ actor }) => profiles.getArtisanProfile(db, actor.id)),
    saveArtisan: action<z.output<typeof artisanProfileSchema>>(({ actor, body }) =>
      profiles.saveArtisanProfile(db, actor.id, body),
    ),
    studentProfile: action(({ actor }) => profiles.getStudentProfile(db, actor.id)),
    saveStudent: action<z.output<typeof studentProfileSchema>>(({ actor, body }) =>
      profiles.saveStudentProfile(db, actor.id, body),
    ),
    saveSkills: action<{ skills: z.output<typeof skillSelectionSchema> }>(({ actor, body }) =>
      profiles.saveStudentProfile(db, actor.id, body),
    ),
    skills: action(() => profiles.availableSkills(db)),
    assistance: action<z.output<typeof assistedSchema>>(
      ({ body }) => admin.submitAssistance(db, body),
      201,
    ),
    overview: action(() => admin.overview(db)),
    users: action<undefined, z.output<typeof userFilter>>(({ query }) =>
      admin.listUsers(db, query),
    ),
    students: action<undefined, z.output<typeof studentFilter>>(({ query }) =>
      admin.listStudents(db, query),
    ),
    studentDetail: action(({ params }) => admin.studentDetail(db, params.id)),
    verify: action<z.output<typeof reviewSchema>>(({ params, body }) =>
      admin.reviewStudent(db, params.id, 'VERIFIED', body),
    ),
    reject: action<z.output<typeof reviewSchema>>(({ params, body }) =>
      admin.reviewStudent(db, params.id, 'REJECTED', body),
    ),
    assistanceList: action<undefined, z.output<typeof assistedFilter>>(({ query }) =>
      admin.listAssistance(db, query),
    ),
    assistanceUpdate: action<z.output<typeof statusUpdate>>(({ params, actor, body }) =>
      admin.updateAssistance(db, params.id, actor.id, body),
    ),
  };
}
