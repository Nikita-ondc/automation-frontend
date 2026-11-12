import { FC, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/Shadcn/Button";
import { ROUTES } from "@constants/routes";
import FlowInformation from "../FlowInformation";
import DocsViewer from "../DocsViewer";
import ErrorCodesTable from "../ErrorCodesTable";
import ReferenceImplementationView from "../ReferenceImplementationView";
// import ChangelogView from "../ChangelogView";
import GithubMarkdown from "@components/GithubMarkdown";
import AdditionalResourcesView from "../AdditionalResourcesView";
import { useDeveloperGuideNav } from "../layout/DeveloperGuideNav";
import GuideContentSkeleton from "../shared/components/GuideContentSkeleton";
import GuideTabFade from "../shared/components/GuideTabFade";
import FlowPageHeader from "./FlowPageHeader";
import {
    resolveUseCaseDocs,
    resolveAdditionalResourcesDocs,
    resolveChangelogDoc,
} from "../content/resolveUseCaseDocs";
import { useDeveloperGuideFlowPageData } from "./useDeveloperGuideFlowPageData";
import type { TopLevelView } from "./types";

const DeveloperGuideFlowPage: FC = () => {
    const navigate = useNavigate();
    const { inShell } = useDeveloperGuideNav();

    const {
        domainKey,
        versionKey,
        slug,
        activeView,
        handleViewChange,
        selectedFlow,
        setSelectedFlow,
        selectedFlowAction,
        setSelectedFlowAction,
        specData,
        isLoading,
        notFound,
        flows,
        errorCodes,
        hasErrorCodes,
        // lazyChangelog, changelogLoading — unused now that Changelog renders the
        // "release notes" doc instead of the structured x-changelog JSON.
        apiUsecase,
    } = useDeveloperGuideFlowPageData();

    const handleBack = () => navigate(ROUTES.DEVELOPER_GUIDE);

    const figmaUrl = specData?.["x-figma"] || specData?.["x-docs"]?.["figma"]?.trim();
    const hasFigma = !!figmaUrl;

    const displayDocs = useMemo(() => resolveUseCaseDocs(specData?.["x-docs"]), [specData]);
    const isDocsEmpty = !displayDocs || Object.keys(displayDocs).length === 0;

    const additionalResourcesDocs = useMemo(
        () => resolveAdditionalResourcesDocs(specData?.["x-docs"], apiUsecase ?? slug),
        [specData, apiUsecase, slug]
    );
    const hasAdditionalResources =
        !!additionalResourcesDocs && Object.keys(additionalResourcesDocs).length > 0;

    const changelogDoc = useMemo(
        () => resolveChangelogDoc(specData?.["x-docs"], apiUsecase ?? slug),
        [specData, apiUsecase, slug]
    );
    const tabOrder = useMemo(() => {
        const order: TopLevelView[] = ["docs"];
        if (hasFigma) order.push("reference-implementation");
        order.push("flows");
        if (hasAdditionalResources) order.push("resources");
        if (hasErrorCodes) order.push("error-codes");
        order.push("changelog");
        return order;
    }, [hasErrorCodes, hasFigma, hasAdditionalResources]);

    if (isLoading) {
        return <GuideContentSkeleton />;
    }

    if (notFound || !domainKey || !versionKey || !slug) {
        return (
            <div
                className={`flex flex-col items-center justify-center bg-white dark:bg-surface-page px-6 ${
                    inShell ? "min-h-[40vh]" : "min-h-screen"
                }`}
            >
                <p className="text-gray-600 mb-4">
                    This use case couldn&apos;t be loaded for this domain/version.
                </p>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={handleBack}
                    className="px-4 py-2 rounded-lg bg-sky-500 text-white hover:bg-sky-600 text-sm font-medium"
                >
                    Back to Developer Guide
                </Button>
            </div>
        );
    }

    return (
        <div
            className={`relative bg-white dark:bg-surface-page flex flex-col ${inShell ? "min-h-0" : "min-h-screen"}`}
        >
            <FlowPageHeader
                activeView={activeView}
                hasErrorCodes={hasErrorCodes}
                hasFigma={hasFigma}
                hasAdditionalResources={hasAdditionalResources}
                errorCodesCount={errorCodes?.code.length}
                onViewChange={handleViewChange}
            />

            <div className="grow flex items-start gap-0 relative">
                <GuideTabFade
                    activeKey={activeView}
                    tabOrder={tabOrder}
                    className="flex min-w-0 flex-1 items-start"
                >
                    {activeView === "flows" ? (
                        <div className="flex-1 min-w-0 px-4 md:px-12">
                            {specData && flows.length > 0 ? (
                                <FlowInformation
                                    data={specData}
                                    flows={flows}
                                    selectedFlow={selectedFlow}
                                    setSelectedFlow={setSelectedFlow}
                                    selectedFlowAction={selectedFlowAction}
                                    setSelectedFlowAction={setSelectedFlowAction}
                                    domain={domainKey}
                                    version={versionKey}
                                />
                            ) : (
                                <div className="w-full flex items-center justify-center min-h-[50vh]">
                                    <p className="text-slate-500 font-medium">
                                        No flows available for this use case.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 min-w-0 px-4 md:px-12 w-full">
                            {activeView === "reference-implementation" && figmaUrl && (
                                <ReferenceImplementationView figmaUrl={figmaUrl} />
                            )}
                            {activeView === "error-codes" &&
                                (hasErrorCodes && errorCodes ? (
                                    <ErrorCodesTable errorCodes={errorCodes} />
                                ) : (
                                    <p className="text-slate-500 text-center py-12">
                                        No error codes available.
                                    </p>
                                ))}
                            {activeView === "docs" &&
                                (isDocsEmpty ? (
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 dark:bg-surface-muted py-12 text-center">
                                        <p className="text-sm text-slate-400">
                                            No documentation available.
                                        </p>
                                    </div>
                                ) : (
                                    <DocsViewer
                                        docs={displayDocs}
                                        useCaseId={apiUsecase ?? slug}
                                        domain={domainKey}
                                        version={versionKey}
                                        flows={flows}
                                    />
                                ))}
                            {activeView === "resources" &&
                                (hasAdditionalResources && additionalResourcesDocs ? (
                                    <AdditionalResourcesView docs={additionalResourcesDocs} />
                                ) : (
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 dark:bg-surface-muted py-12 text-center">
                                        <p className="text-sm text-slate-400">
                                            No additional resources available.
                                        </p>
                                    </div>
                                ))}
                            {activeView === "changelog" &&
                                (changelogDoc ? (
                                    <GithubMarkdown content={changelogDoc} />
                                ) : (
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 dark:bg-surface-muted py-12 text-center">
                                        <p className="text-sm text-slate-400">
                                            No changelog available.
                                        </p>
                                    </div>
                                ))}
                        </div>
                    )}
                </GuideTabFade>
            </div>
        </div>
    );
};

export default DeveloperGuideFlowPage;
