ALTER TABLE `task` ADD `assignee_id` text REFERENCES `user`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE `task` ADD `due_date` text;
--> statement-breakpoint
ALTER TABLE `task` ADD `priority` text DEFAULT 'NONE' NOT NULL;
--> statement-breakpoint
ALTER TABLE `task` ADD `status` text DEFAULT 'TODO' NOT NULL;
--> statement-breakpoint
CREATE TABLE `task_label` (
	`color` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`organization_id` text NOT NULL,
	CONSTRAINT `fk_task_label_organization_id_organization_id_fk` FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `task_label_assignment` (
	`label_id` text NOT NULL,
	`task_id` text NOT NULL,
	CONSTRAINT `task_label_assignment_pk` PRIMARY KEY(`task_id`, `label_id`),
	CONSTRAINT `fk_task_label_assignment_label_id_task_label_id_fk` FOREIGN KEY (`label_id`) REFERENCES `task_label`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_task_label_assignment_task_id_task_id_fk` FOREIGN KEY (`task_id`) REFERENCES `task`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `task_assigneeId_idx` ON `task` (`assignee_id`);
--> statement-breakpoint
CREATE INDEX `task_organizationId_status_idx` ON `task` (`organization_id`,`status`);
--> statement-breakpoint
CREATE INDEX `task_organizationId_dueDate_idx` ON `task` (`organization_id`,`due_date`);
--> statement-breakpoint
CREATE INDEX `taskLabel_organizationId_idx` ON `task_label` (`organization_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `taskLabel_organizationId_name_unique` ON `task_label` (`organization_id`,`name`);
--> statement-breakpoint
CREATE INDEX `taskLabelAssignment_labelId_idx` ON `task_label_assignment` (`label_id`);
