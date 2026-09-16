import type { RequestHandler } from 'express';
import type { z } from 'zod';
import type { Database } from '../db/index.js';
import type { SafeUser } from '../types/auth.js';
import * as trial from '../services/trial-service.js';
import type {
  adminRequestReviewSchema,
  artisanTaskReviewSchema,
  assignStudentSchema,
  contractSchema,
  contractUpdateSchema,
  discoveryReviewSchema,
  discoverySchema,
  growthRequestFilter,
  growthRequestSchema,
  growthRequestUpdateSchema,
  metricSchema,
  milestoneSchema,
  studentTaskSchema,
  taskSchema,
} from '../validators/trial.js';

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
export function trialControllers(db: Database) {
  return {
    artisanRequests: action<undefined, z.output<typeof growthRequestFilter>>(({ actor, query }) =>
      trial.listGrowthRequests(db, actor.id, query),
    ),
    createRequest: action<z.output<typeof growthRequestSchema>>(
      ({ actor, body }) => trial.createGrowthRequest(db, actor.id, body),
      201,
    ),
    updateRequest: action<z.output<typeof growthRequestUpdateSchema>>(({ actor, params, body }) =>
      trial.updateGrowthRequest(db, actor.id, params.id, body),
    ),
    submitRequest: action(({ actor, params }) =>
      trial.submitGrowthRequest(db, actor.id, params.id),
    ),
    artisanRequest: action(({ actor, params }) =>
      trial.artisanGrowthRequestDetail(db, actor.id, params.id),
    ),
    artisanContract: action(({ actor, params }) =>
      trial.contractForArtisan(db, actor.id, params.id),
    ),
    artisanAcceptContract: action(({ actor, params }) =>
      trial.acceptContract(db, params.id, actor.id, 'ARTISAN'),
    ),
    artisanMetrics: action(({ actor, params }) => trial.metricsForArtisan(db, actor.id, params.id)),
    artisanTasks: action(({ actor, params }) => trial.tasksForArtisan(db, actor.id, params.id)),
    artisanAddMetric: action<z.output<typeof metricSchema>>(
      ({ actor, params, body }) => trial.addMetricForArtisan(db, actor.id, params.id, body),
      201,
    ),
    reviewTask: action<z.output<typeof artisanTaskReviewSchema>>(({ actor, params, body }) =>
      trial.artisanReviewTask(db, actor.id, params.id, body),
    ),
    assignments: action(({ actor }) => trial.studentAssignments(db, actor.id)),
    acceptAssignment: action(({ actor, params }) =>
      trial.acceptAssignment(db, actor.id, params.id),
    ),
    studentDiscovery: action(({ actor, params }) =>
      trial.getDiscoveryForStudent(db, actor.id, params.id),
    ),
    saveDiscovery: action<z.output<typeof discoverySchema>>(({ actor, params, body }) =>
      trial.saveDiscovery(db, actor.id, params.id, body),
    ),
    submitDiscovery: action<z.output<typeof discoverySchema>>(({ actor, params, body }) =>
      trial.saveDiscovery(db, actor.id, params.id, body, true),
    ),
    studentContract: action(({ actor, params }) =>
      trial.contractForStudent(db, actor.id, params.id),
    ),
    studentAcceptContract: action(({ actor, params }) =>
      trial.acceptContract(db, params.id, actor.id, 'STUDENT'),
    ),
    studentMetrics: action(({ actor, params }) => trial.metricsForStudent(db, actor.id, params.id)),
    studentTasks: action(({ actor, params }) => trial.tasksForStudent(db, actor.id, params.id)),
    studentAddMetric: action<z.output<typeof metricSchema>>(
      ({ actor, params, body }) => trial.addMetricForStudent(db, actor.id, params.id, body),
      201,
    ),
    studentTask: action<z.output<typeof studentTaskSchema>>(({ actor, params, body }) =>
      trial.submitStudentTask(db, actor.id, params.id, body),
    ),
    adminRequests: action<undefined, z.output<typeof growthRequestFilter>>(({ query }) =>
      trial.adminListGrowthRequests(db, query),
    ),
    adminRequest: action(({ params }) => trial.growthRequestDetail(db, params.id)),
    adminReviewRequest: action<z.output<typeof adminRequestReviewSchema>>(({ params, body }) =>
      trial.adminReviewGrowthRequest(db, params.id, body.status),
    ),
    candidates: action(({ params }) => trial.rankedCandidates(db, params.id)),
    assign: action<z.output<typeof assignStudentSchema>>(
      ({ actor, params, body }) =>
        trial.assignStudent(db, actor.id, params.id, body.studentProfileId),
      201,
    ),
    reviewDiscovery: action<z.output<typeof discoveryReviewSchema>>(({ params, body }) =>
      trial.reviewDiscovery(db, params.id, body.action, body.adminFeedback),
    ),
    assignmentProgress: action(({ params }) => trial.adminAssignmentProgress(db, params.id)),
    createContract: action<z.output<typeof contractSchema>>(
      ({ actor, body }) => trial.createContract(db, actor.id, body),
      201,
    ),
    updateContract: action<z.output<typeof contractUpdateSchema>>(({ params, body }) =>
      trial.updateContract(db, params.id, body),
    ),
    sendContract: action(({ params }) => trial.sendContract(db, params.id)),
    createMilestone: action<z.output<typeof milestoneSchema>>(
      ({ params, body }) => trial.createMilestone(db, params.id, body),
      201,
    ),
    createTask: action<z.output<typeof taskSchema>>(
      ({ params, body }) => trial.createTask(db, params.id, body),
      201,
    ),
    tasks: action(({ params }) => trial.tasksForContract(db, params.id)),
    adminMetrics: action(({ params }) => trial.listMetrics(db, params.id)),
  };
}
