import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { FlowInformationSection } from "./types";
import { useDeferredReveal } from "./useDeferredReveal";
import { resolveDefaultSection } from "./utils";

const KNOWN_SECTIONS: FlowInformationSection[] = [
    "sequence",
    "preview",
    "x-validations",
    "request",
    "response",
    "xinput-form",
    "html-form",
];

interface UseFlowDetailSectionParams {
    selectedFlowAction: string;
    availableSections: FlowInformationSection[];
    /** Called when the section resets to a default (e.g. on action change) so the caller can reset its own example index. */
    onSectionReset: () => void;
}

/**
 * Owns the "Details" tab state (sequence/preview/request/response/x-validations)
 * and keeps it in sync with the `tab` URL param. Mounting of the heavy
 * FlowActionDetails/JsonViewer tree is deferred via useDeferredReveal so the
 * loader paints first.
 */
export function useFlowDetailSection({
    selectedFlowAction,
    availableSections,
    onSectionReset,
}: UseFlowDetailSectionParams) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeSection, setActiveSection] = useState<FlowInformationSection>("preview");
    const isFirstActionEffect = useRef(true);
    const {
        visible: showPreviewDetails,
        schedule: scheduleShowDetails,
        hide: hidePreviewDetails,
    } = useDeferredReveal();

    const urlTab = searchParams.get("tab") as FlowInformationSection | null;

    const isSectionAvailable = useCallback(
        (section: FlowInformationSection | null): section is FlowInformationSection =>
            !!section && KNOWN_SECTIONS.includes(section) && availableSections.includes(section),
        [availableSections]
    );

    useEffect(() => {
        if (isFirstActionEffect.current) {
            isFirstActionEffect.current = false;
            if (isSectionAvailable(urlTab)) {
                setActiveSection(urlTab);
                return;
            }
        }

        if (isSectionAvailable(urlTab)) {
            if (activeSection !== urlTab) {
                setActiveSection(urlTab);
                if (urlTab === "preview") {
                    scheduleShowDetails();
                } else {
                    hidePreviewDetails();
                }
            }
            return;
        }

        const defaultSection = resolveDefaultSection();

        setActiveSection(defaultSection);
        onSectionReset();
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.set("tab", defaultSection);
                next.delete("attr");
                next.delete("panel");
                return next;
            },
            { replace: true }
        );
        if (defaultSection === "preview") {
            scheduleShowDetails();
        } else {
            hidePreviewDetails();
        }
    }, [
        selectedFlowAction,
        isSectionAvailable,
        scheduleShowDetails,
        hidePreviewDetails,
        urlTab,
        setSearchParams,
        onSectionReset,
    ]);

    const handleSectionChange = useCallback(
        (section: FlowInformationSection) => {
            setActiveSection(section);
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    next.set("tab", section);
                    next.delete("attr");
                    next.delete("panel");
                    return next;
                },
                { replace: true }
            );
            if (section === "preview") {
                scheduleShowDetails();
            } else {
                hidePreviewDetails();
            }
        },
        [setSearchParams, scheduleShowDetails, hidePreviewDetails]
    );

    return {
        activeSection,
        showPreviewDetails,
        handleSectionChange,
    };
}
