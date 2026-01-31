import { useState } from "react";
import { useForm } from "react-hook-form";
import { FaRegPaste } from "react-icons/fa6";
import { toast } from "react-toastify";
import PayloadEditor from "@/components/ui/mini-components/payload-editor";
import { FORM_STYLES } from "./airline.types";

interface IFormData {
    providerId: string;
    itemId: string;
    fulfillmentId: string;
}

interface IProvider {
    id: string;
    items: { id: string; name: string; fulfillment_ids: string[] }[];
    fulfillments: { id: string }[];
}

interface IRideHailingSelectProps {
    submitEvent: (data: any) => Promise<void>;
}

export default function RideHailingSelect({ submitEvent }: IRideHailingSelectProps) {
    const [isPayloadEditorActive, setIsPayloadEditorActive] = useState(false);
    const [errorWhilePaste, setErrorWhilePaste] = useState("");
    const [providers, setProviders] = useState<IProvider[]>([]);

    const { register, handleSubmit, setValue, watch } = useForm<IFormData>({
        defaultValues: {
            providerId: "",
            itemId: "",
            fulfillmentId: "",
        },
    });

    const selectedProviderId = watch("providerId");
    const selectedItemId = watch("itemId");
    const selectedFulfillmentId = watch("fulfillmentId");

    // Check if all fields are filled
    const isFormValid = selectedProviderId && selectedItemId && selectedFulfillmentId;

    // Get selected provider data
    const selectedProvider = providers.find((p) => p.id === selectedProviderId);

    // Get items for selected provider
    const availableItems = selectedProvider?.items || [];

    // Get the selected item to find its linked fulfillment_ids
    const selectedItem = availableItems.find((item) => item.id === selectedItemId);

    // Get only fulfillments that are linked to the selected item
    const availableFulfillments = selectedItem
        ? (selectedProvider?.fulfillments || []).filter((f) =>
              selectedItem.fulfillment_ids.includes(f.id)
          )
        : [];

    /* ------------------- HANDLE PASTE ------------------- */
    const handlePaste = (payload: any) => {
        try {
            if (!payload?.message?.catalog?.providers) {
                throw new Error("Invalid Schema");
            }

            const catalogProviders = payload.message.catalog.providers;

            const parsedProviders: IProvider[] = catalogProviders.map((provider: any) => ({
                id: provider.id,
                items: (provider.items || []).map((item: any) => ({
                    id: item.id,
                    name: item.descriptor?.name || item.id,
                    fulfillment_ids: item.fulfillment_ids || [],
                })),
                fulfillments: (provider.fulfillments || []).map((f: any) => ({
                    id: f.id,
                })),
            }));

            setProviders(parsedProviders);
            setErrorWhilePaste("");

            // Auto-select first provider
            if (parsedProviders.length > 0) {
                setValue("providerId", parsedProviders[0].id);

                // Auto-select first item if available
                if (parsedProviders[0].items.length > 0) {
                    setValue("itemId", parsedProviders[0].items[0].id);

                    // Auto-select first fulfillment if available
                    if (parsedProviders[0].items[0].fulfillment_ids.length > 0) {
                        setValue("fulfillmentId", parsedProviders[0].items[0].fulfillment_ids[0]);
                    }
                }

                toast.success(
                    `Found ${parsedProviders.length} provider(s) with ${parsedProviders[0].items.length} item(s)`
                );
            }
        } catch (err) {
            setErrorWhilePaste("Invalid payload structure.");
            toast.error("Invalid payload structure");
            console.error(err);
        }

        setIsPayloadEditorActive(false);
    };

    /* ------------------- FINAL SUBMIT ------------------- */
    const onSubmit = async (data: IFormData) => {
        const finalPayload = {
            provider: data.providerId,
            item: data.itemId,
            fulfillment: data.fulfillmentId,
        };

        await submitEvent({
            jsonPath: {},
            formData: {
                data: JSON.stringify(finalPayload),
            },
        });
    };

    const { inputStyle, labelStyle, fieldWrapperStyle } = FORM_STYLES;

    return (
        <div>
            {isPayloadEditorActive && <PayloadEditor onAdd={handlePaste} />}
            {errorWhilePaste && (
                <p className="text-red-500 text-sm italic mt-1">{errorWhilePaste}</p>
            )}

            <button
                type="button"
                onClick={() => setIsPayloadEditorActive(true)}
                className="p-2 border rounded-full hover:bg-gray-100 mb-3"
            >
                <FaRegPaste size={14} />
            </button>
            <span className="text-sm text-red-600 font-semibold ml-2">
                Paste the on_search payload to select Item, Provider, and Fulfillment
            </span>

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4 h-[500px] overflow-y-scroll p-4"
            >
                <div className="border p-4 rounded-lg space-y-2">
                    {/* PROVIDER ID */}
                    <div className={fieldWrapperStyle}>
                        <label className={labelStyle}>Select Provider ID</label>
                        {providers.length > 0 ? (
                            <select
                                {...register("providerId")}
                                className={inputStyle}
                                onChange={(e) => {
                                    setValue("providerId", e.target.value);
                                    setValue("itemId", "");
                                    setValue("fulfillmentId", "");
                                }}
                            >
                                <option value="">Select a provider</option>
                                {providers.map((provider) => (
                                    <option key={provider.id} value={provider.id}>
                                        {provider.id}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                placeholder="Provider Id"
                                {...register("providerId")}
                                className={inputStyle}
                            />
                        )}
                    </div>

                    {/* ITEM ID */}
                    <div className={fieldWrapperStyle}>
                        <label className={labelStyle}>Select Item ID</label>
                        {availableItems.length > 0 ? (
                            <select
                                {...register("itemId")}
                                className={inputStyle}
                                onChange={(e) => {
                                    setValue("itemId", e.target.value);
                                    setValue("fulfillmentId", "");
                                }}
                            >
                                <option value="">Select an item</option>
                                {availableItems.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.id}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                placeholder="Item Id"
                                {...register("itemId")}
                                className={inputStyle}
                            />
                        )}
                    </div>

                    {/* FULFILLMENT ID */}
                    <div className={fieldWrapperStyle}>
                        <label className={labelStyle}>Select Fulfillment ID</label>
                        {availableFulfillments.length > 0 ? (
                            <select {...register("fulfillmentId")} className={inputStyle}>
                                <option value="">Select a fulfillment</option>
                                {availableFulfillments.map((f) => (
                                    <option key={f.id} value={f.id}>
                                        {f.id}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                placeholder="Fulfillment Id"
                                {...register("fulfillmentId")}
                                className={inputStyle}
                            />
                        )}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={!isFormValid}
                    className={`w-full py-2 rounded ${
                        isFormValid
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                >
                    Submit
                </button>
            </form>
        </div>
    );
}
