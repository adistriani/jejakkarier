import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const applications = sqliteTable("applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  company: text("company").notNull(), role: text("role").notNull(),
  status: text("status").notNull().default("Dilamar"), location: text("location").notNull().default(""),
  workMode: text("work_mode").notNull().default("Remote"), jobUrl: text("job_url").notNull().default(""),
  salary: text("salary").notNull().default(""), appliedDate: text("applied_date").notNull().default(""),
  nextStepDate: text("next_step_date").notNull().default(""), notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_applications_status").on(table.status), index("idx_applications_next_step_date").on(table.nextStepDate)]);
