// import { useForm, useFieldArray } from "react-hook-form";
// import { FaTrash } from "react-icons/fa";
// import { SubmitEventParams } from "../../../../types/flow-types";

// export default function TRV12busSeatSelection({
//   submitEvent,
// }: {
//   submitEvent: (data: SubmitEventParams) => Promise<void>;
// }) {
//   const { control, register, handleSubmit } = useForm({
//     defaultValues: {
//       items: [{ seatNumber: "" }],
//     },
//   });

//   const { fields, append, remove } = useFieldArray({
//     control,
//     name: "items",
//   });

//   const inputStyle =
//     "border rounded p-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
//   const labelStyle = "mb-1 font-semibold";
//   const fieldWrapperStyle = "flex flex-col mb-2";

//   const onSubmit = async (data: any) => {
//     const cleanedData = {
//       items: data.items
//         .map((item: any) => ({
//           seatNumber: item.seatNumber?.trim(),
//         }))
//         .filter((item: any) => item.seatNumber !== ""),
//     };

//     await submitEvent({ jsonPath: {}, formData: cleanedData });
//   };

//   return (
//     <div className="p-4">
//       <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//         {fields.map((field, index) => (
//           <div key={field.id} className="border p-3 rounded space-y-2">
//             <div className={fieldWrapperStyle}>
//               <label className={labelStyle}>Seat {index + 1}</label>
//               <div className="flex items-center gap-2">
//                 <input
//                   type="text"
//                   placeholder="Enter seat number"
//                   {...register(`items.${index}.seatNumber`)}
//                   className={inputStyle}
//                 />
//                 <FaTrash
//                   onClick={() => remove(index)}
//                   className="text-red-600 cursor-pointer hover:text-red-800 w-5 h-5"
//                 />
//               </div>
//             </div>
//           </div>
//         ))}

//         <div className="flex gap-2">
//           <button
//             type="button"
//             onClick={() => append({ seatNumber: "" })}
//             className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
//           >
//             Add Seat
//           </button>

//           <button
//             type="submit"
//             className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
//           >
//             Submit
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// }

import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { FaTrash } from "react-icons/fa";
import { FaRegPaste } from "react-icons/fa6";
import { toast } from "react-toastify";
import { SubmitEventParams } from "../../../../types/flow-types";
import { useEffect, useState } from "react";
import PayloadEditor from "../../mini-components/payload-editor";

type FulfillmentTagListItem = {
    descriptor: { code: string };
    value: string;
};

type FulfillmentTag = {
    descriptor: { code: string };
    list: FulfillmentTagListItem[];
};

type Fulfillment = {
    type?: string;
    tags?: FulfillmentTag[];
};

type OnSelectPayload = {
    message?: {
        order?: {
            fulfillments?: Fulfillment[];
        };
    };
};

type SeatSelectionFormValues = {
    items: Array<{ seatNumber: string }>;
};

export default function TRV12busSeatSelection({
    submitEvent,
    payload,
}: {
    submitEvent: (data: SubmitEventParams) => Promise<void>;
    payload?: OnSelectPayload;
}) {
    const [allowedSeatsCount, setAllowedSeatsCount] = useState(0);
    const [availableSeats, setAvailableSeats] = useState<string[]>([]);
    const [isPayloadEditorActive, setIsPayloadEditorActive] = useState(false);
    const [errorWhilePaste, setErrorWhilePaste] = useState("");

    const parseAndSetData = (data: unknown) => {
        try {
            const parsed = data as OnSelectPayload;
            if (!parsed?.message?.order?.fulfillments) {
                throw new Error("Invalid payload structure: missing fulfillments");
            }

            const fulfillments = parsed.message.order.fulfillments;

            // 1. Calculate allowed seats count (fulfillments of type TICKET)
            const ticketFulfillments = fulfillments.filter((f) => f.type === "TICKET");
            setAllowedSeatsCount(ticketFulfillments.length);

            // 2. Extract available seats (fulfillments of type TRIP -> tags)
            const tripFulfillment = fulfillments.find((f) => f.type === "TRIP");

            const seats: string[] = [];
            if (tripFulfillment && tripFulfillment.tags) {
                tripFulfillment.tags.forEach((tag) => {
                    if (tag.descriptor.code === "SEAT_GRID") {
                        const seatNumberArg = tag.list.find(
                            (item) => item.descriptor.code === "NUMBER"
                        );
                        if (seatNumberArg) {
                            seats.push(seatNumberArg.value);
                        }
                    }
                });
            }
            setAvailableSeats(seats);
            setErrorWhilePaste("");
            toast.success("Payload processed successfully");
        } catch (err) {
            console.error(err);
            setErrorWhilePaste("Invalid payload structure.");
            toast.error("Invalid payload structure");
        }
    };

    useEffect(() => {
        if (payload) {
            parseAndSetData(payload);
        }
    }, [payload]);

    const handlePaste = (pastedPayload: unknown) => {
        parseAndSetData(pastedPayload);
        setIsPayloadEditorActive(false);
    };

    const { control, register, handleSubmit } = useForm<SeatSelectionFormValues>({
        defaultValues: {
            items: [{ seatNumber: "" }],
        },
    });

    const { fields, append, remove } = useFieldArray<SeatSelectionFormValues, "items">({
        control,
        name: "items",
    });

    const watchedItems = useWatch<SeatSelectionFormValues, "items">({
        control,
        name: "items",
    });

    const inputStyle =
        "border rounded p-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
    const labelStyle = "mb-1 font-semibold";
    const fieldWrapperStyle = "flex flex-col mb-2";

    const onSubmit = async (data: SeatSelectionFormValues) => {
        const cleanedData = {
            items: data.items
                .map((item) => ({
                    seatNumber: item.seatNumber?.trim(),
                }))
                .filter((item) => item.seatNumber !== ""),
        };

        await submitEvent({
            jsonPath: {},
            formData: cleanedData as unknown as Record<string, string>,
        });
    };

    return (
        <div className="p-4">
            {isPayloadEditorActive && <PayloadEditor onAdd={handlePaste} />}
            {errorWhilePaste && (
                <p className="text-red-500 text-sm italic mt-1">{errorWhilePaste}</p>
            )}

            <div className="flex justify-start mb-2 items-center gap-2">
                <button
                    type="button"
                    onClick={() => setIsPayloadEditorActive(true)}
                    className="p-2 border rounded-full hover:bg-gray-100"
                    title="Paste Payload"
                >
                    <FaRegPaste size={14} />
                </button>
                <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded">
                    Please enter the on_select payload to select the seat here
                </span>
            </div>

            <div className="mb-4 text-sm text-gray-600">
                Allowed Seats: {allowedSeatsCount} <br />
                Available Seats:{" "}
                {availableSeats.length > 0 ? availableSeats.join(", ") : "None loaded"}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="border p-3 rounded space-y-2">
                        <div className={fieldWrapperStyle}>
                            <label className={labelStyle}>Seat {index + 1}</label>
                            <div className="flex items-center gap-2">
                                <select
                                    {...register(`items.${index}.seatNumber`)}
                                    className={inputStyle}
                                >
                                    <option value="">Select a seat</option>
                                    {availableSeats
                                        .filter((seat) => {
                                            const otherSelectedSeats = watchedItems
                                                ?.filter((_, i) => i !== index)
                                                .map((item) => item.seatNumber);
                                            return !otherSelectedSeats?.includes(seat);
                                        })
                                        .map((seat) => (
                                            <option key={seat} value={seat}>
                                                {seat}
                                            </option>
                                        ))}
                                </select>
                                <FaTrash
                                    onClick={() => remove(index)}
                                    className="text-red-600 cursor-pointer hover:text-red-800 w-5 h-5"
                                />
                            </div>
                        </div>
                    </div>
                ))}

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => append({ seatNumber: "" })}
                        disabled={fields.length >= allowedSeatsCount}
                        className={`px-4 py-2 text-white rounded ${
                            fields.length >= allowedSeatsCount
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700"
                        }`}
                    >
                        Add Seat
                    </button>

                    <button
                        type="submit"
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                        Submit
                    </button>
                </div>
            </form>
        </div>
    );
}
