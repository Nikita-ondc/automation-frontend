import { useState } from "react";
import { useForm } from "react-hook-form";
import { FaRegPaste, FaTrash } from "react-icons/fa6";
import PayloadEditor from "../../mini-components/payload-editor";
import { SubmitEventParams } from "../../../../types/flow-types";
import { toast } from "react-toastify";

interface ExtractedItem {
    id: string;
    parent_item_id: string;
}

type FormValues = {
    selectedItems: ExtractedItem[];
};

type OrderItem = { id: string; parent_item_id?: string };
type CatalogItem = { id: string; parent_item_id?: string };
type CatalogProvider = { items?: CatalogItem[] };
type Payload = {
    message?: {
        order?: { items?: OrderItem[] };
        catalog?: { providers?: CatalogProvider[] };
    };
};

export default function FIS13ItemSelection({
    submitEvent,
}: {
    submitEvent: (data: SubmitEventParams) => Promise<void>;
}) {
    const [isPayloadEditorActive, setIsPayloadEditorActive] = useState(false);
    const [errorWhilePaste, setErrorWhilePaste] = useState("");
    const [itemOptions, setItemOptions] = useState<ExtractedItem[]>([]);

    const { handleSubmit, watch, setValue } = useForm<FormValues>({
        defaultValues: {
            selectedItems: [],
        },
    });

    const selectedItems = watch("selectedItems");

    const onSubmit = async (data: FormValues) => {
        // Only send the selected items array as requested
        await submitEvent({
            jsonPath: {},
            formData: data.selectedItems as unknown as Record<string, string>,
        });
    };

    const handlePaste = (payload: unknown) => {
        setErrorWhilePaste("");
        try {
            let results: ExtractedItem[] = [];
            const parsed = payload as Payload;

            // Handle on_select / on_init payload structure
            if (parsed?.message?.order?.items) {
                results = parsed.message.order.items.map((item: OrderItem) => ({
                    id: item.id,
                    parent_item_id: item.parent_item_id || "",
                }));
            }
            // Handle on_search / catalog payload structure (fallback)
            else if (parsed?.message?.catalog?.providers) {
                parsed.message.catalog.providers.forEach((provider: CatalogProvider) => {
                    if (provider.items) {
                        provider.items.forEach((item: CatalogItem) => {
                            results.push({
                                id: item.id,
                                parent_item_id: item.parent_item_id || "",
                            });
                        });
                    }
                });
            }

            if (results.length === 0) {
                throw new Error("No items found in payload");
            }

            setItemOptions(results);
            toast.success(`${results.length} items extracted from payload.`);
        } catch (err) {
            setErrorWhilePaste("Invalid payload structure or no items found.");
            toast.error("Invalid payload structure. Please check the pasted data.");
            console.error(err);
        }
        setIsPayloadEditorActive(false);
    };

    const toggleItemSelection = (item: ExtractedItem) => {
        const current = [...selectedItems];
        const index = current.findIndex((i) => i.id === item.id);
        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(item);
        }
        setValue("selectedItems", current);
    };

    const inputStyle =
        "border rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
    const labelStyle = "mb-1 font-semibold block text-gray-700";

    return (
        <div className="max-w-2xl mx-auto">
            {isPayloadEditorActive && <PayloadEditor onAdd={handlePaste} />}

            <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setIsPayloadEditorActive(true)}
                        className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                        title="Paste Payload"
                    >
                        <FaRegPaste size={18} />
                        <span className="text-sm font-medium">Paste Payload</span>
                    </button>

                    {itemOptions.length === 0 && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-100 italic">
                            Please paste the payload (on_search) to load item options.
                        </span>
                    )}
                </div>
            </div>

            {errorWhilePaste && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
                    <span className="font-bold">Error:</span> {errorWhilePaste}
                </div>
            )}

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6 bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
            >
                <div className="space-y-4">
                    <label className={labelStyle}>Select Items from Payload</label>

                    {itemOptions.length > 0 ? (
                        <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100 max-h-60 overflow-y-auto">
                            {itemOptions.slice(1).map((option) => {
                                const isSelected = selectedItems.some((i) => i.id === option.id);
                                return (
                                    <div
                                        key={option.id}
                                        onClick={() => toggleItemSelection(option)}
                                        className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => { }} // Handled by div onClick
                                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {option.id}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Parent: {option.parent_item_id || "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                            <p className="text-sm text-gray-500">
                                No items loaded. Please paste a payload first.
                            </p>
                        </div>
                    )}
                </div>

                {selectedItems.length > 0 && (
                    <div className="space-y-2">
                        <label className={labelStyle}>
                            Selected Items ({selectedItems.length})
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {selectedItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium"
                                >
                                    <span>{item.id}</span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleItemSelection(item);
                                        }}
                                        className="hover:text-blue-900 focus:outline-none"
                                    >
                                        <FaTrash size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={selectedItems.length === 0}
                    className={`w-full py-3 rounded-lg font-semibold transition-all shadow-md ${selectedItems.length > 0
                            ? "bg-green-600 text-white hover:bg-green-700 active:transform active:scale-[0.98]"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                >
                    Submit
                </button>
            </form>

            {/* Manual Input Fallback or Addition */}
            <div className="mt-8 pt-6 border-t border-gray-100">
                <details className="group">
                    <summary className="text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700 transition-colors list-none flex items-center gap-2">
                        <span className="transform group-open:rotate-90 transition-transform">
                            ▶
                        </span>
                        Advanced: Add Item Manually
                    </summary>
                    <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-semibold text-gray-600 block mb-1">
                                    Item ID
                                </label>
                                <input
                                    id="manual-id"
                                    type="text"
                                    className={inputStyle}
                                    placeholder="e.g. CHILD_ITEM_ID_I1"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-semibold text-gray-600 block mb-1">
                                    Parent Item ID
                                </label>
                                <input
                                    id="manual-parent-id"
                                    type="text"
                                    className={inputStyle}
                                    placeholder="e.g. I1"
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                const idInput = document.getElementById(
                                    "manual-id"
                                ) as HTMLInputElement;
                                const parentInput = document.getElementById(
                                    "manual-parent-id"
                                ) as HTMLInputElement;
                                if (idInput.value) {
                                    const newItem = {
                                        id: idInput.value,
                                        parent_item_id: parentInput.value,
                                    };
                                    const exists = itemOptions.some((opt) => opt.id === newItem.id);
                                    if (!exists) {
                                        setItemOptions([...itemOptions, newItem]);
                                    }
                                    if (!selectedItems.some((i) => i.id === newItem.id)) {
                                        toggleItemSelection(newItem);
                                    }
                                    idInput.value = "";
                                    parentInput.value = "";
                                }
                            }}
                            className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-gray-900 transition-all font-medium"
                        >
                            Add to List
                        </button>
                    </div>
                </details>
            </div>
        </div>
    );
}
