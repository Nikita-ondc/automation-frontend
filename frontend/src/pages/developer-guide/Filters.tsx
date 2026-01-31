import { FC } from "react";
import GenericForm from "@components/ui/forms/generic-form";
import FormSelect from "@components/ui/forms/form-select";

interface FiltersProps {
    onSubmit: (data: { domain: string; version: string; useCase: string }) => Promise<void>;
}

const Filters: FC<FiltersProps> = ({ onSubmit }) => {
    // Sample options - these should be replaced with actual data from your API/constants
    // Adding placeholder options that match the image
    const domainOptions = [{ key: "Select Domain", value: "" }, "Domain 1", "Domain 2", "Domain 3"];
    const versionOptions = [
        { key: "Select Version", value: "" },
        "Version 1",
        "Version 2",
        "Version 3",
    ];
    const useCaseOptions = [
        { key: "Select Use Case", value: "" },
        "Use Case 1",
        "Use Case 2",
        "Use Case 3",
    ];

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 my-8 mx-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Info</h2>
            <GenericForm onSubmit={onSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormSelect
                        name="domain"
                        label="Domain"
                        options={domainOptions}
                        required={true}
                    />
                    <FormSelect
                        name="version"
                        label="Version"
                        options={versionOptions}
                        required={true}
                    />
                    <FormSelect
                        name="useCase"
                        label="Use Case"
                        options={useCaseOptions}
                        required={true}
                    />
                </div>
            </GenericForm>
        </div>
    );
};

export default Filters;
