import { Context, createContext } from "react";
import { ExecutionResult, MockPlaygroundConfigType } from "@ondc/automation-mock-runner";

import { WorkbenchFlowType } from "@hooks/useWorkbenchFlow";
import { SavedConfigMetadata } from "@pages/protocol-playground/utils/config-storage";

type TransactionHistoryEntry = MockPlaygroundConfigType["transaction_history"][number];
type TransactionPayload = TransactionHistoryEntry extends { payload: infer P } ? P : unknown;
type TransactionSavedInfo = TransactionHistoryEntry extends { saved_info?: infer S }
    ? S
    : Record<string, unknown>;

export interface PlaygroundContextProps {
    config: MockPlaygroundConfigType | undefined;
    setCurrentConfig: (config: MockPlaygroundConfigType | undefined) => void;
    dirtyConfig: boolean;
    setDirtyConfig: React.Dispatch<React.SetStateAction<boolean>>;
    currentState: "editing" | "running";
    setCurrentState: React.Dispatch<React.SetStateAction<"editing" | "running">>;
    updateStepMock: (stepId: string, property: string, value: string) => void;
    activeApi: string | undefined;
    setActiveApi: React.Dispatch<React.SetStateAction<string | undefined>>;
    activeTerminalData: ExecutionResult[];
    setActiveTerminalData: React.Dispatch<React.SetStateAction<ExecutionResult[]>>;
    updateTransactionHistory: (
        actionId: string,
        newPayload: TransactionPayload,
        savedInfo?: TransactionSavedInfo
    ) => void;
    updateHelperLib: (newCode: string) => void;
    resetTransactionHistory: (actionId?: string) => void;

    useModal: {
        popupOpen: boolean;
        popupContent: JSX.Element | null;
        openModal: (content: JSX.Element) => void;
        closeModal: () => void;
    };
    loading: boolean;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    workbenchFlow: WorkbenchFlowType;

    // Config management methods
    loadSavedConfig: (configId: string) => boolean;
    getSavedConfigs: () => SavedConfigMetadata[];
    deleteSavedConfig: (configId: string) => boolean;
    loadConfigFromGist: (gistUrl: string) => Promise<boolean>;
}
export const PlaygroundContext: Context<PlaygroundContextProps> =
    createContext<PlaygroundContextProps>({} as PlaygroundContextProps);
