import React, { useRef } from 'react';

export const ImageViewer = ({ userId, date, checklist, title }) => {
    if (!checklist || !checklist.images) return null;
    const openWindowsRef = useRef({});

    return (
        <div className="border-[1.5px] border-neutral-300 rounded-md mt-2 p-3 flex flex-col">
            <div className="flex items-start mb-2">
                <label className="text-sm font-medium text-gray-800">{title} - Images:</label>
            </div>
            <div className="flex flex-wrap gap-2">
                {Object.keys(checklist.images).map((key) => {
                    if (checklist.images[key] !== '') {
                        return (
                            <button
                                key={key}
                                className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
                                onClick={() => {
                                    const windowName = `_${title.toLowerCase().replace(/ /g, '_')}_${key}_image_${userId}_${date.toLocaleDateString()}_${new Date().toLocaleTimeString()}`;

                                    if (
                                        openWindowsRef.current[windowName] &&
                                        !openWindowsRef.current[windowName].closed
                                    ) {
                                        openWindowsRef.current[windowName].focus();
                                        return;
                                    }

                                    const imgWindow = window.open(
                                        '',
                                        windowName,
                                        'width=800,height=600,scrollbars=yes,resizable=yes'
                                    );
                                    openWindowsRef.current[windowName] = imgWindow;

                                    imgWindow.document.write(`
                <html>
                  <head>
                    <title>${title} - ${key.charAt(0).toUpperCase() + key.slice(1)} - ${userId} - ${date.toLocaleDateString()} - Image</title>
                  </head>
                  <body style="margin:0; display:flex; justify-content:center; align-items:center; background:#000;">
                    <img src="${checklist.images[key]}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />
                  </body>
                </html>
              `);
                                }}
                            >
                                {key.charAt(0).toUpperCase() + key.slice(1)}
                            </button>
                        );
                    }
                    return null;
                })}
            </div>
        </div>
    );
};