import { ReactNode } from "react";

export function createValueNode(value: any): ReactNode {
    if (value === undefined) {
        return <span className="value-keyword">undefined</span>;
    }
    if (value === null) {
        return <span className="value-keyword">null</span>;
    }
    switch (typeof value) {
        case "number":
            return <span className="value-number">{value}</span>;
        case "boolean":
            return <span className="value-keyword">{value ? "true" : "false"}</span>;
        case "object":
            return createObjectValueNode(value);
        default:
            return <span className="value-string">"{value}"</span>;
    }
}

function createObjectValueNode(value: any): ReactNode {
    if (Array.isArray(value)) {
        const len = value.length;
        return (
            <>
                [
                <div className="value-composite">
                    {
                        value.map((element, index) => (
                            <div>
                                {createValueNode(element)}
                                { index < len && ","}
                            </div>
                        ))
                    }
                </div>
                ]
            </>
        );
    }
    const keys = Object.keys(value);
    const len = keys.length;
    return (
        <>
            {"{"}
            <div className="value-composite">
                {
                    keys.map((key, index) => (
                        <div>
                            {createValueNode(value[key])}
                            { index < len && ","}
                        </div>
                    ))
                }
            </div>
            {"}"}
        </>
    );
}
