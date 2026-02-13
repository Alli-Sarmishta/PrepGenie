import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewAPI } from '../../lib/api';
import Input from '../../components/Input';
import Button from '../../components/Button';

export default function InterviewSetupPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    role: '',
    interviewType: 'Technical',
    techStack: '',
    experienceLevel: 'Entry',
    numberOfQuestions: 5,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const techStackArray = formData.techStack
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      const response = await interviewAPI.create({
        role: formData.role,
        interviewType: formData.interviewType,
        techStack: techStackArray,
        experienceLevel: formData.experienceLevel,
        numberOfQuestions: formData.numberOfQuestions,
      });

      const interviewId = response.data.interview.id;
      navigate(`/interview/${interviewId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create interview');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Setup Your Interview</h1>
          <p className="text-gray-600 mb-8">
            Configure your interview preferences to get started
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Job Role"
              type="text"
              placeholder="e.g., Frontend Developer, Data Analyst"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interview Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['Technical', 'Non-Technical', 'Mixed'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, interviewType: type })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.interviewType === type
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Tech Stack (comma separated)"
              type="text"
              placeholder="e.g., React, Node.js, PostgreSQL"
              value={formData.techStack}
              onChange={(e) => setFormData({ ...formData, techStack: e.target.value })}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Experience Level
              </label>
              <select
                value={formData.experienceLevel}
                onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Entry">Entry Level (0-2 years)</option>
                <option value="Mid">Mid Level (2-5 years)</option>
                <option value="Senior">Senior Level (5+ years)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Questions: {formData.numberOfQuestions}
              </label>
              <input
                type="range"
                min="3"
                max="10"
                value={formData.numberOfQuestions}
                onChange={(e) =>
                  setFormData({ ...formData, numberOfQuestions: parseInt(e.target.value) })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>3</span>
                <span>10</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button type="submit" isLoading={isLoading} className="w-full">
              Start Interview
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
