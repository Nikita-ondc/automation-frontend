import { useMemo, useState, type FC } from "react";
import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { Button } from "@components/Shadcn/Button";
import { useClipboard } from "@hooks/useClipboard";
import {
    buildInitialValues,
    parseFormHtml,
} from "@components/Forms/custom-forms/protocol-html-form";
import ProtocolHtmlFieldRenderer from "@components/Forms/custom-forms/protocol-html-field-renderer";
import type { ValueState } from "@components/Forms/types/protocol-html-form-types";

interface HtmlFormPreviewTabProps {
    formHtml: string;
}

const HtmlFormPreviewTab: FC<HtmlFormPreviewTabProps> = ({ formHtml }) => {
    const parsed = useMemo(() => parseFormHtml(formHtml), [formHtml]);
    const [values, setValues] = useState<ValueState>(() => buildInitialValues(parsed.fields));
    const { copyToClipboard } = useClipboard();

    if (!parsed.hasForm) {
        return (
            <p className="text-sm text-slate-500 dark:text-n-40">
                This step&apos;s form markup could not be parsed.
            </p>
        );
    }

    return (
        <div className="rounded-lg border border-slate-200 dark:border-border-default bg-white dark:bg-surface-elevated p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <p className="text-xs text-slate-500 dark:text-n-40">
                    Preview of the form the NP presents at this step — not connected to a live
                    session, for reference only.
                </p>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void copyToClipboard(formHtml)}
                    title="Copy form HTML"
                    aria-label="Copy form HTML"
                    className="shrink-0"
                >
                    <DocumentDuplicateIcon className="size-4" />
                </Button>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {parsed.fields.map((field, index) => (
                    <div key={`${field.name}-${index}`}>
                        <ProtocolHtmlFieldRenderer
                            field={field}
                            value={values[field.name]}
                            onValueChange={(nextValue) =>
                                setValues((prev) => ({ ...prev, [field.name]: nextValue }))
                            }
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HtmlFormPreviewTab;
