import React, { useState, useEffect, useMemo } from 'react';
import { doc, updateDoc, addDoc, collection, serverTimestamp, deleteDoc, getDoc } from 'firebase/firestore';
import Modal from './Modal';
import { createUtcDateFromCentralTime } from '../utils/timezoneHelpers';

const ShiftModal = ({ isOpen, onClose, db, shiftInfo, units, statuses, collectionPath }) => {
    const [formData, setFormData] = useState(null);

    const sortedStatuses = useMemo(() => {
        const onCallStatuses = [
            'On Call',
            'On Call 1',
            'On Call 2',
            'On Call 3',
            'MRI Morning Call',
            'MRI Evening Call',
        ];

        const onCallGroup = statuses.filter(s => onCallStatuses.includes(s.name))
                                    .sort((a, b) => onCallStatuses.indexOf(a.name) - onCallStatuses.indexOf(b.name));

        const otherStatuses = statuses.filter(s => !onCallStatuses.includes(s.name))
                                      .sort((a, b) => a.name.localeCompare(b.name));

        return [...onCallGroup, ...otherStatuses];
    }, [statuses]);

    useEffect(() => { 
        if (shiftInfo) {
            let shiftStartUtc = null;
            let shiftEndUtc = null;

            if (shiftInfo.shift?.shiftStartDateTime) {
                shiftStartUtc = new Date(shiftInfo.shift.shiftStartDateTime);
            } else if (shiftInfo.shift?.startTime?.seconds) {
                shiftStartUtc = new Date(shiftInfo.shift.startTime.seconds * 1000);
            }

            if (shiftInfo.shift?.shiftEndDateTime) {
                shiftEndUtc = new Date(shiftInfo.shift.shiftEndDateTime);
            } else if (shiftInfo.shift?.endTime?.seconds) {
                shiftEndUtc = new Date(shiftInfo.shift.endTime.seconds * 1000);
            }

            setFormData({ 
                staffId: shiftInfo.staff.id, 
                date: shiftInfo.date.toISOString().split('T')[0], 
                startTime: shiftStartUtc ? `${String(shiftStartUtc.getUTCHours()).padStart(2, '0')}:${String(shiftStartUtc.getUTCMinutes()).padStart(2, '0')}` : '07:00', 
                endTime: shiftEndUtc ? `${String(shiftEndUtc.getUTCHours()).padStart(2, '0')}:${String(shiftEndUtc.getUTCMinutes()).padStart(2, '0')}` : '19:30', 
                unit: shiftInfo.shift?.unitId || '', // Use unitId
                status: Array.isArray(shiftInfo.shift?.status) ? shiftInfo.shift.status : [], 
                published: shiftInfo.shift?.published || false, 
                isExtraShift: shiftInfo.shift?.isExtraShift || false,
                karmaAwarded: shiftInfo.shift?.karmaAwarded || false,
                isSwappedShift: shiftInfo.shift?.isSwappedShift || false,
                swapKarmaAwarded: shiftInfo.shift?.swapKarmaAwarded || false,
                noShowKarmaDeducted: shiftInfo.shift?.noShowKarmaDeducted || false,
                manualKarmaAdjustment: shiftInfo.shift?.manualKarmaAdjustment || 0,
                manualKarmaReason: shiftInfo.shift?.manualKarmaReason || '',
                ...shiftInfo.shift 
            }); 
        } else {
            // Default form data for new shifts
            setFormData({
                staffId: shiftInfo?.staff?.id || '',
                date: shiftInfo?.date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
                startTime: '07:00',
                endTime: '19:30',
                unit: '',
                status: [],
                published: false,
                isExtraShift: false,
                karmaAwarded: false,
                isSwappedShift: false,
                swapKarmaAwarded: false,
                noShowKarmaDeducted: false,
                manualKarmaAdjustment: 0,
                manualKarmaReason: '',
            });
        }
    }, [shiftInfo]);
    
    if (!isOpen || !formData) return null;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'status') {
            setFormData(prev => {
                const currentStatuses = Array.isArray(prev.status) ? prev.status : [];
                if (checked) {
                    return { ...prev, status: [...currentStatuses, value] };
                } else {
                    return { ...prev, status: currentStatuses.filter(s => s !== value) };
                }
            });
        } else {
            setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();

        const [startHour, startMinute] = formData.startTime.split(':').map(Number);
        const [endHour, endMinute] = formData.endTime.split(':').map(Number);

        const shiftStartDateTimeUtc = createUtcDateFromCentralTime(formData.date, startHour, startMinute);
        let shiftEndDateTimeUtc = createUtcDateFromCentralTime(formData.date, endHour, endMinute);

        // Handle overnight shifts
        if (shiftEndDateTimeUtc < shiftStartDateTimeUtc) {
            shiftEndDateTimeUtc.setDate(shiftEndDateTimeUtc.getDate() + 1);
        }

        const dataToSave = {
            ...formData,
            shiftStartDateTime: shiftStartDateTimeUtc.toISOString(), // Store as ISO string
            shiftEndDateTime: shiftEndDateTimeUtc.toISOString(),   // Store as ISO string
            unitId: formData.unit, // Save unitId
        };

        // Remove standardShift if it exists, as it's no longer needed
        delete dataToSave.standardShift;

        const isCallOut = dataToSave.status && dataToSave.status.includes('Call out');
        const isExtraShift = dataToSave.isExtraShift;
        const isSwappedShift = dataToSave.isSwappedShift;
        const isNoCallNoShow = dataToSave.status && dataToSave.status.includes('No Call/No Show');
        const manualKarmaAdjustment = Number(dataToSave.manualKarmaAdjustment) || 0;
        let staffMemberDoc;

        if (formData.id) {
            // Existing shift: Check if status changed to Call out and karma not yet deducted
            const oldShiftDoc = await getDoc(doc(db, collectionPath, formData.id));
            const oldShiftData = oldShiftDoc.data();
            const wasCallOut = oldShiftData.status && oldShiftData.status.includes('Call out');
            const wasExtraShift = oldShiftData.isExtraShift;
            const wasSwappedShift = oldShiftData.isSwappedShift;
            const wasNoCallNoShow = oldShiftData.status && oldShiftData.status.includes('No Call/No Show');
            const oldManualKarmaAdjustment = Number(oldShiftData.manualKarmaAdjustment) || 0;

            // Handle Call Out Karma
            if (isCallOut && !oldShiftData.karmaDeducted) {
                staffMemberDoc = await getDoc(doc(db, 'users', dataToSave.staffId));
                if (staffMemberDoc.exists()) {
                    const currentKarma = staffMemberDoc.data().staffKarma || 0;
                    await updateDoc(doc(db, 'users', dataToSave.staffId), { staffKarma: currentKarma - 10 });
                    dataToSave.karmaDeducted = true;
                    await addDoc(collection(db, 'karmaTransactions'), {
                        staffId: dataToSave.staffId,
                        date: dataToSave.date,
                        karmaChange: -10,
                        reason: 'Call Out',
                        transactionType: 'Deduction',
                        timestamp: serverTimestamp(),
                    });
                }
            } else if (!isCallOut && oldShiftData.karmaDeducted) {
                staffMemberDoc = await getDoc(doc(db, 'users', dataToSave.staffId));
                if (staffMemberDoc.exists()) {
                    const currentKarma = staffMemberDoc.data().staffKarma || 0;
                    await updateDoc(doc(db, 'users', dataToSave.staffId), { staffKarma: currentKarma + 10 });
                    dataToSave.karmaDeducted = false;
                    await addDoc(collection(db, 'karmaTransactions'), {
                        staffId: dataToSave.staffId,
                        date: dataToSave.date,
                        karmaChange: 10,
                        reason: 'Call Out Reversal',
                        transactionType: 'Award',
                        timestamp: serverTimestamp(),
                    });
                }
            }

            // Handle Extra Shift Karma
            if (isExtraShift && !oldShiftData.karmaAwarded) {
                staffMemberDoc = await getDoc(doc(db, 'users', dataToSave.staffId));
                if (staffMemberDoc.exists()) {
                    const currentKarma = staffMemberDoc.data().staffKarma || 0;
                    await updateDoc(doc(db, 'users', dataToSave.staffId), { staffKarma: currentKarma + 5 });
                    dataToSave.karmaAwarded = true;
                    await addDoc(collection(db, 'karmaTransactions'), {
                        staffId: dataToSave.staffId,
                        date: dataToSave.date,
                        karmaChange: 5,
                        reason: 'Extra Shift',
                        transactionType: 'Award',
                        timestamp: serverTimestamp(),
                    });
                }
            } else if (!isExtraShift && oldShiftData.karmaAwarded) {
                staffMemberDoc = await getDoc(doc(db, 'users', dataToSave.staffId));
                if (staffMemberDoc.exists()) {
                    const currentKarma = staffMemberDoc.data().staffKarma || 0;
                    await updateDoc(doc(db, 'users', dataToSave.staffId), { staffKarma: currentKarma - 5 });
                    dataToSave.karmaAwarded = false;
                    await addDoc(collection(db, 'karmaTransactions'), {
                        staffId: dataToSave.staffId,
                        date: dataToSave.date,
                        karmaChange: -5,
                        reason: 'Extra Shift Reversal',
                        transactionType: 'Deduction',
                        timestamp: serverTimestamp(),
                    });
                }
            }

            // Handle Swapped Shift Karma
            if (isSwappedShift && !oldShiftData.swapKarmaAwarded) {
                staffMemberDoc = await getDoc(doc(db, 'users', dataToSave.staffId));
                if (staffMemberDoc.exists()) {
                    const currentKarma = staffMemberDoc.data().staffKarma || 0;
                    await updateDoc(doc(db, 'users', dataToSave.staffId), { staffKarma: currentKarma + 5 });
                    dataToSave.swapKarmaAwarded = true;
                    await addDoc(collection(db, 'karmaTransactions'), {
                        staffId: dataToSave.staffId,
                        date: dataToSave.date,
                        karmaChange: 5,
                        reason: 'Swapped Shift',
                        transactionType: 'Award',
                        timestamp: serverTimestamp(),
                    });
                }
            } else if (!isSwappedShift && oldShiftData.swapKarmaAwarded) {
                staffMemberDoc = await getDoc(doc(db, 'users', dataToSave.staffId));
                if (staffMemberDoc.exists()) {
                    const currentKarma = staffMemberDoc.data().staffKarma || 0;
                    await updateDoc(doc(db, 'users', dataToSave.staffId), { staffKarma: currentKarma - 5 });
                    dataToSave.swapKarmaAwarded = false;
                    await addDoc(collection(db, 'karmaTransactions'), {
                        staffId: dataToSave.staffId,
                        date: dataToSave.date,
                        karmaChange: -5,
                        reason: 'Swapped Shift Reversal',
                        transactionType: 'Deduction',
                        timestamp: serverTimestamp(),
                    });
                }
            }

            // Handle No Call/No Show Karma
            if (isNoCallNoShow && !oldShiftData.noShowKarmaDeducted) {
                staffMemberDoc = await getDoc(doc(db, 'users', dataToSave.staffId));
                if (staffMemberDoc.exists()) {
                    const currentKarma = staffMemberDoc.data().staffKarma || 0;
                    await updateDoc(doc(db, 'users', dataToSave.staffId), { staffKarma: currentKarma - 25 });
                    dataToSave.noShowKarmaDeducted = true;
                    await addDoc(collection(db, 'karmaTransactions'), {
                        staffId: dataToSave.staffId,
                        date: dataToSave.date,
                        karmaChange: -25,
                        reason: 'No Call/No Show',
                        transactionType: 'Deduction',
                        timestamp: serverTimestamp(),
                    });
                }
            } else if (!isNoCallNoShow && oldShiftData.noShowKarmaDeducted) {
                staffMemberDoc = await getDoc(doc(db, 'users', dataToSave.staffId));
                if (staffMemberDoc.exists()) {
                    const currentKarma = staffMemberDoc.data().staffKarma || 0;
                    await updateDoc(doc(db, 'users', dataToSave.staffId), { staffKarma: currentKarma + 25 });
                    dataToSave.noShowKarmaDeducted = false;
                    await addDoc(collection(db, 'karmaTransactions'), {
                        staffId: dataToSave.staffId,
                        date: dataToSave.date,
                        karmaChange: 25,
                        reason: 'No Call/No Show Reversal',
                        transactionType: 'Award',
                        timestamp: serverTimestamp(),
                    });
                }
            }

            // Handle Manual Karma Adjustment
            if (manualKarmaAdjustment !== oldManualKarmaAdjustment) {
                staffMemberDoc = await getDoc(doc(db, 'users', dataToSave.staffId));
                if (staffMemberDoc.exists()) {
                    const currentKarma = staffMemberDoc.data().staffKarma || 0;
                    const karmaDifference = manualKarmaAdjustment - oldManualKarmaAdjustment;
                    await updateDoc(doc(db, 'users', dataToSave.staffId), { staffKarma: currentKarma + karmaDifference });
                    await addDoc(collection(db, 'karmaTransactions'), {
                        staffId: dataToSave.staffId,
                        date: dataToSave.date,
                        karmaChange: karmaDifference,
                        reason: dataToSave.manualKarmaReason || 'Manual Adjustment',
                        transactionType: karmaDifference > 0 ? 'Award' : 'Deduction',
                        timestamp: serverTimestamp(),
                    });
                }
            }

            await updateDoc(doc(db, collectionPath, formData.id), dataToSave);
        } else {
            // New shift
            if (isCallOut) {
                staffMemberDoc = await getDoc(doc(db, 'users', dataToSave.staffId));
                if (staffMemberDoc.exists()) {
                    const currentKarma = staffMemberDoc.data().staffKarma || 0;
                    await updateDoc(doc(db, 'users', dataToSave.staffId), { staffKarma: currentKarma - 10 });
                    dataToSave.karmaDeducted = true;
                    await addDoc(collection(db, 'karmaTransactions'), {
                        staffId: dataToSave.staffId,
                        date: dataToSave.date,
                        karmaChange: -10,
                        reason: 'Call Out',
                        transactionType: 'Deduction',
                        timestamp: serverTimestamp(),
                    });
                }
            }
            if (isExtraShift) {
                staffMemberDoc = await getDoc(doc(db, 'users', dataToSave.staffId));
                if (staffMemberDoc.exists()) {
                    const currentKarma = staffMemberDoc.data().staffKarma || 0;
                    await updateDoc(doc(db, 'users', dataToSave.staffId), { staffKarma: currentKarma + 5 });
                    dataToSave.karmaAwarded = true;
                    await addDoc(collection(db, 'karmaTransactions'), {
                        staffId: dataToSave.staffId,
                        date: dataToSave.date,
                        karmaChange: 5,
                        reason: 'Extra Shift',
                        transactionType: 'Award',
                        timestamp: serverTimestamp(),
                    });
                }
            }
            if (isSwappedShift) {
                staffMemberDoc = await getDoc(doc(db, 'users', dataToSave.staffId));
                if (staffMemberDoc.exists()) {
                    const currentKarma = staffMemberDoc.data().staffKarma || 0;
                    await updateDoc(doc(db, 'users', dataToSave.staffId), { staffKarma: currentKarma + 5 });
                    dataToSave.swapKarmaAwarded = true;
                    await addDoc(collection(db, 'karmaTransactions'), {
                        staffId: dataToSave.staffId,
                        date: dataToSave.date,
                        karmaChange: 5,
                        reason: 'Swapped Shift',
                        transactionType: 'Award',
                        timestamp: serverTimestamp(),
                    });
                }
            }
            if (isNoCallNoShow) {
                staffMemberDoc = await getDoc(doc(db, 'users', dataToSave.staffId));
                if (staffMemberDoc.exists()) {
                    const currentKarma = staffMemberDoc.data().staffKarma || 0;
                    await updateDoc(doc(db, 'users', dataToSave.staffId), { staffKarma: currentKarma - 25 });
                    dataToSave.noShowKarmaDeducted = true;
                    await addDoc(collection(db, 'karmaTransactions'), {
                        staffId: dataToSave.staffId,
                        date: dataToSave.date,
                        karmaChange: -25,
                        reason: 'No Call/No Show',
                        transactionType: 'Deduction',
                        timestamp: serverTimestamp(),
                    });
                }
            }
            if (manualKarmaAdjustment !== 0) {
                staffMemberDoc = await getDoc(doc(db, 'users', dataToSave.staffId));
                if (staffMemberDoc.exists()) {
                    const currentKarma = staffMemberDoc.data().staffKarma || 0;
                    await updateDoc(doc(db, 'users', dataToSave.staffId), { staffKarma: currentKarma + manualKarmaAdjustment });
                    await addDoc(collection(db, 'karmaTransactions'), {
                        staffId: dataToSave.staffId,
                        date: dataToSave.date,
                        karmaChange: manualKarmaAdjustment,
                        reason: dataToSave.manualKarmaReason || 'Manual Adjustment',
                        transactionType: manualKarmaAdjustment > 0 ? 'Award' : 'Deduction',
                        timestamp: serverTimestamp(),
                    });
                }
            }
            await addDoc(collection(db, collectionPath), { ...dataToSave, createdAt: serverTimestamp() });
        }
        onClose();
    };
    const handleDelete = async () => {
        if (formData.id && window.confirm("Delete this shift?")) {
            console.log("Attempting to delete shift with ID:", formData.id);
            try {
                const shiftDocRef = doc(db, collectionPath, formData.id);
                const shiftDoc = await getDoc(shiftDocRef);
                if (shiftDoc.exists()) {
                    const shiftData = shiftDoc.data();
                    const staffId = shiftData.staffId;
                    let karmaReversal = 0;
                    let reversalReason = '';

                    if (shiftData.karmaDeducted) { // Call Out
                        karmaReversal += 10;
                        reversalReason = 'Deleted Call Out';
                    }
                    if (shiftData.karmaAwarded) { // Extra Shift
                        karmaReversal -= 5;
                        reversalReason = 'Deleted Extra Shift';
                    }
                    if (shiftData.swapKarmaAwarded) { // Swapped Shift
                        karmaReversal -= 5;
                        reversalReason = 'Deleted Swapped Shift';
                    }
                    if (shiftData.noShowKarmaDeducted) { // No Call/No Show
                        karmaReversal += 25;
                        reversalReason = 'Deleted No Call/No Show';
                    }
                    if (shiftData.manualKarmaAdjustment) {
                        karmaReversal -= shiftData.manualKarmaAdjustment;
                        reversalReason = `Reversal of manual adjustment: ${shiftData.manualKarmaReason}`;
                    }

                    if (karmaReversal !== 0) {
                        const userDocRef = doc(db, 'users', staffId);
                        const userDoc = await getDoc(userDocRef);
                        if (userDoc.exists()) {
                            const currentKarma = userDoc.data().staffKarma || 0;
                            await updateDoc(userDocRef, { staffKarma: currentKarma + karmaReversal });
                            await addDoc(collection(db, 'karmaTransactions'), {
                                staffId: staffId,
                                date: shiftData.date,
                                karmaChange: karmaReversal,
                                reason: reversalReason,
                                transactionType: karmaReversal > 0 ? 'Award' : 'Deduction',
                                timestamp: serverTimestamp(),
                            });
                        }
                    }
                }

                await deleteDoc(shiftDocRef);
                onClose();
            } catch (error) {
                console.error("Error deleting shift:", error);
                alert("Failed to delete shift. Check console for details.");
            }
        }
    }
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={formData.id ? `Edit Shift for ${shiftInfo.staff.fullName}` : `Add Shift for ${shiftInfo.staff.fullName}`}>
            <p className="text-lg font-semibold mb-4">{new Date(formData.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="max-h-96 overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="label-style">Start Time</label><input type="time" name="startTime" value={formData.startTime || ''} onChange={handleChange} required className="input-style"/></div>
                        <div><label className="label-style">End Time</label><input type="time" name="endTime" value={formData.endTime || ''} onChange={handleChange} required className="input-style"/></div>
                        <div><label className="label-style">Unit</label><select name="unit" value={formData.unit || ''} onChange={handleChange} required className="input-style"><option value="" disabled>Select...</option>{units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
                        <div>
                            <label className="label-style">Status</label>
                            <div className="flex flex-wrap gap-2">
                                {sortedStatuses.map(s => (
                                    <label key={s.id} className="flex items-center gap-1">
                                        <input
                                            type="checkbox"
                                            name="status"
                                            value={s.name}
                                            checked={formData.status && formData.status.includes(s.name)}
                                            onChange={handleChange}
                                            className="h-4 w-4 rounded"
                                        />
                                        {s.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                        <input type="checkbox" name="published" id="published" checked={formData.published || false} onChange={handleChange} className="h-4 w-4 rounded" />
                        <label htmlFor="published" className="label-style mb-0">Published to staff</label>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                        <input type="checkbox" name="isExtraShift" id="isExtraShift" checked={formData.isExtraShift || false} onChange={handleChange} className="h-4 w-4 rounded" />
                        <label htmlFor="isExtraShift" className="label-style mb-0">Extra Shift (Award Karma)</label>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                        <input type="checkbox" name="isSwappedShift" id="isSwappedShift" checked={formData.isSwappedShift || false} onChange={handleChange} className="h-4 w-4 rounded" />
                        <label htmlFor="isSwappedShift" className="label-style mb-0">Swapped Shift (Award Karma)</label>
                    </div>
                    <div>
                        <label className="label-style">Manual Karma Adjustment</label>
                        <input
                            type="number"
                            name="manualKarmaAdjustment"
                            value={formData.manualKarmaAdjustment || 0}
                            onChange={handleChange}
                            className="input-style"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="label-style">Reason for Manual Adjustment</label>
                        <textarea
                            name="manualKarmaReason"
                            value={formData.manualKarmaReason || ''}
                            onChange={handleChange}
                            className="input-style"
                            rows="2"
                        ></textarea>
                    </div>
                </div>
                <div className="flex justify-between items-center gap-4 pt-4"><div>{formData.id && <button type="button" onClick={handleDelete} className="btn-danger">Delete Shift</button>}</div><div className="flex gap-4"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">{formData.id ? 'Save Changes' : 'Add Shift'}</button></div></div>
            </form>
        </Modal>
    );
};

export default ShiftModal;