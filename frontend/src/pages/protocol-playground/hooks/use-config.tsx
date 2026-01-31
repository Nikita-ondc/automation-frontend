import { useContext } from "react";
import { PlaygroundContext } from "../context/playground-context";
import { toast } from "react-toastify";
import JsonSchemaForm from "../ui/extras/rsjf-form";
import { calcCurrentIndex } from "../mock-engine";
import MockRunner from "@ondc/automation-mock-runner";
import { createFlowSessionWithPlayground } from "../utils/request-utils";
import { GetRequestEndpoint } from "@components/FlowShared/guides";

type JsonSchema = Record<string, unknown>;
type FormValues = Record<string, unknown>;

type FileInputChangeEvent = Event & {
    target: HTMLInputElement & { files: FileList };
};

type RunResult = { success: boolean };

// hooks/useConfigOperations.ts
export const useConfigOperations = () => {
    const playgroundContext = useContext(PlaygroundContext);
    // const generateRunner = useCodeRunner("generate");
    // const generateResult = generateRunner.result;
    const modal = playgroundContext.useModal;

    const exportConfig = () => {
        if (!playgroundContext.config) {
            toast.error("No configuration to export");
            return;
        }
        const dataStr = JSON.stringify(playgroundContext.config, null, 2);
        const flowName = `${playgroundContext.config.meta.flowId}_playground_flow`;
        const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
        const exportFileDefaultName = flowName + ".json";
        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUri);
        linkElement.setAttribute("download", exportFileDefaultName);
        linkElement.click();
        toast.success("Configuration exported successfully");
    };

    const importConfig = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (event: Event) => {
            const file = (event as FileInputChangeEvent).target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const config = JSON.parse(
                            (e.target as FileReader | null)?.result as string
                        );
                        const validConfig = new MockRunner(config).validateConfig();
                        if (!validConfig.success) {
                            toast.error(`Invalid configuration: ${validConfig.errors?.join(", ")}`);
                            return;
                        }
                        playgroundContext.setCurrentConfig(config);
                        toast.success("Configuration imported successfully");
                    } catch (error) {
                        console.error("Error reading file:", error);
                        const message = error instanceof Error ? error.message : "Unknown error";
                        toast.error(`Invalid JSON file or configuration: ${message}`);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    const clearConfig = () => {
        playgroundContext.setCurrentConfig(undefined);
        playgroundContext.setActiveApi(undefined);
        toast.success("All configurations deleted");
    };

    const showFormModal = (schema: JsonSchema, onSubmit: (formData: FormValues) => void) => {
        modal.openModal(
            <div className="p-1">
                <h2 className="text-l font-semibold mb-1">Enter Input Data</h2>
                <JsonSchemaForm
                    schema={schema}
                    // formData={data.sessionData}
                    onSubmit={onSubmit as (data: Record<string, unknown>) => Promise<void>}
                />
            </div>
        );
        toast.success("Please fill in the form to continue");
    };

    // return true if payload execution was successful
    const executePayload = async (data: { actionId: string; inputs: FormValues }) => {
        playgroundContext.setLoading(true);
        try {
            const config = playgroundContext.config;
            if (!config) {
                toast.error("No configuration found");
                playgroundContext.setLoading(false);
                return false;
            }
            const result = await new MockRunner(config).runGeneratePayload(
                data.actionId,
                data.inputs
            );

            if (!result) {
                toast.error("No result from code execution");
                playgroundContext.setLoading(false);
                return false;
            }
            playgroundContext.setActiveTerminalData((s) => [...s, result]);
            if (result.success) {
                playgroundContext.updateTransactionHistory(data.actionId, result.result);
            }
            modal.closeModal();
            playgroundContext.setLoading(false);
            toast.success("Payload generated. Check console for details.");
            return result.success;
        } catch (e) {
            playgroundContext.setLoading(false);
            console.error("Error executing payload:", e);
            return false;
        }
    };

    const runConfig = async () => {
        if (!playgroundContext.config?.steps || playgroundContext.config.steps.length === 0) {
            toast.error("No steps to run");
            return { success: false } as RunResult;
        }
        if (
            playgroundContext.config.steps.length ===
            playgroundContext.config.transaction_history.length
        ) {
            toast.info("All steps have already been executed");
            return { success: false } as RunResult;
        }
        const currentIndex = calcCurrentIndex(playgroundContext.config);
        if (currentIndex === -1) {
            toast.info("All steps have been executed");
            return { success: false } as RunResult;
        }
        const currentStep = playgroundContext.config.steps[currentIndex];
        try {
            const inputs = currentStep.mock.inputs || {};

            // No inputs needed - execute immediately
            if (inputs === null || Object.keys(inputs).length === 0) {
                const res = await executePayload({
                    actionId: currentStep.action_id,
                    inputs: {},
                });
                return {
                    success: res,
                } as RunResult;
            }

            // Inputs needed - return a Promise that resolves when form is submitted
            return new Promise<RunResult>((resolve) => {
                const handleFormSubmit = async (formData: FormValues) => {
                    modal.closeModal();
                    const res = await executePayload({
                        actionId: currentStep.action_id,
                        inputs: formData,
                    });
                    resolve({ success: res });
                };

                if (!currentStep.mock.inputs.jsonSchema) {
                    toast.error("No input schema defined for this action");
                    resolve({ success: false } as RunResult);
                    return;
                }

                showFormModal(currentStep.mock.inputs.jsonSchema, handleFormSubmit);
            });
        } catch (e) {
            console.error("Error generating payload:", e);
            toast.error("Error generating payload. Check console for details.");
            return {
                success: false,
            } as RunResult;
        }
    };

    // Extracted function to create and open flow session in new tab
    const createAndOpenFlowSession = async (subscriberUrl: string, role: "BAP" | "BPP") => {
        if (!playgroundContext.config) {
            toast.error("No configuration found");
            return;
        }

        playgroundContext.setLoading(true);
        try {
            const result = await createFlowSessionWithPlayground(
                playgroundContext.config,
                subscriberUrl,
                role
            );

            if (!result) {
                toast.error("Error creating flow session");
                return;
            }

            // Open flow session in new tab
            const currentUrl = window.location.origin;
            const newTabUrl = `${currentUrl}/flow-testing?sessionId=${result}&subscriberUrl=${encodeURIComponent(subscriberUrl)}&role=${role}`;
            window.open(newTabUrl, "_blank");

            toast.success("Flow session created! Opening in new tab...");
        } catch (error) {
            console.error("Error creating flow session:", error);
            toast.error("Failed to create flow session");
        } finally {
            playgroundContext.setLoading(false);
        }
    };

    const createFlowSession = () => {
        async function handleFormSubmit(formData: FormValues) {
            const data = formData as { subscriber_url?: string; role?: "BAP" | "BPP" };
            if (data.subscriber_url === "testing") {
                const subUrlBap = GetRequestEndpoint(
                    playgroundContext.config?.meta.domain || "",
                    playgroundContext.config?.meta.version || "",
                    "BAP"
                );
                const subUrlBpp = GetRequestEndpoint(
                    playgroundContext.config?.meta.domain || "",
                    playgroundContext.config?.meta.version || "",
                    "BPP"
                );
                await createAndOpenFlowSession(subUrlBap, "BPP");
                await createAndOpenFlowSession(subUrlBpp, "BAP");
                return;
            }
            // subcriber url is a valid url
            const regex = /^(http|https):\/\/[^ "]+$/;
            if (!data.subscriber_url || !regex.test(data.subscriber_url)) {
                toast.error("Please enter a valid URL");
                return;
            }

            await createAndOpenFlowSession(data.subscriber_url, data.role as "BAP" | "BPP");
        }

        modal.openModal(
            <div>
                <h2 className="text-l font-semibold mb-1">Create Live Flow Session</h2>
                <p className="mb-2">Enter details to create a live session.</p>
                <JsonSchemaForm
                    schema={{
                        type: "object",
                        properties: {
                            subscriber_url: {
                                type: "string",
                                // format: "uri",
                                title: "Your Subscriber URL",
                            },
                            role: {
                                type: "string",
                                enum: ["BAP", "BPP"],
                                default: "BAP",
                                title: "Your Role",
                            },
                        },
                        required: ["subscriber_url", "role"],
                        additionalProperties: false,
                    }}
                    onSubmit={handleFormSubmit}
                />
            </div>
        );
    };

    const runCurrentConfig = async () => {
        if (!playgroundContext.config) {
            toast.error("No configuration found");
            return;
        }
        const activeApi = playgroundContext.activeApi;
        if (!activeApi) {
            toast.error("No active API selected");
            return;
        }
        try {
            playgroundContext.resetTransactionHistory();
            for (const step of playgroundContext.config.steps) {
                const res = await runConfig();
                if (!res?.success) {
                    toast.error(`Execution stopped at action ${step.action_id}`);
                    break;
                }
                if (step.action_id === activeApi) {
                    break;
                }
            }
        } catch (e) {
            console.error("Error running current config:", e);
        }
    };

    return {
        exportConfig,
        importConfig,
        clearConfig,
        runConfig,
        createFlowSession,
        runCurrentConfig,
    };
};
