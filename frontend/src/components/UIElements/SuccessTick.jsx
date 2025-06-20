import React, { useState, useEffect } from "react";

const SuccessTick = ({ onComplete, width, height }) => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        setTimeout(() => setShow(true), 200);
        setTimeout(() => {
            if (onComplete) onComplete();
        }, 2000);
    }, [onComplete]);

    return (
        <div className="flex items-center justify-center">
            <div style={{ height, width }} className={`absolute w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-500 ${show ? "scale-90 opacity-100 animate-ping" : "scale-0 opacity-0"}`}></div>
            <div style={{ height, width }} className={`w-20 h-20 bg-green-500 p-0.5 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-500 ${show ? "scale-100 opacity-100 " : "scale-0 opacity-0"}`}>
                <svg
                    className={`w-12 h-12 text-white transform transition-all duration-500 ${show ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M5 13l4 4L19 7" />
                </svg>
            </div>
        </div>
    );
};

export default SuccessTick;
