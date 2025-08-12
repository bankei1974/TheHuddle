import React, { useState } from 'react';
import Modal from './Modal';
import { useCollection } from '../hooks/useCollection';
import { doc, deleteDoc } from 'firebase/firestore';
import StaffingLevelFormModal from './StaffingLevelFormModal';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

const StaffingLevelsModal = ({ isOpen, onClose, db }) => {
    const { data: staffingLevels, loading } = useCollection(db, 'staffingLevels');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingStaffingLevel, setEditingStaffingLevel] = useState(null);

    const handleOpenFormModal = (level = null) => {
        setEditingStaffingLevel(level);
        setIsFormModalOpen(true);
    };

    const handleCloseFormModal = () => {
        setEditingStaffingLevel(null);
        setIsFormModalOpen(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this staffing level?")) {
            try {
                await deleteDoc(doc(db, 'staffingLevels', id));
            } catch (error) {
                console.error("Error deleting staffing level:", error);
                alert("Failed to delete staffing level. See console for details.");
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage Staffing Levels" maxWidth="max-w-2xl">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Defined Levels</h3>
                <button onClick={() => handleOpenFormModal()} className="btn-primary flex items-center gap-2">
                    <PlusCircle size={18} /> Add New Level
                </button>
            </div>
            <div className="space-y-2">
                {loading ? (
                    <p>Loading staffing levels...</p>
                ) : staffingLevels.length === 0 ? (
                    <p className="text-gray-400">No staffing levels defined yet.</p>
                ) : (
                    staffingLevels.map(level => (
                        <div key={level.id} className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                            <span>{level.unit} ({level.startTime} - {level.endTime}): Min {level.minStaff}, Opt {level.optimalStaff}</span>
                            <div className="flex gap-3">
                                <button onClick={() => handleOpenFormModal(level)} className="text-gray-400 hover:text-white">
                                    <Edit size={18} />
                                </button>
                                <button onClick={() => handleDelete(level.id)} className="text-red-500 hover:text-red-400">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <StaffingLevelFormModal
                isOpen={isFormModalOpen}
                onClose={handleCloseFormModal}
                db={db}
                currentStaffingLevel={editingStaffingLevel}
            />
        </Modal>
    );
};

export default StaffingLevelsModal;