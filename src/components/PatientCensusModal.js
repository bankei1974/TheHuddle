import React, { useState } from 'react';
import Modal from './Modal';
import { useCollection } from '../hooks/useCollection';
import { doc, deleteDoc } from 'firebase/firestore';
import PatientCensusFormModal from './PatientCensusFormModal';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

const PatientCensusModal = ({ isOpen, onClose, db, selectedDate, selectedUnit }) => {
    const { data: patientCensusEntries, loading } = useCollection(db, 'patientCensus');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingCensusEntry, setEditingCensusEntry] = useState(null);

    const handleOpenFormModal = (entry = null) => {
        setEditingCensusEntry(entry);
        setIsFormModalOpen(true);
    };

    const handleCloseFormModal = () => {
        setEditingCensusEntry(null);
        setIsFormModalOpen(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this patient census entry?")) {
            try {
                await deleteDoc(doc(db, 'patientCensus', id));
            } catch (error) {
                console.error("Error deleting patient census entry:", error);
                alert("Failed to delete patient census entry. See console for details.");
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage Patient Census" maxWidth="max-w-2xl">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Census Entries</h3>
                <button onClick={() => handleOpenFormModal()} className="btn-primary flex items-center gap-2">
                    <PlusCircle size={18} /> Add New Entry
                </button>
            </div>
            <div className="space-y-2">
                {loading ? (
                    <p>Loading census entries...</p>
                ) : patientCensusEntries.length === 0 ? (
                    <p className="text-gray-400">No patient census entries defined yet.</p>
                ) : (
                    patientCensusEntries.map(entry => (
                        <div key={entry.id} className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                            <span>{entry.date} ({entry.startTime} - {entry.endTime}): {entry.censusCount} patients</span>
                            <div className="flex gap-3">
                                <button onClick={() => handleOpenFormModal(entry)} className="text-gray-400 hover:text-white">
                                    <Edit size={18} />
                                </button>
                                <button onClick={() => handleDelete(entry.id)} className="text-red-500 hover:text-red-400">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <PatientCensusFormModal
                isOpen={isFormModalOpen}
                onClose={handleCloseFormModal}
                db={db}
                currentCensusEntry={editingCensusEntry}
                propSelectedDate={selectedDate}
                selectedUnit={selectedUnit}
            />
        </Modal>
    );
};

export default PatientCensusModal;