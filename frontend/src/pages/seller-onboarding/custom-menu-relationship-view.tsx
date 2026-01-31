import React from "react";
import { Card, Tag, Timeline, Collapse, Badge, Divider, Alert } from "antd";
import { FaLayerGroup, FaUtensils, FaPuzzlePiece, FaLink } from "react-icons/fa";

interface CustomizationItem {
    id: string;
    name: string;
    price: string;
    vegNonVeg?: string;
}

interface CustomizationGroup {
    id: string;
    name: string;
    type: "single" | "multiple";
    required: boolean;
    minQuantity: number;
    maxQuantity: number;
    items: CustomizationItem[];
}

interface MenuItem {
    name: string;
    category: string;
    price: string;
    vegNonVeg: string;
    customizationGroups?: CustomizationGroup[];
}

interface CustomMenuRelationshipViewProps {
    menuItems: MenuItem[];
}

const CustomMenuRelationshipView: React.FC<CustomMenuRelationshipViewProps> = ({ menuItems }) => {
    // Group items by category
    const categorizedItems = menuItems.reduce(
        (acc, item) => {
            const category = item.category || "Uncategorized";
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(item);
            return acc;
        },
        {} as Record<string, MenuItem[]>
    );

    // Get category ranks
    const categoryRankMap: { [key: string]: number } = {
        Appetizers: 1,
        Starters: 1,
        Soups: 2,
        Salads: 3,
        "Main Course": 4,
        Mains: 4,
        Breads: 5,
        Rice: 6,
        Beverages: 7,
        Desserts: 8,
        Drinks: 7,
    };

    // Sort categories by rank
    const sortedCategories = Object.keys(categorizedItems).sort((a, b) => {
        const rankA = categoryRankMap[a] || 99;
        const rankB = categoryRankMap[b] || 99;
        return rankA - rankB;
    });

    // Collect all custom groups
    const allCustomGroups: CustomizationGroup[] = [];
    menuItems.forEach((item) => {
        if (item.customizationGroups) {
            item.customizationGroups.forEach((group) => {
                if (!allCustomGroups.find((g) => g.id === group.id)) {
                    allCustomGroups.push(group);
                }
            });
        }
    });

    return (
        <div className="space-y-6">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    <FaLayerGroup className="inline mr-2" />
                    Menu Structure & Relationships
                </h3>
                <p className="text-sm text-gray-600">
                    This view shows how categories, items, and customization groups are linked in
                    ONDC F&B structure
                </p>
            </div>

            {/* Custom Groups Section */}
            {allCustomGroups.length > 0 && (
                <Card className="shadow-md mb-6">
                    <h4 className="text-md font-semibold text-gray-800 mb-4">
                        <FaPuzzlePiece className="inline mr-2" />
                        Custom Groups (Separate Category Entries)
                    </h4>
                    <Alert
                        message="Custom groups are added as separate entries in the categories array with type 'custom_group'"
                        type="info"
                        className="mb-4"
                    />
                    <div className="grid md:grid-cols-2 gap-4">
                        {allCustomGroups.map((group) => (
                            <Card
                                key={group.id}
                                size="small"
                                className="border-2 border-purple-200"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{group.name}</span>
                                        <Tag color="purple">custom_group</Tag>
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        <div>ID: {group.id}</div>
                                        <div>
                                            Type:{" "}
                                            {group.type === "single"
                                                ? "Single Select"
                                                : "Multi Select"}
                                        </div>
                                        <div>
                                            Min: {group.minQuantity} | Max: {group.maxQuantity}
                                        </div>
                                        {group.required && (
                                            <Tag color="red" className="mt-1">
                                                Required
                                            </Tag>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </Card>
            )}

            <Timeline mode="left">
                {sortedCategories.map((category, categoryIndex) => {
                    const items = categorizedItems[category];
                    const rank = categoryRankMap[category] || categoryIndex + 1;

                    return (
                        <Timeline.Item
                            key={category}
                            label={
                                <div className="text-right">
                                    <Badge
                                        count={`Rank ${rank}`}
                                        style={{ backgroundColor: "#52c41a" }}
                                    />
                                </div>
                            }
                            dot={<FaLayerGroup className="text-blue-600" />}
                        >
                            <Card
                                title={
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-lg">{category}</span>
                                        <Tag color="blue">Category (custom_menu)</Tag>
                                    </div>
                                }
                                className="shadow-md"
                            >
                                <div className="space-y-3">
                                    <div className="text-sm text-gray-600">
                                        <span className="font-medium">Category ID:</span>{" "}
                                        Auto-generated (e.g., V
                                        {Math.random().toString(36).substr(2, 9).toUpperCase()})
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <span className="font-medium">Items in category:</span>{" "}
                                        {items.length}
                                    </div>

                                    <Divider className="my-3" />

                                    <Collapse accordion>
                                        {items.map((item, itemIndex) => (
                                            <Collapse.Panel
                                                key={itemIndex}
                                                header={
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <FaUtensils className="text-orange-600" />
                                                            <span className="font-medium">
                                                                {item.name}
                                                            </span>
                                                            <Tag
                                                                color={
                                                                    item.vegNonVeg === "veg"
                                                                        ? "green"
                                                                        : "red"
                                                                }
                                                            >
                                                                {item.vegNonVeg === "veg"
                                                                    ? "Veg"
                                                                    : "Non-Veg"}
                                                            </Tag>
                                                        </div>
                                                        <span className="text-gray-600">
                                                            ₹{item.price}
                                                        </span>
                                                    </div>
                                                }
                                            >
                                                <div className="pl-4 space-y-3">
                                                    <div className="text-sm">
                                                        <span className="font-medium text-gray-700">
                                                            Item ID:
                                                        </span>{" "}
                                                        I{itemIndex + 1}
                                                    </div>
                                                    <div className="text-sm">
                                                        <span className="font-medium text-gray-700">
                                                            parent_item_id:
                                                        </span>{" "}
                                                        "{category}"
                                                    </div>
                                                    <div className="text-sm">
                                                        <span className="font-medium text-gray-700">
                                                            category_id:
                                                        </span>{" "}
                                                        "{category}"
                                                    </div>

                                                    {item.customizationGroups &&
                                                        item.customizationGroups.length > 0 && (
                                                            <>
                                                                <Divider className="my-2" />
                                                                <div className="space-y-2">
                                                                    <div className="font-medium text-gray-700 text-sm">
                                                                        <FaLink className="inline mr-1" />
                                                                        Linked Custom Groups (via
                                                                        custom_group tags):
                                                                    </div>
                                                                    <Alert
                                                                        message="Items reference custom_group IDs in their tags"
                                                                        type="warning"
                                                                        className="mb-2"
                                                                        banner
                                                                    />
                                                                    {item.customizationGroups.map(
                                                                        (group, groupIndex) => (
                                                                            <Card
                                                                                key={group.id}
                                                                                size="small"
                                                                                type="inner"
                                                                                title={
                                                                                    <div className="flex items-center justify-between">
                                                                                        <span>
                                                                                            {
                                                                                                group.name
                                                                                            }
                                                                                        </span>
                                                                                        <div className="flex gap-2">
                                                                                            <Tag color="purple">
                                                                                                {group.type ===
                                                                                                "single"
                                                                                                    ? "Single Select"
                                                                                                    : "Multi Select"}
                                                                                            </Tag>
                                                                                            {group.required && (
                                                                                                <Tag color="red">
                                                                                                    Required
                                                                                                </Tag>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                }
                                                                            >
                                                                                <div className="space-y-2">
                                                                                    <div className="text-xs text-gray-600">
                                                                                        <span className="font-medium">
                                                                                            Item
                                                                                            references
                                                                                            custom_group
                                                                                            ID:
                                                                                        </span>{" "}
                                                                                        {group.id}
                                                                                    </div>
                                                                                    <div className="text-xs bg-yellow-50 p-2 rounded">
                                                                                        <code className="text-xs">
                                                                                            tags: [
                                                                                            {"{"}{" "}
                                                                                            code:
                                                                                            "custom_group",
                                                                                            list: [
                                                                                            {"{"}{" "}
                                                                                            code:
                                                                                            "id",
                                                                                            value: "
                                                                                            {
                                                                                                group.id
                                                                                            }
                                                                                            " {"}"}]{" "}
                                                                                            {"}"}]
                                                                                        </code>
                                                                                    </div>
                                                                                    <div className="text-xs mt-2">
                                                                                        <span className="font-medium">
                                                                                            Customization
                                                                                            Items
                                                                                            belong
                                                                                            to this
                                                                                            group:
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="pl-4 space-y-1">
                                                                                        {group.items.map(
                                                                                            (
                                                                                                customItem,
                                                                                                custIndex
                                                                                            ) => (
                                                                                                <div
                                                                                                    key={
                                                                                                        customItem.id
                                                                                                    }
                                                                                                    className="text-xs bg-gray-50 p-2 rounded"
                                                                                                >
                                                                                                    <div className="flex items-center justify-between">
                                                                                                        <div>
                                                                                                            <span className="font-medium">
                                                                                                                {
                                                                                                                    customItem.name
                                                                                                                }
                                                                                                            </span>
                                                                                                            <Tag
                                                                                                                color={
                                                                                                                    customItem.vegNonVeg ===
                                                                                                                    "veg"
                                                                                                                        ? "green"
                                                                                                                        : "red"
                                                                                                                }
                                                                                                                className="ml-2"
                                                                                                            >
                                                                                                                {customItem.vegNonVeg ===
                                                                                                                "veg"
                                                                                                                    ? "V"
                                                                                                                    : "NV"}
                                                                                                            </Tag>
                                                                                                        </div>
                                                                                                        <span className="text-gray-600">
                                                                                                            +₹
                                                                                                            {
                                                                                                                customItem.price
                                                                                                            }
                                                                                                        </span>
                                                                                                    </div>
                                                                                                    <div className="text-gray-600 mt-1">
                                                                                                        <div>
                                                                                                            <span className="font-medium">
                                                                                                                Item
                                                                                                                ID:
                                                                                                            </span>{" "}
                                                                                                            C
                                                                                                            {itemIndex +
                                                                                                                1}

                                                                                                            _
                                                                                                            {custIndex +
                                                                                                                1}
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <span className="font-medium">
                                                                                                                Parent
                                                                                                                (custom_group):
                                                                                                            </span>{" "}
                                                                                                            {
                                                                                                                group.id
                                                                                                            }
                                                                                                        </div>
                                                                                                        <div className="bg-yellow-50 p-1 mt-1 rounded">
                                                                                                            <code className="text-xs">
                                                                                                                parent:
                                                                                                                [
                                                                                                                {
                                                                                                                    "{"
                                                                                                                }{" "}
                                                                                                                code:
                                                                                                                "id",
                                                                                                                value:
                                                                                                                "
                                                                                                                {
                                                                                                                    group.id
                                                                                                                }

                                                                                                                "{" "}
                                                                                                                {
                                                                                                                    "}"
                                                                                                                }

                                                                                                                ]
                                                                                                            </code>
                                                                                                        </div>
                                                                                                        {item.customizationGroups &&
                                                                                                            groupIndex <
                                                                                                                item
                                                                                                                    .customizationGroups
                                                                                                                    .length -
                                                                                                                    1 && (
                                                                                                                <div className="text-blue-600 mt-1">
                                                                                                                    <FaLink className="inline mr-1" />
                                                                                                                    Links
                                                                                                                    to
                                                                                                                    next
                                                                                                                    group:{" "}
                                                                                                                    {
                                                                                                                        item
                                                                                                                            .customizationGroups[
                                                                                                                            groupIndex +
                                                                                                                                1
                                                                                                                        ]
                                                                                                                            .id
                                                                                                                    }
                                                                                                                </div>
                                                                                                            )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </Card>
                                                                        )
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}
                                                </div>
                                            </Collapse.Panel>
                                        ))}
                                    </Collapse>
                                </div>
                            </Card>
                        </Timeline.Item>
                    );
                })}
            </Timeline>

            <Card className="bg-blue-50 border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">
                    Understanding the ONDC F&B Relationships:
                </h4>
                <ul className="space-y-2 text-sm text-blue-800">
                    <li>
                        • <strong>Menu Categories</strong> have type "custom_menu" with timing and
                        display rank
                    </li>
                    <li>
                        • <strong>Custom Groups</strong> are SEPARATE category entries with type
                        "custom_group"
                    </li>
                    <li>
                        • <strong>Items</strong> reference custom_groups by ID in their tags
                    </li>
                    <li>
                        • <strong>Customization Items</strong> have parent tags pointing to
                        custom_group IDs
                    </li>
                    <li>
                        • <strong>Child Tags</strong> on customizations can link to the next
                        custom_group in sequence
                    </li>
                    <li>
                        • <strong>Category IDs</strong> for custom_groups (CG1, CG2) are defined by
                        the seller
                    </li>
                </ul>
            </Card>
        </div>
    );
};

export default CustomMenuRelationshipView;
