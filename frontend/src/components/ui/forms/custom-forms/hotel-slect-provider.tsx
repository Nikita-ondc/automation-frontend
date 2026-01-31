import { useState } from "react";
import { useForm } from "react-hook-form";
import { FaRegPaste } from "react-icons/fa6";
import { toast } from "react-toastify";
import PayloadEditor from "@/components/ui/mini-components/payload-editor";
import { SubmitEventParams } from "@/types/flow-types";

// Hotel Select interfaces
interface IHotelProvider {
    id: string;
    name: string;
}

interface IHotelFormData {
    providerId: string;
    providerName: string;
    checkInDate: string;
    checkOutDate: string;
}

interface IHotelSelectProps {
    submitEvent: (params: SubmitEventParams) => Promise<void>;
}

// Default values
const DEFAULT_HOTEL_FORM_DATA: IHotelFormData = {
    providerId: "",
    providerName: "",
    checkInDate: "",
    checkOutDate: "",
};

// Shared style constants
const HOTEL_FORM_STYLES = {
    inputStyle:
        "border rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white",
    labelStyle: "mb-1 font-semibold text-sm",
    fieldWrapperStyle: "flex flex-col mb-2",
    sectionStyle: "border p-4 rounded-lg space-y-2 mb-4",
} as const;

export default function HotelSelectProvider({ submitEvent }: IHotelSelectProps) {
    const [isPayloadEditorActive, setIsPayloadEditorActive] = useState(false);
    const [errorWhilePaste, setErrorWhilePaste] = useState("");
    const [availableProviders, setAvailableProviders] = useState<IHotelProvider[]>([]);

    const { register, handleSubmit, reset } = useForm<IHotelFormData>({
        defaultValues: DEFAULT_HOTEL_FORM_DATA,
    });

    /* ------------------- HANDLE PASTE ------------------- */
    const handlePaste = (payload: Record<string, unknown>) => {
        try {
            const message = payload?.message as Record<string, unknown> | undefined;
            const catalog = message?.catalog as Record<string, unknown> | undefined;
            const providers = catalog?.providers as Record<string, unknown>[] | undefined;

            if (!providers) {
                throw new Error(
                    "Invalid Schema - Expected on_search payload with catalog.providers"
                );
            }

            // Extract all providers
            const providerList: IHotelProvider[] = providers.map((prov) => {
                const descriptor = prov.descriptor as Record<string, unknown> | undefined;
                return {
                    id: (prov.id as string) || "",
                    name: (descriptor?.name as string) || (prov.id as string) || "",
                };
            });

            setAvailableProviders(providerList);

            // Pre-populate form with first provider
            reset({
                providerId: providerList[0]?.id || "",
                providerName: providerList[0]?.name || "",
                checkInDate: "",
                checkOutDate: "",
            });

            setErrorWhilePaste("");
            toast.success(`Found ${providerList.length} provider(s)`);
        } catch (err) {
            const error = err as Error;
            setErrorWhilePaste(error.message || "Invalid payload structure");
            toast.error(error.message || "Invalid payload structure");
            console.error(err);
        }

        setIsPayloadEditorActive(false);
    };

    /* ------------------- FINAL SUBMIT ------------------- */
    const onSubmit = async (data: IHotelFormData) => {
        // Convert yyyy-mm-dd to ISO timestamp
        const convertToISO = (dateString: string): string => {
            if (!dateString) return "";
            try {
                // Parse yyyy-mm-dd and convert to ISO timestamp
                const date = new Date(dateString);
                return date.toISOString();
            } catch (error: unknown) {
                const err = error as Error;
                console.error("Invalid date format:", err.message, dateString);
                return dateString;
            }
        };

        // Prepare data with converted dates
        const formattedData = {
            ...data,
            checkInDate: convertToISO(data.checkInDate),
            checkOutDate: convertToISO(data.checkOutDate),
        };

        // Send raw form data as-is
        await submitEvent({
            jsonPath: {},
            formData: {
                data: JSON.stringify(formattedData),
            },
        });
    };

    const { inputStyle, labelStyle, fieldWrapperStyle, sectionStyle } = HOTEL_FORM_STYLES;

    return (
        <div>
            {isPayloadEditorActive && (
                <PayloadEditor onAdd={handlePaste as (payload: unknown) => void} />
            )}
            {errorWhilePaste && (
                <p className="text-red-500 text-sm italic mt-1">{errorWhilePaste}</p>
            )}

            <div className="flex items-center gap-2 mb-3">
                <button
                    type="button"
                    onClick={() => setIsPayloadEditorActive(true)}
                    className="p-2 border rounded-full hover:bg-gray-100 flex items-center gap-2"
                    title="Paste on_search payload"
                >
                    <FaRegPaste size={14} />
                    <span className="text-sm">Paste Payload</span>
                </button>
                <p className="text-red-500 text-sm font-semibold">
                    Please paste the on_search payload first to select the provider ID and provider
                    name
                </p>
            </div>

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4 h-[500px] overflow-y-scroll p-4"
            >
                {/* PROVIDER SELECTION */}
                <div className={sectionStyle}>
                    <h3 className="font-semibold text-gray-800 mb-3">Provider Selection</h3>

                    {/* PROVIDER ID */}
                    <div className={fieldWrapperStyle}>
                        <label className={labelStyle}>
                            Select Provider ID <span className="text-red-500">*</span>
                        </label>
                        {availableProviders.length > 0 ? (
                            <select
                                {...register("providerId", { required: true })}
                                className={inputStyle}
                            >
                                <option value="">Select a provider ID</option>
                                {availableProviders.map((provider) => (
                                    <option key={provider.id} value={provider.id}>
                                        {provider.id}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                placeholder="Select Provider ID"
                                {...register("providerId", { required: true })}
                                className={inputStyle}
                            />
                        )}
                    </div>

                    {/* PROVIDER NAME */}
                    <div className={fieldWrapperStyle}>
                        <label className={labelStyle}>
                            Select Provider Name <span className="text-red-500">*</span>
                        </label>
                        {availableProviders.length > 0 ? (
                            <select
                                {...register("providerName", { required: true })}
                                className={inputStyle}
                            >
                                <option value="">Select a provider name</option>
                                {availableProviders.map((provider) => (
                                    <option key={provider.id} value={provider.name}>
                                        {provider.name}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                placeholder="Select Provider Name"
                                {...register("providerName", { required: true })}
                                className={inputStyle}
                            />
                        )}
                    </div>

                    {/* CHECK-IN DATE */}
                    <div className={fieldWrapperStyle}>
                        <label className={labelStyle}>
                            Enter Start Time (Check In) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="yyyy-mm-dd"
                            {...register("checkInDate", { required: true })}
                            className={inputStyle}
                        />
                        <span className="text-xs text-gray-500 mt-1 block">Format: yyyy-mm-dd</span>
                    </div>

                    {/* CHECK-OUT DATE */}
                    <div className={fieldWrapperStyle}>
                        <label className={labelStyle}>
                            Enter End Time (Check Out) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="yyyy-mm-dd"
                            {...register("checkOutDate", { required: true })}
                            className={inputStyle}
                        />
                        <span className="text-xs text-gray-500 mt-1 block">Format: yyyy-mm-dd</span>
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                >
                    Submit
                </button>
            </form>
        </div>
    );
}
