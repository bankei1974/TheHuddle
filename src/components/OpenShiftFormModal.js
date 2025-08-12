import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Select from 'react-select';
import { addDoc, collection } from 'firebase/firestore';

const OpenShiftFormModal = ({ isOpen, onClose, db, units, jobTitles, selectedDate, statuses }) => {
  const [unitId, setUnitId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setUnitId('');
      setJobTitle('');
      setStartTime('');
      setEndTime('');
      setError('');
      setSelectedStatuses([]);
    }
  }, [isOpen]);

  const unitOptions = units.map(unit => ({ value: unit.id, label: unit.name }));
  const jobTitleOptions = jobTitles.map(jt => ({ value: jt.name, label: jt.name }));
  const statusOptions = statuses.map(s => ({ value: s.name, label: s.name }));

  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: '#374151', // gray-700
      borderColor: '#4B5563', // gray-600
      color: '#FFFFFF', // white
      padding: '0.25rem',
      boxShadow: state.isFocused ? '0 0 0 1px #6366F1' : null, // indigo-500
      '&:hover': {
        borderColor: '#6366F1', // indigo-500
      },
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#FFFFFF', // white
    }),
    input: (provided) => ({
      ...provided,
      color: '#FFFFFF', // white
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#D1D5DB', // gray-400
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: '#374151', // gray-700
      borderColor: '#4B5563', // gray-600
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#4F46E5' : state.isFocused ? '#4B5563' : '#374151', // indigo-600, gray-600, gray-700
      color: '#FFFFFF', // white
      '&:active': {
        backgroundColor: '#4F46E5', // indigo-600
      },
    }),
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!unitId || !jobTitle || !startTime || !endTime || !selectedDate) {
      setError('All fields are required.');
      return;
    }

    try {
      const newShift = {
        unitId,
        jobTitle,
        date: selectedDate.toISOString().split('T')[0], // Store date as YYYY-MM-DD string
        startTime: new Date(`${selectedDate.toISOString().split('T')[0]}T${startTime}:00`),
        endTime: new Date(`${selectedDate.toISOString().split('T')[0]}T${endTime}:00`),
        published: true, // Open shifts are always published
        status: selectedStatuses.map(s => s.value), // Save selected statuses
        claimStatus: 'open', // Initialize claimStatus as 'open'
      };
      await addDoc(collection(db, 'openShifts'), newShift);
      onClose();
    } catch (err) {
      console.error('Error adding open shift:', err);
      setError('Failed to add open shift. Please try again.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Open Shift">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-white">Unit</label>
          <Select
            id="unit"
            options={unitOptions}
            onChange={selectedOption => setUnitId(selectedOption ? selectedOption.value : '')}
            className="mt-1 block w-full"
            classNamePrefix="react-select"
            placeholder="Select Unit"
            styles={customStyles}
          />
        </div>
        <div>
          <label htmlFor="jobTitle" className="block text-sm font-medium text-white">Job Title</label>
          <Select
            id="jobTitle"
            options={jobTitleOptions}
            onChange={selectedOption => setJobTitle(selectedOption ? selectedOption.value : '')}
            className="mt-1 block w-full"
            classNamePrefix="react-select"
            placeholder="Select Job Title"
            styles={customStyles}
          />
        </div>
        <div>
          <label htmlFor="statuses" className="block text-sm font-medium text-white">Additional Statuses</label>
          <Select
            id="statuses"
            options={statusOptions}
            isMulti
            onChange={selectedOptions => setSelectedStatuses(selectedOptions || [])}
            className="mt-1 block w-full"
            classNamePrefix="react-select"
            placeholder="Select additional statuses"
            styles={customStyles}
          />
        </div>
        <div>
          <label htmlFor="startTime" className="block text-sm font-medium text-white">Start Time</label>
          <input
            type="time"
            id="startTime"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="endTime" className="block text-sm font-medium text-white">End Time</label>
          <input
            type="time"
            id="endTime"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Add Open Shift
        </button>
      </form>
    </Modal>
  );
};

export default OpenShiftFormModal;
