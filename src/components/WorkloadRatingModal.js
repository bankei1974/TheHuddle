import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import Modal from './Modal';
import { Star } from 'lucide-react';

import { db } from '../firebase';

const WorkloadRatingModal = ({ isOpen, onClose, shift, collectionPath }) => {
    const [rating, setRating] = useState(shift?.workloadRating || 0);
    const handleSubmit = async () => {
        await updateDoc(doc(db, collectionPath, shift.id), { workloadRating: rating });
        onClose();
    };
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Rate Your Workload">
            <div className="text-center">
                <p className="mb-4">For your shift on {new Date(shift.date).toLocaleDateString()}, how was your workload?</p>
                <div className="flex justify-center items-center gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} size={32} className={`cursor-pointer ${rating >= star ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} onClick={() => setRating(star)} />
                    ))}
                </div>
                <p className="text-sm text-gray-400">(1 = Very High, 5 = Very Low)</p>
                <div className="flex justify-end gap-4 mt-8"><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={handleSubmit} className="btn-primary">Submit Rating</button></div>
            </div>
        </Modal>
    );
};

export default WorkloadRatingModal;