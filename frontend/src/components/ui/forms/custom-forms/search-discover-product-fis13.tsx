import { useState } from "react";
import { useForm } from "react-hook-form";
import { FaRegPaste } from "react-icons/fa6";
import { IoArrowBack } from "react-icons/io5";
import { toast } from "react-toastify";
import PayloadEditor from "../../mini-components/payload-editor";
import { SubmitEventParams } from "../../../../types/flow-types";

export default function SearchDiscoverProductFis13({
    submitEvent,
}: {
    submitEvent: (data: SubmitEventParams) => Promise<void>;
}) {
    const [isPayloadEditorActive, setIsPayloadEditorActive] = useState(false);
    const [allProviders, setAllProviders] = useState<any[]>([]);
    const [selectedProviderId, setSelectedProviderId] = useState<string>("");
    const [policyId, setPolicyId] = useState<string>("");

    // Manual Mode
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualProviderId, setManualProviderId] = useState("");
    const [manualPolicyId, setManualPolicyId] = useState("");

    const { handleSubmit } = useForm();

    const selectedProvider = allProviders.find(p => p.id === selectedProviderId);

    // Extract Policy ID from selected provider's MASTER_POLICY tag
    const extractPolicyId = (provider: any): string => {
        return provider?.tags?.find((t: any) => t.descriptor?.code === "MASTER_POLICY")
            ?.list?.find((l: any) => l.descriptor?.code === "POLICY_ID")?.value || "";
    };

    const handlePaste = (payload: any) => {
        try {
            const message = payload?.message;
            const providers = message?.catalog?.providers;

            if (!providers || !providers.length) {
                throw new Error("Invalid payload: No providers found");
            }

            setAllProviders(providers);

            // Auto-select first provider
            const firstProvider = providers[0];
            setSelectedProviderId(firstProvider.id);
            setPolicyId(extractPolicyId(firstProvider));

            setIsManualMode(false);
            setIsPayloadEditorActive(false);
            toast.success("Payload parsed successfully");
        } catch (error: any) {
            toast.error(error.message || "Failed to parse payload");
        }
    };

    // When provider changes, update policy ID
    const handleProviderChange = (providerId: string) => {
        setSelectedProviderId(providerId);
        const provider = allProviders.find(p => p.id === providerId);
        setPolicyId(extractPolicyId(provider));
    };

    const onSubmit = async () => {
        if (!selectedProvider) {
            toast.error("Please select a provider");
            return;
        }

        const finalOutput = {
            provider: {
                id: selectedProvider.id,
                tags: [{
                    descriptor: { code: "MASTER_POLICY" },
                    list: [{ descriptor: { code: "POLICY_ID" }, value: policyId }]
                }]
            },
        };

        await submitEvent({
            jsonPath: {},
            formData: finalOutput as any,
        });
    };

    const onManualSubmit = async () => {
        if (!manualProviderId) {
            toast.error("Please enter Provider ID");
            return;
        }

        const finalOutput = {
            provider: {
                id: manualProviderId,
                tags: [{
                    descriptor: { code: "MASTER_POLICY" },
                    list: [{ descriptor: { code: "POLICY_ID" }, value: manualPolicyId }]
                }]
            },
        };

        await submitEvent({
            jsonPath: {},
            formData: finalOutput as any,
        });
    };

    const inputStyle = "w-full p-2 border border-gray-300 rounded text-sm";
    const labelStyle = "block text-sm font-medium text-gray-600 mb-1";
    const hasData = allProviders.length > 0;

    return (
        <div className="p-4">
            {/* Show Paste Section when manual mode is NOT active */}
            {!isManualMode && (
                <>
                    {/* Top Row: Paste Button + Hint */}
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            type="button"
                            onClick={() => setIsPayloadEditorActive(true)}
                            className="flex items-center gap-2 py-2.5 px-5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium shadow-sm"
                        >
                            <FaRegPaste size={18} />
                            <span>Paste Payload</span>
                        </button>
                        <span className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg">
                            Paste the on_search payload to load provider options.
                        </span>
                    </div>

                    {isPayloadEditorActive && <PayloadEditor onAdd={handlePaste} onClose={() => setIsPayloadEditorActive(false)} />}

                    {/* Main Form Section */}
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 mb-6">
                            <h3 className="text-base font-semibold text-gray-800 mb-4">Select Provider & Policy</h3>

                            {hasData ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelStyle}>Provider ID</label>
                                        <select
                                            value={selectedProviderId}
                                            onChange={(e) => handleProviderChange(e.target.value)}
                                            className={inputStyle}
                                        >
                                            {allProviders.map((provider) => (
                                                <option key={provider.id} value={provider.id}>
                                                    {provider.id} - {provider.descriptor?.name || ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelStyle}>Policy ID</label>
                                        <input
                                            type="text"
                                            value={policyId}
                                            onChange={(e) => setPolicyId(e.target.value)}
                                            className={inputStyle}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="py-10 text-center text-gray-400">
                                    No providers loaded. Please paste an on_search payload first.
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={!hasData}
                            className={`w-full py-3 rounded-lg font-semibold transition-all ${hasData
                                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                                : "bg-gray-200 text-gray-500 cursor-not-allowed"
                                }`}
                        >
                            Submit
                        </button>
                    </form>

                    {/* Advanced: Add Manually - show only when no payload data */}
                    {!hasData && !isPayloadEditorActive && (
                        <details
                            className="mt-6"
                            onToggle={(e) => setIsManualMode((e.target as HTMLDetailsElement).open)}
                        >
                            <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800 py-2">
                                ▶ Advanced: Enter Manually
                            </summary>
                        </details>
                    )}
                </>
            )}

            {/* Show ONLY Manual Section when isManualMode is true */}
            {isManualMode && (
                <div>
                    <button
                        type="button"
                        onClick={() => setIsManualMode(false)}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4"
                    >
                        <IoArrowBack size={16} />
                        <span>Back to Paste Payload</span>
                    </button>
                    <h3 className="text-base font-semibold text-gray-800 mb-4">Enter Details Manually</h3>
                    <form onSubmit={handleSubmit(onManualSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelStyle}>Provider ID</label>
                                <input
                                    type="text"
                                    value={manualProviderId}
                                    onChange={(e) => setManualProviderId(e.target.value)}
                                    placeholder="e.g. P1"
                                    className={inputStyle}
                                />
                            </div>
                            <div>
                                <label className={labelStyle}>Policy ID</label>
                                <input
                                    type="text"
                                    value={manualPolicyId}
                                    onChange={(e) => setManualPolicyId(e.target.value)}
                                    placeholder="e.g. e103b4a5-..."
                                    className={inputStyle}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all"
                        >
                            Submit
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
