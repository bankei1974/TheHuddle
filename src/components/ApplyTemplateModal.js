import React, { useState } from 'react';
import { useCollection } from '../hooks/useCollection';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Modal from './Modal';
import { where } from 'firebase/firestore';
import { createUtcDateFromCentralTime } from '../utils/timezoneHelpers';

const ApplyTemplateModal = ({ isOpen, onClose, db, staffMember, shiftsPath }) => {
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

    const templatesPath = 'templates';
    const { data: templates, loading } = useCollection(
        db,
        templatesPath,
        staffMember ? [where('staffId', '==', staffMember.id)] : []
    );

    const handleApplyTemplate = async () => {
        if (!selectedTemplate || !startDate) {
            alert('Please select a template and a start date.');
            return;
        }

        const template = templates.find(t => t.id === selectedTemplate);
        if (!template) {
            alert('Template not found.');
            return;
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Normalize to start of the day
        const shiftsToAdd = [];

        for (let i = 0; i < template.duration * 7; i++) {
            const shiftData = template.shifts[i];
            if (shiftData && shiftData.startTime && shiftData.endTime) {
                const shiftDate = new Date(start);
                shiftDate.setDate(start.getDate() + i);

                const year = shiftDate.getFullYear();
                const month = shiftDate.getMonth();
                const day = shiftDate.getDate();
                const startHour = parseInt(shiftData.startTime.split(':')[0]);
                const startMinute = parseInt(shiftData.startTime.split(':')[1]);
                const endHour = parseInt(shiftData.endTime.split(':')[0]);
                const endMinute = parseInt(shiftData.endTime.split(':')[1]);

                const shiftStartDateTimeUtc = createUtcDateFromCentralTime(shiftDate.toLocaleDateString('en-CA'), startHour, startMinute);
                let shiftEndDateTimeUtc = createUtcDateFromCentralTime(shiftDate.toLocaleDateString('en-CA'), endHour, endMinute);

                // Handle overnight shifts
                if (shiftEndDateTimeUtc < shiftStartDateTimeUtc) {
                    shiftEndDateTimeUtc.setDate(shiftEndDateTimeUtc.getDate() + 1);
                }

                const newShift = {
                    staffId: staffMember.id,
                    date: shiftDate.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'), // Format as YYYY-MM-DD in local timezone
                    startTime: shiftData.startTime,
                    endTime: shiftData.endTime,
                    unitId: shiftData.unit, // Save unitId
                    status: (shiftData.status && shiftData.status.length > 0) ? shiftData.status : [],
                    published: false,
                    createdAt: serverTimestamp(),
                    shiftStartDateTime: shiftStartDateTimeUtc.toISOString(), // Store as UTC ISO string
                    shiftEndDateTime: shiftEndDateTimeUtc.toISOString(),     // Store as UTC ISO string
                };
                shiftsToAdd.push(addDoc(collection(db, shiftsPath), newShift));
            }
        }

        try {
            await Promise.all(shiftsToAdd);
            alert('Template applied successfully!');
            onClose();
        } catch (error) {
            console.error('Error applying template:', error);
            alert('Failed to apply template.');
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Apply Template for ${staffMember?.fullName}`}>
            <div className="space-y-4">
                <div>
                    <label className="label-style">Select Template</label>
                    <select
                        value={selectedTemplate || ''}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="input-style"
                    >
                        <option value="" disabled>Select a template</option>
                        {loading ? (
                            <option>Loading templates...</option>
                        ) : (
                            templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.duration} weeks)</option>
                            ))
                        )}
                    </select>
                </div>
                <div>
                    <label className="label-style">Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="input-style"
                    />
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                    <button type="button" onClick={handleApplyTemplate} className="btn-primary">Apply Template</button>
                </div>
            </div>
        </Modal>
    );
};

export default ApplyTemplateModal;