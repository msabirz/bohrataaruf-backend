'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown, Sparkles, Eye } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import { useModeContext } from '@/lib/context/ModeContext';
import { CompletionBreakdownCard, type CompletionBreakdownItem } from '@/components/app/CompletionBreakdownCard';
import { VerificationStatusCard } from '@/components/app/VerificationStatusCard';
import { LifestyleToggle, type TraitPair } from '@/components/app/LifestyleToggle';
import { WebRangeSlider } from '@/components/app/WebRangeSlider';
import { AGE_MIN, AGE_MAX } from '@/components/app/FilterPanel';
import { FamilySection } from '@/components/ui/FamilySection';
import { ChildrenSection } from '@/components/ui/ChildrenSection';
import { HEIGHT_PICKER_OPTIONS, DEFAULT_HEIGHT_CM, nearestHeightOptionCm } from '@/lib/height';

function AccordionSection({
  title, isOpen, onToggle, children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-3xl border border-border shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-5 text-left"
      >
        <span className="font-bold text-foreground">{title}</span>
        <ChevronDown className={`w-5 h-5 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

// Groups related questions with the same tier-header language the
// completion card uses (uppercase, tracked-out label + divider), so a long
// form reads as a handful of short ones instead of one dense wall.
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-8 mt-8 first:mt-0 first:border-t-0 first:pt-0">
      <h3 className="text-xs uppercase tracking-wider font-semibold text-muted mb-5">{title}</h3>
      <div className="space-y-5">{children}</div>
    </div>
  );
}


export default function ProfileEditPage() {
  const { mode } = useModeContext();
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [pendingScrollField, setPendingScrollField] = useState<string | null>(null);
  const [openAccordion, setOpenAccordion] = useState<'completion' | 'basics' | 'preferences' | 'lifestyle' | null>('basics');
  const [completionPercentage, setCompletionPercentage] = useState<number | null>(null);
  const [completionBreakdown, setCompletionBreakdown] = useState<CompletionBreakdownItem[]>([]);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'basics' | 'preferences' | 'lifestyle'>('basics');
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
  const [education, setEducation] = useState('');
  const [educationOther, setEducationOther] = useState('');
  const [profession, setProfession] = useState('');
  const [professionOther, setProfessionOther] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [heightCm, setHeightCm] = useState<number>(DEFAULT_HEIGHT_CM);
  // Website localization isn't live yet (same gate as the marketing site's
  // NEXT_PUBLIC_LOCALIZATION_ENABLED) — default everyone to English and
  // show Gujarati/Urdu as visible-but-disabled rather than hiding them, so
  // the question doesn't quietly disappear once localization does ship.
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [willingToRelocate, setWillingToRelocate] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [brothersCount, setBrothersCount] = useState<number | null>(null);
  const [brothersMarriedCount, setBrothersMarriedCount] = useState<number | null>(null);
  const [sistersCount, setSistersCount] = useState<number | null>(null);
  const [sistersMarriedCount, setSistersMarriedCount] = useState<number | null>(null);
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [childrenCount, setChildrenCount] = useState<number | null>(null);
  const [childrenBoysCount, setChildrenBoysCount] = useState<number | null>(null);
  const [childrenGirlsCount, setChildrenGirlsCount] = useState<number | null>(null);
  const [childrenLivingStatus, setChildrenLivingStatus] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [introLine, setIntroLine] = useState('');

  // Preferences state
  // A slider sitting at its full span ([AGE_MIN, AGE_MAX]) reads as "no
  // preference set" rather than a specific answer — unlike the old text
  // inputs, it never risks looking like a real saved value when nothing's
  // been saved yet, so it doesn't need the same "render blank" treatment.
  const [ageRange, setAgeRange] = useState<[number, number]>([AGE_MIN, AGE_MAX]);
  const [prefCities, setPrefCities] = useState<string[]>([]);
  const [prefEducation, setPrefEducation] = useState<string[]>([]);
  const [prefProfessions, setPrefProfessions] = useState<string[]>([]);
  const [practiceLevel, setPracticeLevel] = useState<string>('');
  const [familyExpectation, setFamilyExpectation] = useState<string>('');
  const [partnerQualityTags, setPartnerQualityTags] = useState<string[]>([]);
  const [childrenAcceptance, setChildrenAcceptance] = useState<string>('');

  // Lifestyle & Personality state — moved here from Settings; each toggle
  // still auto-saves on click (matching that page's proven pattern) rather
  // than batching into the Save button the other two tabs use.
  const [traitPairs, setTraitPairs] = useState<TraitPair[]>([]);
  const [lifestyleAnswers, setLifestyleAnswers] = useState<Record<string, string>>({});
  const [lifestyleMessage, setLifestyleMessage] = useState('');

  // Constant options for chips
  // Own attributes — same lists as mobile's onboarding/basics.tsx, distinct
  // from the OWN_EDUCATION_OPTIONS/OWN_PROFESSION_OPTIONS below and the
  // EDUCATION/PROFESSIONS partner-preference lists further down.
  const OWN_EDUCATION_OPTIONS = ['High School', 'B.Com', 'B.Tech', 'MBBS', 'BDS', 'MBA', 'CA', 'M.Ed', 'PhD', 'Other'];
  const OWN_PROFESSION_OPTIONS = ['Doctor', 'Engineer', 'Teacher', 'Business', 'CA', 'Dentist', 'Lawyer', 'Homemaker', 'Other'];
  const CITIES = ['Any', 'Mumbai', 'Pune', 'Surat', 'Dubai', 'Karachi', 'London', 'New York'];
  const EDUCATION = ['Any', 'Bachelors', 'Masters', 'PhD', 'Diploma', 'High School'];
  const PROFESSIONS = ['Any', 'Engineer', 'Doctor', 'Business', 'Design', 'Lawyer', 'Finance', 'Teaching', 'Other'];

  const PRACTICE_LEVELS = [
    { value: 'very_devout', label: 'Very Devout' },
    { value: 'practicing', label: 'Practicing' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'flexible', label: 'Flexible' }
  ];
  const FAMILY_EXPECTATIONS = [
    { value: 'very_important', label: 'Very Important' },
    { value: 'somewhat', label: 'Somewhat' },
    { value: 'flexible', label: 'Flexible' },
    { value: 'not_sure', label: 'Not sure' }
  ];
  const QUALITY_TAGS = ['Ambitious', 'Family-oriented', 'Creative', 'Religious', 'Athletic', 'Traveler'];
  const MARITAL_STATUSES = [
    { value: 'never_married', label: 'Never Married' },
    { value: 'divorced', label: 'Divorced' },
    { value: 'widowed', label: 'Widowed' },
  ];
  const LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'gu', label: 'Gujarati' },
    { value: 'ur', label: 'Urdu' },
  ];
  const RELOCATE_OPTIONS = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
    { value: 'depends', label: 'Depends' },
  ];
  const CHILDREN_ACCEPTANCE_OPTIONS = [
    { value: 'yes', label: 'Yes' },
    { value: 'open', label: 'Open' },
    { value: 'prefer_not', label: 'Prefer not' },
  ];

  const toggleArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setter(prev => {
      const exists = prev.some(i => i.toLowerCase() === item.toLowerCase());
      if (exists) return prev.filter(i => i.toLowerCase() !== item.toLowerCase());
      return [...prev, item];
    });
  };

  const isSelected = (arr: string[], val: string) => arr.some(item => item.toLowerCase() === val.toLowerCase());

  // The desktop grid and mobile accordion both render their own copy of
  // each form (CSS shows/hides them, they're not conditionally mounted),
  // so refs are namespaced per-layout to avoid the two copies colliding.
  const registerFieldRef = (prefix: 'desktop' | 'mobile', field: string) => (el: HTMLElement | null) => {
    fieldRefs.current[`${prefix}:${field}`] = el;
  };

  // Every question gets this box, highlightable or not — the padding is
  // what actually fixes the "wall of inputs" feel; the highlight (a soft
  // colour wash, not a hard ring) is just layered on top for the fields a
  // completion-card click can jump to.
  const fieldBoxClass = (field?: string) =>
    `rounded-2xl px-4 py-3 transition-colors duration-700 ${field && highlightedField === field ? 'bg-accent-light/50' : ''}`;

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
          // "Other" resolution — same pattern as mobile's basics.tsx: a
          // saved value that matches a known option selects that chip; a
          // custom value selects "Other" and pre-fills its text field.
          if (data.education) {
            const known = OWN_EDUCATION_OPTIONS.includes(data.education);
            setEducation(known ? data.education : 'Other');
            setEducationOther(known ? '' : data.education);
          }
          if (data.profession) {
            const known = OWN_PROFESSION_OPTIONS.includes(data.profession);
            setProfession(known ? data.profession : 'Other');
            setProfessionOther(known ? '' : data.profession);
          }
          setFieldOfStudy(data.fieldOfStudy || '');
          setHeightCm(data.heightCm != null ? nearestHeightOptionCm(data.heightCm) : DEFAULT_HEIGHT_CM);
          setPreferredLanguage(data.preferredLanguage || 'en');
          setWillingToRelocate(data.willingToRelocate || '');
          setMaritalStatus(data.maritalStatus || '');
          setBrothersCount(data.brothersCount ?? null);
          setBrothersMarriedCount(data.brothersMarriedCount ?? null);
          setSistersCount(data.sistersCount ?? null);
          setSistersMarriedCount(data.sistersMarriedCount ?? null);
          setHasChildren(data.hasChildren ?? null);
          setChildrenCount(data.childrenCount ?? null);
          setChildrenBoysCount(data.childrenBoysCount ?? null);
          setChildrenGirlsCount(data.childrenGirlsCount ?? null);
          setChildrenLivingStatus(data.childrenLivingStatus ?? null);
          setBio(data.bio || '');
          setIntroLine(data.introLine || '');
          setVerificationStatus(data.verification?.status);
          if (data.lifestyleAnswers) setLifestyleAnswers(data.lifestyleAnswers);

          if (data.preferences) {
            setAgeRange([
              data.preferences.ageRange?.min ?? AGE_MIN,
              data.preferences.ageRange?.max ?? AGE_MAX,
            ]);
            setPrefCities(data.preferences.cities || []);
            setPrefEducation(data.preferences.education || []);
            setPrefProfessions(data.preferences.professions || []);
            setPracticeLevel(data.preferences.practiceLevel || '');
            setFamilyExpectation(data.preferences.familyExpectation || '');
            setPartnerQualityTags(data.preferences.partnerQualityTags || []);
            setChildrenAcceptance(data.preferences.childrenAcceptance || '');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchProfile();
    fetch('/api/v1/lifestyle-traits')
      .then(r => r.json())
      .then(d => { if (isMounted) setTraitPairs(d.pairs || []); })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const refreshCompletion = () => {
    if (mode !== 'B') return;
    fetch('/api/v1/profile/completion')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.percentage === 'number') setCompletionPercentage(data.percentage);
        if (Array.isArray(data.breakdown)) setCompletionBreakdown(data.breakdown);
        if (typeof data.isComplete === 'boolean') setIsProfileComplete(data.isComplete);
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshCompletion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const scrollToField = (field: string): boolean => {
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
    const el = fieldRefs.current[`${isDesktop ? 'desktop' : 'mobile'}:${field}`];
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedField(field);
    window.setTimeout(() => {
      setHighlightedField(cur => (cur === field ? null : cur));
    }, 2000);
    return true;
  };

  // Runs once the tab/accordion switch triggered by a completion-card click
  // has committed to the DOM, so the target field's ref is guaranteed to
  // exist by the time this fires (refs attach during commit, before effects).
  useEffect(() => {
    if (!pendingScrollField) return;
    scrollToField(pendingScrollField);
    setPendingScrollField(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingScrollField, activeTab, openAccordion]);

  const handleBasicsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ text: '', type: '' });
    try {
      // The native <input type="date"> above always emits ISO (YYYY-MM-DD)
      // regardless of what was loaded into it — the API only accepts
      // DD/MM/YYYY (see the comment on parseDobStrict in validators.ts),
      // so this conversion has to happen right here before every submit.
      const dobForApi = dob && /^\d{4}-\d{2}-\d{2}$/.test(dob)
        ? (() => { const [y, m, d] = dob.split('-'); return `${d}/${m}/${y}`; })()
        : dob;

      const res1 = await fetch('/api/v1/profile/basics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, gender, dob: dobForApi, city, jamaat, email,
          education: education === 'Other' ? educationOther.trim() : (education || undefined),
          profession: profession === 'Other' ? professionOther.trim() : (profession || undefined),
          fieldOfStudy: fieldOfStudy || undefined,
          heightCm,
          preferredLanguage,
          willingToRelocate: willingToRelocate || undefined,
          maritalStatus: maritalStatus || undefined,
          brothersCount: brothersCount ?? undefined,
          brothersMarriedCount: brothersMarriedCount ?? undefined,
          sistersCount: sistersCount ?? undefined,
          sistersMarriedCount: sistersMarriedCount ?? undefined,
          hasChildren: hasChildren ?? undefined,
          childrenCount: childrenCount ?? undefined,
          childrenBoysCount: childrenBoysCount ?? undefined,
          childrenGirlsCount: childrenGirlsCount ?? undefined,
          childrenLivingStatus: childrenLivingStatus ?? undefined,
        }),
      });
      const res2 = await fetch('/api/v1/profile/bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, introLine }),
      });
      if (res1.ok && res2.ok) {
        setMessage({ text: 'Basic details updated successfully.', type: 'success' });
        refreshCompletion();
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
    setMessage({ text: '', type: '' });
    setIsSaving(true);
    try {
      const res = await fetch('/api/v1/profile/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ageRange: { min: ageRange[0], max: ageRange[1] },
          cities: prefCities,
          education: prefEducation,
          professions: prefProfessions,
          practiceLevel: practiceLevel || undefined,
          familyExpectation: familyExpectation || undefined,
          partnerQualityTags: partnerQualityTags,
          childrenAcceptance: childrenAcceptance || undefined,
        }),
      });
      if (res.ok) {
        setMessage({ text: 'Preferences updated successfully.', type: 'success' });
        refreshCompletion();
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (err) {
      setMessage({ text: 'Error updating preferences.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLifestyleChange = async (slug: string, optionKey: string) => {
    const prev = lifestyleAnswers;
    const next = { ...lifestyleAnswers, [slug]: optionKey };
    setLifestyleAnswers(next);
    setLifestyleMessage('');
    try {
      const res = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lifestyleAnswers: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setLifestyleAnswers(prev); // revert on failure
      setLifestyleMessage('Failed to update — please try again.');
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

  const handleCompletionFieldClick = (item: CompletionBreakdownItem) => {
    // Tier 2 (Partner Preferences) fields live on the Preferences
    // tab/section; everything else (Tier 1 core essentials, Tier 3
    // background) is on Basics.
    const target = item.tier === 2 ? 'preferences' : 'basics';
    setActiveTab(target);
    setOpenAccordion(target);
    setMessage({ text: '', type: '' });
    setPendingScrollField(item.field);
  };

  // Once the profile is fully complete there's nothing left to act on, so
  // the whole widget (not just its contents) disappears rather than
  // lingering as a "Profile complete" banner nobody needs to see again.
  const completionCard = mode === 'B' && completionBreakdown.length > 0 && !isProfileComplete ? (
    <CompletionBreakdownCard
      percentage={completionPercentage ?? 0}
      breakdown={completionBreakdown}
      isComplete={isProfileComplete}
      verificationStatus={verificationStatus}
      onFieldClick={handleCompletionFieldClick}
    />
  ) : null;

  const renderBasicsForm = (prefix: 'desktop' | 'mobile') => (
            <form onSubmit={handleBasicsSubmit}>
              <FormSection title="Profile Basics">
                <div className={fieldBoxClass()}>
                  <label className="block text-sm font-medium text-muted mb-1.5">Real Name</label>
                  <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background mb-1" />
                  <p className="text-xs text-muted">Your real name stays private — it's only shared once you and someone you match with both choose to reveal it to each other.</p>
                </div>
                <div className={fieldBoxClass()}>
                  <label className="block text-sm font-medium text-muted mb-1.5">Alias</label>
                  <div className="flex items-center justify-between mb-1 bg-background px-4 py-3 rounded-xl border border-border">
                    <span className="font-bold text-foreground text-lg">{alias}</span>
                    <button type="button" onClick={handleRegenerateAlias} disabled={isGeneratingAlias} className="px-4 py-2 bg-secondary text-foreground font-medium rounded-xl disabled:opacity-50 text-sm">
                      {isGeneratingAlias ? 'Generating...' : 'Get a new name'}
                    </button>
                  </div>
                  <p className="text-xs text-muted">This is your public display name. You can generate a new one once every 24 hours.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={fieldBoxClass()}>
                    <label className="block text-sm font-medium text-muted mb-1.5">Gender</label>
                    <select value={gender} onChange={e => setGender(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background">
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <div className={fieldBoxClass()}>
                    <label className="block text-sm font-medium text-muted mb-1.5">Date of Birth</label>
                    <input required type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={fieldBoxClass()}>
                    <label className="block text-sm font-medium text-muted mb-1.5">City</label>
                    <input required type="text" value={city} onChange={e => setCity(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background" />
                  </div>
                  <div ref={registerFieldRef(prefix, 'jamaat')} className={fieldBoxClass('jamaat')}>
                    <label className="block text-sm font-medium text-muted mb-1.5">Jamaat</label>
                    <input required type="text" value={jamaat} onChange={e => setJamaat(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background" />
                  </div>
                </div>
                <div ref={registerFieldRef(prefix, 'email')} className={fieldBoxClass('email')}>
                  <label className="block text-sm font-medium text-muted mb-1.5">Email Address (Optional)</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background" />
                  <p className="text-xs text-muted mt-1">Used only for account recovery. Never shown publicly or shared.</p>
                </div>
                <div className={fieldBoxClass()}>
                  <label className="block text-sm font-medium text-muted mb-1.5">Height</label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {HEIGHT_PICKER_OPTIONS.map(opt => (
                      <Chip key={opt.cm} label={opt.label} selected={heightCm === opt.cm} onClick={() => setHeightCm(opt.cm)} className="shrink-0" />
                    ))}
                  </div>
                </div>
                <div className={fieldBoxClass()}>
                  <label className="block text-sm font-medium text-muted mb-1.5">Preferred Language for Updates</label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGE_OPTIONS.map(opt => (
                      <Chip
                        key={opt.value} label={opt.label}
                        selected={preferredLanguage === opt.value}
                        disabled={opt.value !== 'en'}
                        onClick={() => setPreferredLanguage(opt.value)}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted mt-1">Gujarati and Urdu are coming soon — English only for now.</p>
                </div>
                <div className={fieldBoxClass()}>
                  <label className="block text-sm font-medium text-muted mb-1.5">Willing to Relocate?</label>
                  <div className="flex flex-wrap gap-2">
                    {RELOCATE_OPTIONS.map(opt => (
                      <Chip key={opt.value} label={opt.label} selected={willingToRelocate === opt.value} onClick={() => setWillingToRelocate(opt.value)} />
                    ))}
                  </div>
                </div>
              </FormSection>

              <FormSection title="Education & Profession">
                <div className={fieldBoxClass()}>
                  <h4 className="text-sm font-bold text-foreground mb-3">Education</h4>
                  <div className="flex flex-wrap gap-2">
                    {OWN_EDUCATION_OPTIONS.map(opt => (
                      <Chip key={opt} label={opt} selected={education === opt} onClick={() => setEducation(opt)} />
                    ))}
                  </div>
                  {education === 'Other' && (
                    <input
                      type="text" maxLength={100} value={educationOther}
                      onChange={e => setEducationOther(e.target.value)}
                      placeholder="Your education"
                      className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background mt-3"
                    />
                  )}
                </div>
                <div className={fieldBoxClass()}>
                  <h4 className="text-sm font-bold text-foreground mb-3">Profession</h4>
                  <div className="flex flex-wrap gap-2">
                    {OWN_PROFESSION_OPTIONS.map(opt => (
                      <Chip key={opt} label={opt} selected={profession === opt} onClick={() => setProfession(opt)} />
                    ))}
                  </div>
                  {profession === 'Other' && (
                    <input
                      type="text" maxLength={100} value={professionOther}
                      onChange={e => setProfessionOther(e.target.value)}
                      placeholder="Your profession"
                      className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background mt-3"
                    />
                  )}
                </div>
              </FormSection>

              <FormSection title="Family Background">
                <div className="grid grid-cols-2 gap-3">
                  <div ref={registerFieldRef(prefix, 'fieldOfStudy')} className={fieldBoxClass('fieldOfStudy')}>
                    <label className="block text-sm font-medium text-muted mb-1.5">Field of Study</label>
                    <input type="text" value={fieldOfStudy} onChange={e => setFieldOfStudy(e.target.value)} placeholder="e.g. Computer Science" className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background" />
                  </div>
                  <div ref={registerFieldRef(prefix, 'maritalStatus')} className={fieldBoxClass('maritalStatus')}>
                    <label className="block text-sm font-medium text-muted mb-1.5">Marital Status</label>
                    <select value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background">
                      <option value="">Select...</option>
                      {MARITAL_STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div ref={registerFieldRef(prefix, 'siblingsInfo')} className={fieldBoxClass('siblingsInfo')}>
                  <FamilySection
                    brothersCount={brothersCount}
                    brothersMarriedCount={brothersMarriedCount}
                    sistersCount={sistersCount}
                    sistersMarriedCount={sistersMarriedCount}
                    onChange={(updates) => {
                      if ('brothersCount' in updates) setBrothersCount(updates.brothersCount ?? null);
                      if ('brothersMarriedCount' in updates) setBrothersMarriedCount(updates.brothersMarriedCount ?? null);
                      if ('sistersCount' in updates) setSistersCount(updates.sistersCount ?? null);
                      if ('sistersMarriedCount' in updates) setSistersMarriedCount(updates.sistersMarriedCount ?? null);
                    }}
                  />
                </div>
                <ChildrenSection
                  maritalStatus={maritalStatus}
                  hasChildren={hasChildren}
                  childrenCount={childrenCount}
                  childrenBoysCount={childrenBoysCount}
                  childrenGirlsCount={childrenGirlsCount}
                  childrenLivingStatus={childrenLivingStatus as any}
                  onChange={(updates) => {
                    if ('hasChildren' in updates) setHasChildren(updates.hasChildren ?? null);
                    if ('childrenCount' in updates) setChildrenCount(updates.childrenCount ?? null);
                    if ('childrenBoysCount' in updates) setChildrenBoysCount(updates.childrenBoysCount ?? null);
                    if ('childrenGirlsCount' in updates) setChildrenGirlsCount(updates.childrenGirlsCount ?? null);
                    if ('childrenLivingStatus' in updates) setChildrenLivingStatus(updates.childrenLivingStatus ?? null);
                  }}
                />
              </FormSection>

              <FormSection title="About You">
                <div ref={registerFieldRef(prefix, 'introLine')} className={fieldBoxClass('introLine')}>
                  <label className="block text-sm font-medium text-muted mb-1.5">Intro Line</label>
                  <input type="text" maxLength={100} value={introLine} onChange={e => setIntroLine(e.target.value)} placeholder="A one-line tagline for your profile" className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background" />
                  <p className="text-xs text-muted mt-1">{introLine.length}/100 characters</p>
                </div>
                <div ref={registerFieldRef(prefix, 'bio')} className={fieldBoxClass('bio')}>
                  <label className="block text-sm font-medium text-muted mb-1.5">Bio</label>
                  <textarea maxLength={300} rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us a bit about yourself..." className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:border-primary transition-all bg-background resize-none" />
                  <p className="text-xs text-muted mt-1">{bio.length}/300 characters — at least 10 counts toward profile completion</p>
                </div>
              </FormSection>

              <button disabled={isSaving} type="submit" className="w-full bg-primary text-surface font-bold py-3.5 rounded-xl mt-8 disabled:opacity-50">
                {isSaving ? 'Saving...' : 'Save Basics'}
              </button>
            </form>
  );

  const renderPreferencesForm = (prefix: 'desktop' | 'mobile') => (
            <form onSubmit={handlePreferencesSubmit}>
              <FormSection title="Who You're Looking For">
                <section ref={registerFieldRef(prefix, 'prefAgeRange')} className={fieldBoxClass('prefAgeRange')}>
                  <WebRangeSlider
                    label="Age Range"
                    min={AGE_MIN}
                    max={AGE_MAX}
                    values={ageRange}
                    onChange={(v) => setAgeRange([v[0], v[1]])}
                    openEndedMin={false}
                  />
                </section>

                <section ref={registerFieldRef(prefix, 'prefCities')} className={fieldBoxClass('prefCities')}>
                  <h4 className="text-sm font-bold text-foreground mb-3">Preferred Cities</h4>
                  <div className="flex flex-wrap gap-2">
                    {CITIES.map(c => (
                      <Chip key={c} label={c} selected={isSelected(prefCities, c)} onClick={() => toggleArrayItem(setPrefCities, c)} />
                    ))}
                  </div>
                </section>

                <section ref={registerFieldRef(prefix, 'prefEducation')} className={fieldBoxClass('prefEducation')}>
                  <h4 className="text-sm font-bold text-foreground mb-3">Preferred Education</h4>
                  <div className="flex flex-wrap gap-2">
                    {EDUCATION.map(e => (
                      <Chip key={e} label={e} selected={isSelected(prefEducation, e)} onClick={() => toggleArrayItem(setPrefEducation, e)} />
                    ))}
                  </div>
                </section>

                <section ref={registerFieldRef(prefix, 'prefProfessions')} className={fieldBoxClass('prefProfessions')}>
                  <h4 className="text-sm font-bold text-foreground mb-3">Preferred Professions</h4>
                  <div className="flex flex-wrap gap-2">
                    {PROFESSIONS.map(p => (
                      <Chip key={p} label={p} selected={isSelected(prefProfessions, p)} onClick={() => toggleArrayItem(setPrefProfessions, p)} />
                    ))}
                  </div>
                </section>
              </FormSection>

              <FormSection title="Values & Lifestyle">
                <section ref={registerFieldRef(prefix, 'prefPracticeLevel')} className={fieldBoxClass('prefPracticeLevel')}>
                  <h4 className="text-sm font-bold text-foreground mb-3">Practice Level</h4>
                  <div className="flex flex-wrap gap-2">
                    {PRACTICE_LEVELS.map(level => (
                      <Chip key={level.value} label={level.label} selected={practiceLevel === level.value} onClick={() => setPracticeLevel(level.value)} />
                    ))}
                  </div>
                </section>

                <section ref={registerFieldRef(prefix, 'prefFamilySetup')} className={fieldBoxClass('prefFamilySetup')}>
                  <h4 className="text-sm font-bold text-foreground mb-3">Family Expectation</h4>
                  <div className="flex flex-wrap gap-2">
                    {FAMILY_EXPECTATIONS.map(exp => (
                      <Chip key={exp.value} label={exp.label} selected={familyExpectation === exp.value} onClick={() => setFamilyExpectation(exp.value)} />
                    ))}
                  </div>
                </section>

                <section ref={registerFieldRef(prefix, 'prefQualityTags')} className={fieldBoxClass('prefQualityTags')}>
                  <h4 className="text-sm font-bold text-foreground mb-3">Partner Qualities (Select up to 3)</h4>
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

                <section ref={registerFieldRef(prefix, 'prefChildrenAcceptance')} className={fieldBoxClass('prefChildrenAcceptance')}>
                  <h4 className="text-sm font-bold text-foreground mb-3">Open to a Partner with Children?</h4>
                  <div className="flex flex-wrap gap-2">
                    {CHILDREN_ACCEPTANCE_OPTIONS.map(opt => (
                      <Chip key={opt.value} label={opt.label} selected={childrenAcceptance === opt.value} onClick={() => setChildrenAcceptance(opt.value)} />
                    ))}
                  </div>
                </section>
              </FormSection>

              <button disabled={isSaving} type="submit" className="w-full bg-primary text-surface font-bold py-3.5 rounded-xl mt-8 disabled:opacity-50">
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </button>
            </form>
  );

  // No Save button here — each toggle saves itself immediately (optimistic,
  // with rollback on failure), same as this section behaved on Settings
  // before moving here. Not part of the completion score, so no field refs.
  const renderLifestyleForm = () => (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Lifestyle & Personality</h3>
              </div>
              <p className="text-xs text-muted mb-6">Good to have — the more you share, the better your matches.</p>
              {traitPairs.length === 0 ? (
                <p className="text-sm text-muted">No lifestyle questions available right now.</p>
              ) : (
                <div className="space-y-5">
                  {traitPairs.map((pair, index) => (
                    <div key={pair.id} className={fieldBoxClass()}>
                      <LifestyleToggle
                        pair={pair}
                        value={lifestyleAnswers[pair.slug]}
                        onChange={(optionKey) => handleLifestyleChange(pair.slug, optionKey)}
                        badgeDelay={index * 0.8}
                      />
                    </div>
                  ))}
                  {lifestyleMessage && <p className="text-danger text-xs mt-2">{lifestyleMessage}</p>}
                </div>
              )}
            </div>
  );

  return (
    <>
      {mode === 'B' && (
        <div style={{ backgroundColor: '#211F1A', padding: '16px 24px' }}>
          <div className="container mx-auto max-w-2xl">
            <div className="flex items-center" style={{ gap: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#C9A96E', display: 'inline-block' }} />
              <span style={{ fontSize: '13px', color: '#FFFFFC', fontWeight: 500 }}>Your profile is ready</span>
            </div>
            <div style={{ marginTop: '4px' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                We&apos;re gathering verified families before opening discovery — so your first experience is genuinely good, not an empty room. We&apos;ll email you the moment it opens.
              </p>
            </div>
            <div style={{ marginTop: '10px' }}>
              <a
                href="https://instagram.com/bohrataaruf"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '12px', color: '#C9A96E', textDecoration: 'none' }}
              >
                Follow @bohrataaruf on Instagram →
              </a>
            </div>
          </div>
        </div>
      )}
    <div className="min-h-screen bg-background pt-12 pb-32 px-6">
      <div className="container mx-auto max-w-2xl lg:max-w-6xl">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <h1 className="text-3xl font-bold">Edit Profile</h1>
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary border border-border hover:border-accent px-4 py-2 rounded-xl transition-colors"
          >
            <Eye className="w-4 h-4" /> View my profile
          </Link>
        </div>

        <div className="mb-6">
          <VerificationStatusCard status={verificationStatus} />
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

        {/* Desktop / laptop (>=1024px): 3/8 sticky-sidebar grid — collapses
            to a single column once the completion card has nothing to show */}
        <div className={completionCard ? 'hidden lg:grid lg:grid-cols-[3fr_8fr] lg:gap-8 lg:items-start' : 'hidden lg:block'}>
          {completionCard && (
            <div className="sticky top-8">
              {completionCard}
            </div>
          )}
          <div>
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
              <button
                onClick={() => { setActiveTab('lifestyle'); setMessage({ text: '', type: '' }); }}
                className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-[1px] ${activeTab === 'lifestyle' ? 'border-primary text-foreground' : 'border-transparent text-muted hover:text-foreground'}`}
              >
                Lifestyle & Personality
              </button>
            </div>
            <div className="bg-surface p-8 rounded-3xl border border-border shadow-sm">
              {activeTab === 'basics' && renderBasicsForm('desktop')}
              {activeTab === 'preferences' && renderPreferencesForm('desktop')}
              {activeTab === 'lifestyle' && renderLifestyleForm()}
            </div>
          </div>
        </div>

        {/* Tablet / mobile (<1024px): single-open accordion */}
        <div className="lg:hidden space-y-4">
          {completionCard && (
            <AccordionSection
              title="Profile Completion"
              isOpen={openAccordion === 'completion'}
              onToggle={() => setOpenAccordion(o => o === 'completion' ? null : 'completion')}
            >
              {completionCard}
            </AccordionSection>
          )}

          <AccordionSection
            title="Basic Details"
            isOpen={openAccordion === 'basics'}
            onToggle={() => setOpenAccordion(o => o === 'basics' ? null : 'basics')}
          >
            {renderBasicsForm('mobile')}
          </AccordionSection>

          <AccordionSection
            title="Preferences"
            isOpen={openAccordion === 'preferences'}
            onToggle={() => setOpenAccordion(o => o === 'preferences' ? null : 'preferences')}
          >
            {renderPreferencesForm('mobile')}
          </AccordionSection>

          <AccordionSection
            title="Lifestyle & Personality"
            isOpen={openAccordion === 'lifestyle'}
            onToggle={() => setOpenAccordion(o => o === 'lifestyle' ? null : 'lifestyle')}
          >
            {renderLifestyleForm()}
          </AccordionSection>
        </div>
      </div>
    </div>
    </>
  );
}
