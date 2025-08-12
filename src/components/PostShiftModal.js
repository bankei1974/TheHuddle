
import React, { useState } from 'react';
import Modal from './Modal';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import Select from 'react-select';
import { useCollection } from '../hooks/useCollection';

const PostShiftModal = ({ isOpen, onClose, db }) => {
  const { data: units } = useCollection(db, 'units');
  const { data: jobTitles } = useCollection(db, 'jobTitles');
  const { data: statuses } = useCollection(db, 'statuses');

  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUnit || !selectedJobTitle || !selectedStatus || !startTime || !endTime) {
      alert('Please fill in all fields.');
      return;
    }
    try {
      const startDateTime = new Date(startTime.replace('T', ' '));
      const endDateTime = new Date(endTime.replace('T', ' '));

      if (isNaN(startDateTime) || isNaN(endDateTime)) {
        alert('Invalid date/time format. Please use a valid format.');
        return;
      }

      await addDoc(collection(db, 'openShifts'), {
        unitId: selectedUnit.value,
        jobTitle: selectedJobTitle.label,
        startTime: Timestamp.fromDate(startDateTime),
        endTime: Timestamp.fromDate(endDateTime),
        status: selectedStatus.value,
        signedUpBy: null,
      });
      onClose();
      setSelectedUnit(null);
      setSelectedJobTitle(null);
      setSelectedStatus(null);
      setStartTime('');
      setEndTime('');
    } catch (error) {
      console.error("Error posting shift: ", error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Post New Open Shift">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">Unit</label>
          <Select
            options={units.map(unit => ({ value: unit.id, label: unit.name }))}
            onChange={setSelectedUnit}
            value={selectedUnit}
            className="text-gray-900"
            classNamePrefix="select"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Job Title</label>
          <Select
            options={jobTitles.map(jobTitle => ({ value: jobTitle.id, label: jobTitle.name }))}
            onChange={setSelectedJobTitle}
            value={selectedJobTitle}
            className="text-gray-900"
            classNamePrefix="select"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Status</label>
          <Select
            options={statuses.map(status => ({ value: status.name, label: status.name }))}
            onChange={setSelectedStatus}
            value={selectedStatus}
            className="text-gray-900"
            classNamePrefix="select"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Start Time</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">End Time</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Post Shift
        </button>
      </form>
    </Modal>
  );
};

export default PostShiftModal;
