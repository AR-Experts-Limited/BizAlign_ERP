const Modal = ({ children, isOpen }) => {
    return (
        <div
            className={`fixed z-99 px-4 py-8 sm:px-20 sm:py-12 md:px-48 md:py-20 bg-black/30 inset-0 flex items-center justify-center  ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
            <div
                className={`border-1 border-neutral-400 bg-white/90 dark:bg-dark-2/90 dark:text-slate-50 dark:border-dark-4 backdrop-blur-lg rounded-lg overflow-auto max-h-content max-w-content transform transition-translate duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-9'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
};


export default Modal;