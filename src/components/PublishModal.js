import React, { useState } from 'react';
import { collection, where, getDocs, writeBatch, query } from 'firebase/firestore';
import Modal from './Modal';
import { Send } from 'lucide-react';

const PublishModal = ({ isOpen, onClose, db, collectionPath, startDate, endDate }) => {
    const [isPublishing, setIsPublishing] = useState(false);
    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            const q = query(collection(db, collectionPath), where("date", ">=", startDate), where("date", "<=", endDate), where("published", "==", false));
            const shiftsToPublish = await getDocs(q);
            if (shiftsToPublish.empty) {
                alert("No draft shifts found in the selected date range.");
                setIsPublishing(false);
                onClose();
                return;
            }
            const batch = writeBatch(db);
            shiftsToPublish.forEach(doc => {
                batch.update(doc.ref, { published: true });
            });
            await batch.commit();
            alert(`Successfully published ${shiftsToPublish.size} shifts.`);
        } catch (error) {
            console.error("Error publishing shifts:", error);
            alert("An error occurred while publishing shifts. See console for details.");
        }
        setIsPublishing(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Publish Schedule">
            <div className="text-white">
                <p>You are about to publish all DRAFT shifts between the following dates:</p>
                <p className="my-4 text-lg font-semibold">
                    <strong>Start:</strong> {new Date(startDate).toLocaleDateString()} <br/>
                    <strong>End:</strong> {new Date(endDate).toLocaleDateString()}
                </p>
                <p>This will make them visible to all staff. This action cannot be undone.</p>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} className="btn-secondary" disabled={isPublishing}>Cancel</button>
                    <button onClick={handlePublish} className="btn-primary flex items-center gap-2" disabled={isPublishing}>
                        {isPublishing ? 'Publishing...' : <><Send size={18}/> Publish Now</>}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default PublishModal;