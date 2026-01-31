import { useState } from "react";
import { FaRegPaste, FaPlus, FaTrash } from "react-icons/fa6";
import { toast } from "react-toastify";
import PayloadEditor from "@/components/ui/mini-components/payload-editor";
import { FORM_STYLES } from "./airline.types";

interface IItem {
    id: string;
    name: string;
    maxQuantity: number;
    minQuantity: number;
}

interface ISelectedItem {
    itemId: string;
    itemQuantity: string;
}

interface IMetro210SelectProps {
    submitEvent: (data: any) => Promise<void>;
}

export default function Metro210Select({ submitEvent }: IMetro210SelectProps) {
    const [isPayloadEditorActive, setIsPayloadEditorActive] = useState(false);
    const [errorWhilePaste, setErrorWhilePaste] = useState("");
    const [items, setItems] = useState<IItem[]>([]);
    const [selectedItems, setSelectedItems] = useState<ISelectedItem[]>([
        { itemId: "", itemQuantity: "" },
    ]);

    // Get all selected item IDs (for filtering)
    const selectedItemIds = selectedItems.map((item) => item.itemId).filter(Boolean);

    // Check if form is valid (all items have both fields filled)
    const isFormValid =
        selectedItems.length > 0 && selectedItems.every((item) => item.itemId && item.itemQuantity);

    // Get available items for a specific selection (exclude already selected items)
    const getAvailableItems = (currentIndex: number) => {
        const currentItemId = selectedItems[currentIndex]?.itemId;
        return items.filter(
            (item) => !selectedItemIds.includes(item.id) || item.id === currentItemId
        );
    };

    // Get quantity options for a specific item
    const getQuantityOptions = (itemId: string) => {
        const item = items.find((i) => i.id === itemId);
        if (!item) return [];
        return Array.from(
            { length: item.maxQuantity - item.minQuantity + 1 },
            (_, i) => item.minQuantity + i
        );
    };

    // Handle item selection change
    const handleItemChange = (index: number, itemId: string) => {
        const newSelectedItems = [...selectedItems];
        newSelectedItems[index].itemId = itemId;

        // Reset quantity when item changes
        const item = items.find((i) => i.id === itemId);
        if (item) {
            newSelectedItems[index].itemQuantity = String(item.minQuantity);
        } else {
            newSelectedItems[index].itemQuantity = "";
        }

        setSelectedItems(newSelectedItems);
    };

    // Handle quantity change
    const handleQuantityChange = (index: number, quantity: string) => {
        const newSelectedItems = [...selectedItems];
        newSelectedItems[index].itemQuantity = quantity;
        setSelectedItems(newSelectedItems);
    };

    // Add new item selection
    const addItem = () => {
        // Check if there are still available items to select
        const usedIds = selectedItems.map((item) => item.itemId).filter(Boolean);
        const availableCount = items.filter((item) => !usedIds.includes(item.id)).length;

        if (availableCount === 0) {
            toast.warning("No more items available to add");
            return;
        }

        setSelectedItems([...selectedItems, { itemId: "", itemQuantity: "" }]);
    };

    // Remove item selection
    const removeItem = (index: number) => {
        if (selectedItems.length === 1) {
            toast.warning("At least one item is required");
            return;
        }
        const newSelectedItems = selectedItems.filter((_, i) => i !== index);
        setSelectedItems(newSelectedItems);
    };

    /* ------------------- HANDLE PASTE ------------------- */
    const handlePaste = (payload: any) => {
        try {
            if (!payload?.message?.catalog?.providers) {
                throw new Error("Invalid Schema");
            }

            const catalogProviders = payload.message.catalog.providers;

            // Extract all items from all providers
            const parsedItems: IItem[] = [];
            catalogProviders.forEach((provider: any) => {
                (provider.items || []).forEach((item: any) => {
                    parsedItems.push({
                        id: item.id,
                        name: item.descriptor?.name || item.id,
                        maxQuantity: item.quantity?.maximum?.count || 1,
                        minQuantity: item.quantity?.minimum?.count || 1,
                    });
                });
            });

            setItems(parsedItems);
            setErrorWhilePaste("");

            // Auto-select first item if available
            if (parsedItems.length > 0) {
                setSelectedItems([
                    {
                        itemId: parsedItems[0].id,
                        itemQuantity: String(parsedItems[0].minQuantity),
                    },
                ]);

                toast.success(`Found ${parsedItems.length} item(s)`);
            }
        } catch (err) {
            setErrorWhilePaste("Invalid payload structure.");
            toast.error("Invalid payload structure");
            console.error(err);
        }

        setIsPayloadEditorActive(false);
    };

    /* ------------------- FINAL SUBMIT ------------------- */
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate all items have both fields
        const invalidItems = selectedItems.filter((item) => !item.itemId || !item.itemQuantity);

        if (invalidItems.length > 0) {
            toast.error("Please fill in all fields for each item");
            return;
        }

        const finalPayload = {
            items: selectedItems.map((item) => ({
                itemId: item.itemId,
                itemQuantity: parseInt(item.itemQuantity, 10),
            })),
        };

        console.log("=== METRO SELECT PAYLOAD SENT TO BACKEND ===");
        console.log(JSON.stringify(finalPayload, null, 2));
        console.log("=============================================");

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
                Paste the second on_search payload to select Item and Quantity
            </span>

            <form onSubmit={handleFormSubmit} className="space-y-4 h-[500px] overflow-y-scroll p-4">
                {selectedItems.map((selectedItem, index) => {
                    const availableItems = getAvailableItems(index);
                    const quantityOptions = getQuantityOptions(selectedItem.itemId);

                    return (
                        <div key={index} className="border p-4 rounded-lg space-y-2 relative">
                            {/* Item Header with Delete Button */}
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-semibold text-gray-700">
                                    Item {index + 1}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                                    title="Remove item"
                                >
                                    <FaTrash size={14} />
                                </button>
                            </div>

                            {/* ITEM ID */}
                            <div className={fieldWrapperStyle}>
                                <label className={labelStyle}>
                                    Select Item ID <span className="text-red-500">*</span>
                                </label>
                                {items.length > 0 ? (
                                    <select
                                        value={selectedItem.itemId}
                                        onChange={(e) => handleItemChange(index, e.target.value)}
                                        className={inputStyle}
                                        required
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
                                        value={selectedItem.itemId}
                                        onChange={(e) => handleItemChange(index, e.target.value)}
                                        className={inputStyle}
                                        required
                                    />
                                )}
                            </div>

                            {/* ITEM QUANTITY */}
                            <div className={fieldWrapperStyle}>
                                <label className={labelStyle}>
                                    Select Item Quantity <span className="text-red-500">*</span>
                                </label>
                                {quantityOptions.length > 0 ? (
                                    <select
                                        value={selectedItem.itemQuantity}
                                        onChange={(e) =>
                                            handleQuantityChange(index, e.target.value)
                                        }
                                        className={inputStyle}
                                        required
                                    >
                                        <option value="">Select quantity</option>
                                        {quantityOptions.map((qty) => (
                                            <option key={qty} value={qty}>
                                                {qty}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="number"
                                        placeholder="Quantity"
                                        value={selectedItem.itemQuantity}
                                        onChange={(e) =>
                                            handleQuantityChange(index, e.target.value)
                                        }
                                        className={inputStyle}
                                        min="1"
                                        required
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Add More Item Button */}
                <button
                    type="button"
                    onClick={addItem}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center gap-2 transition-colors"
                >
                    <FaPlus size={12} />
                    Add More Item
                </button>

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
