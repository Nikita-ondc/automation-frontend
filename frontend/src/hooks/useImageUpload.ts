import { useState, useCallback } from "react";

// Hook for managing single image upload state
export const useSingleImageUpload = (initialValue: string = "") => {
    const [imageUrl, setImageUrl] = useState<string>(initialValue);

    const handleImageChange = useCallback((url: string) => {
        setImageUrl(url);
    }, []);

    const clearImage = useCallback(() => {
        setImageUrl("");
    }, []);

    const resetImage = useCallback((newValue: string = "") => {
        setImageUrl(newValue);
    }, []);

    return {
        imageUrl,
        setImageUrl: handleImageChange,
        clearImage,
        resetImage,
    };
};

// Hook for managing multiple image upload state
export const useMultiImageUpload = (initialValues: string[] = []) => {
    const [imageUrls, setImageUrls] = useState<string[]>(initialValues);

    const handleImagesChange = useCallback((urls: string[]) => {
        setImageUrls(urls);
    }, []);

    const addImage = useCallback((url: string) => {
        setImageUrls((prev) => [...prev, url]);
    }, []);

    const removeImage = useCallback((index: number) => {
        setImageUrls((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const clearImages = useCallback(() => {
        setImageUrls([]);
    }, []);

    const resetImages = useCallback((newValues: string[] = []) => {
        setImageUrls(newValues);
    }, []);

    return {
        imageUrls,
        setImageUrls: handleImagesChange,
        addImage,
        removeImage,
        clearImages,
        resetImages,
    };
};

// Hook for managing form-specific image state (combines multiple image types)
export const useFormImageState = <T extends Record<string, unknown>>(initialState: T) => {
    const [imageState, setImageState] = useState<T>(initialState);

    const updateImageField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
        setImageState((prev) => ({
            ...prev,
            [field]: value,
        }));
    }, []);

    const resetImageState = useCallback((newState: T) => {
        setImageState(newState);
    }, []);

    const clearAllImages = useCallback(() => {
        const clearedState = {} as T;
        Object.keys(imageState).forEach((key) => {
            clearedState[key as keyof T] = Array.isArray(imageState[key as keyof T])
                ? ([] as T[keyof T])
                : ("" as T[keyof T]);
        });
        setImageState(clearedState);
    }, [imageState]);

    return {
        imageState,
        updateImageField,
        resetImageState,
        clearAllImages,
    };
};
