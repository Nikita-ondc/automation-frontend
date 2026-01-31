import React, { useEffect, useRef, useState } from "react";
import { DefaultValues, FieldValues, useForm } from "react-hook-form";
import LoadingButton from "./loading-button";

type GenericFormProps<T extends FieldValues> = {
    defaultValues?: DefaultValues<T>;
    children: React.ReactNode;
    onSubmit: (data: T) => Promise<void>;
    className?: string;
    triggerSubmit?: boolean;
};

const GenericForm = <T extends FieldValues = FieldValues>({
    defaultValues,
    children,
    onSubmit,
    className,
    triggerSubmit = false,
}: GenericFormProps<T>) => {
    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
    } = useForm({ defaultValues });
    const isRequestTriggered = useRef(false);

    const [isLoading, setIsLoading] = useState(false);

    const handleSubmitForm = async (data: T) => {
        setIsLoading(true);

        try {
            await onSubmit(data);
        } catch (error: unknown) {
            console.error((error as Error)?.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (triggerSubmit && !isRequestTriggered.current) {
            isRequestTriggered.current = true;
            handleSubmit(handleSubmitForm)();
        }
    }, []);

    return (
        <form
            onSubmit={handleSubmit(handleSubmitForm)} // Use handleSubmit to manage form submission
            className={className}
        >
            {React.Children.map(children, (child) =>
                React.cloneElement(child as React.ReactElement, { register, errors, setValue })
            )}
            <LoadingButton type="submit" buttonText="Submit" isLoading={isLoading} />
        </form>
    );
};

export default GenericForm;
