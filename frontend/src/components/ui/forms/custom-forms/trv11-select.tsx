import { useState } from "react";
import { useForm, useFieldArray, FieldPath } from "react-hook-form";
import { FaRegPaste } from "react-icons/fa6";
import PayloadEditor from "../../mini-components/payload-editor";
import { SubmitEventParams } from "../../../../types/flow-types";
import { toast } from "react-toastify";

interface ExtractedItem {
    itemid: string;
    providerid: string;
}

type FormItem = {
    itemId: string;
    count: number;
    addOns?: string[];
    location?: string;
};

type FormValues = {
    provider: string;
    items: FormItem[];
    fulfillment?: string;
};

type CatalogItem = { id: string };
type CatalogFulfillment = { id: string };
type CatalogProvider = { id: string; fulfillments: CatalogFulfillment[]; items?: CatalogItem[] };
type OnSearchPayload = { message?: { catalog?: { providers?: CatalogProvider[] } } };

// [
//   {
//       "itemId": "I1",
//       "count": 1,
//       "addOns": []
//   }
// ]

export default function TRV11Select({
    submitEvent,
}: {
    submitEvent: (data: SubmitEventParams) => Promise<void>;
}) {
    const [isPayloadEditorActive, setIsPayloadEditorActive] = useState(false);
    const [errorWhilePaste, setErrorWhilePaste] = useState("");

    const { control, handleSubmit, register, setValue } = useForm<FormValues>({
        defaultValues: {
            provider: "",
            items: [{ itemId: "", count: 1, addOns: [] }],
        },
    });

    const { fields, append, remove } = useFieldArray<FormValues, "items">({
        control,
        name: "items",
    });

    const [itemOptions, setItemOptions] = useState<ExtractedItem[]>([]);

    const onSubmit = async (data: FormValues) => {
        await submitEvent({ jsonPath: {}, formData: data as unknown as Record<string, string> });
    };

    const handlePaste = (payload: unknown) => {
        try {
            const parsed = payload as OnSearchPayload;
            if (!parsed?.message?.catalog?.providers) return [];

            const providers = parsed.message.catalog.providers;

            const results: ExtractedItem[] = [];

            providers.forEach((provider: CatalogProvider) => {
                const providerId = provider.id;
                const fulfillmentId = provider.fulfillments[0]?.id;
                if (!fulfillmentId) return;

                if (!provider.items) return;

                setValue("fulfillment" as unknown as FieldPath<FormValues>, fulfillmentId);

                provider.items.forEach((item: CatalogItem) => {
                    results.push({
                        itemid: item.id,
                        providerid: providerId,
                    });
                });
            });

            setItemOptions(results);
        } catch (err) {
            setErrorWhilePaste("Invalid payload structure.");
            toast.error("Invalid payload structure. Please check the pasted data.");
            console.error(err);
        }
        setIsPayloadEditorActive(false);
    };

    const inputStyle =
        "border rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
    const labelStyle = "mb-1 font-semibold";
    const fieldWrapperStyle = "flex flex-col mb-2";

    const renderSelectOrInput = (
        name: string,
        options: ExtractedItem[],
        _index: number,
        placeholder = ""
    ) => {
        if (options.length === 0) {
            return (
                <input
                    type="text"
                    {...register(name as unknown as FieldPath<FormValues>)}
                    placeholder={placeholder}
                    className={inputStyle}
                />
            );
        }
        return (
            <select
                {...register(name as unknown as FieldPath<FormValues>)}
                onChange={(e) => {
                    const selectedId = e.target.value;
                    const selectedOption = options.find((opt) => opt.itemid === selectedId);

                    if (selectedOption) {
                        setValue("provider", selectedOption.providerid);
                    }
                }}
                className={inputStyle}
            >
                <option value="">Select...</option>
                {options.map((option) => (
                    <option key={option.itemid} value={option.itemid}>
                        {option.itemid}
                    </option>
                ))}
            </select>
        );
    };

    return (
        <div>
            {isPayloadEditorActive && <PayloadEditor onAdd={handlePaste} />}
            {errorWhilePaste && (
                <p className="text-red-500 text-sm italic mt-1">{errorWhilePaste}</p>
            )}
            <button
                type="button"
                onClick={() => setIsPayloadEditorActive(true)}
                className="p-2 border rounded-full hover:bg-gray-100"
            >
                <FaRegPaste size={14} />
            </button>

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4 h-[500px] overflow-y-scroll p-4"
            >
                {fields.map((field, index) => (
                    <div key={field.id} className="border p-3 rounded space-y-2">
                        <div className={fieldWrapperStyle}>
                            <label className={labelStyle}>Select Item {index + 1}</label>
                            {renderSelectOrInput(`items.${index}.itemId`, itemOptions, index)}
                        </div>

                        <div className={fieldWrapperStyle}>
                            <label className={labelStyle}>Quantity</label>
                            <input
                                type="number"
                                {...register(`items.${index}.count`, {
                                    valueAsNumber: true,
                                })}
                                className={inputStyle}
                            />
                        </div>
                    </div>
                ))}

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => append({ itemId: "", count: 1, location: "" })}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Add Item
                    </button>
                    {fields.length > 1 && (
                        <button
                            type="button"
                            onClick={() => remove(fields.length - 1)}
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                            Remove Item
                        </button>
                    )}
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

// type FormData = {
//   provider: string;
//   provider_location: string[];
//   location_gps: string;
//   location_pin_code: string;
//   items: {
//     itemId: string;
//     quantity: number;
//     location: string;
//   }[];
//   [key: string]: any; // to allow dynamic offer keys like offers_FLAT50
// };

// function (data: FormData): {
//   valid: boolean;
//   errors: string[];
// } {
//   const errors: string[] = [];

//   for (const key in data) {
//     if (data[key] === undefined || data[key] === null || data[key] === "") {
//       errors.push(`Field ${key} cannot be empty.`);
//     }
//   }

//   // Rule 1: At least 2 items
//   if (!data.items || data.items.length < 2) {
//     errors.push("At least 2 items must be selected.");
//   }

//   // Rule 2: All items must be unique
//   const itemIds = data.items.map((item) => item.itemId);
//   const uniqueItemIds = new Set(itemIds);
//   if (itemIds.length !== uniqueItemIds.size) {
//     errors.push("All selected items must be unique.");
//   }

//   // Rule 3: Only one offer can be selected (non-falsy)
//   const offerKeys = Object.keys(data).filter((key) =>
//     key.startsWith("offers_")
//   );
//   const selectedOffers = offerKeys.filter((key) => Boolean(data[key]));
//   if (selectedOffers.length > 1) {
//     errors.push("Only one offer can be selected.");
//   }

//   return {
//     valid: errors.length === 0,
//     errors,
//   };
// }
