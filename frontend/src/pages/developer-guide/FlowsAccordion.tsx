import { FC, useState } from "react";
import { OpenAPISpecification } from "./types";

interface FlowsAccordionProps {
    data: OpenAPISpecification;
    selectedFlow?: string;
    selectedFlowAction?: string;
    setSelectedFlow: (flow: string) => void;
    setSelectedFlowAction: (action: string) => void;
}

const FlowsAccordion: FC<FlowsAccordionProps> = ({
    data,
    selectedFlow,
    selectedFlowAction,
    setSelectedFlow,
    setSelectedFlowAction,
}) => {
    const [openFlowIndex, setOpenFlowIndex] = useState<number | null>(null);

    const flows = data["x-flows"] || [];

    const toggleFlow = (index: number) => {
        if (openFlowIndex === index) {
            setOpenFlowIndex(null);
            setSelectedFlow("");
        } else {
            setOpenFlowIndex(index);
            setSelectedFlow(flows[index].summary);
        }

        setSelectedFlowAction("");
    };

    const handleStepClick = (flowSummary: string, stepApi: string) => {
        setSelectedFlow(flowSummary);
        setSelectedFlowAction(stepApi);
    };

    return (
        <div className="space-y-2">
            {flows.map((flow, flowIndex) => {
                const isOpen = openFlowIndex === flowIndex;
                const isSelectedFlow = selectedFlow === flow.summary;

                return (
                    <div
                        key={flowIndex}
                        className="bg-white border border-gray-200 rounded-md shadow-sm"
                    >
                        {/* Accordion Header */}
                        <button
                            onClick={() => toggleFlow(flowIndex)}
                            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                        >
                            <span className="font-bold text-gray-800 text-sm">{flow.summary}</span>
                            <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                                {isOpen ? (
                                    <span className="text-white text-sm font-bold">−</span>
                                ) : (
                                    <span className="text-white text-sm font-bold">+</span>
                                )}
                            </div>
                        </button>

                        {/* Accordion Content */}
                        {isOpen && (
                            <div className="px-4 pb-4 pt-2 border-t border-gray-200">
                                <div className="space-y-2 mt-2">
                                    {flow.steps.map((step, stepIndex) => {
                                        const isSelectedAction =
                                            isSelectedFlow && selectedFlowAction === step.api;
                                        const stepNumber = stepIndex + 1;

                                        return (
                                            <button
                                                key={stepIndex}
                                                onClick={() =>
                                                    handleStepClick(flow.summary, step.api)
                                                }
                                                className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                                                    isSelectedAction
                                                        ? "bg-blue-50 border-blue-300 hover:bg-blue-100"
                                                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                                                }`}
                                            >
                                                <span className="text-sm text-gray-800">
                                                    {stepNumber}: {step.api}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default FlowsAccordion;
