import { FC } from "react";
import { OpenAPISpecification } from "./types";
import FlowDetailsAndSummary from "./FlowDetailsAndSummary";
import { FlowActionDetails } from "./flowActionDetails";

interface FlowInformationProps {
    data: OpenAPISpecification;
    selectedFlow: string;
    selectedFlowAction: string;
}

const FlowInformation: FC<FlowInformationProps> = ({ data, selectedFlow, selectedFlowAction }) => {
    const isEmpty = !selectedFlow && !selectedFlowAction;

    if (isEmpty) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4">
                <div className="max-w-md">
                    <div className="mb-6">
                        <svg
                            className="mx-auto h-24 w-24 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Flow Selected</h3>
                    <p className="text-gray-500 text-sm">
                        Please select a flow and action from the accordion on the left to view
                        detailed information.
                    </p>
                </div>
            </div>
        );
    }

    const flows = data["x-flows"] || [];
    const selectedFlowData = flows.find((flow) => flow.summary === selectedFlow);
    const selectedStep = selectedFlowData?.steps.find((s) => s.api === selectedFlowAction);
    const exampleValue = selectedStep?.example?.value;
    const hasExampleObject =
        exampleValue != null && typeof exampleValue === "object" && !Array.isArray(exampleValue);

    return (
        <div className="p-6 space-y-8">
            {selectedFlowData && (
                <FlowDetailsAndSummary
                    flow={selectedFlowData}
                    selectedFlowAction={selectedFlowAction}
                />
            )}

            {selectedFlowAction && hasExampleObject && (
                <section className="flex flex-col">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Selected flow action details
                    </h2>
                    <div className="h-[480px] min-h-0">
                        <FlowActionDetails
                            exampleValue={exampleValue as object}
                            actionApi={selectedFlowAction}
                            spec={data}
                            useCaseId={selectedFlowData?.useCaseId}
                        />
                    </div>
                </section>
            )}
        </div>
    );
};

export default FlowInformation;
