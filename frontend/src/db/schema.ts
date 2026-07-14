import { pgTable, uuid, varchar, timestamp, integer, jsonb, boolean, text } from "drizzle-orm/pg-core";

export const zones = pgTable("zones", {
  id: uuid("id").defaultRandom().primaryKey(),
  zoneId: varchar("zone_id", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  riskLevel: varchar("risk_level", { length: 20 }).notNull().default("LOW"),
  coordinates: jsonb("coordinates").$type<{ x: number; y: number; width: number; height: number }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sensors = pgTable("sensors", {
  id: uuid("id").defaultRandom().primaryKey(),
  sensorId: varchar("sensor_id", { length: 50 }).notNull().unique(),
  zoneId: varchar("zone_id", { length: 20 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  currentValue: integer("current_value").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("NORMAL"),
  lastReading: timestamp("last_reading").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const permits = pgTable("permits", {
  id: uuid("id").defaultRandom().primaryKey(),
  permitId: varchar("permit_id", { length: 50 }).notNull().unique(),
  type: varchar("type", { length: 30 }).notNull(),
  zoneId: varchar("zone_id", { length: 20 }).notNull(),
  authorizedBy: varchar("authorized_by", { length: 100 }),
  workersInvolved: jsonb("workers_involved").$type<string[]>().default([]),
  status: varchar("status", { length: 20 }).notNull().default("ACTIVE"),
  conflicts: jsonb("conflicts").$type<unknown[]>().default([]),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  alertId: varchar("alert_id", { length: 50 }).notNull().unique(),
  zoneId: varchar("zone_id", { length: 20 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  riskScore: integer("risk_score").notNull().default(0),
  acknowledged: boolean("acknowledged").notNull().default(false),
  resolved: boolean("resolved").notNull().default(false),
  triggeredRules: jsonb("triggered_rules").$type<unknown[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const incidents = pgTable("incidents", {
  id: uuid("id").defaultRandom().primaryKey(),
  incident_id: varchar("incident_id", { length: 50 }).notNull().unique(),
  date: varchar("date", { length: 20 }).notNull(),
  plant: varchar("plant", { length: 200 }).notNull(),
  zone: varchar("zone", { length: 100 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  fatalities: integer("fatalities").notNull().default(0),
  injuries: integer("injuries").notNull().default(0),
  root_causes: jsonb("root_causes").$type<string[]>().default([]),
  warning_signs_missed: jsonb("warning_signs_missed").$type<string[]>().default([]),
  regulatory_violations: jsonb("regulatory_violations").$type<string[]>().default([]),
  prevention_measures: jsonb("prevention_measures").$type<string[]>().default([]),
  description: text("description"),
  similarity: integer("similarity"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workers = pgTable("workers", {
  id: uuid("id").defaultRandom().primaryKey(),
  workerId: varchar("worker_id", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  zoneId: varchar("zone_id", { length: 20 }).notNull(),
  shift: varchar("shift", { length: 20 }).notNull(),
  role: varchar("role", { length: 100 }).notNull(),
  locationX: integer("location_x").notNull().default(0),
  locationY: integer("location_y").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
