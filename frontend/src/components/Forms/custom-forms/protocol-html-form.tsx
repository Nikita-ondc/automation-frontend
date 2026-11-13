import { useEffect, useMemo, useState } from "react";
import { queryJsonPath } from "@utils/jsonpath-query";
import { AxiosResponse } from "axios";

import { Button } from "@components/Shadcn/Button";
import FormDialogShell from "@components/Forms/form-dialog-shell";
import ProtocolHtmlFieldRenderer from "./protocol-html-field-renderer";
import FormContractIssues from "./form-contract-issues";
import {
    validateFormContract,
    type IFormContractIssue,
} from "@components/Forms/utils/html-form-contract";
import {
    contractResolutionIssues,
    describeResolvedContract,
    resolveFormContract,
} from "@components/Forms/utils/resolve-form-contract";
import {
    isDiscreteField,
    resolveHiddenValues,
    validateFieldValue,
    validateFormValues,
} from "@components/Forms/utils/html-form-values";
import type {
    BaseField,
    TextLikeField,
    TextareaField,
    SelectField,
    RadioGroupField,
    CheckboxSingleField,
    CheckboxGroupField,
    FileField,
    HiddenField,
    AnyField,
    ParsedForm,
    ValueState,
    IProtocolHtmlFormProps,
} from "../types/protocol-html-form-types";

import { useHtmlFormSubmitMutation, useHtmlFormFetchQuery } from "@store/api";
// --- Helper: label resolution -------------------------------------------------

function getLabelForInput(input: Element, formEl: HTMLFormElement): string | undefined {
    const id = (input as HTMLInputElement).id;
    if (id) {
        const byFor = formEl.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (byFor && byFor.textContent) return byFor.textContent.trim();
    }
    // If input is wrapped by a <label> ancestor
    let parent: Element | null = input.parentElement;
    while (parent) {
        if (parent.tagName.toLowerCase() === "label" && parent.textContent) {
            return parent.textContent.trim();
        }
        parent = parent.parentElement;
    }
    return undefined;
}

// --- Parser: from HTML to field metadata -------------------------------------

export function parseFormHtml(formHtml: string): ParsedForm {
    const doc = new DOMParser().parseFromString(formHtml, "text/html");
    const formEls = doc.querySelectorAll("form");
    const formEl = formEls[0] as HTMLFormElement | undefined;
    if (!formEl) {
        return {
            method: "GET",
            action: "",
            fields: [],
            hasForm: false,
            formCount: 0,
        };
    }

    const method = (formEl.getAttribute("method") || "GET").toUpperCase();
    const action = formEl.getAttribute("action") || "";
    const enctype = formEl.getAttribute("enctype");

    // Single pass over all controls in document order so rendered fields keep
    // the sequence the seller authored in the HTML. Radio/checkbox inputs that
    // share a name become one grouped field, anchored at the slot of the
    // group's first occurrence (reserved during the pass, filled in after).
    const controls = Array.from(formEl.querySelectorAll("input, textarea, select"));

    const radioMap = new Map<string, { index: number; radios: HTMLInputElement[] }>();
    const checkboxMap = new Map<string, { index: number; boxes: HTMLInputElement[] }>();

    const fields: AnyField[] = [];

    const supportedTypes = new Set([
        "text",
        "password",
        "email",
        "number",
        "date",
        "datetime-local",
        "month",
        "time",
        "url",
        "tel",
        "search",
    ]);

    for (const el of controls) {
        const name = el.getAttribute("name") || "";
        if (!name) continue;
        const tag = el.tagName.toLowerCase();

        if (tag === "textarea") {
            const ta = el as HTMLTextAreaElement;
            fields.push({
                kind: "textarea",
                name,
                label: getLabelForInput(ta, formEl),
                required: ta.hasAttribute("required"),
                disabled: ta.hasAttribute("disabled"),
                id: ta.id || null,
                defaultValue: ta.value ?? ta.textContent ?? "",
                placeholder: ta.getAttribute("placeholder") ?? undefined,
                rows: ta.hasAttribute("rows") ? Number(ta.getAttribute("rows")) : undefined,
                minLength: ta.getAttribute("minlength") ?? undefined,
                maxLength: ta.getAttribute("maxlength") ?? undefined,
            } as TextareaField);
            continue;
        }

        if (tag === "select") {
            const sel = el as HTMLSelectElement;
            const options = Array.from(sel.querySelectorAll("option")).map((opt) => ({
                value: opt.getAttribute("value") ?? opt.textContent ?? "",
                label: opt.textContent ?? "",
                selected: opt.hasAttribute("selected"),
            }));
            fields.push({
                kind: "select",
                name,
                label: getLabelForInput(sel, formEl),
                required: sel.hasAttribute("required"),
                disabled: sel.hasAttribute("disabled"),
                id: sel.id || null,
                multiple: sel.hasAttribute("multiple"),
                options,
            } as SelectField);
            continue;
        }

        const input = el as HTMLInputElement;
        const type = (input.getAttribute("type") || "text").toLowerCase();

        const common: Partial<BaseField> = {
            name,
            label: getLabelForInput(input, formEl),
            required: input.hasAttribute("required"),
            disabled: input.hasAttribute("disabled"),
            id: input.id || null,
        };

        if (type === "radio") {
            const entry = radioMap.get(name);
            if (entry) {
                entry.radios.push(input);
            } else {
                radioMap.set(name, { index: fields.length, radios: [input] });
                fields.push(null as unknown as AnyField); // reserved, filled in below
            }
            continue;
        }

        if (type === "checkbox") {
            const entry = checkboxMap.get(name);
            if (entry) {
                entry.boxes.push(input);
            } else {
                checkboxMap.set(name, { index: fields.length, boxes: [input] });
                fields.push(null as unknown as AnyField); // reserved, filled in below
            }
            continue;
        }

        if (type === "hidden") {
            fields.push({
                kind: "hidden",
                ...common,
                value: input.getAttribute("value") ?? "",
            } as HiddenField);
            continue;
        }

        if (type === "file") {
            fields.push({
                kind: "file",
                ...common,
                multiple: input.hasAttribute("multiple"),
                accept: input.getAttribute("accept"),
            } as FileField);
            continue;
        }

        const inputType = supportedTypes.has(type) ? (type as TextLikeField["inputType"]) : "text";

        fields.push({
            kind: "textlike",
            ...common,
            inputType,
            defaultValue: input.getAttribute("value") ?? "",
            placeholder: input.getAttribute("placeholder") ?? undefined,
            min: input.getAttribute("min") ?? undefined,
            max: input.getAttribute("max") ?? undefined,
            step: input.getAttribute("step") ?? undefined,
            pattern: input.getAttribute("pattern") ?? undefined,
            minLength: input.getAttribute("minlength") ?? undefined,
            maxLength: input.getAttribute("maxlength") ?? undefined,
        } as TextLikeField);
    }

    // Fill radio groups into their reserved slots
    for (const [name, { index, radios }] of radioMap.entries()) {
        const label = radios.map((r) => getLabelForInput(r, formEl)).find(Boolean);
        fields[index] = {
            kind: "radio-group",
            name,
            label,
            required: radios.some((r) => r.hasAttribute("required")),
            id: null,
            options: radios.map((r) => ({
                value: r.getAttribute("value") ?? "",
                label: getLabelForInput(r, formEl),
                checked: r.hasAttribute("checked"),
            })),
        } as RadioGroupField;
    }

    // Fill checkboxes into their reserved slots: single vs group
    for (const [name, { index, boxes }] of checkboxMap.entries()) {
        if (boxes.length === 1) {
            const box = boxes[0];
            fields[index] = {
                kind: "checkbox-single",
                name,
                label: getLabelForInput(box, formEl),
                required: box.hasAttribute("required"),
                id: box.id || null,
                valueAttr: box.getAttribute("value") ?? "on",
                checked: box.hasAttribute("checked"),
            } as CheckboxSingleField;
        } else {
            fields[index] = {
                kind: "checkbox-group",
                name,
                label: boxes.map((b) => getLabelForInput(b, formEl)).find(Boolean),
                required: boxes.some((b) => b.hasAttribute("required")),
                id: null,
                options: boxes.map((b) => ({
                    value: b.getAttribute("value") ?? "on",
                    label: getLabelForInput(b, formEl),
                    checked: b.hasAttribute("checked"),
                })),
            } as CheckboxGroupField;
        }
    }

    return { method, action, enctype, fields, hasForm: true, formCount: formEls.length };
}

// --- Helper: build initial field values --------------------------------------------------------
// hiddenValues carries the resolved value for every hidden field (see resolveHiddenValues): the
// session's transaction id and the xinput form id override whatever placeholder the HTML declared,
// and anything else falls back to the declared value or a matching form-URL query param.

export function buildInitialValues(
    fields: AnyField[],
    hiddenValues: Record<string, string> = {}
): ValueState {
    const v: ValueState = {};
    for (const f of fields) {
        switch (f.kind) {
            case "hidden": {
                v[f.name] = hiddenValues[f.name] ?? (f as HiddenField).value ?? "";
                break;
            }
            case "textlike": {
                const tf = f as TextLikeField;
                v[f.name] = tf.defaultValue ?? "";
                break;
            }
            case "textarea": {
                const ta = f as TextareaField;
                v[f.name] = ta.defaultValue ?? "";
                break;
            }
            case "select": {
                const sel = f as SelectField;
                const selected = sel.options.filter((o) => o.selected).map((o) => o.value);
                v[f.name] = sel.multiple ? selected : (selected[0] ?? "");
                break;
            }
            case "radio-group": {
                const rg = f as RadioGroupField;
                v[f.name] = rg.options.find((o) => o.checked)?.value ?? "";
                break;
            }
            case "checkbox-single": {
                const cs = f as CheckboxSingleField;
                v[f.name] = !!cs.checked;
                break;
            }
            case "checkbox-group": {
                const cg = f as CheckboxGroupField;
                v[f.name] = cg.options.filter((o) => o.checked).map((o) => o.value);
                break;
            }
            case "file": {
                v[f.name] = null; // File or File[]
                break;
            }
        }
    }
    return v;
}

export default function ProtocolHTMLForm({
    submitEvent,
    referenceData,
    HtmlFormConfigInFlow,
    contractContext,
    transactionId,
}: IProtocolHtmlFormProps) {
    // Value the step's `reference` points at. Normally embedded HTML, but when the upstream
    // service saved the xinput.form.url without fetching it, it is the seller URL itself.
    // Session-saved keys hold jsonpath.query results (arrays), so unwrap to the first string.
    const referencedValue = useMemo<string>(() => {
        const raw = queryJsonPath(
            { reference_data: referenceData },
            HtmlFormConfigInFlow.reference || ""
        )[0];
        const value = Array.isArray(raw) ? raw.find((v) => typeof v === "string") : raw;
        return typeof value === "string" ? value : "";
    }, [referenceData, HtmlFormConfigInFlow.reference]);

    // Resolve the seller form URL: explicit url mode uses `urlReference`; otherwise auto-detect a
    // URL sitting where HTML was expected and fetch it instead of parsing the URL string as HTML.
    const formUrl = useMemo<string>(() => {
        if (HtmlFormConfigInFlow.htmlSource === "url") {
            const raw = queryJsonPath(
                { reference_data: referenceData },
                HtmlFormConfigInFlow.urlReference || ""
            )[0];
            const value = Array.isArray(raw) ? raw.find((v) => typeof v === "string") : raw;
            return typeof value === "string" ? value : "";
        }
        return /^https?:\/\/\S+$/i.test(referencedValue.trim()) ? referencedValue.trim() : "";
    }, [
        referenceData,
        HtmlFormConfigInFlow.htmlSource,
        HtmlFormConfigInFlow.urlReference,
        referencedValue,
    ]);

    const useUrl = !!formUrl;

    // Fetch the seller-hosted form HTML through the backend proxy (browser can't, due to CORS)
    const {
        data: fetchedHtml,
        isFetching: isFetchingForm,
        error: fetchError,
    } = useHtmlFormFetchQuery({ link: formUrl }, { skip: !useUrl });

    // HTML source: fetched seller form (url mode) or embedded reference_data (default)
    const formHtml = useMemo<string>(() => {
        if (useUrl) return typeof fetchedHtml === "string" ? fetchedHtml : "";
        return referencedValue;
    }, [useUrl, fetchedHtml, referencedValue]);

    // Query params carried on the seller URL, used to back-fill empty hidden fields
    const urlParams = useMemo<Record<string, string>>(() => {
        if (!useUrl || !formUrl) return {};
        try {
            return Object.fromEntries(new URL(formUrl).searchParams);
        } catch {
            return {};
        }
    }, [useUrl, formUrl]);

    // Parse once per formHtml
    const parsed = useMemo<ParsedForm>(() => parseFormHtml(formHtml), [formHtml]);
    const [htmlFormSubmitMutation] = useHtmlFormSubmitMutation();

    // The xinput form id sits next to the form url in reference_data, so derive its path from
    // urlReference (…xinput.form.url → …xinput.form.id) unless the flow points at it explicitly.
    const formId = useMemo<string>(() => {
        const reference =
            HtmlFormConfigInFlow.formIdReference ||
            (HtmlFormConfigInFlow.urlReference || "").replace(/\.url$/, ".id");
        if (!reference) return "";
        const value = queryJsonPath({ reference_data: referenceData }, reference)[0];
        return typeof value === "string" ? value : "";
    }, [referenceData, HtmlFormConfigInFlow.formIdReference, HtmlFormConfigInFlow.urlReference]);

    // Protocol-owned hidden fields: the session's transaction id and the real form id replace the
    // placeholders seller forms ship (`FO1`, stale UUIDs), so the seller receives the live values.
    const hiddenValues = useMemo(
        () =>
            resolveHiddenValues(parsed.fields, {
                ids: {
                    transactionId: transactionId || urlParams.transaction_id,
                    formId: formId || urlParams.form_id || urlParams.formId,
                },
                urlParams,
            }),
        [parsed, transactionId, formId, urlParams]
    );

    // Which form is this step showing? Resolved per form name, so each form gets its own contract.
    const resolvedContract = useMemo(
        () => resolveFormContract(HtmlFormConfigInFlow, { formUrl, context: contractContext }),
        [HtmlFormConfigInFlow, formUrl, contractContext]
    );

    // Contract validation: is the form the flow expected actually what the seller returned?
    // Skipped while the fetch is in flight or has failed — those states have their own messages.
    const contractIssues = useMemo<IFormContractIssue[]>(() => {
        if (useUrl && (isFetchingForm || fetchError)) return [];
        return [
            ...contractResolutionIssues(resolvedContract),
            ...validateFormContract({
                parsed,
                formHtml,
                expectedFields: resolvedContract.expectedFields,
                hiddenValues,
                isUrlSource: useUrl,
            }),
        ];
    }, [parsed, formHtml, resolvedContract, hiddenValues, useUrl, isFetchingForm, fetchError]);

    // Build initial state from defaults/selected, with hidden fields already resolved
    const [values, setValues] = useState<ValueState>(() =>
        buildInitialValues(parsed.fields, hiddenValues)
    );

    // In url mode the form arrives asynchronously — rebuild values once it parses.
    useEffect(() => {
        setValues(buildInitialValues(parsed.fields, hiddenValues));
    }, [parsed]);

    // The transaction/form ids can resolve after the form has parsed. Patch just the hidden fields
    // so a late-arriving id still reaches the seller, without discarding what the tester has typed.
    useEffect(() => {
        setValues((prev) => ({ ...prev, ...hiddenValues }));
    }, [hiddenValues]);

    const [submissionId, setSubmissionId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Applies (or clears) the error for a single field.
    const setFieldError = (name: string, message?: string) => {
        setFieldErrors((prev) => {
            if (!message) {
                if (!prev[name]) return prev;
                const next = { ...prev };
                delete next[name];
                return next;
            }
            if (prev[name] === message) return prev;
            return { ...prev, [name]: message };
        });
    };

    // Change handlers
    const setField = (name: string, val: unknown) => {
        setValues((prev: ValueState) => ({
            ...prev,
            [name]: val as ValueState[string],
        }));

        const field = parsed.fields.find((candidate) => candidate.name === name);
        // Discrete controls change in one step, so re-check them immediately with the incoming value
        // (state is not settled yet). Free-text fields are re-checked on blur instead.
        if (field && isDiscreteField(field)) {
            setFieldError(name, validateFieldValue(field, val as ValueState[string]));
            return;
        }
        setFieldError(name, undefined);
    };

    // Re-check a free-text field once the tester leaves it.
    const handleFieldBlur = (name: string) => {
        const field = parsed.fields.find((candidate) => candidate.name === name);
        if (!field) return;
        setFieldError(name, validateFieldValue(field, values[name]));
    };

    const validateForm = (): boolean => {
        const errors = validateFormValues(parsed.fields, values);
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Submit the rebuilt form
    const handleSubmit = async () => {
        // Validate form before submission
        const isValid = validateForm();

        if (!isValid) {
            setError("Please correct the highlighted fields");
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);

            // Decide encoding: multipart/form-data by default (per the xinput spec, text/html
            // forms are submitted with Content-Type: multipart/form-data); url-encoded only
            // when the form explicitly declares it. Nested FormData cannot go through the
            // JSON `{ link, data }` proxy (JSON.stringify(FormData) === "{}"), so multipart
            // uses a plain object the backend proxy rebuilds into FormData.
            const useMultipart = !(parsed.enctype || "")
                .toLowerCase()
                .includes("application/x-www-form-urlencoded");

            let res: AxiosResponse<unknown, unknown>;
            if (useMultipart) {
                const payload: Record<string, string | string[]> = {};
                const append = (name: string, value: string) => {
                    const existing = payload[name];
                    if (existing === undefined) {
                        payload[name] = value;
                    } else if (Array.isArray(existing)) {
                        existing.push(value);
                    } else {
                        payload[name] = [existing, value];
                    }
                };

                for (const f of parsed.fields) {
                    const val = values[f.name];
                    if (f.kind === "checkbox-single") {
                        if (val === true) {
                            append(f.name, (f as CheckboxSingleField).valueAttr ?? "on");
                        }
                    } else if (f.kind === "checkbox-group") {
                        const arr = (val as string[]) || [];
                        for (const item of arr) append(f.name, item);
                    } else if (f.kind === "radio-group") {
                        if (typeof val === "string" && val !== "") append(f.name, val);
                    } else if (f.kind === "select") {
                        if ((f as SelectField).multiple) {
                            const arr = (val as string[]) || [];
                            for (const item of arr) append(f.name, item);
                        } else if (typeof val === "string") {
                            append(f.name, val);
                        }
                    } else if (f.kind === "file") {
                        // Binary cannot cross the JSON proxy; filenames only
                        // (the previous FormData File appends were already dropped
                        // by JSON serialization).
                        if (Array.isArray(val)) {
                            for (const file of val) append(f.name, (file as File)?.name ?? "");
                        } else if (val instanceof File) {
                            append(f.name, val.name);
                        }
                    } else if (
                        f.kind === "hidden" ||
                        f.kind === "textlike" ||
                        f.kind === "textarea"
                    ) {
                        if (val != null) append(f.name, String(val));
                    }
                }

                const submitData = await htmlFormSubmitMutation({
                    link: parsed.action || window.location.href,
                    data: payload,
                    enctype: "multipart/form-data",
                }).unwrap();
                res = { data: submitData, headers: undefined } as unknown as AxiosResponse<
                    unknown,
                    unknown
                >;
            } else {
                const params = new URLSearchParams();
                for (const f of parsed.fields) {
                    const val = values[f.name];
                    if (f.kind === "checkbox-single") {
                        if (val === true) {
                            const v = (f as CheckboxSingleField).valueAttr ?? "on";
                            params.append(f.name, v);
                        }
                    } else if (f.kind === "checkbox-group") {
                        const arr = (val as string[]) || [];
                        for (const item of arr) params.append(f.name, item);
                    } else if (f.kind === "radio-group") {
                        if (typeof val === "string" && val !== "") params.append(f.name, val);
                    } else if (f.kind === "select") {
                        if ((f as SelectField).multiple) {
                            const arr = (val as string[]) || [];
                            for (const item of arr) params.append(f.name, item);
                        } else if (typeof val === "string") {
                            params.append(f.name, val);
                        }
                    } else if (f.kind === "file") {
                        // no files -> skip in urlencoded mode
                    } else if (
                        f.kind === "hidden" ||
                        f.kind === "textlike" ||
                        f.kind === "textarea"
                    ) {
                        if (val != null) params.append(f.name, String(val));
                    }
                }

                const submitData = await htmlFormSubmitMutation({
                    link: parsed.action || window.location.href,
                    data: params.toString(),
                    enctype: "application/x-www-form-urlencoded",
                }).unwrap();
                res = { data: submitData, headers: undefined } as unknown as AxiosResponse<
                    unknown,
                    unknown
                >;
            }
            // Parse response
            const rawCt =
                typeof res.headers === "object"
                    ? (res.headers["content-type"] ?? res.headers["Content-Type"])
                    : undefined;
            const ct =
                typeof rawCt === "string" ? rawCt : Array.isArray(rawCt) ? (rawCt[0] ?? "") : "";
            let data: {
                submission_id?: string;
                data?: { submission_id?: string };
                result?: { submission_id?: string };
            };
            if (ct.includes("application/json")) {
                data = res.data as {
                    submission_id?: string;
                    data?: { submission_id?: string };
                    result?: { submission_id?: string };
                };
            } else {
                const text = typeof res.data === "string" ? res.data : String(res.data);
                const match = text.match(/"submission_id"\s*:\s*"([^"]+)"/i);
                data = match
                    ? { submission_id: match[1] }
                    : (res.data as {
                          submission_id?: string;
                          data?: { submission_id?: string };
                          result?: { submission_id?: string };
                      });
                // data = match ? { submission_id: match[1] } : { raw: text };
            }

            const finalSubmissionId =
                data?.submission_id ??
                data?.data?.submission_id ??
                data?.result?.submission_id ??
                "";
            if (!finalSubmissionId) {
                throw new Error("No submission_id returned by the form endpoint.");
            }

            setSubmissionId(finalSubmissionId);

            // Build a simple key/value payload for your pipeline
            const plainPayload: Record<string, string> = {};
            for (const f of parsed.fields) {
                const val = values[f.name];
                if (f.kind === "checkbox-group" || (f.kind === "select" && f.multiple)) {
                    (val as string[] | undefined)?.forEach((v, i) => {
                        plainPayload[`${f.name}[${i}]`] = v;
                    });
                } else if (f.kind === "file") {
                    // send filenames only to your submitEvent; upstream already got binary
                    if (Array.isArray(val)) {
                        val.forEach(
                            (file, i) =>
                                (plainPayload[`${f.name}[${i}]`] = (file as File)?.name ?? "")
                        );
                    } else if (val instanceof File) {
                        plainPayload[f.name] = val.name;
                    }
                } else if (typeof val === "boolean") {
                    if (val) {
                        // emulate HTML checkbox submit value
                        const v = (f as CheckboxSingleField).valueAttr ?? "on";
                        plainPayload[f.name] = v;
                    }
                } else if (val != null) {
                    plainPayload[f.name] = String(val);
                }
            }
            // const Subdata = {
            //   jsonpath: { submission_id: finalSubmissionId },
            //   formData: { submission_id: finalSubmissionId },
            // };

            await submitEvent({
                jsonPath: { submission_id: finalSubmissionId },
                formData: { submission_id: finalSubmissionId },
            });
        } catch (e: unknown) {
            console.error(e);
            setError((e as Error)?.message || "Submission failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    const errorCount = Object.keys(fieldErrors).length;

    return (
        <FormDialogShell
            onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
            }}
            footer={
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting
                        ? "Submitting..."
                        : errorCount > 0
                          ? `Fix ${errorCount} Error${errorCount > 1 ? "s" : ""}`
                          : "Submit"}
                </Button>
            }
        >
            <div className="space-y-4 rounded-lg border border-border-default p-4">
                {useUrl && isFetchingForm && (
                    <p className="text-sm text-text-secondary">Loading form from seller…</p>
                )}
                {useUrl && fetchError && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                        <span className="font-medium text-destructive wrap-break-word">
                            Failed to load seller form
                            {formUrl ? ` (${formUrl})` : ""}.
                        </span>
                    </div>
                )}
                <FormContractIssues
                    issues={contractIssues}
                    contractSummary={describeResolvedContract(resolvedContract)}
                />
                <div className="grid grid-cols-1 gap-4">
                    {parsed.fields.map((field, index) => (
                        <div key={`${field.name}-${index}`}>
                            <ProtocolHtmlFieldRenderer
                                field={field}
                                value={values[field.name]}
                                onValueChange={(nextValue) => setField(field.name, nextValue)}
                                onBlur={() => handleFieldBlur(field.name)}
                                error={fieldErrors[field.name]}
                            />
                        </div>
                    ))}
                </div>

                {errorCount > 0 && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                        <p className="text-sm font-medium text-destructive">
                            Please correct {errorCount} field
                            {errorCount > 1 ? "s" : ""}:
                        </p>
                        <ul className="mt-1 list-inside list-disc text-sm text-destructive">
                            {Object.values(fieldErrors).map((fieldError, index) => (
                                <li key={index}>{fieldError}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {parsed.action && (
                    <p className="text-xs text-text-secondary wrap-break-word">
                        POST to <code className="break-all">{parsed.action}</code>
                    </p>
                )}

                <div className="space-y-2 text-sm wrap-break-word">
                    {submissionId && (
                        <p className="text-success-600">
                            Received submission_id:{" "}
                            <code className="break-all">{submissionId}</code>
                        </p>
                    )}
                    {error && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                            <span className="font-medium text-destructive wrap-break-word">
                                Error: {error}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </FormDialogShell>
    );
}
