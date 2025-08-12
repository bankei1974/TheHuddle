import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// Helper to generate 15-minute intervals
const generateTimeIntervals = () => {
    const intervals = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
            const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            intervals.push(time);
        }
    }
    return intervals;
};

const allTimeIntervals = generateTimeIntervals();

const PatientCensusFormModal = ({ isOpen, onClose, db, propSelectedDate, selectedUnit }) => {
    const [date, setDate] = useState('');
    // Use a Map to store census counts for each interval, keyed by time string
    const [censusDataByInterval, setCensusDataByInterval] = useState(new Map());
    const [loadingCensus, setLoadingCensus] = useState(true);

    useEffect(() => {
        if (isOpen) {
            const today = propSelectedDate || new Date().toISOString().split('T')[0];
            setDate(today);

            const fetchCensusData = async () => {
                setLoadingCensus(true);
                const docId = `${today}_${selectedUnit}`;
                const docRef = doc(db, 'patientCensus', docId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data().census || {};
                    const initialCensus = new Map();
                    allTimeIntervals.forEach(interval => {
                        initialCensus.set(interval, data[interval] || '');
                    });
                    setCensusDataByInterval(initialCensus);
                } else {
                    const initialCensus = new Map();
                    allTimeIntervals.forEach(interval => {
                        initialCensus.set(interval, '');
                    });
                    setCensusDataByInterval(initialCensus);
                }
                setLoadingCensus(false);
            };

            if (selectedUnit) {
                fetchCensusData();
            } else {
                setLoadingCensus(false);
            }
        } else {
            // Reset state when modal closes
            setDate('');
            setCensusDataByInterval(new Map());
            setLoadingCensus(true);
        }
    }, [isOpen, db, propSelectedDate, selectedUnit]);

    const handleCensusChange = (interval, value) => {
        setCensusDataByInterval(prev => {
            const newMap = new Map(prev);
            newMap.set(interval, value === '' ? '' : Number(value)); // Store as number or empty string
            return newMap;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const census = {};
            for (const [interval, count] of censusDataByInterval.entries()) {
                if (count !== '') {
                    census[interval] = Number(count);
                }
            }

            const docId = `${date}_${selectedUnit}`;
            await setDoc(doc(db, 'patientCensus', docId), {
                date,
                unitId: selectedUnit,
                census,
                updatedAt: serverTimestamp()
            }, { merge: true });

            alert('Patient census saved successfully!');
            onClose();
        } catch (error) {
            console.error('Error saving patient census:', error);
            alert('Failed to save patient census. See console for details.');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Enter Patient Census (15-min intervals)">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="label-style">Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="input-style"
                        required
                        disabled // Date should be selected from ReportsPage
                    />
                </div>

                <div className="max-h-80 overflow-y-auto border border-gray-700 rounded-md p-2">
                    {loadingCensus ? (
                        <p>Loading census data...</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {allTimeIntervals.map(interval => (
                                <div key={interval} className="flex items-center justify-between bg-gray-800 p-2 rounded-md">
                                    <label className="text-white text-sm">{interval}</label>
                                    <input
                                        type="number"
                                        value={censusDataByInterval.get(interval) || ''}
                                        onChange={(e) => handleCensusChange(interval, e.target.value)}
                                        className="w-20 input-style text-right"
                                        min="0"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary">Save Census</button>
                </div>
            </form>
        </Modal>
    );
};

export default PatientCensusFormModal;