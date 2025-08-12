import React from 'react';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-4xl' }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
            <div className={`bg-gray-800 rounded-2xl shadow-2xl w-full ${maxWidth} border border-gray-700 flex flex-col`}>
                <div className="flex justify-between items-center p-6 border-b border-gray-700 flex-shrink-0">
                    <h3 className="text-xl font-semibold text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar flex-grow">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;