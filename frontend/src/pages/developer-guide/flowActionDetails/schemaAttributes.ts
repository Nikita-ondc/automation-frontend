import type { OpenAPISpecification } from "../types";
import type {
    ActionAttributes,
    AttributeDetails,
    EnumDetails,
    TagDetails,
    TagField,
    EnumOption,
} from "./types";

const DASH = "—";

function getAtPath(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== "object") return undefined;
    const parts = path
        .replace(/^\$\.?/, "")
        .split(".")
        .filter(Boolean);
    let cur: unknown = obj;
    for (const p of parts) {
        if (cur == null || typeof cur !== "object") return undefined;
        cur = (cur as Record<string, unknown>)[p.replace(/\[\d+\]$/, "")];
    }
    return cur;
}

function inferType(value: unknown): string {
    if (value == null) return value === null ? "null" : DASH;
    if (Array.isArray(value)) return "array";
    return typeof value === "object" ? "object" : typeof value;
}

function isEnumArr(v: unknown): v is { code: string; description?: string }[] {
    return (
        Array.isArray(v) && v.length > 0 && typeof (v[0] as { code?: unknown })?.code === "string"
    );
}

function isTagArr(
    v: unknown
): v is { code: string; description?: string; list?: { code: string; description?: string }[] }[] {
    return (
        Array.isArray(v) && v.length > 0 && typeof (v[0] as { code?: unknown })?.code === "string"
    );
}

function isAttrObj(v: unknown): v is {
    required?: unknown;
    type?: unknown;
    owner?: unknown;
    description?: unknown;
} {
    if (!v || typeof v !== "object" || Array.isArray(v)) return false;
    const o = v as Record<string, unknown>;
    const hasRequired = "required" in o && (typeof o.required === "string" || o.required == null);
    const hasType = "type" in o && (typeof o.type === "string" || o.type == null);
    return hasRequired || hasType;
}

/** Coerce spec attribute field to string so React never receives an object. */
function attrFieldString(v: unknown, fallback: string): string {
    if (v == null) return fallback;
    if (typeof v === "string") return v;
    return fallback;
}

/** Resolve attribute fields (required, owner, type, description) from x-attributes for a path. */
function getAttrFieldsForPath(
    xa: Record<string, unknown> | undefined,
    useCaseId: string | undefined,
    actionApi: string,
    path: string,
    value: unknown
): { required: string; owner: string; type: string; description: string } {
    const useCase = xa
        ? useCaseId && useCaseId in xa
            ? useCaseId
            : (Object.keys(xa)[0] as string)
        : "";
    const useCaseData = xa?.[useCase] as Record<string, unknown> | undefined;
    const attrSet = useCaseData?.attribute_set as Record<string, unknown> | undefined;
    const attrBase = attrSet?.[actionApi] as Record<string, unknown> | undefined;
    const attrVal = attrBase ? getAtPath(attrBase, path) : undefined;
    const attrValFromDescription =
        attrBase && !isAttrObj(attrVal)
            ? getAtPath(attrBase, path ? `${path}._description` : "_description")
            : undefined;
    const resolved = isAttrObj(attrVal)
        ? attrVal
        : isAttrObj(attrValFromDescription)
          ? attrValFromDescription
          : undefined;
    if (!resolved)
        return {
            required: DASH,
            owner: DASH,
            type: inferType(value),
            description: DASH,
        };
    return {
        required: attrFieldString(resolved.required, DASH),
        owner: attrFieldString(resolved.owner, DASH),
        type: attrFieldString(resolved.type, inferType(value)),
        description: attrFieldString(resolved.description, DASH),
    };
}

export function getActionAttributes(
    spec: OpenAPISpecification | null | undefined,
    actionApi: string,
    jsonPath: string,
    value: unknown,
    useCaseId?: string
): ActionAttributes {
    const path = jsonPath.replace(/^\$\.?/, "") || "";
    if (!path) {
        return {
            kind: "attribute",
            jsonPath: DASH,
            required: DASH,
            owner: DASH,
            type: inferType(value),
            description: DASH,
        } satisfies AttributeDetails;
    }

    const xe = spec?.["x-enum"] as Record<string, Record<string, unknown>> | undefined;
    const xt = spec?.["x-tags"] as Record<string, Record<string, unknown>> | undefined;
    const xa = spec?.["x-attributes"];

    const enumVal = xe?.[actionApi] ? getAtPath(xe[actionApi], path) : undefined;
    if (isEnumArr(enumVal)) {
        const enumOptions: EnumOption[] = enumVal.map((e) => ({
            code: e.code,
            description: (e.description as string) || DASH,
        }));
        const attr = getAttrFieldsForPath(
            xa as Record<string, unknown> | undefined,
            useCaseId,
            actionApi,
            path,
            value
        );
        return {
            kind: "enum",
            jsonPath: path,
            enums: enumOptions.map((e) => e.code),
            enumOptions,
            required: attr.required,
            owner: attr.owner,
            type: attr.type,
            description: attr.description,
        } satisfies EnumDetails;
    }

    const tagVal = xt?.[actionApi] ? getAtPath(xt[actionApi], path) : undefined;
    if (isTagArr(tagVal)) {
        const tagFields: TagField[] = tagVal.map((t) => ({
            label: t.code,
            description: (t.description as string) || DASH,
            list: (t.list as { code: string; description?: string }[] | undefined)?.map((l) => ({
                code: l.code,
                description: (l.description as string) || DASH,
            })),
        }));
        const attributeInfo = getAttrFieldsForPath(
            xa as Record<string, unknown> | undefined,
            useCaseId,
            actionApi,
            path,
            value
        );
        return {
            kind: "tag",
            jsonPath: path,
            description: "—",
            tagFields,
            attributeInfo,
        } satisfies TagDetails;
    }

    const useCase = xa
        ? useCaseId && useCaseId in xa
            ? useCaseId
            : (Object.keys(xa)[0] as string)
        : "";
    const attrBase = xa?.[useCase]?.attribute_set?.[actionApi] as
        | Record<string, unknown>
        | undefined;
    const attrVal = attrBase ? getAtPath(attrBase, path) : undefined;
    const attrValFromDescription =
        attrBase && !isAttrObj(attrVal)
            ? getAtPath(attrBase, path ? `${path}._description` : "_description")
            : undefined;
    const resolvedAttr = isAttrObj(attrVal)
        ? attrVal
        : isAttrObj(attrValFromDescription)
          ? attrValFromDescription
          : undefined;
    if (resolvedAttr) {
        return {
            kind: "attribute",
            jsonPath: path,
            required: attrFieldString(resolvedAttr.required, DASH),
            owner: attrFieldString(resolvedAttr.owner, DASH),
            type: attrFieldString(resolvedAttr.type, inferType(value)),
            description: attrFieldString(resolvedAttr.description, DASH),
        } satisfies AttributeDetails;
    }

    return {
        kind: "attribute",
        jsonPath: path,
        required: DASH,
        owner: DASH,
        type: inferType(value),
        description: DASH,
    } satisfies AttributeDetails;
}
