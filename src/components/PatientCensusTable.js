import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

import { ChevronUp, ChevronDown } from 'lucide-react';

const PatientCensusTable = ({ selectedUnit, selectedDate }) => {
    const [censusData, setCensusData] = useState({});
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (selectedUnit && selectedDate) {
                const docId = `${selectedDate}_${selectedUnit.id}`;
                const docRef = doc(db, 'patientCensus', docId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setCensusData(docSnap.data().census);
                } else {
                    // Initialize with empty data if no document exists
                    const initialData = {};
                    for (let i = 0; i < 24 * 4; i++) {
                        const hours = Math.floor(i / 4).toString().padStart(2, '0');
                        const minutes = ((i % 4) * 15).toString().padStart(2, '0');
                        initialData[`${hours}:${minutes}`] = '';
                    }
                    setCensusData(initialData);
                }
            }
        };
        fetchData();
    }, [selectedUnit, selectedDate]);

    const handleCensusChange = (time, value) => {
        setCensusData(prevData => ({
            ...prevData,
            [time]: value
        }));
    };

    const handleSave = async () => {
        if (selectedUnit && selectedDate) {
            const docId = `${selectedDate}_${selectedUnit.id}`;
            const docRef = doc(db, 'patientCensus', docId);
            await setDoc(docRef, { census: censusData }, { merge: true });
            alert('Census data saved successfully!');
        }
    };

    const timeIntervals = Array.from({ length: 24 * 4 }, (_, i) => {
        const hours = Math.floor(i / 4).toString().padStart(2, '0');
        const minutes = ((i % 4) * 15).toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    });

    return (
        <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Patient Census for {selectedUnit?.name} on {selectedDate}</h3>
                <button onClick={() => setIsCollapsed(!isCollapsed)} className="text-gray-400 hover:text-white">
                    {isCollapsed ? <ChevronDown /> : <ChevronUp />}
                </button>
            </div>
            {!isCollapsed && (
                <>
                    <div className="grid grid-cols-6 gap-4">
                        {timeIntervals.map(time => (
                            <div key={time} className="flex items-center gap-2">
                                <label className="w-16">{time}</label>
                                <input
                                    type="number"
                                    value={censusData[time] || ''}
                                    onChange={(e) => handleCensusChange(time, e.target.value)}
                                    className="input-style w-24"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end mt-4">
                        <button onClick={handleSave} className="btn-primary">Save Census Data</button>
                    </div>
                </>
            )}
        </div>
    );
};

export default PatientCensusTable;
