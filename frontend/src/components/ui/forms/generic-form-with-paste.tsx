import React, { useState, useRef, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { FaRegPaste } from "react-icons/fa6";
import { toast } from "react-toastify";
import PayloadEditor from "@/components/ui/mini-components/payload-editor";
import LoadingButton from "./loading-button";
import { ICatalogItem, IGenericFormWithPasteProps } from "./generic-form.types";

const GenericFormWithPaste = ({
    defaultValues,
    children,
    onSubmit,
    className,
    triggerSubmit = false,
    enablePaste = false,
}: IGenericFormWithPasteProps) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
    } = useForm({ defaultValues });
    const isRequestTriggered = useRef(false);

    const [isLoading, setIsLoading] = useState(false);
    const [isPayloadEditorActive, setIsPayloadEditorActive] = useState(false);
    const [errorWhilePaste, setErrorWhilePaste] = useState("");
    const [availableItems, setAvailableItems] = useState<ICatalogItem[]>([]);

    // Watch selected item to get its addons
    const selectedItemId = watch("item_id") as string;
    const selectedItem = availableItems.find((item) => item.id === selectedItemId);
    const availableAddons = selectedItem?.addOns || [];

    const handlePaste = (payload: Record<string, unknown>) => {
        try {
            const message = payload?.message as Record<string, unknown> | undefined;
            const catalog = message?.catalog as Record<string, unknown> | undefined;
            const providers = catalog?.providers as Record<string, unknown>[] | undefined;

            if (!providers) {
                throw new Error(
                    "Invalid Schema - Expected on_search payload with catalog.providers"
                );
            }

            const provider = providers[0] as Record<string, unknown>;
            const items = (provider.items || []) as Record<string, unknown>[];

            if (!items.length) {
                throw new Error("No items found in catalog");
            }

            // Extract items with their addons
            const catalogItems: ICatalogItem[] = items.map((item) => {
                const descriptor = item.descriptor as Record<string, unknown> | undefined;
                const addOns = (item.add_ons || []) as Record<string, unknown>[];

                return {
                    id: (item.id as string) || "",
                    name: (descriptor?.name as string) || (item.id as string) || "",
                    addOns: addOns.map((addon) => {
                        const addonDescriptor = addon.descriptor as
                            | Record<string, unknown>
                            | undefined;
                        return {
                            id: (addon.id as string) || "",
                            name:
                                (addonDescriptor?.name as string) ||
                                (addonDescriptor?.short_desc as string) ||
                                (addon.id as string) ||
                                "",
                        };
                    }),
                };
            });

            setAvailableItems(catalogItems);

            const firstItem = catalogItems[0];

            // Set form values
            setValue("item_id", firstItem.id);
            setValue("quantity", "1");
            setValue("add_on_id", firstItem.addOns?.[0]?.id || "");
            setValue("adults_count", "1");
            setValue("children_count", "0");

            setErrorWhilePaste("");
            toast.success(`Found ${catalogItems.length} items in catalog`);
        } catch (err) {
            const error = err as Error;
            setErrorWhilePaste(error.message || "Invalid payload structure");
            toast.error(error.message || "Invalid payload structure");
            console.error(err);
        }

        setIsPayloadEditorActive(false);
    };

    const handleSubmitForm = useCallback(
        async (data: Record<string, unknown>) => {
            setIsLoading(true);

            try {
                await onSubmit(data);
            } catch (error) {
                setIsLoading(false);
                console.error((error as Error)?.message);
            } finally {
                setIsLoading(false);
            }
        },
        [onSubmit]
    );

    useEffect(() => {
        if (triggerSubmit && !isRequestTriggered.current) {
            isRequestTriggered.current = true;
            handleSubmit(handleSubmitForm)();
        }
    }, [triggerSubmit, handleSubmit, handleSubmitForm]);

    // Custom render function that adds dropdowns for item_id and add_on_id when data is available
    const renderChildren = () => {
        return React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) return child;

            const childProps = child.props as Record<string, unknown>;
            const fieldName = childProps.name as string;

            // Replace item_id text input with dropdown when items are available
            if (fieldName === "item_id" && availableItems.length > 0) {
                return (
                    <div className="mb-2 w-full bg-gray-50 border rounded-md p-2 flex">
                        <div className="flex justify-between w-full">
                            <label className="text-sm font-medium text-gray-600 mb-2">
                                {(childProps.label as string) || "Item ID"}{" "}
                                <span className="text-red-500 ml-1">*</span>
                            </label>
                        </div>
                        <select
                            {...register("item_id", { required: true })}
                            className="p-2 rounded bg-transparent border outline-none focus:border-blue-500 w-full"
                        >
                            <option value="">Select an item</option>
                            {availableItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name} ({item.id})
                                </option>
                            ))}
                        </select>
                        {errors["item_id"] && (
                            <p className="text-red-500 text-xs italic">Field required</p>
                        )}
                    </div>
                );
            }

            // Replace add_on_id text input with dropdown when addons are available
            if (fieldName === "add_on_id" && availableAddons.length > 0) {
                return (
                    <div className="mb-2 w-full bg-gray-50 border rounded-md p-2 flex">
                        <div className="flex justify-between w-full">
                            <label className="text-sm font-medium text-gray-600 mb-2">
                                {(childProps.label as string) || "Add-on ID"}
                            </label>
                        </div>
                        <select
                            {...register("add_on_id")}
                            className="p-2 rounded bg-transparent border outline-none focus:border-blue-500 w-full"
                        >
                            <option value="">No add-on (optional)</option>
                            {availableAddons.map((addon) => (
                                <option key={addon.id} value={addon.id}>
                                    {addon.name} ({addon.id})
                                </option>
                            ))}
                        </select>
                    </div>
                );
            }

            // For other fields, pass register, errors, setValue as usual
            return React.cloneElement(child as React.ReactElement, { register, errors, setValue });
        });
    };

    return (
        <div>
            {enablePaste && (
                <>
                    {isPayloadEditorActive && (
                        <PayloadEditor onAdd={handlePaste as (payload: unknown) => void} />
                    )}
                    {errorWhilePaste && (
                        <p className="text-red-500 text-sm italic mb-2">{errorWhilePaste}</p>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsPayloadEditorActive(true)}
                        className="p-2 border rounded-full hover:bg-gray-100 mb-3 flex items-center gap-2"
                        title="Paste on_search payload to auto-populate fields"
                    >
                        <FaRegPaste size={14} />
                        <span className="text-sm">Paste on_search</span>
                    </button>
                </>
            )}
            <form onSubmit={handleSubmit(handleSubmitForm)} className={className}>
                {renderChildren()}
                <LoadingButton type="submit" buttonText="Submit" isLoading={isLoading} />
            </form>
        </div>
    );
};

export default GenericFormWithPaste;
