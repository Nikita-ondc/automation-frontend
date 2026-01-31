import { useState } from "react";
import { useForm } from "react-hook-form";
import { FaRegPaste } from "react-icons/fa6";
import PayloadEditor from "../../mini-components/payload-editor";
import { SubmitEventParams } from "../../../../types/flow-types";
import { toast } from "react-toastify";

interface CatalogItem {
    id: string;
    descriptor?: {
        name?: string;
    };
    price?: {
        value?: string;
    };
}

interface CatalogFulfillment {
    id: string;
}

interface CatalogProvider {
    id: string;
    fulfillments?: CatalogFulfillment[];
    items?: CatalogItem[];
}

interface OnSearchPayload {
    message?: {
        catalog?: {
            providers?: CatalogProvider[];
        };
    };
}

interface FormData {
    provider: string;
    fulfillment: string;
    itemId: string;
    count: number;
}

export default function IntercitySelect({
    submitEvent,
}: {
    submitEvent: (data: SubmitEventParams) => Promise<void>;
}) {
    const [isPayloadEditorActive, setIsPayloadEditorActive] = useState(false);
    const [errorWhilePaste, setErrorWhilePaste] = useState("");
    const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);

    const { register, handleSubmit, setValue } = useForm<FormData>({
        defaultValues: {
            provider: "",
            fulfillment: "",
            itemId: "",
            count: 1,
        },
    });

    /* ------------------- HANDLE PASTE ------------------- */
    const handlePaste = (payload: unknown) => {
        try {
            const parsedPayload = payload as OnSearchPayload;
            if (!parsedPayload?.message?.catalog?.providers?.length) {
                throw new Error("Invalid Schema");
            }

            const provider = parsedPayload.message.catalog.providers[0];

            setValue("provider", provider.id);
            setValue("fulfillment", provider.fulfillments?.[0]?.id || "");
            setCatalogItems(provider.items || []);
        } catch (err) {
            setErrorWhilePaste("Invalid payload structure.");
            toast.error("Invalid payload structure");
            console.error(err);
        }

        setIsPayloadEditorActive(false);
    };

    /* ------------------- FINAL SUBMIT ------------------- */
    const onSubmit = async (data: FormData) => {
        const finalPayload = {
            provider: data.provider,
            fulfillment: data.fulfillment,
            items: [
                {
                    itemId: data.itemId,
                    count: data.count,
                    addOns: [],
                },
            ],
        };

        await submitEvent({
            jsonPath: {},
            formData: {
                data: JSON.stringify(finalPayload),
            },
        });
    };

    const inputStyle =
        "border rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
    const labelStyle = "mb-1 font-semibold text-sm";
    const fieldWrapperStyle = "flex flex-col mb-2";

    return (
        <div>
            {isPayloadEditorActive && <PayloadEditor onAdd={handlePaste} />}
            {errorWhilePaste && (
                <p className="text-red-500 text-sm italic mt-1">{errorWhilePaste}</p>
            )}

            <div className="flex items-center gap-2 mb-3">
                <button
                    type="button"
                    onClick={() => setIsPayloadEditorActive(true)}
                    className="p-2 border rounded-full hover:bg-gray-100"
                >
                    <FaRegPaste size={14} />
                </button>
                <p className="text-red-500 text-sm font-semibold">
                    Please paste the third on_search payload here first to populate the item id to
                    select from dropdown
                </p>
            </div>

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4 h-[500px] overflow-y-scroll p-4"
            >
                <div className="border p-4 rounded-lg space-y-2">
                    {/* ITEM DROPDOWN */}
                    <div className={fieldWrapperStyle}>
                        <label className={labelStyle}>Select Item Id</label>
                        <select {...register("itemId")} className={inputStyle}>
                            <option value="">Select Item Id</option>
                            {catalogItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.id}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* SEAT COUNT */}
                    <div className={fieldWrapperStyle}>
                        <label className={labelStyle}>Select Item Quantity</label>
                        <input
                            type="number"
                            min={1}
                            {...register("count", {
                                valueAsNumber: true,
                            })}
                            className={inputStyle}
                        />
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
