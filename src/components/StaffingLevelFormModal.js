
import React, { useState, useEffect } from 'react';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import Modal from './Modal';

const StaffingLevelFormModal = ({ isOpen, onClose, db, unitId, date, levelData, role, effectiveLevels }) => {
    const [formData, setFormData] = useState({ time: '07:00', min: '0', optimal: '0' });

    useEffect(() => {
        if (levelData) {
            setFormData(levelData);
        } else {
            // Find the corresponding time slot in effectiveLevels and pre-populate
            const currentTime = formData.time; // Use current time if already set
            const existingLevel = effectiveLevels?.find(level => level.time === currentTime);
            setFormData({
                time: currentTime,
                min: existingLevel ? existingLevel.min : '0',
                optimal: existingLevel ? existingLevel.optimal : '0',
            });
        }
    }, [levelData, isOpen, effectiveLevels, formData.time]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const collectionPath = 'staffingLevels';
        const dataToSave = {
            ...formData,
            min: Number(formData.min),
            optimal: Number(formData.optimal),
            unitId,
            date,
            role, // We'll need to pass this in
        };

        try {
            if (levelData?.id) {
                // Update existing document
                const docRef = doc(db, collectionPath, levelData.id);
                await updateDoc(docRef, dataToSave);
            } else {
                // Add new document
                await addDoc(collection(db, collectionPath), dataToSave);
            }
            onClose();
        } catch (error) {
            console.error("Error saving staffing level:", error);
            alert("Failed to save staffing level. Check the console for details.");
        }
    };

    // Generate time options in 15-minute increments
    const timeOptions = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
            const hour = h.toString().padStart(2, '0');
            const minute = m.toString().padStart(2, '0');
            timeOptions.push(`${hour}:${minute}`);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={levelData ? 'Edit Staffing Level' : 'Add Staffing Level'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="label-style">Time</label>
                    <select name="time" value={formData.time} onChange={handleChange} className="input-style">
                        {timeOptions.map(time => (
                            <option key={time} value={time}>{time}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="label-style">Minimum Staff</label>
                    <input type="number" name="min" value={formData.min} onChange={handleChange} className="input-style" min="0" />
                </div>
                <div>
                    <label className="label-style">Optimal Staff</label>
                    <input type="number" name="optimal" value={formData.optimal} onChange={handleChange} className="input-style" min="0" />
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary">{levelData ? 'Save Changes' : 'Add Level'}</button>
                </div>
            </form>
        </Modal>
    );
};

export default StaffingLevelFormModal;
