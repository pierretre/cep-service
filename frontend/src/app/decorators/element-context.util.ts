export interface ElementContext {
    tag: string;
    id?: string;
    name?: string;
    type?: string;
    role?: string;
    label?: string;
    text?: string;
    value?: string | boolean;
    selector: string;
    valid?: boolean;
    validationErrors?: string[];
    validationMessage?: string;
}

type ValidatableElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function isValidatable(element: HTMLElement): element is ValidatableElement {
    return (
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
    );
}

function readValidity(element: HTMLElement): Pick<ElementContext, 'valid' | 'validationErrors' | 'validationMessage'> {
    if (!isValidatable(element)) return {};

    const validity = element.validity;
    const validationErrors = (Object.keys(validity) as (keyof ValidityState)[])
        .filter((key) => key !== 'valid' && validity[key]);

    return {
        valid: validity.valid,
        validationErrors: validationErrors.length ? validationErrors : undefined,
        validationMessage: element.validationMessage || undefined,
    };
}

function findLabelText(element: HTMLElement): string | undefined {
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
        const labelled = document.getElementById(labelledBy);
        if (labelled?.textContent) return labelled.textContent.trim();
    }

    if (element.id) {
        const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        if (label?.textContent) return label.textContent.trim();
    }

    const closestLabel = element.closest('label');
    if (closestLabel?.textContent) return closestLabel.textContent.trim();

    return (element as HTMLInputElement).placeholder || undefined;
}

function buildSelector(element: HTMLElement): string {
    const parts: string[] = [];
    let current: HTMLElement | null = element;

    for (let depth = 0; current && depth < 3; depth++) {
        let part = current.tagName.toLowerCase();
        if (current.id) {
            part += `#${current.id}`;
            parts.unshift(part);
            break;
        }
        if (current.classList.length) {
            part += `.${Array.from(current.classList).join('.')}`;
        }
        parts.unshift(part);
        current = current.parentElement;
    }

    return parts.join(' > ');
}

function readValue(element: HTMLElement): string | boolean | undefined {
    if (element instanceof HTMLInputElement) {
        if (element.type === 'password') return undefined;
        if (element.type === 'checkbox' || element.type === 'radio') return element.checked;
        return element.value;
    }
    if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
        return element.value;
    }
    return undefined;
}

export function describeElement(element: HTMLElement): ElementContext {
    return {
        tag: element.tagName.toLowerCase(),
        id: element.id || undefined,
        name: (element as HTMLInputElement).name || undefined,
        type: (element as HTMLInputElement).type || undefined,
        role: element.getAttribute('role') || undefined,
        label: findLabelText(element),
        text: element.textContent?.trim().slice(0, 100) || undefined,
        value: readValue(element),
        selector: buildSelector(element),
        ...readValidity(element),
    };
}
