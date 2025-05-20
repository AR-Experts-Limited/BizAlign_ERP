import React from 'react';

const Instalments = () => {
    return (
        <div className='relative w-full p-4 overflow-auto'>
            <h2 className='text-xl mb-3 font-bold dark:text-white'>Instalments</h2>
            <div className='grid grid-cols-1 md:grid-cols-7 gap-3'>
                <div className=' h-full md:col-span-2 w-full bg-white dark:bg-dark shadow-lg border border-neutral-300 dark:border-dark-3 rounded-lg'>
                    <div className='relative overflow-auto max-h-[40rem]'>
                        <div className='sticky top-0 z-5 rounded-t-lg w-full p-3 bg-white/30 dark:bg-dark/30 backdrop-blur-md border-b dark:border-dark-3 border-neutral-200 dark:text-white'><h3>Add new instalment</h3></div>
                    </div>
                </div>


                <div className='max-h-[40rem] relative md:col-span-5 w-full bg-white dark:bg-dark dark:border-dark-3  shadow-lg border border-neutral-300 rounded-lg'>
                    <div className='z-5 rounded-t-lg w-full p-3 bg-white dark:bg-dark dark:border-dark-3 border-b border-neutral-200 dark:text-white'><h3>Instalments list</h3></div>
                    <div className='flex items-center justify-between p-2 rounded-lg border border-neutral-200 mx-3 mt-3'>
                        <div className='flex items-center gap-3'>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Instalments;