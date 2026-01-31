import { FC } from "react";
import JsonView from "@uiw/react-json-view";
import { PayloadDisplayProps } from "@pages/db-back-office/types";

const PayloadDisplay: FC<PayloadDisplayProps> = ({ payloadData }) => (
    <div className="bg-white rounded-xl shadow-lg border border-sky-100 p-6">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Payload Data</h2>
            <div className="flex gap-2 text-xs">
                <span className="bg-sky-100 text-sky-700 px-2 py-1 rounded">
                    Domain: {payloadData.domain}
                </span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    Version: {payloadData.version}
                </span>
                {payloadData.page && (
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        Page: {payloadData.page}
                    </span>
                )}
            </div>
        </div>

        <div className="border border-sky-200 rounded-lg overflow-hidden">
            <JsonView
                value={payloadData.data as object}
                style={{
                    backgroundColor: "#f8fafc",
                    padding: "16px",
                    fontSize: "14px",
                    fontFamily: "JetBrains Mono, Monaco, monospace",
                }}
                displayDataTypes={false}
                displayObjectSize={true}
                enableClipboard={true}
                collapsed={2}
            />
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
            Click on objects to expand/collapse • Copy values by clicking the copy icon
        </div>
    </div>
);

export default PayloadDisplay;
