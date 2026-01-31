import { useState } from "react";
import { useForm } from "react-hook-form";
import { FaRegPaste } from "react-icons/fa6";
import { toast } from "react-toastify";
import PayloadEditor from "@/components/ui/mini-components/payload-editor";
import {
    IHotelCatalogItem,
    IHotelFormData,
    IHotelSelectProps,
    DEFAULT_HOTEL_FORM_DATA,
    HOTEL_FORM_STYLES,
} from "./hotel.types";

export default function HotelSelect({ submitEvent }: IHotelSelectProps) {
    const [isPayloadEditorActive, setIsPayloadEditorActive] = useState(false);
    const [errorWhilePaste, setErrorWhilePaste] = useState("");
    const [availableItems, setAvailableItems] = useState<IHotelCatalogItem[]>([]);

    const { register, handleSubmit, watch, reset } = useForm<IHotelFormData>({
        defaultValues: DEFAULT_HOTEL_FORM_DATA,
    });

    // Watch selected item to get its addons
    const selectedItemId = watch("itemId");
    const selectedItem = availableItems.find((item) => item.id === selectedItemId);
    const availableAddons = selectedItem?.addOns || [];

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

            const provider = providers[0] as Record<string, unknown>;
            const items = (provider.items || []) as Record<string, unknown>[];

            // Extract items with their addons
            const catalogItems: IHotelCatalogItem[] = items.map((item) => {
                const descriptor = item.descriptor as Record<string, unknown> | undefined;
                const addOns = (item.add_ons || []) as Record<string, unknown>[];

                return {
                    id: (item.id as string) || "",
                    name: (descriptor?.name as string) || (item.id as string) || "",
                    locationIds: (item.location_ids as string[]) || [],
                    addOns: addOns.map((addon) => {
                        const addonDescriptor = addon.descriptor as
                            | Record<string, unknown>
                            | undefined;
                        return {
                            id: (addon.id as string) || "",
                            name:
                                (addonDescriptor?.name as string) ||
                                (addonDescriptor?.short_desc as string) ||
                                (addon.id as string) ||
                                "",
                        };
                    }),
                };
            });

            setAvailableItems(catalogItems);

            const firstItem = catalogItems[0];

            if (!firstItem) {
                throw new Error("No items found in catalog");
            }

            // Pre-populate form with first item
            reset({
                providerId: (provider.id as string) || "",
                locationId: firstItem.locationIds[0] || "",
                itemId: firstItem.id,
                quantity: 1,
                addOnId: firstItem.addOns?.[0]?.id || "",
                adultsCount: 1,
                childrenCount: 0,
            });

            setErrorWhilePaste("");
            toast.success(`Found ${catalogItems.length} items in catalog`);
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
        const selectPayload = {
            provider: {
                id: data.providerId,
            },
            items: [
                {
                    id: data.itemId,
                    location_ids: data.locationId ? [data.locationId] : [],
                    quantity: {
                        selected: {
                            count: data.quantity,
                        },
                    },
                    ...(data.addOnId && {
                        add_ons: [{ id: data.addOnId }],
                    }),
                },
            ],
            fulfillments: [
                {
                    tags: [
                        {
                            descriptor: { code: "GUESTS" },
                            list: [
                                { descriptor: { code: "ADULTS" }, value: String(data.adultsCount) },
                                {
                                    descriptor: { code: "CHILDREN" },
                                    value: String(data.childrenCount),
                                },
                            ],
                        },
                    ],
                },
            ],
        };

        await submitEvent({
            jsonPath: {},
            formData: {
                data: JSON.stringify(selectPayload),
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
                    <span className="text-sm">Paste on_search payload</span>
                </button>
            </div>

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4 h-[500px] overflow-y-scroll p-4"
            >
                {/* ITEM SELECTION */}
                <div className={sectionStyle}>
                    <h3 className="font-semibold text-gray-800 mb-3">Room Selection</h3>

                    {/* ITEM ID */}
                    <div className={fieldWrapperStyle}>
                        <label className={labelStyle}>
                            Item ID <span className="text-red-500">*</span>
                        </label>
                        {availableItems.length > 0 ? (
                            <select
                                {...register("itemId", { required: true })}
                                className={inputStyle}
                            >
                                <option value="">Select a room/item</option>
                                {availableItems.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name} ({item.id})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                placeholder="Paste on_search payload to populate items"
                                {...register("itemId", { required: true })}
                                className={inputStyle}
                            />
                        )}
                    </div>

                    {/* QUANTITY */}
                    <div className={fieldWrapperStyle}>
                        <label className={labelStyle}>
                            Quantity (Number of rooms) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="1"
                            {...register("quantity", { valueAsNumber: true, required: true })}
                            className={inputStyle}
                        />
                    </div>

                    {/* ADD-ON ID */}
                    <div className={fieldWrapperStyle}>
                        <label className={labelStyle}>Add-On (optional)</label>
                        {availableAddons.length > 0 ? (
                            <select {...register("addOnId")} className={inputStyle}>
                                <option value="">No add-on</option>
                                {availableAddons.map((addon) => (
                                    <option key={addon.id} value={addon.id}>
                                        {addon.name} ({addon.id})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                placeholder="No add-ons available"
                                {...register("addOnId")}
                                className={inputStyle}
                            />
                        )}
                    </div>
                </div>

                {/* GUEST DETAILS */}
                <div className={sectionStyle}>
                    <h3 className="font-semibold text-gray-800 mb-3">Guest Details</h3>

                    {/* ADULTS COUNT */}
                    <div className={fieldWrapperStyle}>
                        <label className={labelStyle}>
                            Number of Adults <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            min="1"
                            {...register("adultsCount", { valueAsNumber: true, required: true })}
                            className={inputStyle}
                        />
                    </div>

                    {/* CHILDREN COUNT */}
                    <div className={fieldWrapperStyle}>
                        <label className={labelStyle}>Number of Children</label>
                        <input
                            type="number"
                            min="0"
                            {...register("childrenCount", { valueAsNumber: true })}
                            className={inputStyle}
                        />
                    </div>
                </div>

                {/* Hidden fields */}
                <input type="hidden" {...register("providerId")} />
                <input type="hidden" {...register("locationId")} />

                <button
                    type="submit"
                    className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                >
                    Submit Select Request
                </button>
            </form>
        </div>
    );
}
