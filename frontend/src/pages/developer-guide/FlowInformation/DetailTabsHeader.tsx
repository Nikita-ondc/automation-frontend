import { type FC } from "react";
import GuideTabs, { type GuideTabItem } from "../shared/components/GuideTabs";
import type { FlowInformationSection } from "./types";

interface DetailTabsHeaderProps {
    activeSection: FlowInformationSection;
    onChange: (section: FlowInformationSection) => void;
    hasExampleObject: boolean;
    hasStep: boolean;
    hasXValidations: boolean;
    hasXInputFormDoc?: boolean;
    hasSequenceDiagram: boolean;
    hasFormHtml?: boolean;
}

const DetailTabsHeader: FC<DetailTabsHeaderProps> = ({
    activeSection,
    onChange,
    hasExampleObject,
    hasStep,
    hasXValidations,
    hasXInputFormDoc = false,
    hasSequenceDiagram,
    hasFormHtml = false,
}) => (
    <GuideTabs<FlowInformationSection>
        active={activeSection}
        onChange={onChange}
        tabs={
            [
                {
                    id: "sequence",
                    label: "Sequence Diagram",
                    visible: hasSequenceDiagram,
                },
                {
                    id: "preview",
                    label: "Example Payload",
                    visible: hasExampleObject,
                },
                { id: "request", label: "Request Schema", visible: hasStep },
                {
                    id: "response",
                    label: "Response Schema",
                    visible: hasStep,
                },
                {
                    id: "html-form",
                    label: "Form Preview",
                    visible: hasFormHtml,
                },
                {
                    id: "x-validations",
                    label: "Validations",
                    visible: hasXValidations,
                },
                {
                    id: "xinput-form",
                    label: "XInput Form",
                    visible: hasXInputFormDoc,
                },
            ] satisfies GuideTabItem<FlowInformationSection>[]
        }
    />
);

export default DetailTabsHeader;
