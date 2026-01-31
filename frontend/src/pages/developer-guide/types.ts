export interface OpenAPIInfo {
    title: string;
    description: string;
    version: string;
    domain: string;
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

export interface FlowStep {
    summary: string;
    api: string;
    details?: Array<{
        description?: string;
    }>;
    reference?: string;
    example?: {
        summary?: string;
        value?: unknown;
    };
}

export interface Flow {
    summary: string;
    details?: Array<{
        description?: string;
    }>;
    reference?: string;
    steps: FlowStep[];
    useCaseId?: string;
}

export interface OpenAPISpecification {
    openapi: string;
    info: OpenAPIInfo;
    security?: OpenAPISecurity[];
    paths: {
        [path: string]: OpenAPIPathItem;
    };
    components?: OpenAPIComponents;
    "x-flows"?: Flow[];
    "x-enum"?: Record<string, Record<string, unknown>>;
    "x-tags"?: Record<string, Record<string, unknown>>;
    "x-attributes"?: Record<string, { attribute_set?: Record<string, Record<string, unknown>> }>;
}
