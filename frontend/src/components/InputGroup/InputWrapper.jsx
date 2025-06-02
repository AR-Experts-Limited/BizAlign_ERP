import React from 'react';

const InputWrapper = ({ children, title, colspan, gridCols, border }) => {
    return (
        <div className={`relative mt-4 grid grid-cols-1 md:grid-cols-${gridCols} col-span-1 md:col-span-${colspan} gap-5 p-3 md:p-5.5 rounded-lg  ${border == 'thin' ? 'border-[1.5px]' : 'border-2'}  border-neutral-300`}>
            <h4 className={`absolute text-xs -top-3 ${border == 'thin' ? 'border-[1.5px]' : 'border-2'} border-neutral-300 left-4 bg-neutral-100 dark:bg-dark-2 dark:border-dark-4 rounded-md px-2`}>{title}</h4>
            {children}
        </div >
    );
};

export default InputWrapper;