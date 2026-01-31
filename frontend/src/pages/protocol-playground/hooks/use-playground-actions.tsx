import { useContext } from "react";
import { PlaygroundContext } from "../context/playground-context";
import { toast } from "react-toastify";
import MockRunner from "@ondc/automation-mock-runner";
// import { getDefaultStep } from "../mock-engine";

type UpdateActionFormData = {
    api: string;
    actionId: string;
    owner: string;
    unsolicited: string;
    responseFor?: string | null;
    description: string;
};

// hooks/usePlaygroundActions.ts
export const usePlaygroundActions = () => {
    const playgroundContext = useContext(PlaygroundContext);

    const addAction = (api: string, actionId: string, insertIndex?: number) => {
        const currentConfig = playgroundContext.config;
        if (!currentConfig) {
            toast.error("No configuration found");
            return;
        }

        const newStep = new MockRunner(currentConfig).getDefaultStep(api, actionId);

        if (!currentConfig.steps) {
            currentConfig.steps = [];
        }

        if (insertIndex !== undefined) {
            currentConfig.steps.splice(insertIndex, 0, newStep);
        } else {
            currentConfig.steps.push(newStep);
        }

        playgroundContext.setCurrentConfig(currentConfig);
    };

    const deleteAction = (actionId: string) => {
        const currentConfig = playgroundContext.config;
        if (!currentConfig) return false;

        const stepIndex = currentConfig.steps.findIndex((step) => step.action_id === actionId);

        if (stepIndex !== -1) {
            currentConfig.steps.splice(stepIndex, 1);
            playgroundContext.setCurrentConfig(currentConfig);
            return true;
        }
        return false;
    };

    const updateAction = (actionId: string, formData: unknown) => {
        const data = formData as UpdateActionFormData;
        const currentConfig = playgroundContext.config;
        if (!currentConfig) return false;

        const updatedConfig = { ...currentConfig };
        const stepIndex = updatedConfig.steps.findIndex((step) => step.action_id === actionId);

        if (stepIndex !== -1) {
            updatedConfig.steps[stepIndex] = {
                ...updatedConfig.steps[stepIndex],
                api: data.api,
                action_id: data.actionId,
                owner: data.owner as "BAP" | "BPP",
                unsolicited: data.unsolicited === "yes",
                responseFor: data.responseFor || null,
                description: data.description,
            };
            playgroundContext.setCurrentConfig(updatedConfig);
            return true;
        }
        return false;
    };

    return { addAction, deleteAction, updateAction };
};
