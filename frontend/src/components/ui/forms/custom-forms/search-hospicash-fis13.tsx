import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { FaRegPaste } from "react-icons/fa6";
import { IoArrowBack } from "react-icons/io5";
import { toast } from "react-toastify";
import PayloadEditor from "../../mini-components/payload-editor";
import { SubmitEventParams } from "../../../../types/flow-types";

interface DynamicInput {
    descriptor: {
        code: string;
        short_desc?: string;
    };
    value: string;
}

export default function SearchHospicashFis13({
    submitEvent,
}: {
    submitEvent: (data: SubmitEventParams) => Promise<void>;
}) {
    const [isPayloadEditorActive, setIsPayloadEditorActive] = useState(false);
    const [allProviders, setAllProviders] = useState<any[]>([]);
    const [selectedProviderId, setSelectedProviderId] = useState<string>("");
    const [selectedItemId, setSelectedItemId] = useState<string>("");
    const [dynamicInputs, setDynamicInputs] = useState<DynamicInput[]>([]);
    const [editablePolicyId, setEditablePolicyId] = useState<string>("");

    // Advanced Manual Mode
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [manualProviderId, setManualProviderId] = useState("");
    const [manualPolicyId, setManualPolicyId] = useState("");
    const [manualItemId, setManualItemId] = useState("");

    // Manual BAP Inputs for Hospicash
    const MANUAL_BAP_INPUTS = [
        { code: "BUYER_NAME", label: "Buyer Name", type: "text" },
        { code: "BUYER_PHONE_NUMBER", label: "Buyer Phone Number", type: "tel" },
        { code: "BUYER_PAN_NUMBER", label: "Buyer Pan Number", type: "text" },
        { code: "BUYER_DOB", label: "Buyer Dob", type: "date" },
        { code: "BUYER_GENDER", label: "Buyer Gender", type: "select" },
        { code: "SUM_INSURED", label: "Sum Insured", type: "text" },
        { code: "BUYER_EMAIL", label: "Buyer Email", type: "email" },
        { code: "TENURE", label: "Tenure", type: "text" },
    ];

    const { register, handleSubmit } = useForm();
    const selectedProvider = allProviders.find(p => p.id === selectedProviderId);
    const availableItems = selectedProvider?.items || [];

    // Extract Policy ID from selected provider
    const extractedPolicyId = selectedProvider?.tags?.find((t: any) => t.descriptor?.code === "MASTER_POLICY")
        ?.list?.find((l: any) => l.descriptor?.code === "POLICY_ID")?.value || "";

    // Sync editable policy ID when provider changes
    useEffect(() => {
        setEditablePolicyId(extractedPolicyId);
    }, [extractedPolicyId]);

    const handlePaste = (payload: any) => {
        try {
            const message = payload?.message;
            const providers = message?.catalog?.providers;

            if (!providers || !providers.length) {
                throw new Error("Invalid payload: No providers found");
            }

            setAllProviders(providers);

            // Auto-select first provider and first item
            const firstProvider = providers[0];
            const firstItem = firstProvider.items?.[0];

            setSelectedProviderId(firstProvider.id);
            setSelectedItemId(firstItem?.id || "");

            // Close manual section when payload is pasted
            setIsAdvancedOpen(false);

            setIsPayloadEditorActive(false);
            toast.success("Payload parsed successfully");
        } catch (error: any) {
            toast.error(error.message || "Failed to parse payload");
        }
    };

    // Update BAP_INPUTS when item selection changes
    useEffect(() => {
        if (!selectedProvider || !selectedItemId) {
            setDynamicInputs([]);
            return;
        }

        const selectedItem = selectedProvider.items?.find((item: any) => item.id === selectedItemId);
        if (!selectedItem) {
            setDynamicInputs([]);
            return;
        }

        const bapInputsTag = selectedItem.tags?.find(
            (t: any) => t.descriptor?.code === "BAP_INPUTS"
        );

        if (bapInputsTag && bapInputsTag.list) {
            setDynamicInputs(bapInputsTag.list);
        } else {
            setDynamicInputs([]);
        }
    }, [selectedProviderId, selectedItemId, selectedProvider]);

    // Helper function to determine input type based on descriptor code
    const getInputType = (code: string): string => {
        const upperCode = code.toUpperCase();

        // Date fields
        if (upperCode.includes('DATE') || upperCode.includes('DOB') || upperCode.includes('BIRTH')) {
            return 'date';
        }

        // Email fields
        if (upperCode.includes('EMAIL')) {
            return 'email';
        }

        // Phone fields
        if (upperCode.includes('PHONE') || upperCode.includes('MOBILE') || upperCode.includes('TEL')) {
            return 'tel';
        }

        // Alphanumeric fields (should be text, not number)
        if (upperCode.includes('PAN') || upperCode.includes('AADHAR') ||
            upperCode.includes('AADHAAR') || upperCode.includes('GSTIN') ||
            upperCode.includes('LICENSE') || upperCode.includes('PASSPORT')) {
            return 'text';
        }

        if (upperCode.includes('AGE') || upperCode.includes('AMOUNT') ||
            upperCode.includes('PINCODE') || upperCode.includes('PIN_CODE')) {
            return 'number';
        }

        return 'text';
    };

    const formatLabel = (code: string): string => {
        return code
            .split('_')
            .map(word => word.charAt(0) + word.slice(1).toLowerCase())
            .join(' ');
    };

    const renderInputField = (input: DynamicInput) => {
        const inputType = getInputType(input.descriptor.code);
        const label = formatLabel(input.descriptor.code);

        return (
            <div key={input.descriptor.code} className="space-y-1">
                <label className={labelStyle}>
                    {label}
                </label>
                <input
                    type={inputType}
                    {...register(input.descriptor.code)}
                    className={inputStyle}
                />
            </div>
        );
    };

    const onSubmit = async (formData: any) => {
        if (!selectedProvider) {
            toast.error("Please select a provider");
            return;
        }

        const provider = JSON.parse(JSON.stringify(selectedProvider));

        // Update BAP_INPUTS for the selected item
        const selectedItem = provider.items?.find((item: any) => item.id === selectedItemId);
        if (selectedItem) {
            const bapInputsTag = selectedItem.tags?.find(
                (t: any) => t.descriptor?.code === "BAP_INPUTS"
            );
            if (bapInputsTag && bapInputsTag.list) {
                bapInputsTag.list.forEach((input: any) => {
                    if (formData[input.descriptor.code] !== undefined) {
                        input.value = formData[input.descriptor.code];
                    }
                });
            }
        }

        const finalOutput = {
            provider: {
                id: provider.id,
                tags: provider.tags,
                items: provider.items.filter((item: any) => item.id === selectedItemId),
            },
        };

        await submitEvent({
            jsonPath: {},
            formData: finalOutput as any,
        });
    };

    const onManualSubmit = async (formData: any) => {
        if (!manualProviderId || !manualItemId) {
            toast.error("Please fill in Provider ID and Item ID");
            return;
        }

        const bapInputsList = MANUAL_BAP_INPUTS.map(input => ({
            descriptor: { code: input.code },
            value: formData[`manual_${input.code}`] || ""
        }));

        const finalOutput = {
            provider: {
                id: manualProviderId,
                tags: [{
                    descriptor: { code: "MASTER_POLICY" },
                    list: [{ descriptor: { code: "POLICY_ID" }, value: manualPolicyId }]
                }],
                items: [{
                    id: manualItemId,
                    tags: [{
                        descriptor: { code: "BAP_INPUTS" },
                        list: bapInputsList
                    }]
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
            {/* Show Paste Section when manual mode is NOT open */}
            {!isAdvancedOpen && (
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
                            Please paste the payload (on_search) to load item options.
                        </span>
                    </div>

                    {isPayloadEditorActive && <PayloadEditor onAdd={handlePaste} onClose={() => setIsPayloadEditorActive(false)} />}

                    {/* Main Form Section */}
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 mb-6">
                            <h3 className="text-base font-semibold text-gray-800 mb-4">Select Items</h3>

                            {hasData ? (
                                <div className="space-y-6">
                                    {/* Selection Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className={labelStyle}>Provider ID</label>
                                            <select
                                                value={selectedProviderId}
                                                onChange={(e) => {
                                                    setSelectedProviderId(e.target.value);
                                                    const newProvider = allProviders.find(p => p.id === e.target.value);
                                                    setSelectedItemId(newProvider?.items?.[0]?.id || "");
                                                }}
                                                className={inputStyle}
                                            >
                                                {allProviders.map((provider) => (
                                                    <option key={provider.id} value={provider.id}>
                                                        {provider.id}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelStyle}>Policy ID</label>
                                            <input
                                                type="text"
                                                value={editablePolicyId}
                                                onChange={(e) => setEditablePolicyId(e.target.value)}
                                                className={inputStyle}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelStyle}>Item ID</label>
                                            <select
                                                value={selectedItemId}
                                                onChange={(e) => setSelectedItemId(e.target.value)}
                                                className={inputStyle}
                                            >
                                                {availableItems.map((item: any) => (
                                                    <option key={item.id} value={item.id}>
                                                        {item.id}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* BAP Inputs */}
                                    {dynamicInputs.length > 0 && (
                                        <div className="pt-4 border-t border-gray-100">
                                            <h4 className="text-sm font-semibold text-gray-700 mb-4">Buyer Details</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {dynamicInputs.map((input) => renderInputField(input))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="py-10 text-center text-gray-400">
                                    No items loaded. Please paste a payload first.
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

                    {/* Advanced: Add Item Manually - show only when no payload data */}
                    {!hasData && !isPayloadEditorActive && (
                        <details
                            className="mt-6"
                            open={isAdvancedOpen}
                            onToggle={(e) => setIsAdvancedOpen((e.target as HTMLDetailsElement).open)}
                        >
                            <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800 py-2">
                                ▶ Advanced: Add Item Manually
                            </summary>
                            <form onSubmit={handleSubmit(onManualSubmit)} className="mt-4 space-y-6">
                                {/* Manual Selection Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelStyle}>Provider ID</label>
                                        <input
                                            type="text"
                                            value={manualProviderId}
                                            onChange={(e) => setManualProviderId(e.target.value)}
                                            placeholder="e.g. s1"
                                            className={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelStyle}>Policy ID</label>
                                        <input
                                            type="text"
                                            value={manualPolicyId}
                                            onChange={(e) => setManualPolicyId(e.target.value)}
                                            placeholder="e.g. pl-120"
                                            className={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelStyle}>Item ID</label>
                                        <input
                                            type="text"
                                            value={manualItemId}
                                            onChange={(e) => setManualItemId(e.target.value)}
                                            placeholder="e.g. I1"
                                            className={inputStyle}
                                        />
                                    </div>
                                </div>

                                {/* Manual Buyer Details */}
                                <div className="pt-4 border-t border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-4">Buyer Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {MANUAL_BAP_INPUTS.map((input) => (
                                            <div key={input.code}>
                                                <label className={labelStyle}>{input.label}</label>
                                                {input.type === "select" ? (
                                                    <select
                                                        {...register(`manual_${input.code}`)}
                                                        className={inputStyle}
                                                    >
                                                        <option value="">Select...</option>
                                                        <option value="Male">Male</option>
                                                        <option value="Female">Female</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                ) : (
                                                    <input
                                                        type={input.type}
                                                        {...register(`manual_${input.code}`)}
                                                        className={inputStyle}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Manual Submit Button */}
                                <button
                                    type="submit"
                                    className="w-full py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all"
                                >
                                    Submit
                                </button>
                            </form>
                        </details>
                    )}
                </>
            )}

            {/* Show ONLY Manual Section when isAdvancedOpen is true */}
            {isAdvancedOpen && (
                <div>
                    <button
                        type="button"
                        onClick={() => setIsAdvancedOpen(false)}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4"
                    >
                        <IoArrowBack size={16} />
                        <span>Back to Paste Payload</span>
                    </button>
                    <h3 className="text-base font-semibold text-gray-800 mb-4">Add Item Manually</h3>
                    <form onSubmit={handleSubmit(onManualSubmit)} className="space-y-6">
                        {/* Manual Selection Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelStyle}>Provider ID</label>
                                <input
                                    type="text"
                                    value={manualProviderId}
                                    onChange={(e) => setManualProviderId(e.target.value)}
                                    placeholder="e.g. s1"
                                    className={inputStyle}
                                />
                            </div>
                            <div>
                                <label className={labelStyle}>Policy ID</label>
                                <input
                                    type="text"
                                    value={manualPolicyId}
                                    onChange={(e) => setManualPolicyId(e.target.value)}
                                    placeholder="e.g. pl-120"
                                    className={inputStyle}
                                />
                            </div>
                            <div>
                                <label className={labelStyle}>Item ID</label>
                                <input
                                    type="text"
                                    value={manualItemId}
                                    onChange={(e) => setManualItemId(e.target.value)}
                                    placeholder="e.g. I1"
                                    className={inputStyle}
                                />
                            </div>
                        </div>

                        {/* Manual Buyer Details */}
                        <div className="pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700 mb-4">Buyer Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {MANUAL_BAP_INPUTS.map((input) => (
                                    <div key={input.code}>
                                        <label className={labelStyle}>{input.label}</label>
                                        {input.type === "select" ? (
                                            <select
                                                {...register(`manual_${input.code}`)}
                                                className={inputStyle}
                                            >
                                                <option value="">Select...</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        ) : (
                                            <input
                                                type={input.type}
                                                {...register(`manual_${input.code}`)}
                                                className={inputStyle}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Manual Submit Button */}
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
