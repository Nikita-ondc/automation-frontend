import type { FlowStep } from "@pages/developer-guide/types";
import { getActionId } from "@pages/developer-guide/utils";
import { isFormStep } from "./xinputInfo";

/** Domain-aware actor naming so FIS13 reads "Insurer Platform", FIS12 "Lender Platform", etc. */
function sellerNoun(domain?: string): string {
    if (!domain) return "Seller";
    if (domain.includes("FIS12")) return "Lender";
    if (domain.includes("FIS13")) return "Insurer";
    return "Seller";
}

function findResponseStep(steps: FlowStep[], requestStep: FlowStep): FlowStep | undefined {
    const actionId = getActionId(requestStep);
    return steps.find((s) => s.responseFor === actionId);
}

function findRequestStep(steps: FlowStep[], responseStep: FlowStep): FlowStep | undefined {
    if (!responseStep.responseFor) return undefined;
    return steps.find((s) => getActionId(s) === responseStep.responseFor);
}

/** True when the example payload of a step carries an xinput form the BAP must fetch. */
function stepReturnsForm(step: FlowStep | undefined): boolean {
    if (!step) return false;
    const payload =
        step.examples?.[0]?.payload ??
        step.mock?.examples?.[0]?.payload ??
        step.mock?.defaultPayload;
    try {
        return JSON.stringify(payload ?? {}).includes('"xinput"');
    } catch {
        return false;
    }
}

/**
 * Synthesizes a step-scoped Mermaid sequence diagram from the flow config when the spec
 * doesn't ship an authored one. Covers three shapes:
 * - form steps (html_form / dynamic_form): the BAP ⇄ Form Service exchange;
 * - request/response pairs (select ⇄ on_select), prefixed with the form exchange when the
 *   step right before the request is a form step (its submission_id rides on the request);
 * - unsolicited callbacks (lone on_* steps).
 */
export function generateStepSequenceMermaid(
    steps: FlowStep[],
    selectedStep: FlowStep | undefined,
    domain?: string
): string | null {
    if (!selectedStep || steps.length === 0) return null;

    const noun = sellerNoun(domain);
    const bpp = `${noun} Platform (BPP)`;
    const formSvc = `${noun} Form Service`;

    const lines: string[] = [];
    let usesFormSvc = false;

    const formExchange = (submissionLabel = "Form Submission") => {
        usesFormSvc = true;
        lines.push(`    BAP->>FS: Get Form`);
        lines.push(`    FS-->>BAP: Form Received`);
        lines.push(`    BAP->>FS: ${submissionLabel}`);
        lines.push(`    FS-->>BAP: Submission ID`);
    };

    if (isFormStep(selectedStep)) {
        // The form step itself: only the BAP ⇄ Form Service exchange.
        formExchange();
    } else {
        const isResponse = !!selectedStep.responseFor || selectedStep.api.startsWith("on_");
        const request = isResponse ? findRequestStep(steps, selectedStep) : selectedStep;
        const response = isResponse ? selectedStep : findResponseStep(steps, selectedStep);

        if (request) {
            // A form step directly before the request means its submission_id rides on this call.
            const requestIdx = steps.indexOf(request);
            const prevStep = requestIdx > 0 ? steps[requestIdx - 1] : undefined;
            const withSubmissionId = isFormStep(prevStep);
            if (withSubmissionId) formExchange();

            lines.push(
                `    BAP->>BPP: ${request.api}${withSubmissionId ? " (with submission_id)" : ""}`
            );
            lines.push(`    BPP-->>BAP: ACK`);
        }

        if (response) {
            lines.push(`    BPP->>BAP: ${response.api}`);
            lines.push(`    BAP-->>BPP: ACK`);
            // The callback returned an xinput form → the BAP fetches it next.
            if (stepReturnsForm(response)) {
                usesFormSvc = true;
                lines.push(`    BAP->>FS: Get Form`);
                lines.push(`    FS-->>BAP: Form Received`);
            }
        }

        if (!request && !response) return null;
    }

    const participants = [
        `    participant BAP as Buyer Platform (BAP)`,
        `    participant BPP as ${bpp}`,
        ...(usesFormSvc ? [`    participant FS as ${formSvc}`] : []),
    ];

    return ["sequenceDiagram", ...participants, ...lines].join("\n");
}
