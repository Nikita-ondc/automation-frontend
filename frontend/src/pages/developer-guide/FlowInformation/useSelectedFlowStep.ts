import { useMemo } from "react";
import type { FlowEntry, ValidationTableAction } from "@pages/developer-guide/types";
import { getActionId } from "@/pages/developer-guide/utils";
import { getExamplesFromStep } from "@/pages/developer-guide/FlowInformation/utils";
import { resolveSequenceMermaid } from "@/pages/developer-guide/FlowInformation/utils";
import { getXinputInfo, hasXinputData } from "@/pages/developer-guide/FlowInformation/xinputInfo";
import { generateStepSequenceMermaid } from "@/pages/developer-guide/FlowInformation/sequenceMermaid";

/**
 * Resolves the currently-selected flow/step and the values derived from it
 * (examples, x-validations, whether the Details tabs should render at all).
 */
export function useSelectedFlowStep(
    flows: FlowEntry[],
    selectedFlow: string,
    selectedFlowAction: string,
    selectedExampleIndex: number,
    validationTable: Record<string, ValidationTableAction> | null,
    domain?: string
) {
    const selectedFlowData = flows.find((f) => f.flowId === selectedFlow);
    const steps = selectedFlowData?.config?.steps ?? [];
    const selectedStep = steps.find((s) => getActionId(s) === selectedFlowAction);
    const examples = useMemo(() => getExamplesFromStep(selectedStep), [selectedStep]);

    const selectedExample = examples[selectedExampleIndex] ?? examples[0];
    const examplePayload = selectedExample?.payload;
    const hasExampleObject =
        examplePayload != null &&
        typeof examplePayload === "object" &&
        !Array.isArray(examplePayload);

    // Authored diagrams from the spec win; otherwise synthesize one from the step structure.
    const sequenceMermaid = useMemo(
        () =>
            resolveSequenceMermaid(selectedFlowData, selectedStep) ??
            generateStepSequenceMermaid(steps, selectedStep, domain),
        [selectedFlowData, selectedStep, steps, domain]
    );

    const apiForValidations = selectedStep?.api ?? selectedFlowAction;
    const selectedValidations = validationTable ? validationTable[apiForValidations] : undefined;
    const hasXValidations = !!selectedValidations;

    const xinputInfo = useMemo(
        () => getXinputInfo(selectedStep, examplePayload),
        [selectedStep, examplePayload]
    );
    const hasXinput = hasXinputData(xinputInfo);

    const hasTabs = hasExampleObject || hasXValidations || !!selectedStep;

    return {
        selectedFlowData,
        steps,
        selectedStep,
        examples,
        selectedExample,
        examplePayload,
        hasExampleObject,
        sequenceMermaid,
        selectedValidations,
        hasXValidations,
        xinputInfo,
        hasXinput,
        hasTabs,
    };
}
