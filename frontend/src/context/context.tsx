import { createContext, ReactNode, useContext, useState, Dispatch, SetStateAction } from "react";
import { SessionCache } from "../types/session-types";

type SessionPayloadData = Record<string, unknown> | unknown[] | null;
type SessionSideView = Record<string, unknown> | null;
type SessionMetadataValue = { name?: string; value: unknown; errorMessage?: string };
type SessionMetadata = Record<string, SessionMetadataValue> | null;

interface SessionContextProps {
    sessionId: string;
    setSessionId: Dispatch<SetStateAction<string>>;
    activeFlowId: string | null;
    setActiveFlowId?: Dispatch<SetStateAction<string | null>>;
    sessionData: SessionCache | null | undefined;
    setSessionData?: Dispatch<SetStateAction<SessionCache | null>>;
    selectedTab: "Request" | "Response" | "Metadata" | "Guide";
    setSelectedTab?: Dispatch<SetStateAction<"Request" | "Response" | "Metadata" | "Guide">>;
    requestData: SessionPayloadData;
    setRequestData: Dispatch<SetStateAction<SessionPayloadData>>;
    responseData: SessionPayloadData;
    setResponseData: Dispatch<SetStateAction<SessionPayloadData>>;
    sideView: SessionSideView;
    setSideView: Dispatch<SetStateAction<SessionSideView>>;
    metadata: SessionMetadata;
    setMetadata: Dispatch<SetStateAction<SessionMetadata>>;
    setActiveCallClickedToggle: React.Dispatch<React.SetStateAction<boolean>>;
    activeCallClickedToggle: boolean;
}

export const SessionContext = createContext<SessionContextProps | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
    const [sessionId, setSessionId] = useState<string>("");
    const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
    const [sessionData, setSessionData] = useState<SessionCache | null>(null);
    const [selectedTab, setSelectedTab] = useState<"Request" | "Response" | "Metadata" | "Guide">(
        "Request"
    );
    const [requestData, setRequestData] = useState<SessionPayloadData>(null);
    const [responseData, setResponseData] = useState<SessionPayloadData>(null);
    const [activeCallClickedToggle, setActiveCallClickedToggle] = useState<boolean>(false);
    const [sideView, setSideView] = useState<SessionSideView>(null);
    const [metadata, setMetadata] = useState<SessionMetadata>(null);

    return (
        <SessionContext.Provider
            value={{
                sessionId,
                setSessionId,
                activeFlowId,
                setActiveFlowId,
                sessionData,
                setSessionData,
                selectedTab,
                setSelectedTab,
                requestData,
                setRequestData,
                setActiveCallClickedToggle,
                activeCallClickedToggle,
                responseData,
                setResponseData,
                sideView, // 👈 optional if you also want to read it
                setSideView, // 👈 fixes missing prop
                metadata, // 👈 optional
                setMetadata,
            }}
        >
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = () => {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error("useSession must be used inside SessionProvider");
    return ctx;
};
