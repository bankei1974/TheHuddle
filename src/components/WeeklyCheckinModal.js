import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const WeeklyCheckinModal = ({ isOpen, onClose, userProfile }) => {
    const [formData, setFormData] = useState({
        morale: 5,
        stress: 5,
        workload: 3,
        weeklyHigh: '',
        weeklyLow: '',
        praise: '',
        feedback: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userProfile) return;

        try {
            await addDoc(collection(db, 'weeklyCheckins'), {
                ...formData,
                staffId: userProfile.id,
                weekStartDate: new Date().toISOString().split('T')[0], // This should be improved
                createdAt: serverTimestamp(),
            });
            alert('Weekly check-in submitted successfully!');
            onClose();
        } catch (error) {
            console.error("Error submitting weekly check-in:", error);
            alert("Failed to submit weekly check-in. Please try again.");
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Weekly Check-in Summary">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="label-style">How was your morale this week? (1-10)</label>
                    <input type="range" min="1" max="10" name="morale" value={formData.morale} onChange={handleChange} className="w-full" />
                    <span className="text-center block">{formData.morale}</span>
                </div>
                <div>
                    <label className="label-style">How was your stress level this week? (1-10)</label>
                    <input type="range" min="1" max="10" name="stress" value={formData.stress} onChange={handleChange} className="w-full" />
                    <span className="text-center block">{formData.stress}</span>
                </div>
                <div>
                    <label className="label-style">How was your workload today? (1-5)</label>
                    <input type="range" min="1" max="5" name="workload" value={formData.workload} onChange={handleChange} className="w-full" />
                    <span className="text-center block">{formData.workload}</span>
                </div>
                <div>
                    <label className="label-style">What was your weekly high?</label>
                    <textarea name="weeklyHigh" value={formData.weeklyHigh} onChange={handleChange} className="input-style" rows="2"></textarea>
                </div>
                <div>
                    <label className="label-style">What was your weekly low?</label>
                    <textarea name="weeklyLow" value={formData.weeklyLow} onChange={handleChange} className="input-style" rows="2"></textarea>
                </div>
                <div>
                    <label className="label-style">Is there anyone that you would like to praise for being especially helpful or for doing an especially good job?</label>
                    <textarea name="praise" value={formData.praise} onChange={handleChange} className="input-style" rows="2"></textarea>
                </div>
                <div>
                    <label className="label-style">Is there anything that you feel the leadership team needs to know or is there anything they can do for you?</label>
                    <textarea name="feedback" value={formData.feedback} onChange={handleChange} className="input-style" rows="2"></textarea>
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary">Submit</button>
                </div>
            </form>
        </Modal>
    );
};

export default WeeklyCheckinModal;
