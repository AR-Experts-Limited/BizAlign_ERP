import React, { useState, useEffect } from "react";
import { FaTrashCan } from "react-icons/fa6";

const TrashBin = ({ onComplete, type, width, height }) => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        setTimeout(() => setShow(true), 200);
        setTimeout(() => {
            if (onComplete) onComplete();
        }, 2000);
    }, [onComplete]);

    return (
        <div className="flex items-center justify-center">
            <div style={{ height, width }} className={`absolute w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-500 ${show ? "scale-90 opacity-100 animate-ping" : "scale-0 opacity-0"}`}></div>
            <div style={{ height, width }} className={`w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-500 ${show ? "scale-100 opacity-100 " : "scale-0 opacity-0"}`}>
                {type && type === 'error' ?
                    <p className={`flex justify-center items-center w-2 h-2 font-bold text-xs text-white transform transition-all duration-500 ${show ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}>!</p>
                    : <FaTrashCan
                        className={`w-[1rem] h-[1rem] text-white transform transition-all duration-500 ${show ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
                    />}
            </div>
        </div>
    );
};

export default TrashBin;
