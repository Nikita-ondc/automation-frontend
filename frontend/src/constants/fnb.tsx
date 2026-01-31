// F&B (Food & Beverage) domain attributes configuration
type FnBAttributeFieldConfig = {
    mandatory: boolean;
    value: string[];
    placeholder?: string;
};

type FnBAttributesGroup = Record<string, FnBAttributeFieldConfig>;

type FnBAttributesConfig = {
    mandatory: FnBAttributesGroup;
    optional: FnBAttributesGroup;
};

export const fnbAttributes: FnBAttributesConfig = {
    // Mandatory attributes for all F&B items
    mandatory: {
        veg_non_veg: {
            mandatory: true,
            value: ["veg", "non-veg", "egg"],
        },
        // FSSAI compliance
        brand_owner_fssai_license_no: {
            mandatory: true,
            value: [],
        },
    },

    // Optional attributes categorized by subcategory
    optional: {
        // Common F&B attributes
        cuisine: {
            mandatory: false,
            value: [
                "Indian",
                "Chinese",
                "Continental",
                "Italian",
                "Mexican",
                "Thai",
                "Japanese",
                "Korean",
                "Mediterranean",
                "American",
                "Fast Food",
                "Street Food",
                "Healthy",
                "Multi-Cuisine",
            ],
        },
        course: {
            mandatory: false,
            value: [
                "Appetizer",
                "Starter",
                "Main Course",
                "Dessert",
                "Beverage",
                "Breakfast",
                "Lunch",
                "Dinner",
                "Snack",
                "Soup",
                "Salad",
                "Bread",
            ],
        },
        allergen_info: {
            mandatory: false,
            value: [],
            placeholder: "Contains nuts, dairy, gluten etc.",
        },
        serving_size: {
            mandatory: false,
            value: [],
            placeholder: "e.g., 250g, 1 plate, 500ml",
        },
        nutritional_info: {
            mandatory: false,
            value: [],
            placeholder: "Calories, proteins, carbs, fats per serving",
        },
        additives_info: {
            mandatory: false,
            value: [],
            placeholder: "Preservatives, artificial colors, flavors used",
        },
        ingredients: {
            mandatory: false,
            value: [],
            placeholder: "List of ingredients used",
        },
        preparation_time: {
            mandatory: false,
            value: [],
            placeholder: "Time in minutes (e.g., 30)",
        },
        is_halal: {
            mandatory: false,
            value: ["yes", "no"],
        },
        is_organic: {
            mandatory: false,
            value: ["yes", "no"],
        },
        spice_level: {
            mandatory: false,
            value: ["mild", "medium", "hot", "extra hot"],
        },
    },
};

// F&B subcategory specific attributes
export const fnbSubcategoryAttributes: Record<string, FnBAttributesConfig> = {
    Beverages: {
        mandatory: {},
        optional: {
            beverage_type: {
                mandatory: false,
                value: ["hot", "cold", "alcoholic", "non-alcoholic"],
            },
            volume: {
                mandatory: false,
                value: [],
                placeholder: "e.g., 250ml, 500ml, 1L",
            },
        },
    },
    "Bakery Items": {
        mandatory: {},
        optional: {
            contains_egg: {
                mandatory: false,
                value: ["yes", "no"],
            },
            shelf_life: {
                mandatory: false,
                value: [],
                placeholder: "e.g., 2 days, 1 week",
            },
        },
    },
    "Frozen Foods": {
        mandatory: {},
        optional: {
            storage_temperature: {
                mandatory: false,
                value: [],
                placeholder: "e.g., -18°C",
            },
            thawing_instructions: {
                mandatory: false,
                value: [],
                placeholder: "Thawing and heating instructions",
            },
        },
    },
    "Ready-to-Eat Meals": {
        mandatory: {},
        optional: {
            heating_instructions: {
                mandatory: false,
                value: [],
                placeholder: "Microwave for 2 mins or heat on stove",
            },
            meal_type: {
                mandatory: false,
                value: ["breakfast", "lunch", "dinner", "snack"],
            },
        },
    },
};

// Helper function to get attributes for a specific F&B subcategory
export const getFnBAttributes = (subcategory: string): FnBAttributesConfig => {
    const baseAttributes = {
        mandatory: fnbAttributes.mandatory,
        optional: fnbAttributes.optional,
    };

    if (fnbSubcategoryAttributes[subcategory]) {
        return {
            mandatory: {
                ...baseAttributes.mandatory,
                ...fnbSubcategoryAttributes[subcategory].mandatory,
            },
            optional: {
                ...baseAttributes.optional,
                ...fnbSubcategoryAttributes[subcategory].optional,
            },
        };
    }

    return baseAttributes;
};

// F&B specific enums for dropdowns
export const fnbEnums = {
    meal_timing: ["Breakfast", "Lunch", "Dinner", "All Day"],
    diet_preference: ["Vegetarian", "Non-Vegetarian", "Vegan", "Jain", "Eggetarian"],
    packaging_type: ["Packed", "Loose", "Semi-packed"],
    temperature_preference: ["Hot", "Cold", "Room Temperature"],
};

// FSSAI related fields for prepackaged food items
export const fssaiFields = {
    brand_owner_name: {
        mandatory: true,
        placeholder: "Name of brand owner",
    },
    brand_owner_address: {
        mandatory: true,
        placeholder: "Complete address of brand owner",
    },
    brand_owner_fssai_license_no: {
        mandatory: true,
        placeholder: "FSSAI License Number",
    },
    other_fssai_license_no: {
        mandatory: false,
        placeholder: "Other FSSAI license numbers if any",
    },
    manufacturer_name: {
        mandatory: false,
        placeholder: "Manufacturer name if different from brand owner",
    },
    manufacturer_address: {
        mandatory: false,
        placeholder: "Manufacturer address",
    },
    importer_name: {
        mandatory: false,
        placeholder: "Importer name (for imported products)",
    },
    importer_address: {
        mandatory: false,
        placeholder: "Importer address",
    },
    importer_fssai_license_no: {
        mandatory: false,
        placeholder: "Importer FSSAI license number",
    },
};
