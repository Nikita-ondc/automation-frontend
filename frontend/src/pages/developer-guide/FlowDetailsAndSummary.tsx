import { FC } from "react";
import { Flow } from "./types";

interface FlowDetailsAndSummaryProps {
    flow: Flow;
    selectedFlowAction: string;
}

const FlowDetailsAndSummary: FC<FlowDetailsAndSummaryProps> = ({ flow, selectedFlowAction }) => {
    const hasDetails = flow.details && flow.details.length > 0;
    const hasReference = !!flow?.reference?.trim();

    return (
        <div className="space-y-8">
            {/* Header */}
            <section className="space-y-3">
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                    {flow.summary}
                </h1>
                {selectedFlowAction && (
                    <div className="inline-flex items-center">
                        <span className="text-sm text-gray-500 mr-2">Action:</span>
                        <span className="px-3 py-1 rounded-md bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100">
                            {selectedFlowAction}
                        </span>
                    </div>
                )}
            </section>

            {/* Flow diagrams */}
            {hasDetails && (
                <section>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                        Flow diagrams
                    </h2>
                    <div className="space-y-6">
                        {flow?.details
                            ?.filter((d) => d.description)
                            ?.map((detail, index) => (
                                <div
                                    key={index}
                                    className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm"
                                >
                                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                            {detail.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                    </div>
                </section>
            )}

            {/* Reference */}
            {hasReference && (
                <section>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Reference
                    </h2>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                        <p className="text-sm text-gray-600">{flow.reference}</p>
                    </div>
                </section>
            )}
        </div>
    );
};

export default FlowDetailsAndSummary;
