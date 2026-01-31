import { useState } from "react";
import { useForm } from "react-hook-form";
import PayloadEditor from "../../mini-components/payload-editor";
import { SubmitEventParams } from "../../../../types/flow-types";
import { toast } from "react-toastify";

type FormValues = {
    city_code: string;
    start_gps: string;
    end_gps: string;
    scheduled_time: string;
};

export default function TRV10ScheduleForm({
    submitEvent,
}: {
    submitEvent: (data: SubmitEventParams) => Promise<void>;
}) {
    const [isPayloadEditorActive, setIsPayloadEditorActive] = useState(false);

    const { register, handleSubmit } = useForm({
        defaultValues: {
            city_code: "",
            start_gps: "",
            end_gps: "",
            scheduled_time: "",
        },
    });

    const handlePaste = (_payload: unknown) => {
        setIsPayloadEditorActive(false);
        toast.success("Payload pasted successfully");
    };

    const onSubmit = async (data: FormValues) => {
        try {
            const formattedData = {
                ...data,
                scheduled_time: new Date(data.scheduled_time).toISOString(),
            };

            await submitEvent({
                jsonPath: {
                    city_code: "$.context.location.city.code",
                    start_gps:
                        "$.message.intent.fulfillment.stops[?(@.type=='START')].location.gps",
                    end_gps: "$.message.intent.fulfillment.stops[?(@.type=='END')].location.gps",
                    scheduled_time:
                        "$.message.intent.fulfillment.stops[?(@.type=='START')].time.timestamp",
                },
                formData: formattedData as unknown as Record<string, string>,
            });
        } catch (err) {
            console.error(err);
            toast.error("Submission failed");
        }
    };

    return (
        <div>
            {isPayloadEditorActive && <PayloadEditor onAdd={handlePaste} />}

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4 h-[500px] overflow-y-scroll p-4"
            >
                <div className="flex flex-col">
                    <label className="mb-1 font-semibold">Enter city code</label>
                    <input type="text" className="border rounded p-2" {...register("city_code")} />
                </div>

                <div className="flex flex-col">
                    <label className="mb-1 font-semibold">Enter start gps coordinates</label>
                    <input
                        type="text"
                        className="border rounded p-2"
                        placeholder="12.9716,77.5946"
                        {...register("start_gps")}
                    />
                </div>

                <div className="flex flex-col">
                    <label className="mb-1 font-semibold">Enter end gps coordinates</label>
                    <input
                        type="text"
                        className="border rounded p-2"
                        placeholder="12.2958,76.6394"
                        {...register("end_gps")}
                    />
                </div>

                <div className="flex flex-col">
                    <label className="mb-1 font-semibold">Enter Time (24-hour format)</label>
                    <input
                        type="datetime-local"
                        className="border rounded p-2"
                        {...register("scheduled_time")}
                    />
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
