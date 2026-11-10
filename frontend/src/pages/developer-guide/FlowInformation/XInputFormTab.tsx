import type { FC } from "react";
import GithubMarkdown from "@components/GithubMarkdown";

interface XInputFormTabProps {
    content: string;
}

const XInputFormTab: FC<XInputFormTabProps> = ({ content }) => (
    <div className="rounded-lg border border-slate-200 dark:border-border-default bg-white dark:bg-surface-elevated p-4">
        <GithubMarkdown content={content} />
    </div>
);

export default XInputFormTab;
