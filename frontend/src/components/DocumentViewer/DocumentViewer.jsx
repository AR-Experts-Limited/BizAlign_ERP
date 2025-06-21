import React, { useEffect, useState } from 'react';

const DocumentViewer = ({ document, onClose }) => {
    const [mimeType, setMimeType] = useState(null);

    useEffect(() => {
        if (document) {
            fetch(document, { method: 'HEAD' })
                .then((res) => setMimeType(res.headers.get('Content-Type')))
                .catch(() => setMimeType('unknown'));
        }
    }, [document]);

    const isImage = mimeType?.startsWith('image/');
    const isPDF = mimeType === 'application/pdf';

    if (!document) return null;

    return (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-lg h-160 w-140 z-120 overflow-hidden p-2 bg-white/40 backdrop-blur-md border border-neutral-200 shadow-lg">
            <button
                onClick={onClose}
                className="flex items-center justify-center backdrop-blur-sm text-sm bg-red-700/50 hover:scale-104 text-white absolute top-4 left-4 h-6 w-6 rounded-full"
            >
                <i className="flex items-center fi fi-rr-cross-small" />
            </button>

            {isImage ? (
                <img
                    src={document}
                    alt="Document"
                    className="w-full h-full object-contain"
                />
            ) : (
                <iframe
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(document)}&embedded=true`}
                    width="100%"
                    height="100%"
                ></iframe>
            )}
        </div>
    );
};

export default DocumentViewer;
