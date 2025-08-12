
import React, { useState } from 'react';
import Modal from './Modal';
import { collection, addDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';

const CopyStaffingLevelsModal = ({ isOpen, onClose, db, sourceUnitId, sourceDate, sourceRole, sourceLevels }) => {
    const [targetDate, setTargetDate] = useState('');
    const [copyMode, setCopyMode] = useState('single'); // 'single', 'daily', 'weekly'
    const [endDate, setEndDate] = useState('');
    const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState([]); // For weekly mode
    const [isCopying, setIsCopying] = useState(false);

    const handleCopy = async () => {
        if (!targetDate) {
            alert('Please select a target date.');
            return;
        }
        if (!sourceLevels || sourceLevels.length === 0) {
            alert('No staffing levels to copy for the selected day and role.');
            return;
        }

        setIsCopying(true);
        try {
            const datesToCopy = [];
            const start = new Date(targetDate);
            const end = new Date(endDate || targetDate);

            if (copyMode === 'single') {
                datesToCopy.push(targetDate);
            } else if (copyMode === 'daily') {
                let current = new Date(start);
                while (current <= end) {
                    datesToCopy.push(current.toISOString().split('T')[0]);
                    current.setDate(current.getDate() + 1);
                }
            } else if (copyMode === 'weekly') {
                let current = new Date(start);
                while (current <= end) {
                    if (selectedDaysOfWeek.includes(current.getDay())) { // getDay() returns 0 for Sunday, 1 for Monday, etc.
                        datesToCopy.push(current.toISOString().split('T')[0]);
                    }
                    current.setDate(current.getDate() + 1);
                }
            }

            for (const dateToCopy of datesToCopy) {
                // 1. Delete existing levels for the target date, unit, and role
                const q = query(
                    collection(db, 'staffingLevels'),
                    where('unitId', '==', sourceUnitId),
                    where('date', '==', dateToCopy),
                    where('role', '==', sourceRole)
                );
                const querySnapshot = await getDocs(q);
                const deletePromises = [];
                querySnapshot.forEach((doc) => {
                    deletePromises.push(deleteDoc(doc.ref));
                });
                await Promise.all(deletePromises);

                // 2. Add new levels based on source data
                const addPromises = sourceLevels.map(level => {
                    const { id, ...dataToCopy } = level; // Exclude the ID from the copied data
                    return addDoc(collection(db, 'staffingLevels'), {
                        ...dataToCopy,
                        date: dateToCopy, // Set the new date
                    });
                });
                await Promise.all(addPromises);
            }

            alert('Staffing levels copied successfully!');
            onClose();
        } catch (error) {
            console.error('Error copying staffing levels:', error);
            alert('Failed to copy staffing levels.');
        } finally {
            setIsCopying(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Copy Staffing Levels from ${sourceDate}`}>
            <div className="space-y-4">
                <div>
                    <label className="label-style">Copy to Date</label>
                    <input
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        className="input-style"
                    />
                </div>
                <div>
                    <label className="label-style">Copy Mode</label>
                    <select value={copyMode} onChange={(e) => setCopyMode(e.target.value)} className="input-style">
                        <option value="single">Single Day</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                    </select>
                </div>

                {(copyMode === 'daily' || copyMode === 'weekly') && (
                    <div>
                        <label className="label-style">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="input-style"
                        />
                    </div>
                )}

                {copyMode === 'weekly' && (
                    <div>
                        <label className="label-style">Days of Week</label>
                        <div className="flex flex-wrap gap-2">
                            {[ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ].map((day, index) => (
                                <label key={day} className="flex items-center gap-1 text-white text-sm">
                                    <input
                                        type="checkbox"
                                        value={index}
                                        checked={selectedDaysOfWeek.includes(index)}
                                        onChange={(e) => {
                                            const dayIndex = Number(e.target.value);
                                            setSelectedDaysOfWeek(prev =>
                                                e.target.checked ? [...prev, dayIndex] : prev.filter(d => d !== dayIndex)
                                            );
                                        }}
                                        className="h-4 w-4 rounded"
                                    />
                                    {day}
                                </label>
                            ))}
                        </div>
                    </div>
                )}
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="btn-secondary" disabled={isCopying}>Cancel</button>
                    <button type="button" onClick={handleCopy} className="btn-primary" disabled={isCopying}>
                        {isCopying ? 'Copying...' : 'Copy Levels'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default CopyStaffingLevelsModal;
