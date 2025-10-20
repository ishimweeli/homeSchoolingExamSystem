// src/components/RichText.tsx
import React from "react";
import DOMPurify from "dompurify";

interface RichTextProps {
    html: string;
    className?: string;
}

const RichText: React.FC<RichTextProps> = ({ html, className }) => {
    console.log("RichText received HTML:", html); // 👈 Add this
    const sanitized = React.useMemo(() => DOMPurify.sanitize(html), [html]);
    return (
        <div
            className={className ?? "prose max-w-none"}
            dangerouslySetInnerHTML={{ __html: sanitized }}
        />
    );
};

export default RichText;