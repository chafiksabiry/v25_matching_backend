import React from 'react';
import { Match } from '../types';
import { formatScore } from '../utils/matchingAlgorithm';
import { BarChart2 } from 'lucide-react';

interface MatchDetailsProps {
  match: Match;
}

const MatchDetails: React.FC<MatchDetailsProps> = ({ match }) => {
  const { matchDetails } = match;
  
  // Format all scores as percentages
  const scores = {
    experience: formatScore(matchDetails.experienceScore),
    skills: formatScore(matchDetails.skillsScore),
    industry: formatScore(matchDetails.industryScore),
    language: formatScore(matchDetails.languageScore),
    availability: formatScore(matchDetails.availabilityScore),
    timezone: formatScore(matchDetails.timezoneScore),
    performance: formatScore(matchDetails.performanceScore),
    region: formatScore(matchDetails.regionScore),
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center space-x-2 mb-4">
        <BarChart2 size={20} className="text-indigo-600" />
        <h3 className="text-lg font-medium text-gray-800">Match Details</h3>
      </div>
      
      <div className="space-y-4">
        {Object.entries(scores).map(([key, value]) => (
          <div key={key}>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 capitalize">{key}</span>
              <span className="text-sm font-medium text-gray-700">{value}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full" 
                style={{ width: value }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Overall Match Score</span>
          <span className="text-lg font-semibold text-indigo-700">{formatScore(match.score)}</span>
        </div>
      </div>
    </div>
  );
};

export default MatchDetails;