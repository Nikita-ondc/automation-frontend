export type AttributeKind = "attribute" | "enum" | "tag";

export interface ActionAttributesBase {
    jsonPath: string;
    kind: AttributeKind;
}

export interface AttributeDetails extends ActionAttributesBase {
    kind: "attribute";
    required: string;
    owner: string;
    type: string;
    description: string;
}

export interface EnumOption {
    code: string;
    description: string;
}

export interface EnumDetails extends ActionAttributesBase {
    kind: "enum";
    enums: string[];
    /** Possible values from x-enum (code + description) */
    enumOptions?: EnumOption[];
    /** Attribute info from x-attributes (shown alongside enum) */
    required?: string;
    owner?: string;
    type?: string;
    description?: string;
}

export interface TagFieldItem {
    code: string;
    description: string;
}

export interface TagField {
    label: string;
    description: string;
    /** Possible values from x-tags list */
    list?: TagFieldItem[];
}

export interface AttributeInfo {
    required: string;
    owner: string;
    type: string;
    description: string;
}

export interface TagDetails extends ActionAttributesBase {
    kind: "tag";
    description: string;
    tagFields: TagField[];
    /** Attribute section from x-attributes (shown separately, not merged) */
    attributeInfo?: AttributeInfo;
}

export type ActionAttributes = AttributeDetails | EnumDetails | TagDetails;

export type FlowActionDetailsTab = "documentation" | "ai-driven";
