import React, { useState } from 'react';
import { useCollection } from '../hooks/useCollection';
import { collection, getDocs, query, addDoc } from 'firebase/firestore';
import { Sparkles } from 'lucide-react';

import { db } from '../firebase';

const AIInsightsPage = () => {
    const [analysisResult, setAnalysisResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [question, setQuestion] = useState('');
    const [suggestedShifts, setSuggestedShifts] = useState([]);

    const { data: shifts } = useCollection(db, 'shifts');
    const { data: users } = useCollection(db, 'users');
    const { data: units } = useCollection(db, 'units');
    const { data: jobTitles } = useCollection(db, 'jobTitles');
    const { data: statuses } = useCollection(db, 'statuses');
    const { data: staffingLevels } = useCollection(db, 'staffingLevels');
    const { data: patientCensus } = useCollection(db, 'patientCensus');
    const { data: weeklyCheckins } = useCollection(db, 'weeklyCheckins');

    const handleApproveSuggestion = async (suggestedShift) => {
        if (!window.confirm("Are you sure you want to approve and create this open shift?")) {
            return;
        }
        try {
            const newShift = {
                ...suggestedShift,
                startTime: new Date(`${suggestedShift.date}T${suggestedShift.startTime}:00`),
                endTime: new Date(`${suggestedShift.date}T${suggestedShift.endTime}:00`),
                published: true,
                claimStatus: 'open',
            };
            await addDoc(collection(db, 'openShifts'), newShift);
            alert('Open shift created successfully!');
        } catch (error) {
            console.error("Error creating open shift from suggestion:", error);
            alert("Failed to create open shift. Please try again.");
        }
    };

    const handleAnalyze = async () => {
        setIsLoading(true);
        setAnalysisResult('');
        
        // We now have all the data from the hooks.
        // We will construct the prompt in the next step.
        const shiftsData = shifts;
        const usersData = users;
        const unitsData = units;
        const jobTitlesData = jobTitles;
        const statusesData = statuses;
        const staffingLevelsData = staffingLevels;
        const patientCensusData = patientCensus;
        const weeklyCheckinsData = weeklyCheckins;

        const prompt = `
            Based on the following data, please answer the user's question.

            If the user's question is about staffing shortages or asks for suggestions on open shifts, please identify any days where the number of scheduled staff is below the 'min' staffing level.
            For each identified shortage, suggest a new open shift to create.
            
            The suggested shifts should be in a JSON array format within a \`json\` code block. For example:
            \`\`\`json
            [
                {
                    "unitId": "unit_id_from_data",
                    "jobTitle": "job_title_from_data",
                    "date": "YYYY-MM-DD",
                    "startTime": "HH:mm",
                    "endTime": "HH:mm",
                    "status": ["Productive"]
                }
            ]
            \`\`\`

            Here is the data:
            Shifts: ${JSON.stringify(shiftsData)}
            Users: ${JSON.stringify(usersData)}
            Units: ${JSON.stringify(unitsData)}
            Job Titles: ${JSON.stringify(jobTitlesData)}
            Statuses: ${JSON.stringify(statusesData)}
            Staffing Levels: ${JSON.stringify(staffingLevelsData)}
            Patient Census: ${JSON.stringify(patientCensusData)}
            Weekly Check-ins: ${JSON.stringify(weeklyCheckinsData)}
            
            Question: ${question}
        `;
        
        try {
            const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
            const payload = { contents: chatHistory };
            const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
                const aiResponseText = result.candidates[0].content.parts[0].text;
                setAnalysisResult(aiResponseText);

                // Look for a JSON code block for suggested shifts
                const jsonRegex = /```json\n([\s\S]*?)\n```/;
                const match = aiResponseText.match(jsonRegex);
                if (match && match[1]) {
                    try {
                        const parsedShifts = JSON.parse(match[1]);
                        setSuggestedShifts(parsedShifts);
                    } catch (e) {
                        console.error("Error parsing suggested shifts JSON:", e);
                    }
                } else {
                    setSuggestedShifts([]);
                }
            } else {
                setAnalysisResult("Could not get a valid analysis from the AI. The response might be empty or malformed.");
                setSuggestedShifts([]);
            }
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            setAnalysisResult("An error occurred while trying to analyze the data.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
         <main className="p-8 overflow-y-auto flex-1 flex flex-col gap-8">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-bold text-white">AI Insights</h1>
            </div>
             <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                 <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2"><Sparkles className="text-purple-400"/> AI-Powered Insights</h2>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Simplified controls for now */}
                 </div>
                 <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question about the selected data..." className="input-style w-full min-h-[80px] mb-4"></textarea>
                 <button onClick={handleAnalyze} className="btn-primary flex items-center gap-2" disabled={isLoading}>{isLoading ? 'Analyzing...' : 'Analyze'}</button>
                 {analysisResult && <div className="mt-4 p-4 bg-gray-700/50 rounded-lg whitespace-pre-wrap"><p>{analysisResult}</p></div>}

                 {suggestedShifts.length > 0 && (
                     <div className="mt-8">
                         <h3 className="text-xl font-semibold mb-4">Suggested Open Shifts</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             {suggestedShifts.map((shift, index) => (
                                 <div key={index} className="bg-gray-700 p-4 rounded-lg shadow-md">
                                     <p className="font-bold">{units.find(u => u.id === shift.unitId)?.name || shift.unitId}</p>
                                     <p className="text-sm">{shift.jobTitle}</p>
                                     <p className="text-sm">{shift.date} {shift.startTime} - {shift.endTime}</p>
                                     <div className="mt-4 flex">
                                         <button
                                             onClick={() => handleApproveSuggestion(shift)}
                                             className="btn-primary flex-1"
                                         >
                                             Approve
                                         </button>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}
            </div>
        </main>
    )
}

export default AIInsightsPage;