import { defineRelations } from "drizzle-orm";

// biome-ignore lint/performance/noNamespaceImport: defineRelations requires a schema namespace
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  account: {
    user: r.one.user({
      from: r.account.userId,
      to: r.user.id,
    }),
  },
  invitation: {
    inviter: r.one.user({
      from: r.invitation.inviterId,
      to: r.user.id,
    }),
    organization: r.one.organization({
      from: r.invitation.organizationId,
      to: r.organization.id,
    }),
  },
  member: {
    organization: r.one.organization({
      from: r.member.organizationId,
      to: r.organization.id,
    }),
    user: r.one.user({
      from: r.member.userId,
      to: r.user.id,
    }),
  },
  organization: {
    invitations: r.many.invitation({
      from: r.organization.id,
      to: r.invitation.organizationId,
    }),
    members: r.many.member({
      from: r.organization.id,
      to: r.member.organizationId,
    }),
    tasks: r.many.task({
      from: r.organization.id,
      to: r.task.organizationId,
    }),
    taskLabels: r.many.taskLabel({
      from: r.organization.id,
      to: r.taskLabel.organizationId,
    }),
  },
  session: {
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id,
    }),
  },
  task: {
    assignee: r.one.user({
      from: r.task.assigneeId,
      to: r.user.id,
    }),
    creator: r.one.user({
      from: r.task.createdById,
      to: r.user.id,
    }),
    organization: r.one.organization({
      from: r.task.organizationId,
      to: r.organization.id,
    }),
    taskLabelAssignments: r.many.taskLabelAssignment({
      from: r.task.id,
      to: r.taskLabelAssignment.taskId,
    }),
  },
  taskLabel: {
    assignments: r.many.taskLabelAssignment({
      from: r.taskLabel.id,
      to: r.taskLabelAssignment.labelId,
    }),
    organization: r.one.organization({
      from: r.taskLabel.organizationId,
      to: r.organization.id,
    }),
  },
  taskLabelAssignment: {
    label: r.one.taskLabel({
      from: r.taskLabelAssignment.labelId,
      to: r.taskLabel.id,
    }),
    task: r.one.task({
      from: r.taskLabelAssignment.taskId,
      to: r.task.id,
    }),
  },
  user: {
    accounts: r.many.account({
      from: r.user.id,
      to: r.account.userId,
    }),
    createdTasks: r.many.task({
      from: r.user.id,
      to: r.task.createdById,
    }),
    assignedTasks: r.many.task({
      from: r.user.id,
      to: r.task.assigneeId,
    }),
    invitations: r.many.invitation({
      from: r.user.id,
      to: r.invitation.inviterId,
    }),
    members: r.many.member({
      from: r.user.id,
      to: r.member.userId,
    }),
    sessions: r.many.session({
      from: r.user.id,
      to: r.session.userId,
    }),
  },
}));
