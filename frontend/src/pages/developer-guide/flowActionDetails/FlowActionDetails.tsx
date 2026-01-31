import React, { FC, useState, useCallback } from "react";
import { FaCopy } from "react-icons/fa";
import { FiMaximize2 } from "react-icons/fi";
import Tabs from "@components/ui/mini-components/tabs";
import JsonViewer from "@pages/protocol-playground/ui/Json-path-extractor";
import { SelectedType } from "@pages/protocol-playground/ui/session-data-tab";
import type { OpenAPISpecification } from "../types";
import { getActionAttributes } from "./schemaAttributes";
import AttributesPanel from "./AttributesPanel";

const TAB_OPTIONS = [
    { key: "documentation", label: "Documentation" },
    { key: "ai-driven", label: "Ai Driven" },
];

function getValueAtPath(obj: unknown, path: string): unknown {
    const parts = path
        .replace(/^\$\.?/, "")
        .split(".")
        .filter(Boolean);
    let cur: unknown = obj;
    for (const p of parts) {
        if (cur == null || typeof cur !== "object") return undefined;
        cur = (cur as Record<string, unknown>)[p];
    }
    return cur;
}

interface FlowActionDetailsProps {
    exampleValue: object;
    actionApi: string;
    spec: OpenAPISpecification | null | undefined;
    useCaseId?: string;
}

const FlowActionDetails: FC<FlowActionDetailsProps> = ({
    exampleValue,
    actionApi,
    spec,
    useCaseId,
}) => {
    const [activeTab, setActiveTab] = useState("documentation");
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    const handleKeyClick = useCallback((path: string, _k: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedPath(path);
    }, []);

    const isSelected = useCallback(
        (path: string) => ({
            status: selectedPath === path,
            type: selectedPath === path ? SelectedType.SaveData : null,
        }),
        [selectedPath]
    );

    const valueAtPath = selectedPath ? getValueAtPath(exampleValue, selectedPath) : undefined;
    const attributes = selectedPath
        ? getActionAttributes(spec, actionApi, selectedPath, valueAtPath, useCaseId)
        : null;

    const root = (
        <div className="flex flex-col h-full border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
            <div className="flex items-center justify-between gap-4 px-4 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
                <Tabs
                    options={TAB_OPTIONS}
                    defaultTab="documentation"
                    onSelectOption={setActiveTab}
                />
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() =>
                            void navigator.clipboard.writeText(
                                JSON.stringify(exampleValue, null, 2)
                            )
                        }
                        className="p-2 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                        title="Copy JSON"
                    >
                        <FaCopy className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setExpanded((e) => !e)}
                        className="p-2 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                        title={expanded ? "Exit fullscreen" : "Expand"}
                    >
                        <FiMaximize2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="flex-1 flex min-h-0">
                {activeTab === "documentation" && (
                    <>
                        <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200">
                            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50/80 text-xs text-gray-500">
                                Selected action value • Click keys to view attributes
                            </div>
                            <div className="flex-1 min-h-0 overflow-auto bg-gray-900 p-3">
                                <JsonViewer
                                    data={
                                        exampleValue as React.ComponentProps<
                                            typeof JsonViewer
                                        >["data"]
                                    }
                                    isSelected={isSelected}
                                    handleKeyClick={handleKeyClick}
                                />
                            </div>
                        </div>
                        <div className="w-[320px] shrink-0 flex flex-col min-h-0 p-3 bg-gray-50/50">
                            <AttributesPanel attributes={attributes} />
                        </div>
                    </>
                )}
                {activeTab === "ai-driven" && (
                    <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-8">
                        Ai Driven view — coming soon
                    </div>
                )}
            </div>
        </div>
    );

    if (expanded) {
        return (
            <div className="fixed inset-0 z-50 bg-white flex flex-col">
                <div className="flex justify-end gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50">
                    <button
                        type="button"
                        onClick={() => setExpanded(false)}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        Exit fullscreen
                    </button>
                </div>
                <div className="flex-1 min-h-0 p-4">
                    <div className="h-full w-full max-w-6xl mx-auto">{root}</div>
                </div>
            </div>
        );
    }
    return root;
};

export default FlowActionDetails;
