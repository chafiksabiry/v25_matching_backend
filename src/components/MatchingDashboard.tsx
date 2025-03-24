import React, { useState, useEffect } from 'react';
import { Rep, Gig, Match, MatchingWeights } from '../types';
import { formatScore } from '../utils/matchingAlgorithm';
import { getReps, getGigs, findMatchesForGig, findGigsForRep, generateOptimalMatches } from '../api';
import { BarChart, Activity, Users, Briefcase, Zap, Settings, Award, Clock } from 'lucide-react';
import MatchDetails from './MatchDetails';

const defaultMatchingWeights: MatchingWeights = {
  experience: 0.15,
  skills: 0.20,
  industry: 0.15,
  language: 0.10,
  availability: 0.10,
  timezone: 0.05,
  performance: 0.20,
  region: 0.05
};

type TabType = 'gigs' | 'reps' | 'optimal';

const MatchingDashboard: React.FC = () => {
  const [reps, setReps] = useState<Rep[]>([]);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [selectedRep, setSelectedRep] = useState<Rep | null>(null);
  const [weights, setWeights] = useState<MatchingWeights>(defaultMatchingWeights);
  const [activeTab, setActiveTab] = useState<TabType>('gigs');
  const [showWeights, setShowWeights] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  const paginatedReps = reps.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(reps.length / itemsPerPage);

  // Fetch reps and gigs on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [repsData, gigsData] = await Promise.all([getReps(), getGigs()]);
        setReps(repsData.data || []);
        setGigs(gigsData.data || []);
        setError(null);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Get matches based on current selection
  useEffect(() => {
    const getMatches = async () => {
      console.log("Starting getMatches function");
      console.log("Current activeTab:", activeTab);
      console.log("Selected Gig:", selectedGig);
      console.log("Selected Rep:", selectedRep);
      console.log("Current weights:", weights);

      if (loading) {
        console.log("Loading is true, returning early");
        return;
      }
      
      try {
        setLoading(true);
        
        if (activeTab === 'gigs' && selectedGig) {
          console.log('Processing gig matching...');
          const transformedWeights = {
            experienceWeight: weights.experience,
            skillsWeight: weights.skills,
            industryWeight: weights.industry,
            languageWeight: weights.language,
            availabilityWeight: weights.availability,
            timezoneWeight: weights.timezone,
            performanceWeight: weights.performance,
            regionWeight: weights.region
          };
          console.log('Transformed Weights:', transformedWeights);
          console.log('Calling API with gigId:', selectedGig._id);
          const response = await findMatchesForGig(selectedGig._id!, {
            experience: weights.experience,
            skills: weights.skills,
            industry: weights.industry,
            language: weights.language,
            availability: weights.availability,
            timezone: weights.timezone,
            performance: weights.performance,
            region: weights.region
          });
          console.log('API Response:', response);
          
          if (!response.data || response.data.length === 0) {
            const errorMessage = `Aucun match trouvé.`;
            console.log('Setting error:', errorMessage);
            setError(errorMessage);
          } else {
            console.log('Setting matches:', response.data);
            setMatches(response.data);
          }
        } else if (activeTab === 'reps' && selectedRep) {
          console.log('Processing rep matching...');
          const transformedWeights = {
            experienceWeight: weights.experience,
            skillsWeight: weights.skills,
            industryWeight: weights.industry,
            languageWeight: weights.language,
            availabilityWeight: weights.availability,
            timezoneWeight: weights.timezone,
            performanceWeight: weights.performance,
            regionWeight: weights.region
          };
          console.log('Transformed Weights:', transformedWeights);
          console.log('Calling API with repId:', selectedRep._id);
          const response = await findGigsForRep(selectedRep._id!, {
            experience: weights.experience,
            skills: weights.skills,
            industry: weights.industry,
            language: weights.language,
            availability: weights.availability,
            timezone: weights.timezone,
            performance: weights.performance,
            region: weights.region
          });
          console.log('API Response:', response);
          
          if (!response.data || response.data.length === 0) {
            const errorMessage = `Aucun match trouvé.`;
            console.log('Setting error:', errorMessage);
            setError(errorMessage);
          } else {
            console.log('Setting matches:', response.data);
            setMatches(response.data);
          }
        } else if (activeTab === 'optimal') {
          const matchesData = await generateOptimalMatches(weights);
          setMatches(matchesData);
        } else {
          setMatches([]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error in getMatches:', err);
        setError('Failed to fetch matches. Please try again later.');
      } finally {
        console.log('Setting loading to false');
        setLoading(false);
      }
    };
    
    console.log('useEffect triggered with:', { activeTab, selectedGig, selectedRep, weights });
    getMatches();
  }, [activeTab, selectedGig, selectedRep, weights]);
  
  // Get rep or gig details for a match
  const getRepForMatch = (match: Match) => reps.find(rep => rep._id === match.repId);
  const getGigForMatch = (match: Match) => gigs.find(gig => gig._id === match.gigId);

  // Handle weight change
  const handleWeightChange = (key: keyof MatchingWeights, value: number) => {
    setWeights(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Reset weights to default
  const resetWeights = () => {
    setWeights(defaultMatchingWeights);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-700 text-white p-6 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Zap size={28} className="text-yellow-300" />
            <h1 className="text-2xl font-bold">HARX Smart Matching System</h1>
          </div>
          <button 
            onClick={() => setShowWeights(!showWeights)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-md transition"
          >
            <Settings size={18} />
            <span>Adjust Weights</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <p>{error}</p>
          </div>
        )}
        
        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        )}
        
        {/* Weights Configuration Panel */}
        {showWeights && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Matching Weights Configuration</h2>
              <button 
                onClick={resetWeights}
                className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
              >
                Reset to Default
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(weights).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-gray-700 capitalize">
                      {key} ({Math.round(value * 100)}%)
                    </label>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={value}
                    onChange={(e) => handleWeightChange(key as keyof MatchingWeights, parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Note: These weights determine how much each factor contributes to the overall matching score.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="flex border-b">
            <button 
              className={`flex-1 py-4 px-6 text-center font-medium ${activeTab === 'gigs' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('gigs')}
            >
              <div className="flex items-center justify-center space-x-2">
                <Briefcase size={18} />
                <span>Match Reps to Gig</span>
              </div>
            </button>
            <button 
              className={`flex-1 py-4 px-6 text-center font-medium ${activeTab === 'reps' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('reps')}
            >
              <div className="flex items-center justify-center space-x-2">
                <Users size={18} />
                <span>Find Gigs for Rep</span>
              </div>
            </button>
            <button 
              className={`flex-1 py-4 px-6 text-center font-medium ${activeTab === 'optimal' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('optimal')}
            >
              <div className="flex items-center justify-center space-x-2">
                <Activity size={18} />
                <span>Optimal Matching</span>
              </div>
            </button>
          </div>
        </div>

        {/* Selection Area */}
        {activeTab === 'gigs' && !loading && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Select a Gig to Find Matching Reps</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gigs.map(gig => (
                <div 
                  key={gig._id}
                  className={`border rounded-lg p-4 cursor-pointer transition ${selectedGig?._id === gig._id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
                  onClick={() => setSelectedGig(gig)}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-gray-800">{gig.title}</h3>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">{gig.industry}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{gig.companyName}</p>
                  <div className="mt-3 text-xs text-gray-600">
                    <p>Required Experience: {gig.requiredExperience}+ years</p>
                    <p>Expected Conversion: {gig.expectedConversionRate * 100}%</p>
                    <p>Region: {gig.targetRegion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reps' && !loading && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Select a Rep to Find Matching Gigs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedReps.map(rep => (
                <div 
                  key={rep.id}
                  className={`border rounded-lg p-4 cursor-pointer transition ${selectedRep?.id === rep.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
                  onClick={() => setSelectedRep(rep)}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-gray-800">{rep.Deal_Name}</h3>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">{rep.Stage}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {rep.Contact_Name?.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(rep.Modified_Time).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-600">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium">Owner:</span>
                      <span>{rep.Owner?.name}</span>
                    </div>
                    {rep.Phone && (
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium">Phone:</span>
                        <span>{rep.Phone}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Pipeline:</span>
                      <span>{rep.Pipeline}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded ${
                    currentPage === 1 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  }`}
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded ${
                    currentPage === totalPages 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'optimal' && !loading && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Activity size={24} className="text-indigo-600" />
                <h2 className="text-xl font-semibold text-gray-800">Optimal Matching Results</h2>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{matches.length}</span> optimal pairings found
                </div>
                <button 
                  onClick={() => {
                    setLoading(true);
                    let promise;
                    switch (activeTab as TabType) {
                      case 'gigs':
                        promise = selectedGig 
                          ? findMatchesForGig(selectedGig._id!, weights)
                          : Promise.resolve({ data: [] });
                        break;
                      case 'reps':
                        promise = selectedRep
                          ? findGigsForRep(selectedRep._id!, weights)
                          : Promise.resolve({ data: [] });
                        break;
                      case 'optimal':
                        promise = generateOptimalMatches(weights);
                        break;
                      default:
                        promise = Promise.resolve({ data: [] });
                    }

                    promise
                      .then(response => {
                        setMatches(response.data || []);
                      })
                      .finally(() => {
                        setLoading(false);
                      });
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm flex items-center space-x-2"
                >
                  <Zap size={16} />
                  <span>Regenerate Matches</span>
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">About Optimal Matching</h3>
              <p className="text-sm text-gray-600">
                This algorithm finds the best possible combinations of reps and gigs to maximize overall success probability
                and satisfaction. It considers all factors simultaneously to create the most efficient pairings.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-800 mb-2">Global Match Score</h4>
                <div className="text-2xl font-bold text-green-600">
                  {matches.length > 0 ? 
                    `${(matches.reduce((acc, m) => acc + m.score, 0) / matches.length * 100).toFixed(1)}%` 
                    : 'N/A'}
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Total Matches</h4>
                <div className="text-2xl font-bold text-blue-600">
                  {matches.length}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Area */}
        {matches.length > 0 && !loading && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                {activeTab === 'gigs' 
                  ? `Top Matching Reps for "${selectedGig?.title}"`
                  : activeTab === 'reps'
                  ? `Best Gigs for ${selectedRep?.Deal_Name}`
                  : 'Optimal Rep-Gig Pairings'}
              </h2>
              <p className="text-gray-600 mt-1">
                {matches.length} matches found, sorted by match score
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activeTab === 'gigs' ? 'Rep' : 'Gig'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {matches.map((match, index) => {
                    const rep = getRepForMatch(match);
                    const gig = getGigForMatch(match);
                    return (
                      <tr key={`${match.repId}-${match.gigId}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {activeTab === 'gigs' || activeTab === 'optimal' ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">{rep?.Deal_Name}</div>
                              <div className="text-sm text-gray-500">{rep?.Stage} • {rep?.Stage}</div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-sm font-medium text-gray-900">{gig?.title}</div>
                              <div className="text-sm text-gray-500">{gig?.companyName} • {gig?.industry}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2.5">
                              <div 
                                className="bg-indigo-600 h-2.5 rounded-full" 
                                style={{ width: `${match.score * 100}%` }}
                              ></div>
                            </div>
                            <span className="ml-3 text-sm font-medium text-gray-900">
                              {formatScore(match.score)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            {match.matchDetails.skillsScore > 0.7 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Skills Match
                              </span>
                            )}
                            {match.matchDetails.industryScore > 0.7 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Industry Fit
                              </span>
                            )}
                            {match.matchDetails.performanceScore > 0.7 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                High Performer
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No Results Message */}
        {matches.length === 0 && !loading && (activeTab === 'gigs' || activeTab === 'reps') && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="flex justify-center mb-4">
              <Clock size={48} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Matches Yet</h3>
            <p className="text-gray-600">
              {activeTab === 'gigs' 
                ? 'Select a gig to see matching reps' 
                : 'Select a rep to see matching gigs'}
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 p-6 mt-12">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Zap size={20} className="text-yellow-400" />
              <span className="text-white font-medium">HARX Smart Matching System</span>
            </div>
            <div className="text-sm">
              © 2025 HARX. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MatchingDashboard;