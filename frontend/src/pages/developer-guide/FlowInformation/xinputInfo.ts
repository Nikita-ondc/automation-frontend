import type { FlowStep } from "@pages/developer-guide/types";

/** Shape of the beckn `xinput` object as it appears in example payloads. Fields are
 * optional because BPPs populate different subsets per action (form vs form_response). */
export interface XinputObject {
    head?: {
        descriptor?: { name?: string };
        index?: { min?: number; cur?: number; max?: number };
        headings?: string[];
    };
    form?: {
        id?: string;
        mime_type?: string;
        url?: string;
        resubmit?: boolean;
        multiple_sumbissions?: boolean;
        multiple_submissions?: boolean;
        [key: string]: unknown;
    };
    form_response?: {
        status?: string;
        submission_id?: string;
        [key: string]: unknown;
    };
    required?: boolean;
    [key: string]: unknown;
}

/** One `xinput` object found in the example payload, with the JSON path it sits at. */
export interface XinputOccurrence {
    path: string;
    xinput: XinputObject;
}

export interface XinputInfo {
    /** Every `xinput` object found in the selected example payload. */
    occurrences: XinputOccurrence[];
    /** True when the step itself is a form step (html_form / dynamic_form). */
    isFormStep: boolean;
    /** For form steps: the example submission as field → value (the step example payload). */
    formSubmission: Record<string, unknown> | null;
}

const FORM_STEP_APIS = new Set(["html_form", "dynamic_form"]);

export function isFormStep(step: FlowStep | undefined): boolean {
    return !!step && FORM_STEP_APIS.has(step.api);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Depth-first walk collecting every object stored under an `xinput` key. */
function collectXinputs(node: unknown, path: string, out: XinputOccurrence[]): void {
    if (Array.isArray(node)) {
        node.forEach((item, i) => collectXinputs(item, `${path}[${i}]`, out));
        return;
    }
    if (!isPlainObject(node)) return;
    for (const [key, value] of Object.entries(node)) {
        const childPath = path ? `${path}.${key}` : key;
        if (key === "xinput" && isPlainObject(value)) {
            out.push({ path: childPath, xinput: value as XinputObject });
        }
        collectXinputs(value, childPath, out);
    }
}

export function getXinputInfo(step: FlowStep | undefined, examplePayload: unknown): XinputInfo {
    const occurrences: XinputOccurrence[] = [];
    collectXinputs(examplePayload, "", occurrences);

    const formStep = isFormStep(step);
    const formSubmission =
        formStep && isPlainObject(examplePayload)
            ? (examplePayload as Record<string, unknown>)
            : null;

    return { occurrences, isFormStep: formStep, formSubmission };
}

export function hasXinputData(info: XinputInfo): boolean {
    return info.isFormStep || info.occurrences.length > 0;
}
