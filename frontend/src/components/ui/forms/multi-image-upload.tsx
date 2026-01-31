import React, { useState, useEffect } from "react";
import { Button, message } from "antd";
import { UploadOutlined, DeleteOutlined } from "@ant-design/icons";
import axios from "axios";
import { LabelWithToolTip } from "./form-input";

type UploadedImage = { imageUrl?: string };
type UploadMultipleResponse = {
    success: boolean;
    data: { images: UploadedImage[] };
    message?: string;
};

interface MultiImageUploadProps {
    label: string;
    labelInfo?: string;
    required?: boolean;
    folder?: string;
    value?: string[];
    onChange?: (urls: string[]) => void;
    maxFiles?: number;
    maxSizePerFile?: number;
    className?: string;
    previewSize?: "small" | "medium" | "large";
    defaultImageUrl?: string;
    allowUrlInput?: boolean;
}
const baseUrl = new URL(import.meta.env.VITE_BASE_URL).origin;
const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
    label,
    labelInfo = "",
    required = false,
    folder = "workbench-seller-onboarding",
    value = [],
    onChange,
    maxFiles = 10,
    maxSizePerFile = 5 * 1024 * 1024, // 5MB
    className = "",
    previewSize = "medium",
    defaultImageUrl = `${baseUrl}/images/ondc-logo.png`,
    allowUrlInput = true,
}) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadedUrls, setUploadedUrls] = useState<string[]>(value);
    const [filePreviews, setFilePreviews] = useState<string[]>([]);
    const [uploadLoading, setUploadLoading] = useState<boolean>(false);
    const [urlInputValue, setUrlInputValue] = useState<string>("");
    const [inputMode, setInputMode] = useState<"upload" | "url">("upload");

    // Sync with external value changes
    useEffect(() => {
        setUploadedUrls(value);
    }, [value]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const fileArray = Array.from(files);

            // Check file count limit
            if (fileArray.length > maxFiles) {
                message.error(`Maximum ${maxFiles} files allowed`);
                event.target.value = "";
                return;
            }

            // Validate each file
            for (const file of fileArray) {
                if (file.size > maxSizePerFile) {
                    message.error(
                        `File ${file.name} is too large. Maximum size is ${maxSizePerFile / (1024 * 1024)}MB.`
                    );
                    event.target.value = "";
                    return;
                }

                if (!file.type.startsWith("image/")) {
                    message.error(`${file.name} is not a valid image file.`);
                    event.target.value = "";
                    return;
                }
            }

            setSelectedFiles(fileArray);

            // Generate previews for all files
            const previewPromises = fileArray.map((file) => {
                return new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(previewPromises).then(setFilePreviews);
        }
    };

    const uploadToS3 = async (): Promise<string[]> => {
        if (!selectedFiles.length) return [];

        try {
            setUploadLoading(true);
            const formData = new FormData();
            selectedFiles.forEach((file) => {
                formData.append("images", file);
            });
            formData.append("folder", folder);

            const baseURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
            const response = await axios.post<UploadMultipleResponse>(
                `${baseURL}/images/upload-multiple`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            if (response.data.success) {
                const newUploadedUrls = response.data.data.images.map(
                    (img: UploadedImage) => img.imageUrl || defaultImageUrl
                );
                const allUrls = [...uploadedUrls, ...newUploadedUrls];
                setUploadedUrls(allUrls);
                setSelectedFiles([]);
                setFilePreviews([]);

                // Call onChange callback
                onChange?.(allUrls);

                message.success(`${newUploadedUrls.length} image(s) uploaded successfully!`);
                return newUploadedUrls;
            } else {
                throw new Error(response.data.message || "Upload failed");
            }
        } catch (error: unknown) {
            console.error("Error uploading images:", error);
            message.error("Failed to upload images. Using default image URLs.");
            // Use default URLs for the number of files that failed
            const fallbackUrls = selectedFiles.map(() => defaultImageUrl);
            const allUrls = [...uploadedUrls, ...fallbackUrls];
            setUploadedUrls(allUrls);
            setSelectedFiles([]);
            setFilePreviews([]);
            onChange?.(allUrls);
            return fallbackUrls;
        } finally {
            setUploadLoading(false);
        }
    };

    const handleUrlsSubmit = () => {
        const urls = urlInputValue
            .split(/[,\n]/)
            .map((url) => url.trim())
            .filter((url) => url !== "");

        if (urls.length === 0) {
            message.warning("Please enter at least one image URL");
            return;
        }

        if (uploadedUrls.length + urls.length > maxFiles) {
            message.error(`Total images cannot exceed ${maxFiles}`);
            return;
        }

        // Validate URLs
        const validUrls: string[] = [];
        for (const url of urls) {
            try {
                new URL(url);
                validUrls.push(url);
            } catch (error: unknown) {
                console.error("Error validating URL:", error);
                message.error(`Invalid URL: ${url}`);
                return;
            }
        }

        const allUrls = [...uploadedUrls, ...validUrls];
        setUploadedUrls(allUrls);
        onChange?.(allUrls);
        setUrlInputValue("");
        message.success(`${validUrls.length} URL(s) added successfully!`);
    };

    const removeImage = (index: number) => {
        const newUrls = uploadedUrls.filter((_, i) => i !== index);
        setUploadedUrls(newUrls);
        onChange?.(newUrls);
    };

    const removeFilePreview = (index: number) => {
        const newFiles = selectedFiles.filter((_, i) => i !== index);
        const newPreviews = filePreviews.filter((_, i) => i !== index);

        setSelectedFiles(newFiles);
        setFilePreviews(newPreviews);
    };

    const removeAll = () => {
        setSelectedFiles([]);
        setFilePreviews([]);
        setUploadedUrls([]);
        setUrlInputValue("");
        onChange?.([]);

        // Clear the file input
        const fileInput = document.querySelector(
            `input[name="${folder}-images"]`
        ) as HTMLInputElement;
        if (fileInput) {
            fileInput.value = "";
        }
    };

    const getPreviewSize = () => {
        switch (previewSize) {
            case "small":
                return "w-16 h-16";
            case "large":
                return "w-32 h-32";
            default:
                return "w-20 h-20";
        }
    };

    const getGridCols = () => {
        switch (previewSize) {
            case "small":
                return "grid-cols-4 sm:grid-cols-6 md:grid-cols-8";
            case "large":
                return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
            default:
                return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4";
        }
    };

    return (
        <div className={`mb-4 w-full ${className}`}>
            <LabelWithToolTip labelInfo={labelInfo} label={label} required={required} />

            <div className="space-y-4">
                {allowUrlInput && (
                    <div className="flex gap-2 mb-2">
                        <Button
                            type={inputMode === "upload" ? "primary" : "default"}
                            size="small"
                            onClick={() => setInputMode("upload")}
                        >
                            Upload Files
                        </Button>
                        <Button
                            type={inputMode === "url" ? "primary" : "default"}
                            size="small"
                            onClick={() => setInputMode("url")}
                        >
                            Enter URLs
                        </Button>
                    </div>
                )}

                {inputMode === "upload" ? (
                    <div className="relative">
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            name={`${folder}-images`}
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                        />
                    </div>
                ) : (
                    <div className="space-y-2">
                        <textarea
                            placeholder="Enter image URLs (one per line or comma-separated)&#10;e.g., https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                            value={urlInputValue}
                            onChange={(e) => setUrlInputValue(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm min-h-[100px]"
                            rows={4}
                        />
                        <Button type="primary" onClick={handleUrlsSubmit}>
                            Add URLs
                        </Button>
                    </div>
                )}

                {selectedFiles.length > 0 && (
                    <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-md border border-green-200">
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                        <p className="text-sm text-green-700 font-medium">
                            {selectedFiles.length} image(s) ready for upload
                        </p>
                        <Button
                            type="primary"
                            size="small"
                            loading={uploadLoading}
                            onClick={uploadToS3}
                            icon={<UploadOutlined />}
                        >
                            Upload All
                        </Button>
                        <Button
                            type="text"
                            size="small"
                            onClick={removeAll}
                            icon={<DeleteOutlined />}
                            danger
                        >
                            Clear
                        </Button>
                    </div>
                )}

                {uploadedUrls.length > 0 && (
                    <div className="p-2 bg-blue-50 rounded-md border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm text-blue-700 font-medium">
                                <p>{uploadedUrls.length} image(s) uploaded successfully</p>
                                <div className="mt-1 space-y-1">
                                    {uploadedUrls.map((url, index) => (
                                        <div
                                            key={index}
                                            className="text-xs text-blue-600 break-all"
                                        >
                                            {index + 1}. {url}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Button
                                type="text"
                                size="small"
                                onClick={removeAll}
                                icon={<DeleteOutlined />}
                                danger
                            >
                                Remove All
                            </Button>
                        </div>
                    </div>
                )}

                {(filePreviews.length > 0 || uploadedUrls.length > 0) && (
                    <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200 shadow-sm">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                            Images Preview ({filePreviews.length + uploadedUrls.length} total)
                        </h4>
                        <div className={`grid ${getGridCols()} gap-4`}>
                            {filePreviews.map((preview, index) => (
                                <div key={`preview-${index}`} className="relative group">
                                    <div
                                        className={`${getPreviewSize()} bg-white rounded-lg border-2 border-gray-300 p-1 shadow-sm`}
                                    >
                                        <img
                                            src={preview}
                                            alt={`Preview ${index + 1}`}
                                            className="w-full h-full object-contain rounded"
                                        />
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 rounded-b truncate">
                                        {selectedFiles[index]?.name}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeFilePreview(index)}
                                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            {uploadedUrls.map((url, index) => (
                                <div key={`uploaded-${index}`} className="relative group">
                                    <div
                                        className={`${getPreviewSize()} bg-white rounded-lg border-2 border-green-300 p-1 shadow-sm`}
                                    >
                                        <img
                                            src={url}
                                            alt={`Uploaded ${index + 1}`}
                                            className="w-full h-full object-contain rounded"
                                        />
                                    </div>
                                    <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">
                                        ✓
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <p className="text-xs text-gray-500 mt-1">
                Upload multiple images. Accepted formats: JPG, PNG, GIF, WebP (Max{" "}
                {maxSizePerFile / (1024 * 1024)}MB each, max {maxFiles} files).
            </p>
        </div>
    );
};

export default MultiImageUpload;
