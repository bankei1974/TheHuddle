import React from 'react';
import Modal from './Modal';

const PendingSurveysModal = ({ isOpen, onClose, pendingDaily, pendingWeekly, onCompleteDaily, onCompleteWeekly }) => {
    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pending Surveys">
            <div className="space-y-4">
                {pendingDaily.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Daily Workload Surveys</h3>
                        <ul className="space-y-2">
                            {pendingDaily.map(shift => (
                                <li key={shift.id} className="flex justify-between items-center bg-gray-700/50 p-2 rounded-md">
                                    <span>Shift on {new Date(shift.date).toLocaleDateString()}</span>
                                    <button onClick={() => onCompleteDaily(shift)} className="btn-primary">Complete</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {pendingWeekly && (
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Weekly Check-in Survey</h3>
                        <div className="flex justify-between items-center bg-gray-700/50 p-2 rounded-md">
                            <span>For last week</span>
                            <button onClick={onCompleteWeekly} className="btn-primary">Complete</button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default PendingSurveysModal;
