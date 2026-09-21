import { type FC, type ReactNode } from "react";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import GithubMarkdown from "@components/GithubMarkdown";
import type { XinputInfo, XinputObject } from "./xinputInfo";
import xinputReadmeRaw from "./xinput_readme.md?raw";

const xinputReadme = typeof xinputReadmeRaw === "string" ? xinputReadmeRaw : "";

interface XinputFormPanelProps {
    info: XinputInfo;
    /** action_id / api of the selected step, for headings. */
    actionLabel: string;
}

const card =
    "border border-slate-200 dark:border-border-default rounded-lg bg-white dark:bg-surface-elevated overflow-scroll";

const MetaRow: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
    <div className="flex gap-3 px-4 py-2 border-b border-slate-100 dark:border-border-default last:border-b-0 text-sm">
        <span className="w-44 shrink-0 text-slate-500 dark:text-n-40">{label}</span>
        <span className="min-w-0 break-all text-slate-800 dark:text-n-10">{children}</span>
    </div>
);

const BoolBadge: FC<{ value: boolean | undefined }> = ({ value }) => {
    if (value == null) return <span className="text-slate-400 dark:text-n-40">—</span>;
    return (
        <span
            className={cn(
                "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                value
                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-slate-100 text-slate-600 dark:bg-surface-muted dark:text-n-30"
            )}
        >
            {value ? "Yes" : "No"}
        </span>
    );
};

const XinputCard: FC<{ path: string; xinput: XinputObject }> = ({ path, xinput }) => {
    const { head, form, form_response: formResponse, required } = xinput;
    const multipleSubmissions = form?.multiple_submissions ?? form?.multiple_sumbissions;
    const indexText = head?.index
        ? `${head.index.cur ?? "—"} of ${head.index.min ?? "—"}–${head.index.max ?? "—"} (cur of min–max)`
        : null;

    return (
        <div className={card}>
            <div className="flex items-baseline justify-between gap-3 px-4 py-2.5 bg-slate-50 dark:bg-surface-muted border-b border-slate-200 dark:border-border-default">
                <span className="font-semibold text-sm text-slate-800 dark:text-n-10">
                    {head?.descriptor?.name ?? form?.id ?? "Form reference"}
                </span>
                <code className="text-xs text-slate-500 dark:text-n-40 break-all">{path}</code>
            </div>
            {form?.id && <MetaRow label="Form id">{form.id}</MetaRow>}
            {form?.url && (
                <MetaRow label="Form URL">
                    <a
                        href={form.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand-normal hover:underline"
                    >
                        {form.url}
                        <ArrowTopRightOnSquareIcon className="size-3.5 shrink-0" />
                    </a>
                </MetaRow>
            )}
            {form?.mime_type && <MetaRow label="MIME type">{form.mime_type}</MetaRow>}
            {head?.headings && head.headings.length > 0 && (
                <MetaRow label="Headings">{head.headings.join(", ")}</MetaRow>
            )}
            {indexText && <MetaRow label="Form index">{indexText}</MetaRow>}
            <MetaRow label="Required">
                <BoolBadge value={required} />
            </MetaRow>
            {form && "resubmit" in form && (
                <MetaRow label="Resubmit allowed">
                    <BoolBadge value={form.resubmit} />
                </MetaRow>
            )}
            {multipleSubmissions != null && (
                <MetaRow label="Multiple submissions">
                    <BoolBadge value={multipleSubmissions} />
                </MetaRow>
            )}
            {formResponse?.status && (
                <MetaRow label="Response status">{formResponse.status}</MetaRow>
            )}
            {formResponse?.submission_id && (
                <MetaRow label="Submission id">{formResponse.submission_id}</MetaRow>
            )}
        </div>
    );
};

const formatValue = (v: unknown): string => {
    if (v == null || v === "") return "—";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
};

/**
 * "Form (x-input)" tab body: the xinput form references found in the selected example
 * payload, and — for html_form / dynamic_form steps — the example submission fields.
 */

const XinputFormPanel: FC<XinputFormPanelProps> = ({ info, actionLabel }) => (
    <div className="flex flex-col gap-4 overflow-y-auto pb-4">
        {info.isFormStep && info.formSubmission && (
            <div className={card}>
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-surface-muted border-b border-slate-200 dark:border-border-default">
                    <span className="font-semibold text-sm text-slate-800 dark:text-n-10">
                        Example form submission
                    </span>
                    <span className="ml-2 text-xs text-slate-500 dark:text-n-40">
                        fields the user submits in {actionLabel}
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-n-40 border-b border-slate-200 dark:border-border-default">
                                <th className="px-4 py-2 font-medium">Field</th>
                                <th className="px-4 py-2 font-medium">Example value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(info.formSubmission).map(([field, value]) => (
                                <tr
                                    key={field}
                                    className="border-b border-slate-100 dark:border-border-default last:border-b-0"
                                >
                                    <td className="px-4 py-2 font-mono text-xs text-slate-800 dark:text-n-10 whitespace-nowrap">
                                        {field}
                                    </td>
                                    <td className="px-4 py-2 text-slate-600 dark:text-n-30 break-all">
                                        {formatValue(value)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {info.occurrences.map(({ path, xinput }) => (
            <XinputCard key={path} path={path} xinput={xinput} />
        ))}

        {/* Protocol reference: how xinput forms work (seller-side form, mime types, form response). */}
        <div className={card}>
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-surface-muted border-b border-slate-200 dark:border-border-default">
                <span className="font-semibold text-sm text-slate-800 dark:text-n-10">
                    XInput reference
                </span>
                <span className="ml-2 text-xs text-slate-500 dark:text-n-40">
                    how form exchange works in the protocol
                </span>
            </div>
            <div className="px-4 py-3">
                <GithubMarkdown content={xinputReadme} />
            </div>
        </div>
    </div>
);

export default XinputFormPanel;
