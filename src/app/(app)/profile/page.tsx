'use client';

import React, { useState, useEffect } from 'react';
import { Chip } from '@/components/ui/Chip';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'basics' | 'preferences'>('basics');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Basics state
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [isGeneratingAlias, setIsGeneratingAlias] = useState(false);
  const [gender, setGender] = useState('female');
  const [dob, setDob] = useState('');
  const [city, setCity] = useState('');
  const [jamaat, setJamaat] = useState('');
  const [email, setEmail] = useState('');

  // Preferences state
  const [ageMin, setAgeMin] = useState(25);
  const [ageMax, setAgeMax] = useState(30);
  const [prefCities, setPrefCities] = useState<string[]>([]);
  const [prefEducation, setPrefEducation] = useState<string[]>([]);
  const [prefProfessions, setPrefProfessions] = useState<string[]>([]);
  const [practiceLevel, setPracticeLevel] = useState<string>('');
  const [familyExpectation, setFamilyExpectation] = useState<string>('');
  const [partnerQualityTags, setPartnerQualityTags] = useState<string[]>([]);

  // Constant options for chips
  const CITIES = ['Mumbai', 'Pune', 'Surat', 'Dubai', 'Karachi', 'London', 'New York'];
  const EDUCATION = ['Bachelors', 'Masters', 'PhD', 'Diploma', 'High School'];
  const PROFESSIONS = ['Engineer', 'Doctor', 'Business', 'Design', 'Lawyer', 'Finance', 'Teaching', 'Other'];

  const PRACTICE_LEVELS = [
    { value: 'very_devout', label: 'Very Devout' },
    { value: 'practicing', label: 'Practicing' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'flexible', label: 'Flexible' }
  ];
  const FAMILY_EXPECTATIONS = [
    { value: 'very_important', label: 'Very Important' },
    { value: 'somewhat', label: 'Somewhat' },
    { value: 'flexible', label: 'Flexible' }
  ];
  const QUALITY_TAGS = ['Ambitious', 'Family-oriented', 'Creative', 'Religious', 'Athletic', 'Traveler'];

  const toggleArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setter(prev => {
      const exists = prev.some(i => i.toLowerCase() === item.toLowerCase());
      if (exists) return prev.filter(i => i.toLowerCase() !== item.toLowerCase());
      return [...prev, item];
    });
  };

  const isSelected = (arr: string[], val: string) => arr.some(item => item.toLowerCase() === val.toLowerCase());

  useEffect(() => {
    let isMounted = true;
    async function fetchProfile() {
      try {
        const res = await fetch('/api/v1/profile');
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;

          setName(data.name || '');
          setAlias(data.alias || '');
          setGender(data.gender || 'female');
          setDob(data.dob ? data.dob.split('T')[0] : '');
          setCity(data.city || '');
          setJamaat(data.jamaat || '');
          setEmail(data.email || '');

          if (data.preferences) {
            setAgeMin(data.preferences.ageRange?.min || 25);
            setAgeMax(data.preferences.ageRange?.max || 30);
            setPrefCities(data.preferences.cities || []);
            setPrefEducation(data.preferences.education || []);
            setPrefProfessions(data.preferences.professions || []);
            setPracticeLevel(data.preferences.practiceLevel || '');
            setFamilyExpectation(data.preferences.familyExpectation || '');
            setPartnerQualityTags(data.preferences.partnerQualityTags || []);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchProfile();
    return () => { isMounted = false; };
  }, []);

  const handleBasicsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const res1 = await fetch('/api/v1/profile/basics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, gender, dob, city, jamaat, email }),
      });
      if (res1.ok) {
        setMessage({ text: 'Basic details updated successfully.', type: 'success' });
      } else {
        throw new Error('Failed to update basics');
      }
    } catch (err) {
      setMessage({ text: 'Error updating details.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await fetch('/api/v1/profile/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ageRange: { min: ageMin, max: ageMax },
          cities: prefCities,
          education: prefEducation,
          professions: prefProfessions,
          practiceLevel: practiceLevel || undefined,
          familyExpectation: familyExpectation || undefined,
          partnerQualityTags: partnerQualityTags
        }),
      });
      if (res.ok) {
        setMessage({ text: 'Preferences updated successfully.', type: 'success' });
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (err) {
      setMessage({ text: 'Error updating preferences.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateAlias = async () => {
    setIsGeneratingAlias(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await fetch('/api/v1/profile/alias/generate');
      if (res.ok) {
        const data = await res.json();
        setAlias(data.alias);
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429 || data.code === 'ALIAS_LIMIT_REACHED' || (data.error && data.error.includes('daily alias limit'))) {
          setMessage({
            text: "You've reached your daily alias limit (3/24h). Need help? Contact support.",
            type: 'limit_error'
          });
          return;
        }
        throw new Error(data.error || 'Failed to generate alias');
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error generating new alias.', type: 'error' });
    } finally {
      setIsGeneratingAlias(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-12 pb-32 px-6">
      <div className="container mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>

        <div className="flex items-center gap-2 mb-8 border-b border-border">
          <button
            onClick={() => { setActiveTab('basics'); setMessage({ text: '', type: '' }); }}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-[1px] ${activeTab === 'basics' ? 'border-primary text-foreground' : 'border-transparent text-muted hover:text-foreground'}`}
          >
            Basic Details
          </button>
          <button
            onClick={() => { setActiveTab('preferences'); setMessage({ text: '', type: '' }); }}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-[1px] ${activeTab === 'preferences' ? 'border-primary text-foreground' : 'border-transparent text-muted hover:text-foreground'}`}
          >
            Preferences
          </button>
        </div>

        {message.text && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-medium border flex items-center justify-between ${message.type === 'success' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-danger/10 text-danger border-danger/20'}`}>
            <span>{message.text}</span>
            {message.type === 'limit_error' && (
              <a href="/contact" className="underline font-bold ml-2 hover:opacity-80 shrink-0">
                Contact support &rarr;
              </a>
            )}
          </div>
        )}

        <div className="bg-surface p-8 rounded-3xl border border-border shadow-sm">
          {activeTab === 'basics' && (
            <form onSubmit={handleBasicsSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Real Name</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background mb-1" />
                <p className="text-xs text-muted">Your real name stays private — it's only shared once you and someone you match with both choose to reveal it to each other.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Alias</label>
                <div className="flex items-center justify-between mb-1 bg-background px-4 py-3 rounded-xl border border-border">
                  <span className="font-bold text-foreground text-lg">{alias}</span>
                  <button type="button" onClick={handleRegenerateAlias} disabled={isGeneratingAlias} className="px-4 py-2 bg-secondary text-foreground font-medium rounded-xl disabled:opacity-50 text-sm">
                    {isGeneratingAlias ? 'Generating...' : 'Get a new name'}
                  </button>
                </div>
                <p className="text-xs text-muted">This is your public display name. You can generate a new one once every 24 hours.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Gender</label>
                  <select value={gender} onChange={e => setGender(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Date of Birth</label>
                  <input required type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">City</label>
                  <input required type="text" value={city} onChange={e => setCity(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Jamaat</label>
                  <input required type="text" value={jamaat} onChange={e => setJamaat(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">Email Address (Optional)</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background" />
                <p className="text-xs text-muted mt-1">Used only for account recovery. Never shown publicly or shared.</p>
              </div>
              <button disabled={isSaving} type="submit" className="w-full bg-primary text-surface font-bold py-3.5 rounded-xl mt-4 disabled:opacity-50">
                {isSaving ? 'Saving...' : 'Save Basics'}
              </button>
            </form>
          )}

          {activeTab === 'preferences' && (
            <form onSubmit={handlePreferencesSubmit} className="space-y-8">

              <section>
                <h3 className="text-sm font-bold text-foreground mb-4">Age Range</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">Min Age</label>
                    <input required type="number" value={ageMin} onChange={e => setAgeMin(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">Max Age</label>
                    <input required type="number" value={ageMax} onChange={e => setAgeMax(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background" />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-foreground mb-3">Preferred Cities</h3>
                <div className="flex flex-wrap gap-2">
                  {CITIES.map(c => (
                    <Chip key={c} label={c} selected={isSelected(prefCities, c)} onClick={() => toggleArrayItem(setPrefCities, c)} />
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-foreground mb-3">Preferred Education</h3>
                <div className="flex flex-wrap gap-2">
                  {EDUCATION.map(e => (
                    <Chip key={e} label={e} selected={isSelected(prefEducation, e)} onClick={() => toggleArrayItem(setPrefEducation, e)} />
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-foreground mb-3">Preferred Professions</h3>
                <div className="flex flex-wrap gap-2">
                  {PROFESSIONS.map(p => (
                    <Chip key={p} label={p} selected={isSelected(prefProfessions, p)} onClick={() => toggleArrayItem(setPrefProfessions, p)} />
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-foreground mb-3">Practice Level</h3>
                <div className="flex flex-wrap gap-2">
                  {PRACTICE_LEVELS.map(level => (
                    <Chip key={level.value} label={level.label} selected={practiceLevel === level.value} onClick={() => setPracticeLevel(level.value)} />
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-foreground mb-3">Family Expectation</h3>
                <div className="flex flex-wrap gap-2">
                  {FAMILY_EXPECTATIONS.map(exp => (
                    <Chip key={exp.value} label={exp.label} selected={familyExpectation === exp.value} onClick={() => setFamilyExpectation(exp.value)} />
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-foreground mb-3">Partner Qualities (Select up to 3)</h3>
                <div className="flex flex-wrap gap-2">
                  {QUALITY_TAGS.map(tag => (
                    <Chip
                      key={tag}
                      label={tag}
                      selected={isSelected(partnerQualityTags, tag)}
                      disabled={!isSelected(partnerQualityTags, tag) && partnerQualityTags.length >= 3}
                      onClick={() => toggleArrayItem(setPartnerQualityTags, tag)}
                    />
                  ))}
                </div>
              </section>

              <button disabled={isSaving} type="submit" className="w-full bg-primary text-surface font-bold py-3.5 rounded-xl mt-8 disabled:opacity-50">
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
