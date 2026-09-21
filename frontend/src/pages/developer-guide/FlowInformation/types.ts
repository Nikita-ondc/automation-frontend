import type { OpenAPISpecification, FlowEntry } from "../types";

export type FlowInformationSection =
    | "sequence"
    | "preview"
    | "x-validations"
    | "request"
    | "response"
    | "xinput";

export interface FlowInformationProps {
    data: OpenAPISpecification;
    flows: FlowEntry[];
    selectedFlow: string;
    setSelectedFlow: (flowId: string) => void;
    selectedFlowAction: string;
    setSelectedFlowAction: (actionId: string) => void;
    domain: string;
    version: string;
}

export interface FlowExample {
    name: string;
    payload: unknown;
}
