import React, { useState } from 'react';

const AdmitsTable = () => {
    const [admits, setAdmits] = useState({
        picu: '',
        scu: '',
        burn: '',
        acute: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setAdmits(prevAdmits => ({
            ...prevAdmits,
            [name]: value
        }));
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Admits</h3>
            <div className="flex justify-around text-center">
                {['PICU', 'SCU', 'Burn', 'Acute'].map((unit) => (
                    <div key={unit} className="flex flex-col items-center mx-1">
                        <label htmlFor={unit.toLowerCase()} className="text-xs font-medium text-gray-300 mb-1">{unit}</label>
                        <input
                            type="text"
                            id={unit.toLowerCase()}
                            name={unit.toLowerCase()}
                            value={admits[unit.toLowerCase()]}
                            onChange={handleChange}
                            className="input-style w-12 h-6 text-center text-xs p-0.5"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdmitsTable;
