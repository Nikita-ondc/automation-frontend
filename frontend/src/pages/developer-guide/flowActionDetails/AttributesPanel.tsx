import React, { FC } from "react";
import type { ActionAttributes, AttributeDetails, EnumDetails, TagDetails } from "./types";

const HTML_TAG_RE = /<[^>]+>/g;

function stripHtml(html: string): string {
    if (typeof document === "undefined")
        return html.replace(HTML_TAG_RE, " ").replace(/\s+/g, " ").trim();
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent ?? div.innerText ?? "").replace(/\s+/g, " ").trim();
}

function hasHtml(s: string): boolean {
    return /<[^>]+>/.test(s);
}

function safeDescription(s: string): string {
    return hasHtml(s) ? stripHtml(s) : s;
}

interface AttributesPanelProps {
    attributes: ActionAttributes | null;
}

const LabelBadge: FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-medium shrink-0">
        {children}
    </span>
);

const ValueBadge: FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-xs">
        {children}
    </span>
);

const AttrRow: FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-2 border-b border-gray-200 last:border-0 items-start">
        <LabelBadge>{label}</LabelBadge>
        <span className="text-sm text-gray-800 break-words">
            {typeof value === "object" &&
            value !== null &&
            !Array.isArray(value) &&
            !React.isValidElement(value)
                ? String(value)
                : value}
        </span>
    </div>
);

const AttributeSection: FC<{ attrs: AttributeDetails }> = ({ attrs }) => (
    <>
        <div className="space-y-0">
            <AttrRow label="json path" value={<ValueBadge>{attrs.jsonPath}</ValueBadge>} />
            <AttrRow label="Required" value={attrs.required} />
            <AttrRow label="Owner" value={attrs.owner} />
            <AttrRow label="Type" value={attrs.type} />
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="mb-2">
                <LabelBadge>Description</LabelBadge>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {safeDescription(attrs.description)}
            </p>
        </div>
    </>
);

const EnumSection: FC<{ attrs: EnumDetails }> = ({ attrs }) => (
    <>
        <div className="space-y-0">
            <AttrRow label="json path" value={<ValueBadge>{attrs.jsonPath}</ValueBadge>} />
            <AttrRow label="Required" value={attrs.required ?? "—"} />
            <AttrRow label="Owner" value={attrs.owner ?? "—"} />
            <AttrRow label="Type" value={attrs.type ?? "—"} />
            <AttrRow label="ENUMS" value={<ValueBadge>{attrs.enums.join(", ")}</ValueBadge>} />
        </div>
        {attrs.description != null && attrs.description !== "—" && (
            <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="mb-2">
                    <LabelBadge>Description</LabelBadge>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {safeDescription(attrs.description)}
                </p>
            </div>
        )}
        {attrs.enumOptions && attrs.enumOptions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="mb-2">
                    <LabelBadge>Possible values</LabelBadge>
                </div>
                <ul className="space-y-2 text-sm">
                    {attrs.enumOptions.map((o, i) => (
                        <li key={i} className="flex gap-2 flex-wrap">
                            <ValueBadge>{o.code}</ValueBadge>
                            {o.description !== "—" && (
                                <span className="text-gray-700">
                                    {safeDescription(o.description)}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        )}
    </>
);

const TagSection: FC<{ attrs: TagDetails }> = ({ attrs }) => (
    <>
        {attrs.attributeInfo ? (
            <>
                <div className="space-y-0">
                    <AttrRow label="json path" value={<ValueBadge>{attrs.jsonPath}</ValueBadge>} />
                    <AttrRow label="Required" value={attrs.attributeInfo.required} />
                    <AttrRow label="Owner" value={attrs.attributeInfo.owner} />
                    <AttrRow label="Type" value={attrs.attributeInfo.type} />
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="mb-2">
                        <LabelBadge>Description</LabelBadge>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {safeDescription(attrs.attributeInfo.description)}
                    </p>
                </div>
            </>
        ) : (
            <div className="space-y-0">
                <AttrRow label="json path" value={<ValueBadge>{attrs.jsonPath}</ValueBadge>} />
            </div>
        )}
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
            {attrs.tagFields.map((f, i) => (
                <div key={i}>
                    <div className="mb-1">
                        <LabelBadge>{f.label}</LabelBadge>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{safeDescription(f.description)}</p>
                    {f.list && f.list.length > 0 && (
                        <div className="ml-2 mt-1">
                            <span className="text-xs font-medium text-gray-500">
                                Possible values:{" "}
                            </span>
                            <ul className="mt-1 space-y-1 text-sm">
                                {f.list.map((l, j) => (
                                    <li key={j} className="flex gap-2 flex-wrap items-baseline">
                                        <ValueBadge>{l.code}</ValueBadge>
                                        {l.description !== "—" && (
                                            <span className="text-gray-600">
                                                {safeDescription(l.description)}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            ))}
        </div>
    </>
);

const AttributesPanel: FC<AttributesPanelProps> = ({ attributes }) => {
    if (!attributes) {
        return (
            <div className="h-full flex flex-col rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                    <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider">
                        Attributes
                    </h3>
                </div>
                <div className="flex-1 p-4 flex items-center justify-center text-gray-500 text-sm">
                    Select a key in the JSON to view its attributes.
                </div>
            </div>
        );
    }

    const title =
        attributes.kind === "attribute"
            ? "Attributes"
            : attributes.kind === "enum"
              ? "ENUM"
              : "Tags";

    return (
        <div className="h-full flex flex-col rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider">
                    {title}
                </h3>
            </div>
            <div className="flex-1 overflow-auto p-4">
                {attributes.kind === "attribute" && <AttributeSection attrs={attributes} />}
                {attributes.kind === "enum" && <EnumSection attrs={attributes} />}
                {attributes.kind === "tag" && <TagSection attrs={attributes} />}
            </div>
        </div>
    );
};

export default AttributesPanel;
