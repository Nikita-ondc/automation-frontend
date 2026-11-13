// ─── Developer Docs ───────────────────────────────────────────────────────────

export interface DocMeta {
    slug: string;
    label: string;
    shortDescription: string;
}

// ─── OpenAPI 3.0 Base Types ───────────────────────────────────────────────────

export interface OpenAPIInfo {
    title?: string;
    description?: string;
    version: string;
    domain?: string;
    "x-usecases"?: string[];
    "x-branch-name"?: string;
    "x-reporting"?: boolean;
}

export interface OpenAPISecurityScheme {
    type: string;
    in?: string;
    name?: string;
    description?: string;
}

export interface OpenAPISecurity {
    [key: string]: unknown[];
}

export interface OpenAPISchema {
    type?: string;
    description?: string;
    properties?: Record<string, unknown>;
    required?: string[];
    enum?: unknown[];
    allOf?: unknown[];
    oneOf?: unknown[];
    anyOf?: unknown[];
    items?: unknown;
    additionalProperties?: boolean | Record<string, unknown>;
    $ref?: string;
    [key: string]: unknown;
}

export interface OpenAPIRequestBody {
    content?: {
        [mediaType: string]: {
            schema?: OpenAPISchema;
        };
    };
}

export interface OpenAPIResponse {
    description?: string;
    content?: {
        [mediaType: string]: {
            schema?: OpenAPISchema;
        };
    };
    $ref?: string;
}

export interface OpenAPIPathItem {
    [method: string]: {
        tags?: string[];
        description?: string;
        requestBody?: OpenAPIRequestBody;
        responses?: {
            [statusCode: string]: OpenAPIResponse;
        };
        [key: string]: unknown;
    };
}

export interface OpenAPIComponents {
    securitySchemes?: {
        [key: string]: OpenAPISecurityScheme;
    };
    schemas?: {
        [key: string]: OpenAPISchema;
    };
    [key: string]: unknown;
}

// ─── Flow Types ───────────────────────────────────────────────────────────────

export interface MockExample {
    name?: string;
    description?: string;
    type?: string;
    payload?: unknown;
}

/** Optional prose + Mermaid sequence diagram attached to a flow or step. */
export interface FlowDetailBlock {
    description?: string;
    mermaid?: string;
}

export interface FlowStep {
    summary?: string;
    api: string;
    action_id?: string;
    action_label?: string;
    responseFor?: string | null;
    unsolicited?: boolean;
    owner?: string;
    description?: string;
    details?: FlowDetailBlock[];
    reference?: string;
    example?: {
        summary?: string;
        value?: unknown;
    };
    examples?: MockExample[];
    mock?: {
        examples?: MockExample[];
        generate?: string;
        validate?: string;
        requirements?: string;
        defaultPayload?: unknown;
        formHtml?: string;
        [key: string]: unknown;
    };
}

/** A request/response pair of steps displayed together (e.g. search + on_search). */
export interface StepPair {
    type: "pair";
    request: FlowStep;
    response: FlowStep;
    requestIdx: number;
    responseIdx: number;
}

/** A single step displayed on its own (no matching pair found). */
export interface StepSingle {
    type: "single";
    step: FlowStep;
    stepIdx: number;
}

export type StepDisplayItem = StepPair | StepSingle;

export interface FlowConfig {
    summary?: string;
    steps: FlowStep[];
    helperLib?: string;
    details?: FlowDetailBlock[];
    reference?: string;
    [key: string]: unknown;
}

/** Role of a flow in the walkthrough hierarchy (current authoring schema). */
export type FlowMetaType = "PREREQUISITE" | "PRIMARY" | "SECONDARY" | "OPTIONAL";

/** Authoring metadata from the flow index YAML (`flows[].meta`).
 * Current schema: `type` + `secondary_flows` (on the primary) + `hide_actions`/
 * `visible_actions` (on secondaries). Older schemas (`is_secondary`/`parent_flow`,
 * `secondary_of`/`secondary_start`) remain supported for already-ingested builds. */
export interface FlowMeta {
    /** Role: PREREQUISITE (shown above the primary's calls), PRIMARY, SECONDARY,
     * or OPTIONAL (excluded from the API Walkthrough flows list entirely —
     * still ingested/available, just not shown as its own card anywhere). */
    type?: FlowMetaType | string;
    /** Display order within the use case. */
    order?: number;
    /** On a PRIMARY: flowIds of its secondary flows, in display order. */
    secondary_flows?: string[];
    /** On a SECONDARY: action_ids to exclude from its call list. */
    hide_actions?: string[];
    /** On a SECONDARY: explicit action_ids to show (in flow order); wins over hide_actions. */
    visible_actions?: string[];
    /** Legacy schema: whether this flow is a secondary/variant. */
    is_secondary?: boolean;
    /** Legacy schema: flowId of the primary flow this is a secondary of. */
    parent_flow?: string;
    /** Legacy schema: flowId of the primary flow this flow is a secondary/variant of. */
    secondary_of?: string;
    /** Legacy schema: action_id(s) from which this secondary flow's own calls begin. */
    secondary_start?: string[];
    /** Business-name display config for this flow's steps (API Walkthrough's
     * "Business Illustration" toggle). PRIMARY flows typically group actions into
     * named `sections`; SECONDARY flows (smaller call sets) typically provide a
     * flat `actions` map instead. */
    display?: FlowDisplayMeta;
    [key: string]: unknown;
}

/** One named grouping of API calls in a flow's `meta.display.sections`,
 * e.g. "Product Discovery" with its covered action ids → business labels. */
export interface FlowDisplaySection {
    name: string;
    actions: Record<string, string>;
    /** Render this section as a collapsible "Optional Step" card inline within
     * the flow's own step sequence (same badge/behavior as an `inline` card),
     * instead of a plain heading — for a step that belongs to this flow itself
     * but is skippable, e.g. a manual-review redirection. */
    optional?: boolean;
}

/** A flow injected inline within another flow's Journey View, anchored to one of
 * that flow's sections and rendered as a collapsible "optional"/"alternative" card. */
export interface FlowDisplayInline {
    /** flowId of the flow to inject. */
    flow: string;
    /** Inject this flow's card immediately after the last journey item belonging
     * to this section name. */
    after_section: string;
    /** Title for the collapsible card (defaults to the flowId when omitted). */
    label?: string;
    /** Section names to omit when rendering the injected flow's own sections. */
    skip_sections?: string[];
    /** Badge/semantics for the injected card: "optional" (a skippable extra
     * step, violet badge) or "alternative" (a different path through the same
     * stage, sky-blue "Alternative Path" badge). Defaults to "optional". */
    kind?: "optional" | "alternative";
}

/** Backend-authored Journey View presentation metadata for a flow (`meta.display`). */
export interface FlowDisplayMeta {
    /** Marks this as the default "Full Journey" flow to show for its use case. */
    preferred?: boolean;
    sections?: FlowDisplaySection[];
    actions?: Record<string, string>;
    inline?: FlowDisplayInline[];
}

export interface FlowEntry {
    domain?: string;
    version?: string;
    type: string;
    flowId: string;
    usecase: string;
    tags: string[];
    description: string;
    meta?: FlowMeta | null;
    config: FlowConfig;
}

// ─── Error Codes ──────────────────────────────────────────────────────────────

export interface ErrorCode {
    Event: string;
    Description: string;
    From: string;
    code: string | number;
}

export interface ErrorCodes {
    code: ErrorCode[];
}

// ─── Supported Actions ────────────────────────────────────────────────────────

export interface SupportedActions {
    supportedActions: Record<string, string[]>;
    apiProperties: Record<
        string,
        {
            async_predecessor: string | null;
            transaction_partner: string[];
        }
    >;
}

// ─── Validations ──────────────────────────────────────────────────────────────

export interface XValidationRule {
    _NAME_?: string;
    attr?: string;
    _RETURN_?: string | XValidationRule[];
    reg?: string[];
    valid?: string[];
    domain?: string[];
    version?: string[];
    action?: string[];
    search?: string[];
    _CONTINUE_?: string;
    optional_vars?: string[];
    [key: string]: unknown;
}

export interface XValidationTestGroup {
    _NAME_?: string;
    _DESCRIPTION_?: string;
    action?: string[];
    _RETURN_?: XValidationRule[];
    [key: string]: unknown;
}

// ─── Root Spec Type ───────────────────────────────────────────────────────────

export interface OpenAPISpecification {
    openapi: string;
    info: OpenAPIInfo;
    security?: OpenAPISecurity[];
    paths?: {
        [path: string]: OpenAPIPathItem;
    };
    components?: OpenAPIComponents;
    "x-flows"?: FlowEntry[];
    "x-attributes"?:
        | Array<{
              meta?: { use_case_id?: string };
              attribute_set?: Record<string, Record<string, unknown>>;
          }>
        | Record<string, { attribute_set?: Record<string, Record<string, unknown>> }>;
    "x-validations"?: Record<
        string,
        Record<string, XValidationTestGroup[]> | Record<string, unknown>
    >;
    "x-errorcodes"?: ErrorCodes;
    "x-supported-actions"?: SupportedActions;
    "x-docs"?: Record<string, string>;
    "x-figma"?: string;
    "x-changelog"?: ChangelogEntry[];
}

// ─── Validation Table (from API validationTable section) ─────────────────────

export interface ValidationTableRow {
    rowType: "group" | "leaf";
    name: string;
    group: string;
    scope: string;
    description: string;
    skipIf: string;
    errorCode: string;
    successCode: string;
}

export interface ValidationTableAction {
    action: string;
    codeName: string;
    numLeafTests: number;
    generated: string;
    rows: ValidationTableRow[];
}

export interface ValidationTableSection {
    domain?: string;
    version?: string;
    ingestedAt?: string;
    table: Record<string, ValidationTableAction>;
}

// ─── API Response Types ───────────────────────────────────────────────────────

/**
 * Lifecycle status for a domain version / use case in Developer Guide.
 * Sole source of truth: `GET available-builds` (normalized from wire values
 * like `RELEASED` / `DRAFT`). When omitted, the UI shows no status styling.
 */
export type BuildLifecycleStatus = "released" | "drafted" | "to-be-deprecated" | "deprecated";

export interface BuildEntry {
    key: string;
    version: Array<{
        key: string;
        usecase: string[];
        /** Version-level status from backend when available (normalized). */
        status?: BuildLifecycleStatus;
        /**
         * Per-use-case status map after client normalize.
         * Wire format is `[{ usecase, status }]` — see `normalizeBuildEntries`.
         */
        usecaseStatus?: Record<string, BuildLifecycleStatus>;
    }>;
}

// ─── Changelog Types ─────────────────────────────────────────────────────────

export type ChangeKind = "added" | "removed" | "modified";

export interface ChangeEntry {
    kind: ChangeKind;
    /** Dot-path to the changed item */
    path: string;
    summary: string;
    before?: string;
    after?: string;
}

export interface ChangeSection {
    section: string;
    label: string;
    totalChanges: number;
    entries: ChangeEntry[];
    truncated: boolean;
    truncatedCount: number;
}

export interface ChangelogEntry {
    domain?: string;
    version?: string;
    fromVersion: string;
    toVersion: string;
    branch?: string;
    totalChanges: number;
    generatedAt?: string;
    summary?: {
        totalChanges: number;
        sections: { section: string; label: string; count: number }[];
    };
    sections?: ChangeSection[];
    [key: string]: unknown;
}

export interface SpecResponse {
    meta?: Record<string, unknown> | null;
    flows?: FlowEntry[];
    attributes?: Array<{
        domain?: string;
        version?: string;
        useCaseId?: string;
        attributeSet?: Record<string, Record<string, unknown>>;
    }>;
    docs?: Array<{
        domain?: string;
        version?: string;
        slug: string;
        content: string;
        order?: number;
    }>;
    validations?: { validations?: unknown; [key: string]: unknown } | null;
    validationTable?: ValidationTableSection | null;
    changelog?: ChangelogEntry[];
}
