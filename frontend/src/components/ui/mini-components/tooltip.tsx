import Tippy from "@tippyjs/react";
import { ReactElement } from "react";

import "tippy.js/animations/perspective-subtle.css";

const CustomTooltip = ({ content, children }: { content: string; children: ReactElement }) => {
    return (
        <Tippy
            content={
                <div className="p-2 max-w-xs rounded-lg shadow-lg bg-white/30 backdrop-blur-lg text-black text-sm font-semibold text-center border border-white/2">
                    {content}
                </div>
            }
            interactive={true}
            placement="right"
            animation="perspective-subtle"
            zIndex={9999}
            appendTo={document.body} // Ensures the tooltip is rendered outside parent containers
        >
            {children}
        </Tippy>
    );
};

export default CustomTooltip;
