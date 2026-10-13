import { sql } from "drizzle-orm";
import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  company: text("company").notNull(), role: text("role").notNull(),
  status: text("status").notNull().default("Dilamar"), location: text("location").notNull().default(""),
  workMode: text("work_mode").notNull().default("Remote"), jobUrl: text("job_url").notNull().default(""),
  salary: text("salary").notNull().default(""), appliedDate: text("applied_date").notNull().default(""),
  nextStepDate: text("next_step_date").notNull().default(""), notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_applications_user_id").on(table.userId), index("idx_applications_status").on(table.status), index("idx_applications_next_step_date").on(table.nextStepDate)]);
