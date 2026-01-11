import { InferInsertModel, InferSelectModel, relations, sql } from "drizzle-orm";

import {
  bigint,
  boolean,
  date,
  index,
  integer,
  json,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  real,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const documentStatusEnum = pgEnum("document_status", ["draft", "published", "archived"]);

export const userFilterPreferences = pgTable(
  "user_filter_preferences",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    name: varchar("name", { length: 255 }), // Filter name
    pageKey: varchar("page_key", { length: 255 }).notNull(), // Identifies which page the filters are for
    filters: json("filters").notNull(), // Store filters as JSON
    isShared: boolean("is_shared").default(false), // Whether this filter is shared with other admins
    isPinned: boolean("is_pinned").default(false), // Whether this filter is pinned
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    // Create unique index on userId, name, and pageKey
    // (allows multiple saved filters per user per page as long as names are unique)
    userPageNameIdx: uniqueIndex(
      "user_filter_preferences_user_page_name_idx"
    ).on(t.userId, t.pageKey, t.name),
    // Add index for faster lookups of shared filters
    sharedFiltersIdx: index("shared_filters_idx").on(t.isShared),
    // Add index for page key to quickly find all filters for a page
    pageKeyIdx: index("page_key_idx").on(t.pageKey),
    // Add index for pinned filters
    pinnedFiltersIdx: index("pinned_filters_idx").on(t.isPinned),
  })
);

export type UserFilterPreference = typeof userFilterPreferences.$inferSelect;
export type NewUserFilterPreference = typeof userFilterPreferences.$inferInsert;

export const settings = pgTable(
  "settings",
  {
    id: serial("id").primaryKey(),
    key: varchar("key", { length: 255 }).unique(),
    value: text("value"),
  },
  (t) => ({
    keyIdx: index("settings_key_idx").on(t.key),
  })
);

export const roleEnum = pgEnum("role", ["admin", "provider"]);
export const subRoleEnum = pgEnum("subRole", [
  "doctor",
  "superAdmin",
  "careTeam",
  "admin",
]);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).unique().notNull(),
    calComEmail: varchar("cal_com_email", { length: 255 }),
    name: varchar("name", { length: 255 }), //full text index
    hashedPassword: varchar("hashed_password", { length: 255 }),
    avatar: varchar("avatar", { length: 255 }),
    role: roleEnum("role"), //index
    subRole: subRoleEnum("sub_role"),
    isActive: boolean("is_active").default(true), //index
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    emailIdx: index("user_email_idx").on(t.email),
    roleIdx: uniqueIndex("user_id_idx").on(t.id, t.role),
    subRoleIdx: index("user_sub_role_idx").on(t.subRole),
    nameSearchIndex: index("title_search_index").using(
      "gin",
      sql`to_tsvector('english', ${t.name})`
    ),
    isActiveIdx: index("user_is_active_idx").on(t.isActive),
  })
);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const emailVerificationCodes = pgTable(
  "email_verification_codes",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 21 }),
    email: varchar("email", { length: 255 }).notNull(),
    code: varchar("code", { length: 8 }).notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => ({
    userIdx: index("verification_code_user_idx").on(t.userId),
    emailIdx: index("verification_code_email_idx").on(t.email),
  })
);

export const adminAnalytics = pgTable("admin_analytics", {
  id: serial("id").primaryKey(),
  date: varchar("date", { length: 255 }).notNull(),

  // Revenue and Payment Fields
  grossRevenue: numeric("gross_revenue", { precision: 10, scale: 2 })
    .$type<string | number>()
    .notNull(),
  netRevenue: numeric("net_revenue", { precision: 10, scale: 2 })
    .$type<string | number>()
    .notNull(),
  totalPayments: numeric("total_payments", { precision: 10, scale: 2 })
    .$type<string | number>()
    .notNull(),
  stripeFees: numeric("stripe_fees", { precision: 10, scale: 2 })
    .$type<string | number>()
    .notNull(),

  // Ad Spend Fields
  googleAdSpend: numeric("google_ad_spend", { precision: 10, scale: 2 })
    .$type<string | number>()
    .default("0"),
  metaAdSpend: numeric("meta_ad_spend", { precision: 10, scale: 2 })
    .$type<string | number>()
    .default("0"),
  bingAdSpend: numeric("bing_ad_spend", { precision: 10, scale: 2 })
    .$type<string | number>()
    .default("0"),

  // Cost and Fees Fields
  costZenith: numeric("cost_zenith", { precision: 10, scale: 2 })
    .$type<string | number>()
    .default("0"),
  supportAmount: numeric("support_amount", { precision: 10, scale: 2 })
    .$type<string | number>()
    .default("0"),
  providerPerConsultFees: numeric("provider_per_consult_fees", {
    precision: 10,
    scale: 2,
  })
    .$type<string | number>()
    .default("0"),
  providerFlatFees: numeric("provider_flat_fees", { precision: 10, scale: 2 })
    .$type<string | number>()
    .default("0"),

  // Profit and Metrics Fields
  grossProfit: numeric("gross_profit", { precision: 10, scale: 2 })
    .$type<string | number>()
    .default("0"),
  roas: numeric("roas", { precision: 10, scale: 2 })
    .$type<string | number>()
    .default("0"),
  cpaAmount: numeric("cpa_amount", { precision: 10, scale: 2 })
    .$type<string | number>()
    .default("0"),
  clicks: numeric("clicks", { precision: 10, scale: 2 })
    .$type<string | number>()
    .default("0"),
  conversionRate: numeric("conversion_rate", { precision: 10, scale: 2 })
    .$type<string | number>()
    .default("0"),
  intakeSubmits: numeric("intake_submits", { precision: 10, scale: 2 })
    .$type<string | number>()
    .default("0"),
  intakeConversionRate: numeric("intake_conversion_rate", {
    precision: 10,
    scale: 2,
  })
    .$type<string | number>()
    .default("0"),
  miscellaneousAmount: numeric("miscellaneous_amount", {
    precision: 10,
    scale: 2,
  })
    .$type<string | number>()
    .default("0"),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(), //index
  },
  (t) => ({
    userIdx: index("session_user_idx").on(t.userId),
    expiresAtIdx: index("session_expires_at_idx").on(t.expiresAt),
  })
);

export const brands = pgTable(
  "brands",
  {
    id: serial("id").primaryKey(),
    brandName: varchar("brand_name", { length: 255 }).notNull(),
    brandCode: varchar("brand_code", { length: 255 }).default("parkingmd"),
    url: varchar("url", { length: 255 }),
    webhookUrl: varchar("webhook_url", { length: 255 }),
    emailLayout: text("email_layout"),
    smtpHost: varchar("smtp_host", { length: 255 }),
    smtpPort: integer("smtp_port"),
    smtpUser: varchar("smtp_user", { length: 255 }),
    smtpPassword: varchar("smtp_password", { length: 255 }),
    smtpFromEmail: varchar("smtp_from_email", { length: 255 }),
    checkoutLink: varchar("checkout_link", { length: 255 }),
    twilioAccountSid: varchar("twilio_account_sid", { length: 255 }),
    twilioAuthToken: varchar("twilio_auth_token", { length: 255 }),
    twilioFromNumber: varchar("twilio_from_number", { length: 255 }),
    twilioTwimlAppSid: varchar("twilio_twiml_app_sid", { length: 255 }),
  },
  (t) => ({
    brandCodeIdx: index("brand_code_idx").on(t.brandCode),
  })
);

// like create full text index  or else it will be regular index
export const patients = pgTable(
  "patients",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 255 }),

    brandCode: varchar("brand_code", { length: 255 }).default("parkingmd"),

    firstName: varchar("first_name", { length: 255 }).notNull(),
    middleName: varchar("middle_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),
    email: varchar("email", { length: 255 }).notNull(),

    password: varchar("password", { length: 255 }),
    phone: varchar("phone", { length: 255 }),
    alternate_phone: varchar("alternate_phone", { length: 255 }),

    address: varchar("address", { length: 255 }),
    apartment: varchar("apartment", { length: 255 }),
    city: varchar("city", { length: 255 }),
    county: varchar("county", { length: 255 }),
    state: varchar("state", { length: 255 }),
    country: varchar("country", { length: 255 }),
    zipcode: varchar("zipcode", { length: 255 }),

    mailAddress: varchar("mail_address", { length: 255 }),
    mailApartment: varchar("mail_apartment", { length: 255 }),
    mailCity: varchar("mail_city", { length: 255 }),
    mailState: varchar("mail_state", { length: 255 }),
    mailCounty: varchar("mail_county", { length: 255 }),
    mailCountry: varchar("mail_country", { length: 255 }),
    mailZipcode: varchar("mail_zipcode", { length: 255 }),

    dob: date("dob", {
      mode: "date",
    }),
    isMinor: boolean("is_minor").default(false),
    gender: varchar("gender", { length: 255 }),

    tracking_params: json("tracking_params"),

    paymentProvider: varchar("payment_provider", { length: 255 }),
    paymentProviderCustomerId: varchar("payment_provider_customer_id", {
      length: 255,
    }),
    paymentProviderPaymentMethodId: varchar("payment_provider_payment_method_id", {
      length: 255,
    }),

    ghlContactId: varchar("ghl_contact_id", { length: 255 }),

    timezone: varchar("timezone", { length: 255 }).default("CST"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    patientsCodeIdx: index("patients_code_idx").on(t.code),
    patientsBrandCodeIdx: index("patients_brand_code_idx").on(t.brandCode),
    patientsFirstNameSearchIndex: index(
      "patients_first_name_search_index"
    ).using("gin", sql`to_tsvector('english', ${t.firstName})`),
    patientsLastNameSearchIndex: index("patients_last_name_search_index").using(
      "gin",
      sql`to_tsvector('english', ${t.lastName})`
    ),
    patientsEmailSearchIndex: index("patients_email_search_index").using(
      "gin",
      sql`to_tsvector('english', ${t.email})`
    ),
    patientsPhoneSearchIndex: index("patients_phone_search_index").using(
      "gin",
      sql`to_tsvector('english', ${t.phone})`
    ),
    patientsStateSearchIndex: index("patients_state_search_index").on(t.state),
  })
);

export type PatientStateInterestType = InferInsertModel<
  typeof patientStateInterests
>;

export const patientStateInterests = pgTable(
  "patient_state_interests",
  {
    id: serial("id").primaryKey(),

    brandCode: varchar("brand_code", { length: 255 }).default("parkingmd"),

    patientId: integer("patient_id").notNull(),

    state: varchar("state", { length: 255 }),

    message: text("message"), // Used to store the response of the intake form

    createdAt: timestamp("created_at").defaultNow(),

    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    patientIdIdx: index("psi_patient_id_idx").on(t.patientId), // Renamed index
    stateIdx: index("state_idx").on(t.state),
    patientStateUnique: uniqueIndex("patient_state_unique_idx").on(
      t.patientId,
      t.state
    ),
  })
);

// like create full text index  or else it will be regular index
export const patientSubscriptions = pgTable(
  "patient_subscriptions",
  {
    id: serial("id").primaryKey(),
    subscriptionId: uuid("subscription_id").default(sql`gen_random_uuid()`), // or "uuid_generate_v4()" if your DB uses that
    patientId: integer("patient_id").references(() => patients.id),

    state: varchar("state", { length: 255 }),

    productId: integer("product_id").notNull(),
    status: varchar("status", { length: 255 }),

    paymentProvider: varchar("payment_provider", { length: 255 }),
    paymentProviderCustomerId: varchar("payment_provider_customer_id", {
      length: 255,
    }),

    renewalDate: timestamp("renewal_date", {
      mode: "date",
    }),
    startDate: timestamp("start_date", {
      mode: "date",
    }),
    endDate: timestamp("end_date", {
      mode: "date",
    }),
    cancelledAt: timestamp("cancelled_at"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    patientIdIdx: index("patient_id_idx").on(t.patientId),
    productIdIdx: index("product_id_idx").on(t.productId),
    subsId: index("subs_id").on(t.subscriptionId),
  })
);

export const patientIntakeForms = pgTable("patient_intake_forms", {
  id: serial("id").primaryKey(),
  brandCode: varchar("brand_code", { length: 255 }).default("parkingmd"),
  patientId: integer("patient_id").notNull(),
  taskId: integer("task_id").notNull(),
  state: varchar("state", { length: 255 }),
  formId: varchar("form_id", { length: 50 }).notNull(),
  response: json("response"), // Used to store the response of the intake form
  type: varchar("type", { length: 255 }), // Used to render the intake form
  tag: varchar("tag", { length: 255 }),
  document_id: integer("document_id"), // Used to store the document ID of the intake form

  lastStep: varchar("last_step", { length: 50 }),
  status: varchar("status", { length: 255 }),

  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Password Reset Tokens Table
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: varchar("id", { length: 40 }).primaryKey(),
    userId: varchar("user_id", { length: 21 }).notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => ({
    userIdx: index("password_token_user_idx").on(t.userId),
    expiresAtIdx: index("password_token_expires_at_idx").on(t.expiresAt),
  })
);

export const workflowConfigs = pgTable("workflow_configs", {
  id: serial("id").primaryKey(),
  workflowId: varchar("workflow_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});


export type TaskType = InferInsertModel<typeof Tasks>;
export type TaskTypeSelect = InferSelectModel<typeof Tasks>;
export type UpdateTaskType = Partial<TaskType>;

// Tasks Table
export const Tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    brandCode: varchar("brand_code", { length: 255 }).default("parkingmd"), //index
    code: varchar("code", { length: 255 }), //index

    doctorId: integer("doctor_id").references(() => Doctors.id),
    patientId: integer("patient_id").references(() => patients.id),

    type: varchar("type", { length: 255 }).notNull(), //Appointment
    tag: varchar("tag", { length: 255 }).notNull(), //New
    state: varchar("state", { length: 255 }), //patient state

    status: varchar("status", { length: 255 }).notNull(), //Waiting to start

    callStatus: varchar("call_status", { length: 255 }), //index
    callNote: text("call_note"),
    callBackAt: timestamp("call_back_at"),

    adminNote: text("admin_note"),
    patientNote: text("patient_note"),

    paymentReason: text("payment_reason"),
    startDate: timestamp("start_date"), //index
    dueDate: timestamp("due_date"), //index
    completedDate: timestamp("completed_date"), //index
    paymentDate: timestamp("payment_date"), //index
    validTill: timestamp("valid_till", { mode: "date" }), //index
    amount: real("amount"),
    isAssigned: boolean("is_assigned").default(false),
    isReviewed: boolean("is_reviewed").default(false),
    requiresAppointment: boolean("requires_appointment").default(true),

    isPayment: boolean("is_payment"),
    paymentStatus: varchar("payment_Status", { length: 255 })
      .notNull()
      .default("Unpaid"), //index

    readyForPackaging: boolean("ready_for_packaging").default(false),

    totalAmount: real("total_amount"),
    supportAmount: real("support_amount"),
    othersAmount: real("others_amount"),
    processingAmount: real("processing_amount"),
    sscAmount: real("ssc_amount"),
    providerAmount: real("provider_amount"),
    discountAmount: real("discount_amount"),
    discountCode: varchar("discount_code", { length: 255 }),

    paymentProvider: varchar("payment_provider", { length: 255 }),
    paymentProviderTransactionId: varchar("payment_provider_transaction_id", {
      length: 255,
    }),
    paymentProviderSubscriptionId: varchar("payment_provider_subscription_id", {
      length: 255,
    }),

    patientSubscriptionId: integer("patient_subscription_id"),

    tracking_params: json("tracking_params"),

    formResponse: json("form_response"),

    // cal com
    calComUrl: varchar("cal_com_url", { length: 255 }),
    calBookingUid: varchar("cal_booking_uid", { length: 255 }),
    bookingId: integer("booking_id"),
    bookingTriggerEvent: varchar("booking_trigger_event", { length: 255 }),
    bookingCreatedAt: timestamp("booking_created_at"),
    // Timings
    bookingStartTime: timestamp("booking_start_time"),
    bookingEndTime: timestamp("booking_end_time"),
    // Organizer
    organizerName: varchar("organizer_name", { length: 255 }),
    organizerEmail: varchar("organizer_email", { length: 255 }),
    // Additional info from 'payload' you frequently need
    bookingStatus: varchar("booking_status", { length: 255 }),
    bookingReason: text("booking_reason"),
    rescheduleReason: text("reschedule_reason"),
    cancellationReason: text("cancellation_reason"),
    cancelledBy: varchar("cancelled_by", { length: 255 }),
    rescheduledBy: varchar("rescheduled_by", { length: 255 }),
    cancelledAt: timestamp("cancelled_at"),
    rescheduledAt: timestamp("rescheduled_at"),
    // The rest in a JSON column for good measure
    calAttendees: json("cal_attendees"),
    calBookingPayload: json("cal_booking_payload"),

    // isSubscription: boolean("is_subscription").default(false),
    // subscriptionMethod: varchar("subscription_method", { length: 255 }),
    patientNoteSendAt: timestamp("patient_note_send_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    taskIdIdx: index("task_user_idx").on(t.id),
    codeIdx: index("task_code_idx").on(t.code),
    typeIdx: index("task_type_idx").on(t.type),
    tagIdx: index("task_tag_idx").on(t.tag),
    stateIdx: index("task_state_idx").on(t.state),
    statusIdx: index("task_status_idx").on(t.status),
    callStatusIdx: index("task_call_status_idx").on(t.callStatus),
    startDateIdx: index("task_start_date_idx").on(t.startDate),
    dueDateIdx: index("task_due_date_idx").on(t.dueDate),
    completedDateIdx: index("task_completed_date_idx").on(t.completedDate),
    paymentStatusIdx: index("task_payment_status_idx").on(t.paymentStatus),
    isAssignedIdx: index("task_is_assigned_idx").on(t.isAssigned),
    isPaymentIdx: index("task_is_payment_idx").on(t.isPayment),
  })
);

export type Appointment = InferSelectModel<typeof appointments>;

export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').notNull().references(() => Tasks.id, { onDelete: 'cascade' }),
  
  // Duplicated for direct appointment queries (denormalization for performance)
  patientId: integer('patient_id').notNull().references(() => patients.id, { onDelete: 'cascade' }),
  doctorId: integer('doctor_id').references(() => Doctors.id, { onDelete: 'set null' }),
  // categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  
  // Appointment-specific fields
  startAt: timestamp('start_at', { withTimezone: false }).notNull(), // UTC timestamp
  endAt: timestamp('end_at', { withTimezone: false }).notNull(), // UTC timestamp
  // status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  status: text('status').notNull().default('scheduled'),
  link: text('link'), // appointment_link
  
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
});

// Messages Table
export const Messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  senderId: integer("sender_id").notNull(),
  senderType: varchar("sender_type", { length: 255 }).notNull(),
  receiverId: integer("receiver_id").notNull(),
  receiverType: varchar("receiver_type", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).$onUpdate(
    () => new Date()
  ),
});

export const templates = pgTable(
  "templates",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    html: varchar("html", {
      length: 65535,
    }),
    editorState: varchar("editor_state", { length: 65535 }),
    state: varchar("state", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    templatesNameIdIdx: index("templates_name_idx").on(t.name),
  })
);

export const templateContents = pgTable("template_contents", {
  id: serial("id").primaryKey(),
  templateType: varchar("template_type", { length: 255 }).default("visit"),
  templateName: varchar("template_name", { length: 255 }).notNull(),
  templateState: varchar("template_state", { length: 255 }),
  content: text("content"),
  doctorId: integer("doctor_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).$onUpdate(
    () => new Date()
  ),
});



export const agreementDocuments = pgTable("agreement_documents", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(), // Unique identifier for the document type
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(), // Rich text content from Lexical editor
  editorState: text("editor_state"), // Lexical editor state JSON
  status: documentStatusEnum("status").default("draft"),
  macros: json("macros").$type<string[]>(), // Array of macro keys used in this document
  predefinedMacros: json("predefined_macros").$type<Record<string, string>>(), // Macros that cannot be changed
  allowCustomMacros: boolean("allow_custom_macros").default(true), // Whether custom macros are allowed
  brandCode: varchar("brand_code", { length: 255 }).default("parkingmd"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

// Generated Documents (tracking what was generated for patients)
export const generatedAgreementDocuments = pgTable("generated_agreement_documents", {
  id: serial("id").primaryKey(),
  agreementDocumentId: integer("agreement_document_id").references(() => agreementDocuments.id),
  patientId: integer("patient_id").references(() => patients.id),
  documentId: integer("document_id").references(() => Documents.id), // Links to existing Documents table
  macroValues: json("macro_values").$type<Record<string, string>>(), // The actual macro values used
  generatedAt: timestamp("generated_at").defaultNow(),
  signedAt: timestamp("signed_at"),
  isForced: boolean("is_forced").default(false), // Whether this was force generated
});

// Types
export type AgreementDocument = typeof agreementDocuments.$inferSelect;
export type NewAgreementDocument = typeof agreementDocuments.$inferInsert;
export type GeneratedAgreementDocument = typeof generatedAgreementDocuments.$inferSelect;

// Documents Table
export const Documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),

    brandCode: varchar("brand_code", { length: 255 }).default("parkingmd"), //index
    code: varchar("code", { length: 255 }), //index

    doctorId: integer("doctor_id").references(() => Doctors.id),
    patientId: integer("patient_id").references(() => patients.id),
    taskId: integer("task_id").references(() => Tasks.id),

    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 255 }).notNull(),
    subType: varchar("sub_type", { length: 255 }), // e.g., "Permanent Permit", "Temporary Permit"
    tag: varchar("tag", { length: 255 }),
    url: varchar("url", { length: 255 }).notNull(),
    fileType: varchar("file_type", { length: 255 }).notNull(),
    patientVisible: boolean("patient_visible").default(true),
    readyForPackaging: boolean("ready_for_packaging").default(false),

    validTill: timestamp("valid_till", { mode: "date" }),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    documentIdIdx: index("document_id_idx").on(t.id),
    codeIdx: index("document_code_idx").on(t.code),
    typeIdx: index("document_type_idx").on(t.type),
    subTypeIdx: index("document_sub_type_idx").on(t.subType),
    tagIdx: index("document_tag_idx").on(t.tag),
    fileTypeIdx: index("document_file_type_idx").on(t.fileType),
    patientVisibleIdx: index("document_patient_visible_idx").on(
      t.patientVisible
    ),
    doctorIdIdx: index("document_doctor_id_idx").on(t.doctorId),
    patientIdIdx: index("document_patient_id_idx").on(t.patientId),
    validTillIdx: index("document_valid_till_idx").on(t.validTill),
    nameIdx: index("document_name_idx").using(
      "gin",
      sql`to_tsvector('english', ${t.name})`
    ),
  })
);

// Transactions Table
export const Transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id").references(() => Tasks.id),
    patientId: integer("patient_id").references(() => patients.id),
    doctorId: integer("doctor_id")
      .notNull()
      .references(() => Doctors.id),
    amount: real("amount"),
    totalAmount: real("total_amount").notNull(),
    patientAmount: real("patient_amount").notNull(),
    supportAmount: real("support_amount").notNull(),
    othersAmount: real("others_amount").notNull(),
    processingAmount: real("processing_amount").notNull(),
    sscAmount: real("ssc_amount").notNull(),
    providerAmount: real("provider_amount").notNull(),
    status: varchar("status", { length: 255 }).notNull(), //index
    paymentCode: varchar("payment_code", { length: 255 }), //index
    adminNotes: varchar("admin_notes", {
      length: 65535,
    }), //index
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    doctorIdIdx: index("transaction_doctor_id_idx").on(t.doctorId),
    statusIdx: index("transaction_status_idx").on(t.status),
    paymentCodeIdx: index("transaction_payment_code_idx").on(t.paymentCode),
  })
);

// DoctorPayments Table
export const DoctorPayments = pgTable(
  "doctor_payments",
  {
    id: serial("id").primaryKey(),
    paymentCode: varchar("payment_code", { length: 255 }).notNull(),
    doctorId: integer("doctor_id")
      .notNull()
      .references(() => Doctors.id),
    paymentDate: timestamp("payment_date").notNull(),
    paymentAmount: real("payment_amount").notNull(),
    paymentMethod: json("payment_method"),
    status: varchar("status", { length: 255 }).notNull(),
    paymentRefNumber: varchar("payment_ref_number", { length: 255 }),
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    doctorIdIdx: index("doctor_payment_doctor_id_idx").on(t.doctorId),
    statusIdx: index("doctor_payment_status_idx").on(t.status),
    paymentCodeIdx: index("doctor_payment_payment_code_idx").on(t.paymentCode),
  })
);

export const activeCallSessions = pgTable("active_call_sessions", {
  id: serial("id").primaryKey(),
  callSid: varchar("call_sid", { length: 34 }).notNull().unique(),
  status: varchar("status", { length: 20 }).notNull(), // 'waiting', 'accepted', 'completed'
  from: varchar("from", { length: 20 }).notNull(),
  to: varchar("to", { length: 20 }).notNull(),
  handledBy: varchar("handled_by", { length: 50 }), // admin's ID who accepted
  startedAt: timestamp("started_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

export const DoctorPriorities = pgTable(
  "doctor_priorities",
  {
    id: serial("id").primaryKey(),
    doctorId: integer("doctor_id")
      .notNull()
      .references(() => Doctors.id),
    state: varchar("state", { length: 255 }).notNull(),
    maxTasksCap: integer("max_tasks_cap"),
    priority: numeric("priority", { precision: 5, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).$onUpdate(
      () => new Date()
    ),
    createdBy: integer("created_by").references(() => users.id),
  },
  (t) => ({
    doctorStateIdx: uniqueIndex("doctor_state_priority_idx").on(
      t.doctorId,
      t.state
    ),
  })
);

// Doctors Table
export const Doctors = pgTable(
  "doctors",
  {
    id: integer("id").primaryKey().notNull(),
    firstName: varchar("first_name", { length: 255 }).notNull(),
    middleName: varchar("middle_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }).notNull(),
    code: varchar("code", { length: 255 }),
    profilePicture: varchar("profile_picture", { length: 255 }),
    birthDate: timestamp("birth_date"),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    phoneNumber: varchar("phone_number", { length: 255 }).notNull(),
    maxTasksCap: integer("max_tasks_cap"),
    services: text("services"),
    bio: text("bio"),
    country: varchar("country", { length: 255 }),
    address: varchar("address", { length: 255 }),
    city: varchar("city", { length: 255 }),
    county: varchar("county", { length: 255 }),
    state: varchar("state", { length: 255 }),
    zipCode: varchar("zip_code", { length: 255 }),
    npiNumber: varchar("npi_number", { length: 255 }),
    title: varchar("title", { length: 255 }),
    medicalLicense: json("medical_license"),
    practiceInformation: json("practice_information"),
    businessHours: json("business_hours"),
    signature: varchar("signature", { length: 255 }),
    credentials: varchar("credentials", { length: 255 }), //roles like Physician, Nurse Practitioner, etc.
    accountNumber: varchar("account_number", { length: 255 }),
    routingNumber: varchar("routing_number", { length: 255 }),
    officeFaxNumber: varchar("office_fax_number", { length: 255 }),
    sendEmailNotification: boolean("send_email_notification").default(true),
    emailNotification: varchar("email_notification", { length: 255 }),
    sendSmsNotification: boolean("send_sms_notification").default(true),
    phoneNumberNotification: varchar("phone_number_notification", {
      length: 255,
    }),
    formAddress: json("form_address"),
    isReturnMailAddressRequired: boolean("is_return_mail_address_required").default(false),
    returnMailAddress: jsonb("return_mail_address"),
    timezone: text('timezone').notNull(), // e.g., "America/New_York"
    appointmentLink: text('appointment_link'),
    isFlatAmount: boolean("is_flat_amount").default(false),
    flatAmount: numeric("flat_amount", { precision: 10, scale: 2 }),
    isActive: boolean("is_active").default(true),
    isOnline: boolean("is_online").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).$onUpdate(
      () => new Date()
    ),

    patientCallMediums: jsonb("patient_call_mediums"), // [{brand: 'leafy', key: 'doxy', link: 'https://doxy.me/me', enabled: 1}, {brand: 'leafy', key: 'call', link: '+1234567890', enabled: 1}]
  },
  (t) => ({
    codeIdx: index("doctor_code_idx").on(t.code),
    uniqueUserId: uniqueIndex("unique_doctor_user_id").on(t.userId, t.id),
    firstNameSearchIndex: index("first_name_search_index").using(
      "gin",
      sql`to_tsvector('english', ${t.firstName})`
    ),
    lastNameSearchIndex: index("last_name_search_index").using(
      "gin",
      sql`to_tsvector('english', ${t.lastName})`
    ),
    cityIdx: index("doctor_city_idx").on(t.city),
    stateIdx: index("doctor_state_idx").on(t.state),
    countryIdx: index("doctor_country_idx").on(t.country),
  })
);

//Doctor Medical license
export const DoctorMedicalLicense = pgTable(
  "doctor_medical_license",
  {
    id: serial("id").primaryKey(),
    doctorId: integer("doctor_id")
      .notNull()
      .references(() => users.id),
    country: varchar("country", { length: 255 }),
    state: varchar("state", { length: 255 }),
    licenseNumber: varchar("license_number", { length: 255 }),
    licenseExpirationDate: timestamp("license_expiration_date"),
    licenseEntity: varchar("license_entity", { length: 255 }),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).$onUpdate(
      () => new Date()
    ),
  }
  // (t) => ({
  //   doctorMedicalLicenseIdIdx: index("doctor_medical_license_doctor_id_idx").on(t.doctorId),
  // })
);

//Doctor Business Hours
export const DoctorBusinessHours = pgTable(
  "doctor_business_hours",
  {
    id: serial("id").primaryKey(),
    doctorId: integer("doctor_id")
      .notNull()
      .references(() => users.id),
    day: varchar("day", { length: 255 }),
    startTime: varchar("start_time", { length: 255 }),
    endTime: varchar("end_time", { length: 255 }),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).$onUpdate(
      () => new Date()
    ),
  }
  // (t) => ({
  //   doctorBusinessHoursIdIdx: index("doctor_business_hours_doctor_id_idx").on(t.doctorId),
  // })
);


export const doctorTimeOff = pgTable('doctor_time_off', {
  id: serial('id').primaryKey(),
  doctorId: integer('doctor_id').notNull().references(() => Doctors.id, { onDelete: 'cascade' }),
  startDateTime: timestamp('start_date_time', { withTimezone: false }).notNull(), // UTC timestamp
  endDateTime: timestamp('end_date_time', { withTimezone: false }).notNull(), // UTC timestamp
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
});


//Address For Forms
export const AddressForForms = pgTable(
  "address_for_forms",
  {
    id: serial("id").primaryKey(),
    doctorId: integer("doctor_id")
      .notNull()
      .references(() => users.id),
    service: varchar("service", { length: 255 }),
    country: varchar("country", { length: 255 }),
    state: varchar("state", { length: 255 }),
    address: varchar("address", { length: 255 }),
    county: varchar("county", { length: 255 }),
    city: varchar("city", { length: 255 }),
    zipcode: varchar("zipcode", { length: 255 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 255 }),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    doctorIdIdx: index("doctor_medical_license_doctor_id_idx").on(t.doctorId),
  })
);

// Admins Table
export const Admins = pgTable(
  "admins",
  {
    id: integer("id").primaryKey().notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phoneNumber: varchar("phone_number", { length: 255 }),
    profilePicture: varchar("profile_picture", { length: 255 }),
    userId: integer("user_id").references(() => users.id),
    role: varchar("role", { length: 255 }).notNull(),
    isActive: boolean("is_active").default(true),
    companyCost: numeric("company_cost", { precision: 10, scale: 2 }).default(
      "0"
    ),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    uniqueUserId: uniqueIndex("unique_user_id").on(t.userId, t.id),
    uniqueEmail: uniqueIndex("unique_email").on(t.email),
    // uniquePhoneNumber: uniqueIndex("unique_phone_number").on(t.phoneNumber),
    nameIdx: index("name_idx").using(
      "gin",
      sql`to_tsvector('english', ${t.name})`
    ),
  })
);

// Comments Table
export const Comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    content: text("content").notNull(),
    userType: roleEnum("role"),
    userId: integer("user_id").notNull(),
    commentableType: varchar("commentable_type", { length: 255 }).notNull(),
    commentableId: varchar("commentable_id", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    commentsUserIdIdx: index("comments_user_id_idx").on(t.userId),
    commentableIdIdx: index("comments_commentable_id_idx").on(t.commentableId),
    commentableTypeIdx: index("comments_commentable_type_idx").on(
      t.commentableType
    ),
    commentsUserTypeIdx: index("comments_user_type_idx").on(t.userType),
  })
);

// Notes Table
export const Notes = pgTable(
  "notes",
  {
    id: serial("id").primaryKey(),
    content: text("content").notNull(),
    userType: roleEnum("role"),
    userId: integer("user_id").notNull(),
    isHidden: boolean("is_hidden").default(false),
    patientId: integer("patient_id").references(() => patients.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).$onUpdate(
      () => new Date()
    ),
  },
  (t) => ({
    userIdIdx: index("patients_id_idx").on(t.userId),
    // patientIdIdx: index("patient_id_idx").on(t.patientId),
    userTypeIdx: index("patient_type_idx").on(t.userType),
    isHiddenIdx: index("patient_is_hidden_idx").on(t.isHidden),
  })
);


export type ServiceConfiguration = typeof serviceConfigurations.$inferSelect;
export const serviceConfigurations = pgTable(
  "service_configurations",
  {
    id: serial("id").primaryKey(),

    stateCode: varchar("state_code", { length: 5 }), // ISO 2 state code

    type: varchar("type", { length: 255 }), // ISO 2 state code
    tag: varchar("tag", { length: 255 }), // ISO 2 state code

    brandCode: varchar("brand_code", { length: 255 }).default("parkingmd"),

    expiryDays: integer("expiry_days"), // change integer type to date
    calcomLink: varchar("calcom_link"),
    paymentFormId: integer("payment_form_id").references(() => paymentForms.id),
    intakeFormConfiguration: jsonb("intake_form_configuration"), // JSON for intake form configuration

    
    active: boolean("active").default(false),

    // Post complete instructions State Wise configuration
    postCompleteInstructions: text("post_complete_instructions"),
    postApprovalInstructions: text("post_approval_instructions"),
    taskPostCompleteInstructions: text("task_post_complete_instructions"),

    isApprovalNeeded: boolean("is_approval_needed").default(false),
    
    providerSignatureRequired: boolean("provider_signature_required").default(false),

    requiresCoverLetter: boolean("requires_coverletter").default(false),
    requiresEnvelope: boolean("requires_envelope").default(false),
 
    coverLetterContent: text("cover_letter_content"),
    coverLetterSubject: text("cover_letter_subject"),

    requiresPrescription: boolean("requires_prescription").default(false),
    requiresPackaging: boolean("requires_packaging").default(false),

    requiresAsyncAppointment: boolean("requires_async_appointment").default(false),
    requiresAppointment: boolean("requires_appointment").default(true),

    appointmentDurationMinutes: integer('appointment_duration_minutes').default(15),
    appointmentBufferMinutes: integer('appointment_buffer_minutes').default(0),
    appointmentBookingWindowDays: integer('appointment_booking_window_days').default(14),
    appointmentConcurrencyLimit: integer('appointment_concurrency_limit').default(10),


    createdAt: timestamp("created_at", { withTimezone: false }), // Timestamp for creation
    updatedAt: timestamp("updated_at", { withTimezone: false })
      .defaultNow()
      .notNull(), // Timestamp for update
  },
  (t) => ({
    typeIdx: index("type_idx").on(t.type),
    tagIdx: index("tag_idx").on(t.tag),
    stateCodeIdx: index("state_code_idx").on(t.stateCode),
  })
);

export const states = pgTable(
  "states",
  {
    id: serial("id").primaryKey(),

    name: varchar("name", { length: 100 }).notNull(), // State name
    iso2: varchar("iso2", { length: 5 }), // ISO 2 state code
    countryCode: varchar("country_code", { length: 2 }), // Country code (ISO2)

    createdAt: timestamp("created_at", { withTimezone: false }), // Timestamp for creation
    updatedAt: timestamp("updated_at", { withTimezone: false })
      .defaultNow()
      .notNull(), // Timestamp for update
  },
  (t) => ({
    nameIdx: index("states_name_idx").on(t.name),
    iso2Idx: index("states_iso2_idx").on(t.iso2),
  })
);

// Document Expiration Configuration Table
export const documentExpirationConfig = pgTable(
  "document_expiration_config",
  {
    id: serial("id").primaryKey(),

    state: varchar("state", { length: 255 }).notNull(), // State code
    type: varchar("type", { length: 255 }).notNull(), // Service type
    subType: varchar("sub_type", { length: 255 }).notNull(), // e.g., "Permanent Permit", "Temporary Permit", etc.
    tag: varchar("tag", { length: 255 }).notNull(), // Service tag
    
    expiryDays: integer("expiry_days").notNull(), // Number of days until expiration
    
    brandCode: varchar("brand_code", { length: 255 }).default("parkingmd"),

    createdAt: timestamp("created_at", { withTimezone: false })
      .defaultNow()
      .notNull(), // Timestamp for creation
    updatedAt: timestamp("updated_at", { withTimezone: false })
      .defaultNow()
      .notNull(), // Timestamp for update
  },
  (t) => ({
    stateIdx: index("doc_exp_state_idx").on(t.state),
    typeIdx: index("doc_exp_type_idx").on(t.type),
    subTypeIdx: index("doc_exp_sub_type_idx").on(t.subType),
    tagIdx: index("doc_exp_tag_idx").on(t.tag),
    // Composite index for common lookups
    stateTypeSubTypeTagIdx: uniqueIndex("doc_exp_state_type_subtype_tag_idx").on(
      t.state,
      t.type,
      t.subType,
      t.tag
    ),
  })
);

export type DocumentExpirationConfig = typeof documentExpirationConfig.$inferSelect;
export type NewDocumentExpirationConfig = typeof documentExpirationConfig.$inferInsert;

// export const states = pgTable("states", {
//   id: serial("id").primaryKey(),

//   name: varchar("name", { length: 100 }).notNull(), // State name
//   iso2: varchar("iso2", { length: 5 }), // ISO 2 state code
//   countryCode: varchar('country_code', { length: 2 }),  // Country code (ISO2)
//   expiryDays: integer("expiry_days"),
//   calcomLink: varchar("calcom_link"),
//   paymentFormId: integer("payment_form_id").references(() => paymentForms.id),
//   active: boolean("active").default(false),

//   createdAt: timestamp("created_at", { withTimezone: false }), // Timestamp for creation
//   updatedAt: timestamp("updated_at", { withTimezone: false })
//     .defaultNow()
//     .notNull(), // Timestamp for update
// },(t) => ({
//   nameIdx: index("states_name_idx").on(t.name),
//   iso2Idx: index("states_iso2_idx").on(t.iso2),
// }));

export const DoctorsServicePrice = pgTable(
  "doctors_service_pricing",
  {
    id: serial("id").primaryKey(), // Primary Key with bigint (auto increment)
    // brandCode: varchar("brand_code", { length: 255 }).default("parkingmd"), // Brand code for the service
    doctorId: bigint("doctor_id", { mode: "number" })
      .notNull()
      .references(() => Doctors.id), // Foreign key for the doctor

    state: varchar("state", { length: 255 }), // State where the service is offered

    tags: varchar("tags", { length: 255 }),
    type: varchar("type", { length: 255 }), // Type of the service

    price: numeric("price", { precision: 10, scale: 2 }).notNull(), // Price
  },
  (t) => ({
    doctorTagsTypeIdx: index("doctor_tags_type_idx").on(
      t.doctorId,
      t.tags,
      t.type
    ),
  })
);

// ActivityLog Table
export const ActivityLogs = pgTable(
  "activity_logs",
  {
    id: serial("id").primaryKey(),

    // Who performed the action
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    userRole: varchar("user_role", { length: 255 }).notNull(),

    // What action was performed
    action: varchar("action", { length: 255 }).notNull(), // e.g., "created", "updated", "deleted"
    entityType: varchar("entity_type", { length: 255 }).notNull(), // e.g., "task", "document", "patient"
    entityId: varchar("entity_id", { length: 255 }).notNull(), // ID of the affected entity

    // Additional context
    description: text("description").notNull(), // Human-readable description of the action
    oldData: json("old_data"), // Previous state for updates
    newData: json("new_data"), // New state for updates
    metadata: json("metadata"), // Any additional contextual information

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    // Indexes for common query patterns
    userIdIdx: index("activity_log_user_id_idx").on(t.userId),
    userRoleIdx: index("activity_log_user_role_idx").on(t.userRole),
    actionIdx: index("activity_log_action_idx").on(t.action),
    entityTypeIdx: index("activity_log_entity_type_idx").on(t.entityType),
    entityIdIdx: index("activity_log_entity_id_idx").on(t.entityId),
    createdAtIdx: index("activity_log_created_at_idx").on(t.createdAt),

    // Combined indexes for common filtering scenarios
    userActionIdx: index("activity_log_user_action_idx").on(t.userId, t.action),
    entityTypeActionIdx: index("activity_log_entity_type_action_idx").on(
      t.entityType,
      t.action
    ),

    // Full-text search on description
    descriptionSearchIdx: index("activity_log_description_search_idx").using(
      "gin",
      sql`to_tsvector('english', ${t.description})`
    ),
  })
);

export const retellAICallLogs = pgTable(
  "retell_ai_call_logs",
  {
    id: serial("id").primaryKey(), // Primary Key with bigint (auto increment)
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id), // User
    taskId: integer("task_id")
      .notNull()
      .references(() => Tasks.id), // User
    fromNumber: varchar("from_number", { length: 255 }), // From Number
    time: varchar("time", { length: 255 }), // Time
    duration: varchar("duration", { length: 255 }), // Duration
    type: varchar("type", { length: 255 }), // Type
    cost: varchar("cost", { length: 255 }), // Cost
    callId: varchar("call_id", { length: 255 }), // Call ID
    agentId: varchar("agent_id", { length: 255 }), // Agent ID
    disconnectionReason: text("disconnection_reason"), // Disconnection Reason
    callStatus: text("call_status"), // Call Status
    userSentiment: text("user_sentiment"), // User Sentiment
    recording_url: text("recording_url"), // Recording URL
    metaData: text("meta_data"), // Meta Data
    transcript: text("transcript"), // Transcript
    transcriptObject: json("transcript_object"), // Transcript Object
    callSummary: text("call_summary"), // Call Summary
    detailedCallSummary: text("detailed_call_summary"), // Detailed Call Summary
    callOutCome: text("call_out_come"), // Call Out Come
    customerEngagement: text("customer_engagement"), // Customer Engagement
    abandonedPurchaseReason: text("abandoned_purchase_reason"), // Abandoned Purchase Reason
    callBackTime: text("call_back_time"), // Call Back Time
    startTimestamp: timestamp("start_timestamp", { withTimezone: false }), // Start Timestamp
    endTimestamp: timestamp("end_timestamp", { withTimezone: false }), // End Timestamp
    retellDynamicVariables: json("retell_dynamic_variables"), // Retell Dynamic Variables
    createdAt: timestamp("created_at", { withTimezone: false })
      .defaultNow()
      .notNull(), // Timestamp
    updatedAt: timestamp("updated_at", { withTimezone: false }).$default(
      () => new Date()
    ), //
  },
  (t) => ({
    patientIdIdx: index("retell_ai_call_logs_patient_id_idx").on(t.patientId),
    taskIdIdx: index("retell_ai_call_logs_task_id_idx").on(t.taskId),
    timeIdx: index("retell_ai_call_logs_time_idx").on(t.time),
    durationIdx: index("retell_ai_call_logs_duration_idx").on(t.duration),
    typeIdx: index("retell_ai_call_logs_type_idx").on(t.type),
    costIdx: index("retell_ai_call_logs_cost_idx").on(t.cost),
    callIdIdx: index("retell_ai_call_logs_call_id_idx").on(t.callId),
    disconnectionReasonIdx: index(
      "retell_ai_call_logs_disconnection_reason_idx"
    ).on(t.disconnectionReason),
    callStatusIdx: index("retell_ai_call_logs_call_status_idx").on(
      t.callStatus
    ),
    userSentimentIdx: index("retell_ai_call_logs_user_sentiment_idx").on(
      t.userSentiment
    ),
    recordingUrlIdx: index("retell_ai_call_logs_recording_url_idx").on(
      t.recording_url
    ),
    metaDataIdx: index("retell_ai_call_logs_meta_data_idx").on(t.metaData),
    createdAtIdx: index("retell_ai_call_logs_created_at_idx").on(t.createdAt),
  })
);

// Patient Payments table
export const patientPayments = pgTable(
  "patient_payments",
  {
    id: serial("id").primaryKey(),

    patientId: integer("patient_id").notNull(),
    productId: integer("product_id").references(() => products.id),

    paymentId: text("payment_id"),
    status: text("status").notNull(),

    amount: real("amount").notNull(),
    metadata: jsonb("metadata"),

    subscriptionId: text("subscription_id").references(
      () => patientSubscriptions.subscriptionId
    ),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    // Indexes for common query patterns
    paymentIdIdx: index("patient_payments_payment_id_idx").on(t.paymentId),
    statusIdx: index("patient_payments_status_idx").on(t.status),
  })
);

// Patient OTP Tokens Table
export const patientOtpTokens = pgTable(
  "patient_otp_tokens",
  {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }), // Cascade delete if patient is deleted
    otp: varchar("otp", { length: 10 }).notNull(), // Store OTP - consider hashing in production if needed
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    patientIdIdx: index("patient_otp_patient_id_idx").on(t.patientId),
    expiresAtIdx: index("patient_otp_expires_at_idx").on(t.expiresAt),
  })
);

export type InsertPatientType = InferInsertModel<typeof patients>;
export type UpdatePatientType = Partial<InsertPatientType>;



export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  code: varchar("code", { length: 255 }),
  description: text("description"),
  image: text("image"),

  price: numeric("price").notNull(),

  paymentProvider: varchar("payment_provider", { length: 255 }),
  paymentProviderProductId: varchar("payment_provider_product_id", {
    length: 255,
  }),

  is_subscription: boolean("is_subscription").default(false),
  subscription_interval: varchar("subscription_interval"),

  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const paymentForms = pgTable("payment_forms", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull(),
  brandCode: varchar("brand_code", { length: 255 }).default("parkingmd"),
  description: text("description"),
  redirect_url: text("redirect_url"),
  popular_product_id: integer("popular_product_id").references(
    () => products.id
  ),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const paymentFormsProducts = pgTable("payment_forms_products", {
  id: serial("id").primaryKey(),
  payment_form_id: integer("payment_form_id").references(() => paymentForms.id),
  product_id: integer("product_id").references(() => products.id),
  product_type: varchar("product_type").default("default"),
  display_order: integer("display_order"),
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const couponTypeEnum = pgEnum("coupon_type", ["fixed", "percentage"]);

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 255 }).notNull().unique(),
  type: couponTypeEnum("type").default("percentage"),
  brandCode: varchar("brand_code", { length: 255 }).default("parkingmd"),
  discountAmount: real("discount_amount"),
  percentageOff: real("percentage_off").default(0),

  // // Usage limits
  // usageLimit: integer("usage_limit"),
  // usageCount: integer("usage_count").default(0), //* different table for handling customer and patient

  // // Minimum order amount to apply the coupon
  // minimumOrderAmount: real("minimum_order_amount").default(0),

  expiryDate: timestamp("expiry_date"),
  is_active: boolean("is_active").default(true),

  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updated_at: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const calComWebhookLogs = pgTable(
  "cal_com_webhook_logs",
  {
    id: serial("id").primaryKey(),
    triggerEvent: varchar("trigger_event", { length: 255 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("received"),
    payload: json("payload").notNull(),
    processedAt: timestamp("processed_at"),
    error: text("error"),
    taskCode: varchar("task_code", { length: 255 }),
    bookingId: integer("booking_id"),
    calBookingUid: varchar("cal_booking_uid", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  // Indexes for efficient querying
  (t) => ({
    triggerEventIdx: index("cal_com_webhook_logs_trigger_event_idx").on(
      t.triggerEvent
    ),
    statusIdx: index("cal_com_webhook_logs_status_idx").on(t.status),
    taskCodeIdx: index("cal_com_webhook_logs_task_code_idx").on(t.taskCode),
    bookingIdIdx: index("cal_com_webhook_logs_booking_id_idx").on(t.bookingId),
    calBookingUidIdx: index("cal_com_webhook_logs_cal_booking_uid_idx").on(
      t.calBookingUid
    ),
    createdAtIdx: index("cal_com_webhook_logs_created_at_idx").on(t.createdAt),
  })
);

export const newsletterIntrest = pgTable("newsletter_intrest", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});





// Enum for template types
export const templateTypeEnum = pgEnum('template_type', ['email', 'sms']);



// Main templates table
export const notificationTemplates = pgTable('notification_templates', {
  id: serial('id').primaryKey(),
  templateKey: varchar('template_key', { length: 100 }).notNull().unique(), // e.g., 'parkingmd_checkout_email'
  name: varchar('name', { length: 255 }).notNull(), // Human readable name
  type: templateTypeEnum('type').notNull(), // 'email' or 'sms'
  brandCode: varchar('brand_code', { length: 50 }).notNull().default('parkingmd'),
  
  // Template content
  heading1: varchar('heading1', { length: 500 }),
  heading2: varchar('heading2', { length: 500 }),
  title: varchar('title', { length: 500 }), // For emails only
  preview: varchar('preview', { length: 255 }), // For email preview
  content: text('content'), // For markdown content
  
  // Metadata
  isActive: boolean('is_active').notNull().default(true),
  
  // Audit fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: varchar('created_by', { length: 100 }),
  updatedBy: varchar('updated_by', { length: 100 }),
});



export const callerNumbers = pgTable("caller_numbers", {
  id: serial("id").primaryKey(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull().unique(),
  brandCode: varchar("brand_code", { length: 255 }).default("parkingmd"),
  maxDailyUtilization: integer("max_daily_utilization").notNull().default(149),
  agentId: varchar("agent_id",{length:255}),
  agentName: varchar("agent_name",{length:255}),
  isActive: boolean("is_active").default(true),
  isLateNight: boolean("is_late_night").default(false),
  isRenewals: boolean("is_renewals").default(false),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$default(() => new Date()),
});

export const retellJobs = pgTable("retell_jobs", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),

  taskId: integer("task_id"),
  agent: varchar("agent", { length: 255 }),
  payload: jsonb("payload"),
  error: varchar("error",{length:255}),
  status: varchar("status", { length: 255 }).default("pending"),
  recievedAt: timestamp("recieved_at"),
  processedAt: timestamp("processed_at"),
  
  queueName: varchar("queue_name", { length: 255 }).default("active"),
  
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$default(() => new Date()),
  });