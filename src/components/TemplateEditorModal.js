import React, { useState, useEffect } from 'react';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import Modal from './Modal';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { utcToCentral, centralToUtc } from '../utils/timezoneHelpers';

const TemplateEditorModal = ({ isOpen, onClose, db, template, collectionPath, units, statuses, staffId, staffMember }) => {
    const [name, setName] = useState('');
    const [duration, setDuration] = useState(4);
    const [shifts, setShifts] = useState([]);
    const [isStatusesExpanded, setIsStatusesExpanded] = useState(false);
    const [activeWeekIndex, setActiveWeekIndex] = useState(0);

    useEffect(() => {
        if (template) {
            // Convert stored UTC times to Central Time for editing
            const convertedShifts = template.shifts.map(shift => ({
                ...shift,
                // Assuming startTime and endTime in template are simple strings like 'HH:MM'
                // If they are ISO strings, they would need conversion.
                // For now, we'll assume they are already in the correct local format for the template.
            }));
            setName(template.name);
            setDuration(template.duration);
            setShifts(convertedShifts || Array(template.duration * 7).fill({}));
        } 
        else { 
            const newDuration = 4;
            setName('');
            setDuration(newDuration);
            setShifts(Array(newDuration * 7).fill({}));
        }
        setActiveWeekIndex(0); // Reset to first week on modal open/template change
    }, [template, isOpen]);

    useEffect(() => { 
        const newShifts = Array(duration * 7).fill({});
        // Preserve existing shifts if duration changes
        shifts.forEach((shift, index) => {
            if (index < newShifts.length) {
                newShifts[index] = shift;
            }
        });
        setShifts(newShifts); 
    }, [duration, shifts]);

    const handleShiftChange = (index, field, value) => {
        setShifts(prevShifts => {
            const newShifts = [...prevShifts];
            newShifts[index] = { ...newShifts[index], [field]: value };
            if (field === 'unit') {
                newShifts[index].unitId = value;
            }
            return newShifts;
        });
    };

    const applyStandardShift = (shiftIndex) => {
        if (staffMember && staffMember.standardStartTime && staffMember.standardEndTime && staffMember.predominantUnitId) {
            handleShiftChange(shiftIndex, 'startTime', staffMember.standardStartTime);
            handleShiftChange(shiftIndex, 'endTime', staffMember.standardEndTime);
            handleShiftChange(shiftIndex, 'unit', staffMember.predominantUnitId);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const templateData = { name, duration, shifts, staffId: staffMember?.id };
        if (template) {
            await updateDoc(doc(db, collectionPath, template.id), templateData);
        } else {
            await addDoc(collection(db, collectionPath), templateData);
        }
        onClose();
    };
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={template ? 'Edit Rotation Template' : 'Create Rotation Template'} maxWidth="max-w-6xl">
            <form onSubmit={handleSubmit} className="space-y-4 flex flex-col h-full">
                <div className="flex gap-4 flex-shrink-0">
                    <div className="flex-grow"><label className="label-style">Template Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className="input-style" /></div>
                    <div><label className="label-style">Duration (Weeks)</label><select value={duration} onChange={e => setDuration(Number(e.target.value))} className="input-style"><option value={2}>2</option><option value={4}>4</option><option value={5}>5</option><option value={6}>6</option></select></div>
                </div>

                {/* Week Navigation Tabs */}
                <div className="flex flex-wrap gap-2 mb-4 flex-shrink-0">
                    {Array.from({ length: duration }).map((_, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => setActiveWeekIndex(index)}
                            className={`px-4 py-2 rounded-md font-semibold ${activeWeekIndex === index ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            Week {index + 1}
                        </button>
                    ))}
                </div>

                {/* Scrollable Week Content */}
                <div className="flex-grow overflow-y-auto space-y-4 p-2 -mx-2">
                    {Array.from({ length: duration }).map((_, weekIndex) => (
                        <div key={weekIndex} style={{ display: activeWeekIndex === weekIndex ? 'block' : 'none' }}>
                            <h4 className="text-lg font-semibold mb-2">Week {weekIndex + 1}</h4>
                            <div className="grid grid-cols-7 gap-2">
                                {weekDays.map((day, dayIndex) => {
                                    const shiftIndex = weekIndex * 7 + dayIndex;
                                    const currentShift = shifts[shiftIndex] || {}; // Use currentShift instead of shift
                                    return (
                                        <div key={dayIndex} className="p-2 bg-gray-700 rounded-lg">
                                            <p className="font-bold text-center mb-2">{day}</p>
                                            <div className="space-y-2">
                                                <input type="time" value={currentShift.startTime || ''} onChange={e => handleShiftChange(shiftIndex, 'startTime', e.target.value)} className="input-style text-xs p-1" placeholder="Start"/>
                                                <input type="time" value={currentShift.endTime || ''} onChange={e => handleShiftChange(shiftIndex, 'endTime', e.target.value)} className="input-style text-xs p-1" placeholder="End"/>
                                                <select value={currentShift.unit || ''} onChange={e => handleShiftChange(shiftIndex, 'unit', e.target.value)} className="input-style text-xs p-1">
                                                    <option value="">Unit...</option>
                                                    {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                </select>
                                                {staffMember && staffMember.standardStartTime && (
                                                    <button type="button" onClick={() => applyStandardShift(shiftIndex)} className="btn-secondary w-full text-xs py-1">Apply Standard Shift</button>
                                                )}
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsStatusesExpanded(!isStatusesExpanded)}>
                                                        <p className="text-xs font-semibold">Status:</p>
                                                        {isStatusesExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                                                    </div>
                                                    {isStatusesExpanded && (
                                                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                                                {statuses.map(s => (
                                                                    <label key={s.id} className="flex items-center gap-1 text-2xs">
                                                                        <input
                                                                            type="checkbox"
                                                                            value={s.name}
                                                                            checked={currentShift.status && currentShift.status.includes(s.name)}
                                                                            onChange={e => handleShiftChange(shiftIndex, 'status', e.target.checked ? [...(currentShift.status || []), s.name] : (currentShift.status || []).filter(status => status !== s.name))}
                                                                            className="h-3 w-3 rounded"
                                                                        />
                                                                        {s.name} {s.symbol || ''}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-4 pt-4 flex-shrink-0"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{template ? 'Save Changes' : 'Create Template'}</button></div>
            </form>
        </Modal>
    );
};

export default TemplateEditorModal;