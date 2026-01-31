import { FC, useState } from "react";
import Filters from "./Filters";
import FlowsAccordion from "./FlowsAccordion";
import FlowInformation from "./FlowInformation";
import data from "./data.json";

const DeveloperGuide: FC = () => {
    const [selectedFlow, setSelectedFlow] = useState<string>("");
    const [selectedFlowAction, setSelectedFlowAction] = useState<string>("");

    const handleFiltersSubmit = async (data: {
        domain: string;
        version: string;
        useCase: string;
    }) => {
        console.error("Form submitted with data:", data);
        // Handle the form data here
        // You can add your logic to process the filter data
    };

    return (
        <div>
            <Filters onSubmit={handleFiltersSubmit} />
            <div className="flex m-4 gap-4">
                <div className="w-[30%]">
                    <FlowsAccordion
                        data={data}
                        selectedFlow={selectedFlow}
                        selectedFlowAction={selectedFlowAction}
                        setSelectedFlow={setSelectedFlow}
                        setSelectedFlowAction={setSelectedFlowAction}
                    />
                </div>
                <div className="w-[70%]">
                    <FlowInformation
                        data={data}
                        selectedFlow={selectedFlow}
                        selectedFlowAction={selectedFlowAction}
                    />
                </div>
            </div>
        </div>
    );
};
export default DeveloperGuide;
