import React from 'react';

const Spinner = ({ color }) => {
    return (
        <div className={`w-3 h-3 border-3 border-${color || 'white'}-600 border-t-transparent rounded-full animate-spin`}></div>
    );
};

export default Spinner;