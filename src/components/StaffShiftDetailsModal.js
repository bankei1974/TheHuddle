import React, { useState } from 'react';
import Modal from './Modal';
import { Repeat } from 'lucide-react';
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';

const StaffShiftDetailsModal = ({ isOpen, onClose, shift, allShifts, allStaff, currentUserId, db, collectionPath, unitsMap }) => {
    const [availableForSwap, setAvailableForSwap] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const findSwaps = () => {
        setIsLoading(true);
        const potentialSwaps = allShifts.filter(s => 
            s.date === shift.date && 
            s.unitId === shift.unitId && // Add this line for unit filtering
            Array.isArray(s.status) && 
            s.status.includes('Productive') && 
            s.staffId !== currentUserId
        );
        const swapOptions = potentialSwaps.map(swapShift => { const staffMember = allStaff.find(staff => staff.id === swapShift.staffId); return { ...staffMember, shift: swapShift }; }).filter(Boolean);
        setAvailableForSwap(swapOptions);
        setIsLoading(false);
    };

    const requestSwap = async (targetUser) => {
        try {
            await addDoc(collection(db, "swapRequests"), {
                requesterId: currentUserId,
                requesterShiftId: shift.id,
                targetUserId: targetUser.id,
                targetUserShiftId: targetUser.shift.id,
                status: 'pending',
                timestamp: new Date(),
            });
            alert(`Swap request sent to ${targetUser.fullName}.`);
            onClose();
        } catch (error) {
            console.error("Error sending swap request:", error);
            alert("Failed to send swap request.");
        }
    };
    const handleDeleteShift = async () => {
        if (window.confirm("Are you sure you want to delete this open shift?")) {
            try {
                await deleteDoc(doc(db, collectionPath, shift.id));
                onClose();
                alert("Shift deleted successfully!");
            } catch (error) {
                console.error("Error deleting shift:", error);
                alert("Failed to delete shift. Please try again.");
            }
        }
    };

    if (!isOpen || !shift) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Shift Details & Swap">
            <div className="text-white">
                <div className="p-4 bg-gray-700/50 rounded-lg mb-4">
                    <p><strong>Date:</strong> {new Date(shift.date).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> {shift.shiftStartDateTime ? new Date(shift.shiftStartDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'} - {shift.shiftEndDateTime ? new Date(shift.shiftEndDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</p>
                    <p><strong>Unit:</strong> {unitsMap && unitsMap[shift.unitId]?.name || shift.unitId}</p>
                    <p><strong>Status:</strong> {collectionPath === 'openShifts' ? 
                        (shift.claimStatus === 'pending' ? `Pending (Claimed by ${shift.claimedByName || 'Unknown'})` : 'Open') 
                        : (Array.isArray(shift.status) ? shift.status.join(', ') : shift.status)}
                    </p>
                </div>
                <button onClick={findSwaps} className="btn-primary flex items-center gap-2 w-full justify-center"><Repeat size={18}/> Find Swap</button>
                {collectionPath === 'openShifts' && (
                    <button
                        onClick={handleDeleteShift}
                        className="mt-2 btn-danger flex items-center gap-2 w-full justify-center"
                    >
                        Delete Open Shift
                    </button>
                )}
                <div className="mt-4">{isLoading ? <p>Searching for swaps...</p> : availableForSwap.length > 0 && (<div><h4 className="font-semibold text-lg mb-2">Available Staff to Swap With:</h4><ul className="space-y-2">{availableForSwap.map(staff => (<li key={staff.id} className="p-3 bg-gray-700 rounded-lg flex justify-between items-center"><div><p className="font-bold">{staff.fullName} <span className="font-normal text-sm text-gray-400">({staff.jobTitle})</span></p><p className="text-sm">{new Date(staff.shift.startTime.seconds * 1000).toLocaleTimeString()} - {new Date(staff.shift.endTime.seconds * 1000).toLocaleTimeString()} in {unitsMap[staff.shift.unitId]?.name || staff.shift.unitId}</p></div><button onClick={() => requestSwap(staff)} className="btn-secondary">Request</button></li>))}</ul></div>)}</div>
            </div>
        </Modal>
    );
};

export default StaffShiftDetailsModal;