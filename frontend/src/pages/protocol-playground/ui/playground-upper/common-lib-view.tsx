import { useContext } from "react";
import { PlaygroundContext } from "../../context/playground-context";
import { Editor, Monaco } from "@monaco-editor/react";
import { DarkSkyBlueTheme } from "../editor-themes";
import { MockRunner } from "@ondc/automation-mock-runner/dist/lib/MockRunner";

export default function CommonLibView() {
    const playgroundContext = useContext(PlaygroundContext);

    const getEditorContent = () => {
        try {
            const value = playgroundContext.config?.helperLib || "";
            return MockRunner.decodeBase64(value);
        } catch (e) {
            console.error("Error decoding helper library content:", e);
            return "Error decoding helper library content.";
        }
    };

    // Handle editor changes
    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            playgroundContext.updateHelperLib(value);
        }
    };
    const handleEditorWillMount = (monaco: Monaco) => {
        monaco.editor.defineTheme("dark-skyblue", DarkSkyBlueTheme);
    };

    return (
        <>
            <div className="flex-1 p-2 overflow-hidden h-full">
                <Editor
                    key={`common-helper`}
                    theme="dark-skyblue"
                    beforeMount={handleEditorWillMount}
                    height="100%"
                    language={"javascript"}
                    value={getEditorContent()}
                    onChange={handleEditorChange}
                    options={{
                        padding: { top: 16, bottom: 16 },
                        fontSize: 16,
                        lineNumbers: "on",
                        scrollBeyondLastLine: true,
                        automaticLayout: true,
                        formatOnPaste: true,
                        formatOnType: true,
                    }}
                />
            </div>
        </>
    );
}
