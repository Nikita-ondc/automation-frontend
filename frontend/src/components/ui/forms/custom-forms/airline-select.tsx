import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { FaRegPaste } from "react-icons/fa6";
import { toast } from "react-toastify";
import PayloadEditor from "@/components/ui/mini-components/payload-editor";
import {
    IFormData,
    ICatalogItem,
    IAirlineSelectProps,
    FORM_STYLES,
    DEFAULT_FORM_DATA,
} from "./airline.types";

type CatalogAddOn = { id: string; descriptor?: { name?: string } };
type CatalogItem = { id: string; descriptor?: { name?: string }; add_ons?: CatalogAddOn[] };
type CatalogFulfillment = { id: string };
type CatalogProvider = { id: string; items?: CatalogItem[]; fulfillments?: CatalogFulfillment[] };
type OnSearchPayload = { message?: { catalog?: { providers?: CatalogProvider[] } } };

export default function AirlineSelect({
    submitEvent,
    defaultValues = DEFAULT_FORM_DATA,
}: IAirlineSelectProps) {
    const [isPayloadEditorActive, setIsPayloadEditorActive] = useState(false);
    const [errorWhilePaste, setErrorWhilePaste] = useState("");
    const [availableItems, setAvailableItems] = useState<ICatalogItem[]>([]);

    const { control, register, handleSubmit, setValue, reset, watch } = useForm<IFormData>({
        defaultValues,
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items",
    });

    // Watch form items to get selected itemId for each row
    const watchedItems = watch("items");

    // Helper to get addons for a selected item
    const getAddonsForItem = (itemId: string) => {
        const item = availableItems.find((i) => i.id === itemId);
        return item?.addOns || [];
    };

    /* ------------------- HANDLE PASTE ------------------- */
    const handlePaste = (payload: unknown) => {
        try {
            const parsed = payload as OnSearchPayload;
            if (!parsed?.message?.catalog?.providers) {
                throw new Error("Invalid Schema");
            }

            const provider = parsed.message.catalog.providers[0];

            // Extract items from catalog
            const catalogItems: ICatalogItem[] = (provider.items || []).map(
                (item: CatalogItem) => ({
                    id: item.id,
                    name: item.descriptor?.name || item.id,
                    addOns: (item.add_ons || []).map((addon: CatalogAddOn) => ({
                        id: addon.id,
                        name: addon.descriptor?.name || addon.id,
                    })),
                })
            );

            setAvailableItems(catalogItems);
            setErrorWhilePaste("");

            // Set provider and fulfillment
            setValue("provider", provider.id);
            setValue("fulfillment", provider.fulfillments?.[0]?.id || "");

            // Pre-populate first item if available
            if (catalogItems.length > 0) {
                reset({
                    provider: provider.id,
                    fulfillment: provider.fulfillments?.[0]?.id || "",
                    items: [
                        {
                            itemId: catalogItems[0].id,
                            count: 1,
                            addOnId: catalogItems[0].addOns?.[0]?.id || "",
                            addOnCount: 1,
                        },
                    ],
                });
                toast.success(`Found ${catalogItems.length} items in catalog`);
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
        const finalItems = data.items.map((item) => ({
            itemId: item.itemId,
            count: item.count,
            addOns: item.addOnId
                ? [
                      {
                          id: item.addOnId,
                          count: item.addOnCount || 1,
                      },
                  ]
                : [],
        }));

        const finalPayload = {
            provider: data.provider,
            fulfillment: data.fulfillment,
            items: finalItems,
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

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4 h-[500px] overflow-y-scroll p-4"
            >
                {fields.map((field, index) => (
                    <div key={field.id} className="border p-4 rounded-lg space-y-2">
                        {/* ITEM ID */}
                        <div className={fieldWrapperStyle}>
                            <label className={labelStyle}>Item ID</label>
                            {availableItems.length > 0 ? (
                                <select
                                    {...register(`items.${index}.itemId`)}
                                    className={inputStyle}
                                >
                                    <option value="">Select an item</option>
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
                                    {...register(`items.${index}.itemId`)}
                                    className={inputStyle}
                                />
                            )}
                        </div>

                        {/* ITEM QUANTITY */}
                        <div className={fieldWrapperStyle}>
                            <label className={labelStyle}>Item Quantity</label>
                            <input
                                type="number"
                                min="1"
                                {...register(`items.${index}.count`, {
                                    valueAsNumber: true,
                                })}
                                className={inputStyle}
                            />
                        </div>

                        {/* ADD-ON ID */}
                        <div className={fieldWrapperStyle}>
                            <label className={labelStyle}>Add-On ID</label>
                            {(() => {
                                const selectedItemId = watchedItems?.[index]?.itemId || "";
                                const itemAddons = getAddonsForItem(selectedItemId);
                                return itemAddons.length > 0 ? (
                                    <select
                                        {...register(`items.${index}.addOnId`)}
                                        className={inputStyle}
                                    >
                                        <option value="">Select an add-on (optional)</option>
                                        {itemAddons.map((addon) => (
                                            <option key={addon.id} value={addon.id}>
                                                {addon.name} ({addon.id})
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        placeholder="No add-ons available or select an item first"
                                        {...register(`items.${index}.addOnId`)}
                                        className={inputStyle}
                                    />
                                );
                            })()}
                        </div>

                        {/* ADD-ON QUANTITY */}
                        <div className={fieldWrapperStyle}>
                            <label className={labelStyle}>Add-On Quantity</label>
                            <input
                                type="number"
                                // min="1"
                                {...register(`items.${index}.addOnCount`, {
                                    valueAsNumber: true,
                                })}
                                className={inputStyle}
                            />
                        </div>

                        {fields.length > 1 && (
                            <button
                                type="button"
                                onClick={() => remove(index)}
                                className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                            >
                                Remove Item
                            </button>
                        )}
                    </div>
                ))}

                <button
                    type="button"
                    onClick={() =>
                        append({
                            itemId: "",
                            count: 1,
                            addOnId: "",
                            addOnCount: 1,
                        })
                    }
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    + Add Another Item
                </button>

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
