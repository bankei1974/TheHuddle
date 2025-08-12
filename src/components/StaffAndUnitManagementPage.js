import React, { useState } from 'react';
import SimpleManagement from './SimpleManagement';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { db } from '../firebase';

const StaffAndUnitManagementPage = () => {
    const [expandedSections, setExpandedSections] = useState({
        units: false,
        jobTitles: false,
        statuses: false,
        staff: false,
    });

    const toggleSection = (sectionName) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionName]: !prev[sectionName]
        }));
    };

    return (
        <main className="p-8 overflow-y-auto">
            <h1 className="text-4xl font-bold text-white mb-8">Units, Roles, Statuses</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                    {/* Units Section */}
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('units')}>
                            <h2 className="text-2xl font-semibold text-white">Units</h2>
                            {expandedSections.units ? <ChevronUp className="text-white" /> : <ChevronDown className="text-white" />}
                        </div>
                        {expandedSections.units && (
                            <div className="mt-4">
                                <SimpleManagement db={db} collectionName="units" singularName="Unit" pluralName="Units" />
                            </div>
                        )}
                    </div>

                    {/* Job Titles Section */}
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('jobTitles')}>
                            <h2 className="text-2xl font-semibold text-white">Job Titles</h2>
                            {expandedSections.jobTitles ? <ChevronUp className="text-white" /> : <ChevronDown className="text-white" />}
                        </div>
                        {expandedSections.jobTitles && (
                            <div className="mt-4">
                                <SimpleManagement db={db} collectionName="jobTitles" singularName="Job Title" pluralName="Job Titles" />
                            </div>
                        )}
                    </div>

                    {/* Statuses Section */}
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('statuses')}>
                            <h2 className="text-2xl font-semibold text-white">Statuses</h2>
                            {expandedSections.statuses ? <ChevronUp className="text-white" /> : <ChevronDown className="text-white" />}
                        </div>
                        {expandedSections.statuses && (
                            <div className="mt-4">
                                <SimpleManagement db={db} collectionName="statuses" singularName="Status" pluralName="Statuses" />
                            </div>
                        )}
                    </div>
                </div>

                
            </div>
        </main>
    );
};

export default StaffAndUnitManagementPage;